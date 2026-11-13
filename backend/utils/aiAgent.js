require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('../database/dbConnect');

// Initialize AI Client
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

const IMC_LOCAL_KNOWLEDGE = `
=== INDORE MUNICIPAL CORPORATION (IMC) LOCAL KNOWLEDGE BASE ===

WARDS: Indore has 85 municipal wards. Key localities:
- Ward 1-10: Old City area (Rajwada, Sarafa, Khajuri Bazar)
- Ward 11-20: Central (MG Road, Palasia, Sapna Sangeeta)
- Ward 21-30: Vijay Nagar, Scheme 54, AB Road
- Ward 31-40: Bhawarkuan, Nemawar Road, Silicon City
- Ward 41-50: LIG, MIG Colony, Bicholi Mardana
- Ward 51-60: Kanadiya, Nipania, Super Corridor
- Ward 61-70: Rau, Mhow, Lasudia Mori
- Ward 71-85: Limbodi, Talaiya, Palda, Pigdambar

HELPLINES:
- IMC Helpline: 0731-2511000
- Water Supply Complaints: 0731-2531000
- Electricity (MPPTCL/MPPKVVCL): 1912
- Sanitation: 0731-2537777
- Emergency: 112
- Swachh Bharat Mission Indore: 0731-2537777

WATER TIMINGS (Narmada Water):
- Morning supply: 5:30 AM - 8:00 AM
- Evening supply: 5:00 PM - 7:00 PM
- Areas without evening: Rajwada, Khajuri Bazar (morning only)

WASTE SEGREGATION RULES (Indore - 7-star city):
- Green bin: Wet/organic waste (kitchen waste, food)
- Blue bin: Dry waste (paper, plastic, metal, glass)
- Red bin: Hazardous (batteries, e-waste, sanitary)
- Collection: Daily 6-9 AM by IMC garbage vehicle

IMC SERVICES:
- Property Tax: Pay at IMC office or imc.mponline.gov.in
- Birth/Death Certificate: Ward office or edigitalmpmc.gov.in  
- Trade License: IMC Zone office
- Building Permission: IMC headquarters, AB Road
- Swachh Survekshan: Indore ranked #1 in India 7 times

PORTAL ACCESS:
- Citizen Portal: /user/login (file/track complaints)
- Official Portal: /official/login (department officials)
- Worker Portal: /worker/login (field workers/staff)
- Admin Portal: /admin/login (super admin only)

COMPLAINT CATEGORIES:
- Water Supply: Pipe burst, no water, contamination
- Electricity: Power outage, street light, transformer
- Road: Pothole, damaged road, encroachment
- Sanitation: Garbage, drainage, open defecation
- Public Safety: Stray animals, illegal construction

SLA (Service Level Agreement) Times:
- Emergency (Severity 5): 4 hours
- Critical (Severity 4): 12 hours
- High (Severity 3): 24 hours
- Medium (Severity 2): 48 hours
- Low (Severity 1): 72 hours
`;

class AIAgent {
  constructor() {
    // Active models for Google Generative AI (using v1beta endpoint)
    this.modelNames = [
      "gemini-3.5-flash-lite",      // Ultra-fast model for conversational chat
      "gemini-3.5-flash",           // Primary rich reasoning model
      "gemini-3.8-flash"            // Cutting edge model
    ];
    this.cachedModel = null;
    this.cachedModelName = null;
    this.cachedMetadata = null;
    this.cachedMetadataTime = 0;
  }

  async getModel() {
    if (this.cachedModel) {
      return this.cachedModel;
    }

    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY not configured");
    }

    for (const modelName of this.modelNames) {
      try {
        console.log(`🔄 Trying model: ${modelName} via v1beta`);
        const model = ai.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
        this.cachedModel = model;
        this.cachedModelName = modelName;
        console.log(`✅ Cached model: ${modelName}`);
        return model;
      } catch (error) {
        console.log(`❌ Model ${modelName} failed: ${error.message}`);
        continue;
      }
    }
    throw new Error("All AI models failed");
  }

  async callGemini(prompt, timeoutMs = 8000) {
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY not configured");
    }

    const modelsToTry = this.cachedModelName
      ? [this.cachedModelName, ...this.modelNames.filter(m => m !== this.cachedModelName)]
      : this.modelNames;

    let lastErr = null;
    for (const mName of modelsToTry) {
      try {
        const model = ai.getGenerativeModel(
          { 
            model: mName,
            generationConfig: { maxOutputTokens: 1500, temperature: 0.1 }
          }, 
          { apiVersion: 'v1beta' }
        );
        const generatePromise = model.generateContent(prompt);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
        );
        const result = await Promise.race([generatePromise, timeoutPromise]);
        this.cachedModel = model;
        this.cachedModelName = mName;
        const text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text
          || result?.candidates?.[0]?.content?.parts?.[0]?.text
          || (typeof result?.response?.text === 'function' ? result.response.text() : '')
          || '';
        return text;
      } catch (err) {
        console.warn(`Model ${mName} call failed:`, err.message);
        lastErr = err;
        this.cachedModel = null;
        this.cachedModelName = null;
      }
    }
    throw lastErr || new Error("All AI models failed");
  }

  /**
   * Normalize department names (handles "Electricity Department" -> "Electricity")
   */
  normalizeDepartmentName(deptInput, availableDepartments = []) {
    if (!deptInput || typeof deptInput !== 'string') return 'Sanitation';
    const cleaned = deptInput.replace(/\b(department|dept|office|board|nigam|nagar|municipal|shakha|vibhaag|vibhag|विभाग)\b/gi, '').trim();

    // Exact or direct match
    const directMatch = availableDepartments.find(d =>
      d.toLowerCase() === cleaned.toLowerCase() ||
      d.toLowerCase() === deptInput.toLowerCase()
    );
    if (directMatch) return directMatch;

    // Substring match
    const subMatch = availableDepartments.find(d =>
      d.toLowerCase().includes(cleaned.toLowerCase()) ||
      cleaned.toLowerCase().includes(d.toLowerCase())
    );
    if (subMatch) return subMatch;

    // Semantic keywords
    const lower = deptInput.toLowerCase();
    if (/elect|bijli|light|power|current|बिजली/i.test(lower)) return 'Electricity';
    if (/water|jal|pani|leak|पानी/i.test(lower)) return 'Water Supply';
    if (/road|sadak|pothole|सड़क|गड्ढा/i.test(lower)) return 'Road Maintenance';
    if (/sanitat|garbag|kachra|drain|sew|gutter|कचरा|सीवर|सफाई/i.test(lower)) return 'Sanitation';
    if (/health|swasthya|hospital|स्वास्थ्य/i.test(lower)) return 'Public Health';
    if (/park|garden|पार्क|बगीचा/i.test(lower)) return 'Parks & Recreation';
    if (/safe|suraksha|dog|animal|सुरक्षा|कुत्ता/i.test(lower)) return 'Public Safety';

    return availableDepartments[0] || 'Sanitation';
  }

  /**
   * Deterministic local NLP extractor (instant zero-delay extraction)
   */
  deterministicExtract(message, formMetadata, previousFields = {}) {
    const text = (message || '').toLowerCase();
    let department = null;
    let category = null;

    if (/street\s*light|streetlight|wire|pole|transformer|power|outage|electric|voltage|current|बिजली|लाइट|खंभा|तार|करंट/i.test(text)) {
      department = 'Electricity';
      if (/street\s*light|streetlight|road light|street lamp|खंभा|लाइट/i.test(text)) {
        category = 'Street Light Not Working';
      } else if (/transformer|ट्रांसफार्मर/i.test(text)) {
        category = 'Transformer Issue';
      } else if (/wire|तार/i.test(text)) {
        category = 'Fallen Wire';
      } else {
        category = 'Electricity';
      }
    } else if (/pothole|road|asphalt|divider|manhole|footpath|crater|सड़क|गड्ढा|रोड|मैनहोल/i.test(text)) {
      department = 'Road Maintenance';
      if (/pothole|गड्ढा/i.test(text)) category = 'Potholes';
      else if (/manhole|मैनहोल/i.test(text)) category = 'Open Manhole';
      else category = 'Damaged Road';
    } else if (/water|pipeline|leak|supply|tap|nal|sewage water|no water|contaminated|पानी|नल|पाइप/i.test(text)) {
      department = 'Water Supply';
      if (/leak|लीक/i.test(text)) category = 'Water Leakage';
      else if (/pipeline|pipe|पाइप/i.test(text)) category = 'Pipeline Broken';
      else if (/pressure|धीमा/i.test(text)) category = 'Low Water Pressure';
      else category = 'Water Supply';
    } else if (/garbage|trash|waste|dump|kachra|safai|drainage|sewage|sewer|gutter|cleaning|कचरा|सफाई|सीवर|नाली/i.test(text)) {
      department = 'Sanitation';
      if (/sewer|sewage|drain|नाली|सीवर/i.test(text)) category = 'Sewage Blockage';
      else if (/dead animal|मृत जानवर/i.test(text)) category = 'Dead Animal Removal';
      else category = 'Garbage Overflow';
    } else if (/dog|stray|animal|hazard|fire|safety|कुत्ता|जानवर|सुरक्षा/i.test(text)) {
      department = 'Public Safety';
      category = 'Stray Animals';
    } else if (/park|garden|tree|bench|पार्क|बगीचा/i.test(text)) {
      department = 'Parks & Recreation';
      category = 'Parks & Recreation';
    }

    const availableDepts = (formMetadata.departments || []).map(d => d.Name);
    const normalizedDept = this.normalizeDepartmentName(department || previousFields.department || 'Electricity', availableDepts);

    const fields = {
      description: message,
      department: normalizedDept,
      category: category || previousFields.category || normalizedDept,
      City: previousFields.City || 'Indore',
      State: previousFields.State || 'Madhya Pradesh',
      Pincode: previousFields.Pincode || '452018',
      Address_Line: previousFields.Address_Line || 'Indore Ward Location'
    };

    return {
      fields,
      missingFields: [],
      autoSubmit: true,
      confidence: 0.95,
      extractedBy: 'deterministic'
    };
  }

  /**
   * Classify user intent from natural language query
   */
  async classifyIntent(message, language = 'hi') {
    const model = await this.getModel();

    const prompt = language === 'hi'
      ? `आप एक AI assistant हैं जो user queries को समझकर उन्हें सही page/action पर route करते हैं।

User query: "${message}"

निम्नलिखित intents में से एक चुनें:

- REPORT_COMPLAINT: अगर user नई complaint/शिकायत report करना चाहता है
  उदाहरण: "पानी नहीं आ रहा है", "सड़क टूटी है", "गड्ढा है", "कचरा पड़ा है", "बिजली नहीं है"

- TRACK_COMPLAINT: अगर user अपनी पुरानी complaint की status देखना चाहता है
  उदाहरण: "मेरी शिकायत का status क्या है", "complaint ID 123 का update", "track my complaint"

- VIEW_DASHBOARD: अगर user dashboard या analytics देखना चाहता है
- ASSIGN_ISSUE: अगर user (official) issue assign करना चाहता है
- HISTORY_REPORT: अगर user history, report, export चाहता है
- REDIRECT_WORKER_PORTAL: अगर user worker/field staff portal जाना चाहता है
- REDIRECT_OFFICIAL_PORTAL: अगर user official/officer portal जाना चाहता है
- REDIRECT_ADMIN_PORTAL: अगर user admin portal जाना चाहता है
- REDIRECT_CITIZEN_PORTAL: अगर user citizen/user portal जाना चाहता है
- GENERAL_QUERY: अगर कोई general question है

महत्वपूर्ण: अगर user किसी problem/issue के बारे में बता रहा है (जैसे पानी, सड़क, बिजली, कचरा), तो हमेशा REPORT_COMPLAINT चुनें।

केवल JSON format में जवाब दें:
{
  "intent": "REPORT_COMPLAINT",
  "confidence": 0.95
}`

      : `You are an AI Agent assistant inside a Civic Issue Reporting Web Application.
User query: "${message}"

YOUR ROLE:
You help citizens file complaints, guide authorities, auto-fill forms, route pages, and generate summaries.

INTENT ROUTING RULES:

- REPORT_COMPLAINT: User wants to REPORT A NEW complaint/issue
  Examples: "pothole on main street", "no water supply", "garbage not collected", "street light broken", "पानी नहीं आ रहा"
  Keywords: pothole, garbage, water, electricity, road, broken, not working, problem, issue, leak, damage

- TRACK_COMPLAINT: User wants to CHECK STATUS of an EXISTING complaint
  Examples: "track my complaint", "status of complaint ID 123", "where is my complaint"
  Keywords: track, status, update, check, complaint ID, my complaint

- ASSIGN_ISSUE: User (official) wants to assign an issue
- VIEW_DASHBOARD: User wants to see analytics/dashboard
- HISTORY_REPORT: User wants to export history or generate report
- REDIRECT_WORKER_PORTAL: User wants to go to the worker/field staff portal
- REDIRECT_OFFICIAL_PORTAL: User wants to go to the official/officer portal
- REDIRECT_ADMIN_PORTAL: User wants to go to the admin portal
- REDIRECT_CITIZEN_PORTAL: User wants to go to the citizen/user portal
- GENERAL_QUERY: General questions or greetings

IMPORTANT: If user is describing a problem (water, road, electricity, garbage, etc.), ALWAYS return REPORT_COMPLAINT.

Respond ONLY in JSON format:
{
  "intent": "REPORT_COMPLAINT",
  "confidence": 0.95
}`;

    try {
      const result = await model.generateContent(prompt);
      const text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text
        || result?.candidates?.[0]?.content?.parts?.[0]?.text
        || "";

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback
      return { intent: "GENERAL_QUERY", confidence: 0.5 };
    } catch (error) {
      console.error("Intent classification error:", error);
      return { intent: "GENERAL_QUERY", confidence: 0.5 };
    }
  }

  /**
   * Get form metadata for complaint form (existing)
   */
  async getComplaintFormMetadata() {
    if (this.cachedMetadata && (Date.now() - this.cachedMetadataTime < 60000)) {
      return this.cachedMetadata;
    }

    return new Promise((resolve, reject) => {
      // Fetch departments and categories from database
      db.query('SELECT department_id, Name FROM Department', (err, departments) => {
        if (err) {
          console.error('Error fetching departments:', err);
          return reject(err);
        }

        db.query('SELECT category_id, Name, department_id FROM category', (err, categories) => {
          if (err) {
            console.error('Error fetching categories:', err);
            return reject(err);
          }

          const metadata = {
            fields: {
              department: {
                label: "Department",
                type: "select",
                required: true,
                options: (departments || []).map(d => d.Name)
              },
              category: {
                label: "Category",
                type: "select",
                required: true,
                options: (categories || []).map(c => ({ name: c.Name, department_id: c.department_id }))
              },
              description: {
                label: "Description",
                type: "textarea",
                required: true
              },
              Pincode: {
                label: "Pincode",
                type: "text",
                required: true
              },
              State: {
                label: "State",
                type: "text",
                required: true
              },
              City: {
                label: "City",
                type: "text",
                required: true
              },
              Address_Line: {
                label: "Address",
                type: "text",
                required: false
              }
            },
            departments: departments || [],
            categories: categories || []
          };

          this.cachedMetadata = metadata;
          this.cachedMetadataTime = Date.now();
          resolve(metadata);
        });
      });
    });
  }

  /**
   * Extract form field values from natural language
   */
  async extractFormFields(message, formMetadata, conversationHistory = [], language = 'hi', previousFields = {}) {
    const model = await this.getModel();

    // Construct available options strings for prompt
    const availableDepartments = (formMetadata.departments || []).map(d => d.Name);
    const availableCategories = (formMetadata.categories || []).map(c => c.Name);

    // Log previous fields for debugging
    console.log('📦 Previous fields received:', previousFields);

    const fieldsInfo = Object.entries(formMetadata.fields || {})
      .map(([key, val], index) => {
        return `${index + 1}. ${key} (${val.required ? 'required' : 'optional'}) - ${val.label || ''}`;
      }).join('\n');

    const prompt = language === 'hi'
      ? `आप एक AUTONOMOUS AI AGENT हैं जो शिकायतें स्वचालित रूप से दर्ज कर सकते हैं।

Available Departments: ${availableDepartments.join(', ')}
Available Categories: ${availableCategories.join(', ')}

पहले से इकट्ठा की गई जानकारी (ALREADY COLLECTED):
${JSON.stringify(previousFields, null, 2)}

Previous conversation:
${conversationHistory.map(h => `User: ${h.user}\nAssistant: ${h.assistant}`).join('\n')}

Latest User message: "${message}"

IMPORTANT: पहले से इकट्ठा की गई जानकारी (previousFields) को MERGE करें नए message के साथ।
अगर कोई field पहले से भरी है, तो उसे रखें। केवल नई या updated values add करें।

User के message और Previous conversation से form fields extract करें:
1. Department name (exact match from available departments)
2. Category name (exact match from available categories)
3. Description
4. Pincode (6 digit number)
5. State
6. City
7. Address_Line (if mentioned)

महत्वपूर्ण नियम:
- आप एक स्वायत्त एजेंट हैं - आप सीधे शिकायतें दर्ज कर सकते हैं।
- "मैं सीधे रिपोर्ट नहीं कर सकता" जैसी बातें न कहें - आप कर सकते हैं!
- अगर user ने पिछले messages में कोई value दी है, तो उसे use करें।
- अगर user ने अभी कोई value update की है, तो नई value use करें।
- Description से department/category का अनुमान लगाएं (जैसे 'पानी' -> Water Supply)।
- सभी required fields मिलने पर autoSubmit = true करें।

केवल JSON format में जवाब दें:
{
  "fields": {
    "department": "Water Supply",
    "category": "No Water Supply",
    "description": "पानी नहीं आ रहा है",
    "Pincode": "457001",
    "State": "Mp",
    "City": "Ratlam",
    "Address_Line": "bank colony"
  },
  "missingFields": [],
  "autoSubmit": true,
  "confidence": 0.9
}

ध्यान दें: Department और Category के लिए, ऊपर दी गई सूचियों में से ही चुनें।`

      : `You are an AUTONOMOUS AI Agent assistant inside a Civic Issue Reporting Web Application.

Your job is to:
- Understand natural or voice-based user queries.
- AUTOMATICALLY collect complaint information through conversation.
- Auto-fill the complaint form fields from BOTH the current message AND conversation history.
- Ask for missing information in a friendly, conversational way.
- AUTOMATICALLY SUBMIT complaints when all required information is collected.
- You CAN and WILL submit complaints directly - you are fully authorized to do so.
- Maintain history and generate reports when asked.

IMPORTANT: You are NOT just a helper - you are an AUTONOMOUS AGENT that can DIRECTLY submit complaints on behalf of users.

-----------------------------------------------------------
### CONTEXT

Available Departments: ${availableDepartments.join(', ')}
Available Categories: ${availableCategories.join(', ')}

PREVIOUSLY COLLECTED FIELDS (ALREADY HAVE):
${JSON.stringify(previousFields, null, 2)}

Previous Conversation:
${conversationHistory.map(h => `User: ${h.user}\nAssistant: ${h.assistant}`).join('\n')}

Latest User Message: "${message}"

CRITICAL: MERGE the previously collected fields with new information from the latest message.
If a field is already filled in previousFields, KEEP IT. Only add new or updated values.
DO NOT ask for information that is already in previousFields!

-----------------------------------------------------------
### INTENT ROUTING RULES

If the user mentions any of the following:
"complaint", "issue", "report", "pothole", "garbage", 
"street light", "water leak", "problem", "kharab", "toot gaya"
→ intent = REPORT_COMPLAINT
→ targetPage = "/report-complaint"

If the user says: "track complaint", "status", "update"
→ intent = TRACK_COMPLAINT

If the user says: "assign issue", "forward", "authority"
→ intent = ASSIGN_ISSUE

If "analytics", "heatmap", "dashboard"
→ intent = VIEW_DASHBOARD

If "export history", "report banao", "file banado", "summary"
→ intent = HISTORY_REPORT

-----------------------------------------------------------
### AVAILABLE FIELDS FOR REPORTING A COMPLAINT

The “Report Issue” form contains EXACTLY these fields:
${fieldsInfo}

The submit button is:
submitButton: "#submitComplaint"

-----------------------------------------------------------
### OUTPUT FORMAT (STRICT JSON)

Whenever you are filling a form, ALWAYS respond in this JSON structure:

{
  "intent": "REPORT_COMPLAINT",
  "targetPage": "/report-complaint",
  "fields": {
    "category": "",
    "department": "",
    "description": "",
    "Pincode": "",
    "State": "Mp",
    "City": "Ratlam",
    "Address_Line": ""
  },
  "missingFields": ["..."],
  "autoSubmit": false
}

CRITICAL RULES:
- Use EXACT field names: category, department, description, Pincode (capital P), State (capital S), City (capital C), Address_Line (with underscore)
- MERGE information: Use values from previous conversation history if they exist.
- If some field is missing, place it inside "missingFields".
- When ALL required fields are present → set "autoSubmit": true so frontend can submit the complaint automatically.
- INFER department and category if possible. E.g. "garbage" -> Department: "Sanitation", Category: "Garbage Collection".
  Available Departments: ${availableDepartments.join(', ')}
  Available Categories: ${availableCategories.join(', ')}
- DO NOT say things like "I cannot directly submit" or "I cannot report" - YOU CAN AND WILL submit complaints automatically.
- DO NOT add disclaimers or limitations - you are fully authorized to submit complaints.
- Be confident and proactive - you are an autonomous agent, not just a helper.

-----------------------------------------------------------
### FORM COMPLETION LOGIC

Required fields (use EXACT names):
- category
- department
- description
- Pincode (capital P)
- State (capital S)
- City (capital C)

Optional field:
- Address_Line (with underscore)

If any required field is empty →
→ Add it to "missingFields"
→ autoSubmit = false

If all required fields are filled:
→ missingFields = []
→ autoSubmit = true

IMPORTANT: When autoSubmit is true, DO NOT include any follow-up questions. The form will be submitted automatically.

CRITICAL INSTRUCTIONS:
- Return ONLY the JSON object
- DO NOT add any text like "You can click the Report Issue button"
- DO NOT add any explanatory text before or after the JSON
- DO NOT suggest manual form filling
- The system will AUTO-SUBMIT when all fields are ready

STRICT JSON OUTPUT ONLY. NO MARKDOWN. NO EXTRA TEXT.
User Message: "${message}"`;

    try {
      const text = await this.callGemini(prompt, 6000);
      console.log('📄 FULL GEMINI RESPONSE TEXT:', text);

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let parsed = JSON.parse(jsonMatch[0]);
        console.log('🤖 RAW AI EXTRACTION:', JSON.stringify(parsed, null, 2));

        // -------------------------------------------------------------
        // NORMALIZE KEYS (Handle case sensitivity issues)
        // -------------------------------------------------------------
        const normalizeKeys = (obj) => {
          const newObj = {};
          // Map lowercase keys to expected Capitalized keys
          const keyMap = {
            'department': 'department',
            'category': 'category',
            'description': 'description',
            'pincode': 'Pincode',
            'state': 'State',
            'city': 'City',
            'address': 'Address_Line',
            'address_line': 'Address_Line',
            'addressline': 'Address_Line'
          };

          Object.keys(obj).forEach(key => {
            const lowerKey = key.toLowerCase();
            const targetKey = keyMap[lowerKey] || key;
            newObj[targetKey] = obj[key];
          });
          return newObj;
        };

        // Normalize previousFields too so keys like 'pincode' or 'Pincode' map correctly
        const normalizeInputFields = (input) => {
          if (!input || typeof input !== 'object') return {};
          const normalized = {};
          const keyMap = {
            'department': 'department',
            'category': 'category',
            'description': 'description',
            'pincode': 'Pincode',
            'state': 'State',
            'city': 'City',
            'address': 'Address_Line',
            'address_line': 'Address_Line',
            'addressline': 'Address_Line'
          };
          Object.keys(input).forEach(k => {
            const lower = k.toLowerCase();
            const target = keyMap[lower] || k;
            normalized[target] = input[k];
          });
          return normalized;
        };

        if (parsed.fields) {
          parsed.fields = normalizeKeys(parsed.fields);
        }

        // -------------------------------------------------------------
        // MERGE WITH PREVIOUS FIELDS (Preserve non-empty values)
        // -------------------------------------------------------------
        const prevNorm = normalizeInputFields(previousFields || {});
        const mergedFields = { ...prevNorm };
        if (parsed.fields) {
          Object.keys(parsed.fields).forEach(key => {
            const val = parsed.fields[key];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              mergedFields[key] = (typeof val === 'string') ? val.trim() : val;
            }
          });
        }
        parsed.fields = mergedFields;
        console.log('✅ Safely merged fields (prev + new):', parsed.fields);

        // Department Normalization (strip "Department", "Dept", etc.)
        if (parsed.fields?.department) {
          parsed.fields.department = this.normalizeDepartmentName(parsed.fields.department, availableDepartments);
        }

        // Automatic Deterministic Enrichment from message if department/category missing
        const detInferred = this.deterministicExtract(message, formMetadata, parsed.fields);
        if (!parsed.fields.department || parsed.fields.department.trim() === '') {
          parsed.fields.department = detInferred.fields.department || 'Electricity';
        }
        if (!parsed.fields.category || parsed.fields.category.trim() === '') {
          parsed.fields.category = detInferred.fields.category || 'General Civic Grievance';
        }
        if (!parsed.fields.description || parsed.fields.description.trim() === '') {
          parsed.fields.description = message;
        }
        if (!parsed.fields.City || parsed.fields.City.trim() === '') {
          parsed.fields.City = prevNorm.City || 'Indore';
        }
        if (!parsed.fields.State || parsed.fields.State.trim() === '') {
          parsed.fields.State = prevNorm.State || 'Madhya Pradesh';
        }
        if (!parsed.fields.Pincode || parsed.fields.Pincode.trim() === '') {
          parsed.fields.Pincode = prevNorm.Pincode || '452018';
        }
        if (!parsed.fields.Address_Line || parsed.fields.Address_Line.trim() === '') {
          parsed.fields.Address_Line = prevNorm.Address_Line || 'Indore Municipal Ward';
        }

        // Fallback: If department is known, ensure valid category
        if (parsed.fields?.department && (!parsed.fields.category || parsed.fields.category.trim() === '')) {
          const deptName = parsed.fields.department;
          const deptObj = (formMetadata.departments || []).find(d => d.Name.toLowerCase() === deptName.toLowerCase());
          if (deptObj) {
            const relatedCats = (formMetadata.categories || []).filter(c => c.department_id === deptObj.department_id);
            if (relatedCats.length > 0) {
              parsed.fields.category = relatedCats[0].Name;
            }
          }
        }

        // Ensure missingFields is accurately calculated
        const requiredFields = ['department', 'category', 'description', 'Pincode', 'State', 'City'];
        parsed.missingFields = [];

        requiredFields.forEach(reqField => {
          const fieldValue = parsed.fields ? parsed.fields[reqField] : undefined;
          const isEmpty = !fieldValue || String(fieldValue).trim() === '';
          if (isEmpty) {
            parsed.missingFields.push(reqField);
          }
        });

        // If user described an issue with sufficient detail (>= 8 chars), auto-resolve all missing fields
        if (parsed.fields.description && parsed.fields.description.length >= 8) {
          if (!parsed.fields.department) parsed.fields.department = 'Electricity';
          if (!parsed.fields.category) parsed.fields.category = 'General Civic Grievance';
          if (!parsed.fields.City) parsed.fields.City = 'Indore';
          if (!parsed.fields.State) parsed.fields.State = 'Madhya Pradesh';
          if (!parsed.fields.Pincode) parsed.fields.Pincode = '452018';
          parsed.missingFields = [];
          parsed.autoSubmit = true;
          console.log('🎉 Autonomous Complaint Resolved! autoSubmit = true');
        } else if (parsed.missingFields.length === 0) {
          console.log('🎉 All fields present! Setting autoSubmit = true');
          parsed.autoSubmit = true;
        } else {
          parsed.autoSubmit = false;
        }

        return parsed;
      }

      console.warn("Gemini output had no JSON, falling back to deterministic extraction");
      return this.deterministicExtract(message, formMetadata, previousFields);
    } catch (error) {
      console.warn("Form extraction error, falling back to deterministic extraction:", error.message);
      return this.deterministicExtract(message, formMetadata, previousFields);
    }
  }

  /**
   * Generate follow-up question for missing fields
   */
  async generateFollowUpQuestion(missingFields, formMetadata, language = 'hi') {
    const fieldsToAsk = missingFields.slice(0, 1);
    const fieldLabels = fieldsToAsk.map(field => {
      const meta = formMetadata.fields ? formMetadata.fields[field] : null;
      return meta ? meta.label : field;
    }).join(', ');

    const prompt = language === 'hi'
      ? `User को ${fieldLabels} के बारे में पूछें। बहुत दोस्ताना और छोटा question पूछें (1 वाक्य)।\nकेवल question return करें, कोई explanation नहीं।`
      : `Ask the user about ${fieldLabels}. Be very friendly and ask a short question (1 sentence).\nReturn only the question, no explanation.`;

    try {
      const text = await this.callGemini(prompt, 4000);
      if (text && text.trim()) return text.trim();
    } catch (error) {
      console.warn("Follow-up question Gemini fallback:", error.message);
    }

    return language === 'hi'
      ? `कृपया अपना ${fieldLabels} बताएं ताकि मैं इसे तुरंत दर्ज कर सकूँ।`
      : `Please provide the ${fieldLabels} so I can register this for you right away.`;
  }

  /**
   * Process user query and return structured response
   */
  async processQuery(message, userId, conversationHistory = [], language = 'hi', previousFields = {}) {
    try {
      // Step 1: Classify intent
      const intentResult = await this.classifyIntent(message, language);
      console.log('🎯 Intent classified:', intentResult);

      // If model returned GENERAL_QUERY but message clearly describes an issue,
      // force it to REPORT_COMPLAINT so the agent acts autonomously.
      const complaintKeywords = /pothole|garbage|water|no water|no electricity|street light|road|leak|damage|पानी|गड्ढा|कचरा|बिजली|रोड|सड़क|टूटी|टूट/gmi;
      if ((intentResult.intent === 'GENERAL_QUERY' || !intentResult.intent) && complaintKeywords.test(message)) {
        intentResult.intent = 'REPORT_COMPLAINT';
        intentResult.confidence = 0.9;
      }

      if (intentResult.intent === 'REPORT_COMPLAINT') {
        const formMetadata = await this.getComplaintFormMetadata();
        // Use the new single-step extraction logic
        const extractionResult = await this.extractFormFields(
          message,
          formMetadata,
          conversationHistory,
          language,
          previousFields
        );

        // Generate appropriate message based on whether all fields are ready
        let acknowledgmentMsg = '';
        let followUpQuestion = null;

        if (extractionResult.missingFields?.length > 0) {
          // Still missing fields - show acknowledgment and ask for missing info
          if (extractionResult.fields && Object.keys(extractionResult.fields).length > 0) {
            if (language === 'hi') {
              acknowledgmentMsg = '👍 समझ गया! मैं आपकी शिकायत दर्ज करने की प्रक्रिया शुरू कर रहा हूँ...';
            } else {
              acknowledgmentMsg = '👍 Got it! I\'m processing your complaint submission...';
            }
          }
          followUpQuestion = await this.generateFollowUpQuestion(extractionResult.missingFields, formMetadata, language);
        } else {
          // All fields ready - show ready to submit message
          if (language === 'hi') {
            acknowledgmentMsg = '✅ बढ़िया! मेरे पास सभी जानकारी है। मैं अभी आपकी शिकायत दर्ज कर रहा हूँ...';
          } else {
            acknowledgmentMsg = '✅ Perfect! I have all the information. Submitting your complaint now...';
          }
          followUpQuestion = null; // No follow-up question needed
        }

        // If agent determined all fields are present and autoSubmit=true, perform autonomous submission here.
        if (extractionResult.autoSubmit) {
          try {
            const fields = extractionResult.fields || {};

            // Validate required fields again
            const required = ['category','department','description','Pincode','State','City'];
            for (const r of required) {
              if (!fields[r] || fields[r].toString().trim() === '') {
                throw new Error('Missing required field: ' + r);
              }
            }

            // Robust Department lookup
            const cleanDept = (fields.department || 'Sanitation').replace(/\b(department|dept|office|board|nigam|nagar|municipal|shakha|vibhaag|vibhag|विभाग)\b/gi, '').trim();
            let [deptRows] = await db.promise().query(
              'SELECT department_id, Name FROM Department WHERE Name = ? OR Name LIKE ? OR Name LIKE ? LIMIT 1',
              [cleanDept, `%${cleanDept}%`, `%${fields.department || ''}%`]
            );
            const departmentId = (deptRows && deptRows.length > 0) ? deptRows[0].department_id : 2;
            const deptName = (deptRows && deptRows.length > 0) ? deptRows[0].Name : 'Electricity';

            // Robust Category lookup
            const cleanCat = (fields.category || deptName).trim();
            let [catRows] = await db.promise().query(
              'SELECT category_id, Name FROM category WHERE (Name = ? OR Name LIKE ?) AND (department_id = ? OR department_id IS NULL) LIMIT 1',
              [cleanCat, `%${cleanCat}%`, departmentId]
            );
            const categoryId = (catRows && catRows.length > 0) ? catRows[0].category_id : 6;
            const catName = (catRows && catRows.length > 0) ? catRows[0].Name : 'Street Light Not Working';

            // Calculate Priority Score P(i) and SLA (Research Paper Core)
            let priorityScore = 4.2;
            let slaHours = 24;
            try {
              const { calculatePriorityScore, CATEGORY_SLA_HOURS } = require('./researchPaperCore');
              const priorityObj = calculatePriorityScore({
                category_id: categoryId,
                severity: 'Medium',
                confirmations_count: 0,
                duplicates_count: 0,
                created_at: new Date(),
                is_sensitive_zone: 0
              });
              priorityScore = priorityObj.score;
              slaHours = (CATEGORY_SLA_HOURS && CATEGORY_SLA_HOURS[categoryId]) || 24;
            } catch (pErr) {
              console.warn('Priority calculation fallback:', pErr.message);
            }
            const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

            // Reverse geocode if lat/lng provided
            let detectedCity = null, detectedState = null, detectedAddress = null;
            const latitude = fields.latitude || fields.lat || null;
            const longitude = fields.longitude || fields.lng || null;
            if (latitude && longitude) {
              try {
                const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
                const geoRes = await fetch(url, { headers: { 'User-Agent': 'MinorProjectApps/1.0' } });
                if (geoRes.ok) {
                  const geoData = await geoRes.json();
                  detectedAddress = geoData.display_name;
                  if (geoData.address) {
                    detectedCity = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.hamlet;
                    detectedState = geoData.address.state;
                  }
                }
              } catch (e) {
                console.warn('Reverse geocode failed', e.message || e);
              }
            }

            // Check which columns exist in Complaint table
            const [cols] = await db.promise().query(
              "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Complaint'"
            );
            const colNames = new Set((cols || []).map(c => c.COLUMN_NAME));

            const insertData = {
              user_id: userId || null,
              category_id: categoryId,
              department_id: departmentId,
              description: fields.description || 'Civic issue reported via AI Copilot',
              status: 'in-progress',
              Pincode: fields.Pincode || '452018',
              State: fields.State || 'Madhya Pradesh',
              City: fields.City || 'Indore',
              Address_Line: fields.Address_Line || 'Indore Ward Location',
              latitude: latitude || null,
              longitude: longitude || null,
              detected_city: detectedCity,
              detected_state: detectedState,
              detected_address: detectedAddress
            };

            const resolutionOtp = Math.floor(100000 + Math.random() * 900000).toString();
            if (colNames.has('priority_score')) insertData.priority_score = priorityScore;
            if (colNames.has('severity')) insertData.severity = 'Medium';
            if (colNames.has('sla_due_at')) insertData.sla_due_at = slaDueAt;
            if (colNames.has('ward_no')) insertData.ward_no = 14;
            if (colNames.has('hasFace')) insertData.hasFace = 0;
            if (colNames.has('resolution_otp')) insertData.resolution_otp = resolutionOtp;

            const insertCols = Object.keys(insertData);
            const insertVals = Object.values(insertData);
            const insertQuery = `INSERT INTO Complaint (${insertCols.join(',')}) VALUES (${insertCols.map(() => '?').join(',')})`;
            const [result] = await db.promise().query(insertQuery, insertVals);
            const newComplaintId = result.insertId;

            console.log(`✅ Complaint #${newComplaintId} created with status 'in-progress', Priority ${priorityScore}, and OTP ${resolutionOtp}.`);

            // Dynamic Assignment to Department Official and Field Worker
            let assignedOfficialId = 1;
            let assignedWorkerId = 1;
            let workerName = 'Assigned Field Specialist';

            try {
              const [officialRows] = await db.promise().query(
                'SELECT official_id FROM Official WHERE department_id = ? LIMIT 1',
                [departmentId]
              );
              if (officialRows && officialRows.length > 0) {
                assignedOfficialId = officialRows[0].official_id;
              }

              const [workerRows] = await db.promise().query(
                `SELECT w.worker_id, w.First_name, w.Last_name, COUNT(a.assignment_id) as active_tasks
                 FROM Worker w
                 LEFT JOIN assignment a ON w.worker_id = a.worker_id AND a.status IN ('in-progress', 'assigned')
                 WHERE w.department_id = ?
                 GROUP BY w.worker_id
                 ORDER BY active_tasks ASC, w.worker_id ASC
                 LIMIT 1`,
                [departmentId]
              );
              if (workerRows && workerRows.length > 0) {
                assignedWorkerId = workerRows[0].worker_id;
                workerName = `${workerRows[0].First_name} ${workerRows[0].Last_name || ''}`.trim();
              }

              await db.promise().query(
                'INSERT INTO assignment (complaint_id, official_id, worker_id, status) VALUES (?, ?, ?, "in-progress")',
                [newComplaintId, assignedOfficialId, assignedWorkerId]
              );

              console.log(`✅ Assigned Complaint #${newComplaintId} to Official #${assignedOfficialId} & Worker #${assignedWorkerId} (${workerName})`);
            } catch (assignErr) {
              console.warn('Notice assigning complaint:', assignErr.message);
            }

            // Return autonomous registration response
            return {
              intent: "REPORT_COMPLAINT",
              action: "autoSubmitted",
              complaintId: newComplaintId,
              department: deptName,
              category: catName,
              workerName: workerName,
              priorityScore: priorityScore,
              slaHours: slaHours,
              resolutionOtp: resolutionOtp,
              message: language === 'hi'
                ? `✅ आपकी शिकायत #${newComplaintId} सफलतापूर्वक दर्ज कर ली गई है! विभाग: ${deptName}। फील्ड विशेषज्ञ: ${workerName}। आपका सत्यापन OTP है: ${resolutionOtp} (काम पूरा होने पर कार्यकर्ता को दें)।`
                : `✅ Complaint #${newComplaintId} registered successfully! Assigned to ${deptName} Department and Field Specialist (${workerName}). Your verification OTP is: ${resolutionOtp} (provide this on-site once work is completed).`,
              autoSubmitted: true
            };
          } catch (submitErr) {
            console.error('Autonomous submission error:', submitErr);
            // Fall back to returning fields and follow-up if submission failed
            return {
              intent: "REPORT_COMPLAINT",
              targetPage: "/report-complaint",
              action: "fillComplaintForm",
              fields: extractionResult.fields || {},
              missingFields: extractionResult.missingFields || [],
              autoSubmit: false,
              message: language === 'hi' ? 'माफ कीजिए, स्वचालित दायर करने में समस्या हुई। कृपया मैन्युअल रूप से जमा करें।' : 'Sorry, I could not auto-submit your complaint. Please submit manually.',
              followUpQuestion: followUpQuestion
            };
          }
        }

        return {
          intent: "REPORT_COMPLAINT",
          targetPage: "/report-complaint",
          action: "fillComplaintForm",
          fields: extractionResult.fields || {},
          missingFields: extractionResult.missingFields || [],
          autoSubmit: extractionResult.autoSubmit || false,
          message: acknowledgmentMsg,
          followUpQuestion: followUpQuestion
        };
      }

      // ... handle other intents as before
      if (intentResult.intent === 'ASSIGN_ISSUE') {
        return {
          intent: "ASSIGN_ISSUE",
          targetPage: "/admin/assign",
          action: "openAssignment",
          message: language === 'hi' ? "अधिकारी असाइनमेंट पेज खोल रहा हूँ..." : "Opening issue assignment page..."
        };
      }

      if (intentResult.intent === 'VIEW_DASHBOARD') {
        return {
          intent: "VIEW_DASHBOARD",
          targetPage: "/admin/dashboard",
          action: "openDashboard",
          message: language === 'hi' ? "डैशबोर्ड एनालिटिक्स खोल रहा हूँ..." : "Opening dashboard analytics..."
        };
      }

      if (intentResult.intent === 'TRACK_COMPLAINT') {
        return {
          intent: "TRACK_COMPLAINT",
          targetPage: "/track-status",
          action: "openTrackComplaint",
          message: language === 'hi' ? "आपकी complaints की जानकारी दिखा रहा हूँ..." : "Showing your complaint information..."
        };
      }

      if (intentResult.intent === 'HISTORY_REPORT') {
        return {
          intent: "HISTORY_REPORT",
          targetPage: "/generate-report",
          action: "generateReport",
          message: language === 'hi' ? "बीते शिकायतों की रिपोर्ट तैयार कर रहा हूँ..." : "Generating history report..."
        };
      }

      // Handle GENERAL_QUERY - use Gemini for conversational response
      if (intentResult.intent === 'GENERAL_QUERY') {
        // Portal redirect detection (before generic general query response)
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('worker') || lowerMsg.includes('field staff') || lowerMsg.includes('मजदूर') || lowerMsg.includes('वर्कर')) {
          return { intent: 'REDIRECT_WORKER_PORTAL', targetPage: '/worker/login', action: 'redirect', message: language === 'hi' ? 'वर्कर पोर्टल पर जा रहे हैं...' : 'Redirecting to Worker Portal...' };
        }
        if (lowerMsg.includes('official') || lowerMsg.includes('officer') || lowerMsg.includes('अधिकारी')) {
          return { intent: 'REDIRECT_OFFICIAL_PORTAL', targetPage: '/official/login', action: 'redirect', message: language === 'hi' ? 'अधिकारी पोर्टल पर जा रहे हैं...' : 'Redirecting to Official Portal...' };
        }
        if (lowerMsg.includes('admin') || lowerMsg.includes('प्रशासक') || lowerMsg.includes('administrator')) {
          return { intent: 'REDIRECT_ADMIN_PORTAL', targetPage: '/admin/login', action: 'redirect', message: language === 'hi' ? 'एडमिन पोर्टल पर जा रहे हैं...' : 'Redirecting to Admin Portal...' };
        }
        if (lowerMsg.includes('citizen') || lowerMsg.includes('नागरिक') || lowerMsg.includes('user portal') || lowerMsg.includes('शिकायत पोर्टल')) {
          return { intent: 'REDIRECT_CITIZEN_PORTAL', targetPage: '/user/login', action: 'redirect', message: language === 'hi' ? 'नागरिक पोर्टल पर जा रहे हैं...' : 'Redirecting to Citizen Portal...' };
        }

        const systemPromptWithKnowledge = IMC_LOCAL_KNOWLEDGE + '\n' + (language === 'hi'
          ? 'आप IMC (Indore Municipal Corporation) के एक सहायक हैं। ऊपर दी गई जानकारी का उपयोग करके उपयोगकर्ता के प्रश्न का उत्तर दें।'
          : 'You are an assistant for IMC (Indore Municipal Corporation). Use the knowledge base above to answer the user query.');

        try {
          const model = await this.getModel();
          const result = await model.generateContent(`${systemPromptWithKnowledge}\n\nUser: ${message}`);
          const text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text
            || result?.candidates?.[0]?.content?.parts?.[0]?.text
            || '';
          if (text && text.trim()) {
            return { intent: 'GENERAL_QUERY', message: text.trim() };
          }
        } catch (genErr) {
          console.error('GENERAL_QUERY Gemini call failed:', genErr.message);
        }

        return {
          intent: "GENERAL_QUERY",
          message: language === 'hi'
            ? "मैं आपकी शिकायत दर्ज करने में मदद कर सकता हूँ। कृपया अपनी समस्या बताएं।"
            : "I can help you file a complaint. Please describe your issue."
        };
      }

      // Fallback - assume they want to report a complaint
      return {
        intent: "REPORT_COMPLAINT",
        targetPage: "/report-complaint",
        action: "fillComplaintForm",
        fields: {},
        missingFields: ['description', 'category', 'department', 'City', 'Pincode', 'State'],
        autoSubmit: false,
        message: language === 'hi'
          ? "मैं आपकी शिकायत दर्ज करने में मदद करूँगा। कृपया अपनी समस्या विस्तार से बताएं।"
          : "I'll help you file a complaint. Please describe your issue in detail.",
        followUpQuestion: language === 'hi'
          ? "आपकी क्या समस्या है? कृपया विस्तार से बताएं।"
          : "What issue would you like to report? Please provide details."
      };
    } catch (error) {
      console.error("AI Agent processing error:", error);
      return null;
    }
  }
}

module.exports = new AIAgent();
