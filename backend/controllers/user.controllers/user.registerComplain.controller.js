const { uploadOnCloudinary } = require('../../utils/cloudinary');
const db = require('../../database/dbConnect');
const { calculatePriorityScore, CATEGORY_SLA_HOURS } = require('../../utils/researchPaperCore');

const registerUserComplain = async (req, res) => {
  try {
    console.log('req.file:', req.file);
    console.log('req.body:', req.body);

    const userId = req.user && req.user.user_id;
    const {
      Pincode: rawPincode,
      State: rawState,
      description: rawDescription,
      City: rawCity,
      Address_Line: rawAddress,
      // accept either `category` or `category_id` and `department` or `department_id`
      category: rawCategory,
      department: rawDepartment,
      category_id: rawCategoryId,
      department_id: rawDepartmentId,
      latitude,
      longitude
    } = req.body || {};

    const rawHasFace = req.body && (req.body.hasFace || req.body.has_face || req.body.face);

    // trim inputs to avoid whitespace-only values
    const trim = v => (typeof v === 'string' ? v.trim() : v);
    const Pincode = trim(rawPincode);
    const State = trim(rawState);
    const description = trim(rawDescription);
    const City = trim(rawCity);
    const Address_Line = trim(rawAddress);

    // prefer explicit names, fallback to *_id fields (your client sends category_id/department_id as names)
    const category = trim(rawCategory || rawCategoryId);
    const department = trim(rawDepartment || rawDepartmentId);

    // --- Reverse Geocoding Logic ---
    let detectedCity = null;
    let detectedState = null;
    let detectedAddress = null;

    if (latitude && longitude) {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
        console.log("Fetching location from:", url);
        // Using native fetch
        const geoRes = await fetch(url, {
          headers: {
            'User-Agent': 'MinorProjectApps/1.0' // important for Nominatim
          }
        });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          console.log("Nominatim Data:", geoData);
          detectedAddress = geoData.display_name;
          if (geoData.address) {
            detectedCity = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.hamlet;
            detectedState = geoData.address.state;
          }
        } else {
          console.error("Nominatim API error:", geoRes.statusText);
        }
      } catch (geoErr) {
        console.error("Error fetching reverse geocode:", geoErr);
      }
    }


    // Validation
    if (!Pincode || !State || !description || !City || !category || !department) {
      console.log("❌ Validation failed - Missing required fields", { Pincode, State, description, City, category, department });
      return res.status(400).json({ error: 'Pincode, State, City, description, category, and department are required.' });
    }

    console.log("✅ Validation passed");

    // Step 1: Get department_id with intelligent fallback
    console.log("Step 1: Fetching department_id for:", department);
    const cleanDept = (department || '').replace(/\b(department|dept|office|board|nigam|nagar|municipal|shakha|vibhaag|vibhag|विभाग)\b/gi, '').trim();
    const departmentQuery = `
      SELECT department_id, Name FROM Department 
      WHERE Name = ? OR Name LIKE ? OR LOWER(Name) = LOWER(?) OR LOWER(Name) LIKE LOWER(?)
      LIMIT 1
    `;
    let departmentId = 1;
    try {
      const [deptResult] = await db.promise().query(departmentQuery, [department, `%${department}%`, cleanDept, `%${cleanDept}%`]);
      if (deptResult && deptResult.length > 0) {
        departmentId = deptResult[0].department_id;
      } else {
        // Semantic keyword inferencing
        const fullText = `${department} ${category} ${description}`.toLowerCase();
        if (/elect|bijli|light|power|current|transformer|wire|खंभा|बिजली/i.test(fullText)) departmentId = 2;
        else if (/road|sadak|pothole|manhole|asphalt|footpath|सड़क|गड्ढा/i.test(fullText)) departmentId = 3;
        else if (/sanitat|garbag|kachra|drain|sew|gutter|waste|कचरा|सीवर|नाली/i.test(fullText)) departmentId = 4;
        else if (/health|swasthya|hospital|mosquito|डेंगू|स्वास्थ्य/i.test(fullText)) departmentId = 5;
        else departmentId = 1;
      }
    } catch (dErr) {
      console.warn('Notice resolving department:', dErr.message);
      departmentId = 1;
    }
    console.log("✅ Department ID determined:", departmentId);

    // Step 2: Get category_id from category name and department_id
    console.log("Step 2: Fetching category_id for:", category, "in department:", departmentId);
    const categoryQuery = 'SELECT category_id FROM category WHERE (Name = ? OR Name LIKE ?) AND (department_id = ? OR department_id IS NULL) LIMIT 1';
    let categoryId = 1;
    try {
      const [catResult] = await db.promise().query(categoryQuery, [category, `%${category}%`, departmentId]);
      if (catResult && catResult.length > 0) {
        categoryId = catResult[0].category_id;
      } else {
        const [anyCat] = await db.promise().query('SELECT category_id FROM category WHERE department_id = ? LIMIT 1', [departmentId]);
        categoryId = (anyCat && anyCat.length > 0) ? anyCat[0].category_id : departmentId;
      }
    } catch (cErr) {
      console.warn('Notice resolving category:', cErr.message);
      categoryId = departmentId;
    }
    console.log("✅ Category ID determined:", categoryId);

    try {
      let imageUrl = null;
      console.log("*************");
      console.log("File status : ", req.file);
      console.log("*************");
      if (req.file) {
        const result = await uploadOnCloudinary(req.file);
        console.log('url : ', result.url);
        imageUrl = result.secure_url || result.url || null;
      }

      // Normalize hasFace flag
      const hasFaceFlag = (rawHasFace === 'true' || rawHasFace === '1' || rawHasFace === 1 || rawHasFace === true) ? 1 : 0;

      // Check if the Complaint table has a 'hasFace' column (so we insert only when present)
      let includeHasFace = false;
      try {
        const [colRows] = await db.promise().query(
          "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Complaint' AND COLUMN_NAME = 'hasFace'"
        );
        includeHasFace = Array.isArray(colRows) && colRows.length > 0;
      } catch (colErr) {
        console.warn('Could not verify hasFace column existence:', colErr.message || colErr);
        includeHasFace = false;
      }

      // Research paper attributes (Section V-D, V-E)
      const severity = req.body.severity || 'Medium';
      const is_sensitive_zone = (req.body.is_sensitive_zone === '1' || req.body.is_sensitive_zone === 1 || req.body.is_sensitive_zone === true) ? 1 : 0;
      const parent_complaint_id = req.body.parent_complaint_id ? parseInt(req.body.parent_complaint_id) : null;
      const ward_no = req.body.ward_no ? parseInt(req.body.ward_no) : 14;

      const priorityObj = calculatePriorityScore({
        category_id: categoryId,
        severity,
        confirmations_count: 0,
        duplicates_count: 0,
        created_at: new Date(),
        is_sensitive_zone
      });

      const slaHours = CATEGORY_SLA_HOURS[categoryId] || 24;
      const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

      // Research Paper Section V-E: Secure 6-digit Resident Resolution OTP
      const resolutionOtp = Math.floor(100000 + Math.random() * 900000).toString();

      // Build insert dynamically so missing DB columns don't break insertion
      const insertCols = [
        'user_id', 'category_id', 'department_id', 'description', 'status', 'imageUrl',
        'Pincode', 'State', 'City', 'Address_Line', 'latitude', 'longitude',
        'detected_city', 'detected_state', 'detected_address',
        'priority_score', 'severity', 'sla_due_at', 'ward_no', 'is_sensitive_zone', 'parent_complaint_id',
        'resolution_otp'
      ];
      const insertPlaceholders = insertCols.map(() => '?');
      const insertValues = [
        userId, categoryId, departmentId, description, 'reported', imageUrl,
        Pincode, State, City, Address_Line, latitude || null, longitude || null,
        detectedCity, detectedState, detectedAddress,
        priorityObj.score, severity, slaDueAt, ward_no, is_sensitive_zone, parent_complaint_id,
        resolutionOtp
      ];

      if (includeHasFace) {
        insertCols.push('hasFace');
        insertPlaceholders.push('?');
        insertValues.push(hasFaceFlag);
      }

      const insertQuery = `INSERT INTO Complaint (${insertCols.join(',')}) VALUES (${insertPlaceholders.join(',')})`;

      const [result] = await db.promise().query(insertQuery, insertValues);
      const newComplaintId = result.insertId;

      // If linked to a parent duplicate issue, increment duplicates count on parent (Section V-B)
      if (parent_complaint_id) {
        try {
          await db.promise().query(
            'UPDATE Complaint SET duplicates_count = duplicates_count + 1 WHERE complaint_id = ?',
            [parent_complaint_id]
          );
        } catch (pErr) {
          console.warn('Notice updating parent duplicate count:', pErr.message);
        }
      }

      // Auto-assign designated department official and field worker based on department & load
      try {
        const [officialRows] = await db.promise().query(
          'SELECT official_id FROM Official WHERE department_id = ? LIMIT 1',
          [departmentId]
        );
        const assignedOfficialId = (officialRows && officialRows.length > 0) ? officialRows[0].official_id : 1;

        const [workerRows] = await db.promise().query(`
              SELECT w.worker_id, w.First_name, w.Last_name,
                     COUNT(CASE WHEN a.status = 'in-progress' THEN 1 END) as active_load
              FROM Worker w
              LEFT JOIN assignment a ON w.worker_id = a.worker_id
              WHERE w.department_id = ?
              GROUP BY w.worker_id, w.First_name, w.Last_name
              ORDER BY active_load ASC, w.worker_id ASC
              LIMIT 1
            `, [departmentId]);

        const assignedWorkerId = (workerRows && workerRows.length > 0)
          ? workerRows[0].worker_id
          : (departmentId >= 1 && departmentId <= 5 ? departmentId : 1);

        await db.promise().query(
          'INSERT INTO assignment (complaint_id, official_id, worker_id, status, assigned_date) VALUES (?, ?, ?, "in-progress", CURRENT_TIMESTAMP)',
          [newComplaintId, assignedOfficialId, assignedWorkerId]
        );
        await db.promise().query(
          'UPDATE Complaint SET status = "in-progress" WHERE complaint_id = ?',
          [newComplaintId]
        );
        console.log(`✅ Complaint #${newComplaintId} routed: Dept ${departmentId} -> Official #${assignedOfficialId} -> Worker #${assignedWorkerId}`);
      } catch (assignErr) {
        console.warn('Auto-assignment notice:', assignErr.message);
      }

      // Check if this was a traditional browser form submit or AJAX
      const isAjax = req.xhr ||
        req.headers['x-requested-with'] === 'XMLHttpRequest' ||
        (req.headers.accept && req.headers.accept.includes('application/json')) ||
        req.is('json');

      if (!isAjax) {
        return res.redirect('/user/profile?complaintSuccess=1&complaintId=' + newComplaintId);
      }

      return res.status(201).json({
        success: true,
        message: 'Complaint registered and assigned to field team',
        complaintId: newComplaintId,
        redirect: '/user/profile?complaintSuccess=1&complaintId=' + newComplaintId,
        priority_score: priorityObj.score,
        severity,
        geotagged: !!(latitude && longitude),
        hasFace: includeHasFace ? !!hasFaceFlag : null
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Upload or registration failed' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { registerUserComplain };