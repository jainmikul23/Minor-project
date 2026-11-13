// Configuration
const SERVER_URL = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'http://localhost:3000';

// Language / Translations
let currentLang = localStorage.getItem('lang') || 'en';

const TRANSLATIONS = {
    hi: {
        logo: 'नागरिक पोर्टल',
        quick_actions: 'त्वरित क्रियाएँ',
        report_issue: 'समस्या की रिपोर्ट करें',
        track_complaint: 'शिकायत ट्रैक करें',
        pay_bill: 'बिल भुगतान',
        request_certificate: 'प्रमाण पत्र का अनुरोध',
        book_appointment: 'नियुक्ति बुक करें',
        voice_assistant: 'वॉइस सहायक',
        click_to_speak: 'बोलने के लिए क्लिक करें',
        my_area_problems: 'मेरे क्षेत्र की समस्याएँ',
        bills_dues: 'बिल और बकाया',
        my_recent_complaints: 'मेरी हाल की शिकायतें',
        all_my_complaints: 'मेरी सभी शिकायतें',
        view_all: 'सभी देखें',
        select_category: 'श्रेणी चुनें',
        select_department: 'विभाग चुनें',
        description: 'विवरण',
        take_photo: 'फोटो लें (वैकल्पिक)',
        submit: 'सबमिट करें',
        no_complaints_yet: ' अभी तक कोई शिकायत नहीं। पहली शिकायत दर्ज करने के लिए "समस्या की रिपोर्ट करें" पर क्लिक करें।',
        loading_complaints: 'शिकायतें लोड हो रही हैं...',
        fetch_problems: 'समस्याएं प्राप्त करें',
        loading_problems: 'समस्याएं लोड हो रही हैं...',
        no_problems_found: 'आपके क्षेत्र में कोई समस्या नहीं मिली',
        notifications: 'सूचनाएं',
        loading_notifications: 'सूचनाएं लोड हो रही हैं...',
        no_notifications: 'अभी तक कोई सूचना नहीं',
        error_loading_notifications: 'सूचनाएं लोड करने में त्रुटि',
        voice_listening: 'सुन रहा है...',
        voice_processing: 'प्रतिक्रिया प्राप्त कर रहे हैं...',
        voice_error: 'वॉइस पहचान त्रुटि',
        voice_not_supported: 'आपका ब्राउज़र वॉइस पहचान का समर्थन नहीं करता है',
        generating_response: 'जवाब तैयार हो रहा है...',
        you: 'आप',
        assistant: 'सहायक',
        voice_enabled: 'आवाज़ सक्षम',
        voice_disabled: 'आवाज़ अक्षम',
        complaint_submitted: 'शिकायत सफलतापूर्वक दर्ज की गई',
        complaint_id: 'शिकायत आईडी',
        submission_failed: 'शिकायत दर्ज करने में विफल',
        invalid_image: 'कैप्चर की गई छवि अमान्य या असमर्थित प्रारूप है',
        required_fields: 'कृपया सभी आवश्यक फ़ील्ड भरें'
    }
};

function translatePage(lang) {
    if (!lang || lang === 'en') return; // nothing to do for English baseline
    const t = TRANSLATIONS[lang];
    if (!t) return;

    // Simple selector-based translations
    const selSet = [
        { sel: '.logo span', key: 'logo' },
        { sel: '.quick-actions h3', key: 'quick_actions' },
        { sel: '.action-btn:nth-child(1) span', key: 'report_issue' },
        { sel: '.action-btn:nth-child(2) span', key: 'track_complaint' },
        { sel: '.action-btn:nth-child(3) span', key: 'pay_bill' },
        { sel: '.action-btn:nth-child(4) span', key: 'request_certificate' },
        { sel: '.action-btn:nth-child(5) span', key: 'book_appointment' },
        { sel: '.voice-assistant h4', key: 'voice_assistant' },
        { sel: '#voiceStatus', key: 'click_to_speak' },
        { sel: '.alert-card .card-header h3', key: 'my_area_problems' },
        { sel: '.bills-card .card-header h3', key: 'bills_dues' },
        { sel: '.requests-card .card-header h3', key: 'my_recent_complaints' },
        { sel: 'section.my-complaints-section h2', key: 'all_my_complaints' },
        { sel: '#report-issue-modal h3', key: 'report_issue' },
        { sel: '#report-issue-form label[for="issue-category"]', key: 'select_category' },
        { sel: '#report-issue-form label[for="issue-department"]', key: 'select_department' },
        { sel: '#report-issue-form label[for="issue-description"]', key: 'description' },
        { sel: '#report-issue-modal button[type="submit"]', key: 'submit' },
        { sel: '.fetch-problems-btn span', key: 'fetch_problems' },
        { sel: '#notificationsPanel .panel-header h3', key: 'notifications' }
    ];

    selSet.forEach(entry => {
        const el = document.querySelector(entry.sel);
        if (el && t[entry.key]) {
            // For buttons/spans, set textContent
            el.textContent = t[entry.key];
        }
    });

    // Replace some inline placeholder texts
    const allComplaintsContainer = document.getElementById('all-complaints-container');
    if (allComplaintsContainer && TRANSLATIONS[lang].no_complaints_yet) {
        // If currently the container has the default English paragraph, replace it
        const p = allComplaintsContainer.querySelector('p');
        if (p && p.textContent.includes('No complaints yet')) {
            p.textContent = TRANSLATIONS[lang].no_complaints_yet;
        }
    }
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    // Apply translations
    if (lang === 'en') {
        // page is originally English; reload to get dynamic text back or re-run data functions
        // Instead of full reload, we will re-run load/display functions and then skip translation
        // but first reset some static elements to English by reloading page texts where feasible
        window.location.reload();
        return;
    }
    translatePage(lang);
    // Also update dynamic selects
    const cat = document.getElementById('issue-category');
    if (cat) cat.querySelector('option') && (cat.querySelector('option').textContent = TRANSLATIONS[lang].select_category);
    const dept = document.getElementById('issue-department');
    if (dept) dept.querySelector('option') && (dept.querySelector('option').textContent = TRANSLATIONS[lang].select_department);
}

// Load departments and categories on page load
document.addEventListener('DOMContentLoaded', function () {
    // set language selector
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
        langSelect.value = currentLang;
        langSelect.addEventListener('change', (e) => setLanguage(e.target.value));
    }

    loadDepartments();
    loadCategories();
    loadUserComplaints();
    loadInitialNotificationCount();

    const reportForm = document.getElementById('report-issue-form');
    if (reportForm) {
        reportForm.addEventListener('submit', submitComplaint);
    }

    // Apply translation if non-english
    if (currentLang && currentLang !== 'en') {
        setTimeout(() => translatePage(currentLang), 300);
    }
});

// Load departments
async function loadDepartments() {
    try {
        const response = await fetch(`${SERVER_URL}/api/departments`);
        const data = await response.json();

        const departmentSelect = document.getElementById('issue-department');
        departmentSelect.innerHTML = `<option value="">${currentLang === 'hi' ? 'विभाग चुनें' : 'Select Department'}</option>`;

        data.departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.Name; // Use Name instead of ID
            option.textContent = dept.Name;
            departmentSelect.appendChild(option);
        });
        console.log('✅ Departments loaded:', data.departments.length);
    } catch (error) {
        console.error('❌ Error loading departments:', error);
    }
}

// Load categories
async function loadCategories() {
    try {
        const response = await fetch(`${SERVER_URL}/api/categories`);

        const data = await response.json();

        const categorySelect = document.getElementById('issue-category');
        categorySelect.innerHTML = `<option value="">${currentLang === 'hi' ? 'श्रेणी चुनें' : 'Select Category'}</option>`;

        data.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.Name; // Use Name instead of ID
            option.textContent = cat.Name;
            categorySelect.appendChild(option);
        });
        console.log('✅ Categories loaded:', data.categories.length);
    } catch (error) {
        console.error('❌ Error loading categories:', error);
    }
}

// Load user complaints

async function loadUserComplaints() {
    try {
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        let complaints = null;
        try {
            const response = await fetch('/user/trackComplain', {
                headers,
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                complaints = data.complaints || [];
            }
        } catch (e) {
            console.warn('Primary fetch to /user/trackComplain failed, trying fallback...', e);
        }

        // Fallback to /complaints/my-complaints if needed
        if (!complaints) {
            try {
                const fallback = await fetch('/complaints/my-complaints', {
                    headers,
                    credentials: 'include'
                });
                if (fallback.ok) {
                    const data = await fallback.json();
                    complaints = data.complaints || [];
                }
            } catch (e) {
                console.warn('Fallback fetch also failed:', e);
            }
        }

        if (complaints) {
            console.log('✅ Complaints loaded:', complaints.length);
            window.allCitizenComplaints = complaints;
            displayComplaints(complaints);
            displayAllComplaintsInDashboard(complaints);
            updateQuickStats(complaints);
        }
    } catch (error) {
        console.error('❌ Error loading complaints:', error);
    }
}

// Update Quick Stats card
function updateQuickStats(complaints) {
    const totalElement = document.getElementById('total-complaints');
    const pendingElement = document.getElementById('pending-complaints');
    const inprogressElement = document.getElementById('inprogress-complaints');
    const resolvedElement = document.getElementById('resolved-complaints');

    if (!totalElement) return;

    const total = complaints.length;
    const pending = complaints.filter(c => c.status === 'reported' || c.status === 'pending').length;
    const inprogress = complaints.filter(c => c.status === 'in-progress').length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;

    totalElement.textContent = total;
    pendingElement.textContent = pending;
    inprogressElement.textContent = inprogress;
    resolvedElement.textContent = resolved;
}

// Display all complaints in the dashboard section
function displayAllComplaintsInDashboard(complaints) {
    const container = document.getElementById('all-complaints-container');
    if (!container) return;

    container.innerHTML = '';

    if (complaints.length === 0) {
        container.innerHTML = '<p style="color: #64748b; grid-column: 1/-1; text-align: center; padding: 2rem;">No complaints yet. Click "Report Issue" to submit your first complaint.</p>';
        return;
    }

    complaints.forEach(complaint => {
        const rawStatus = (complaint.status || 'pending').toLowerCase();
        const statusClass = rawStatus === 'resolved' ? 'resolved' :
            (rawStatus === 'in-progress' || rawStatus === 'inprogress') ? 'in-progress' : 'pending';
        const statusText = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).replace('-', ' ');

        // Multi-factor Priority P(i) calculation & styling
        const pScore = (complaint.priority_score !== undefined && complaint.priority_score !== null)
            ? Number(complaint.priority_score).toFixed(0) : '50';
        const sev = complaint.severity || 'Medium';
        let pColor = '#10b981';
        let pBg = 'rgba(16, 185, 129, 0.12)';
        let pBorder = 'rgba(16, 185, 129, 0.3)';
        if (pScore >= 75) {
            pColor = '#ef4444';
            pBg = 'rgba(239, 68, 68, 0.12)';
            pBorder = 'rgba(239, 68, 68, 0.3)';
        } else if (pScore >= 45) {
            pColor = '#f59e0b';
            pBg = 'rgba(245, 158, 11, 0.12)';
            pBorder = 'rgba(245, 158, 11, 0.3)';
        }

        const slaDue = complaint.sla_due_at ? new Date(complaint.sla_due_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Standard 24h SLA';

        // Worker assignment info
        const hasWorker = complaint.worker_id && complaint.worker_first_name;
        const workerName = hasWorker ? `${complaint.worker_first_name} ${complaint.worker_last_name}` : null;
        const workerPhone = hasWorker ? complaint.worker_phone : null;

        // Stepper state calculations
        let stageClass = 'stage-reported';
        let node1 = 'completed';
        let node2 = '';
        let node3 = '';
        let node4 = '';

        if (rawStatus === 'resolved') {
            stageClass = 'stage-resolved';
            node2 = 'completed';
            node3 = 'completed';
            node4 = 'completed';
        } else if (rawStatus === 'in-progress' || rawStatus === 'inprogress') {
            stageClass = 'stage-in-progress';
            node2 = 'completed';
            node3 = 'active-progress';
        } else if (hasWorker) {
            stageClass = 'stage-assigned';
            node2 = 'completed';
            node3 = 'active-pending';
        } else {
            stageClass = 'stage-reported';
            node1 = 'active-pending';
        }

        const isOtpVerified = !!complaint.otp_verified_at;
        const hasOtp = !!complaint.resolution_otp;

        const complaintCard = document.createElement('div');
        complaintCard.className = 'complaint-card';

        complaintCard.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem; gap: 0.75rem; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 220px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.35rem; flex-wrap: wrap;">
                                <span style="font-size: 0.72rem; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #2563eb; background: rgba(37, 99, 235, 0.1); padding: 3px 8px; border-radius: 6px;">
                                    ID #${complaint.complaint_id}
                                </span>
                                <span style="font-size: 0.75rem; color: #64748b; font-weight: 500;">
                                    ${complaint.department_name || 'General Municipal'}
                                </span>
                                <span style="font-size: 0.72rem; font-weight: 700; color: ${pColor}; background: ${pBg}; border: 1px solid ${pBorder}; padding: 2px 7px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
                                    <i class="fas fa-fire"></i> Priority P(i): ${pScore} (${sev})
                                </span>
                            </div>
                            <h4 style="color: #0f172a; margin: 0; font-size: 1.15rem; font-weight: 700; font-family: 'Outfit', sans-serif; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-ticket-alt" style="color: #2563eb; font-size: 1rem;"></i>
                                ${complaint.category_name || 'Complaint'}
                            </h4>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <button type="button" onclick="trackSpecificComplaint(${complaint.complaint_id})" style="padding: 4px 10px; background: rgba(37, 99, 235, 0.08); color: #2563eb; border: 1.5px solid rgba(37, 99, 235, 0.25); border-radius: 8px; font-size: 0.76rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s ease;" title="Track resolution progress">
                                <i class="fas fa-route"></i> Track Status
                            </button>
                            <span class="status ${statusClass}" style="margin: 0; flex-shrink: 0;">
                                <span class="status-dot-pulse"></span>
                                ${statusText}
                            </span>
                        </div>
                    </div>

                    <!-- 3D Progress Stepper -->
                    <div class="complaint-stepper">
                        <div class="stepper-track-bg"></div>
                        <div class="stepper-track-fill ${stageClass}"></div>
                        <div class="stepper-node ${node1}">
                            <div class="stepper-dot"><i class="fas fa-check" style="font-size:8px;"></i></div>
                            <span class="stepper-label">Reported</span>
                        </div>
                        <div class="stepper-node ${node2}">
                            <div class="stepper-dot">${node2 === 'completed' ? '<i class="fas fa-check" style="font-size:8px;"></i>' : '2'}</div>
                            <span class="stepper-label">Assigned</span>
                        </div>
                        <div class="stepper-node ${node3}">
                            <div class="stepper-dot">${node3 === 'completed' ? '<i class="fas fa-check" style="font-size:8px;"></i>' : '3'}</div>
                            <span class="stepper-label">In Progress</span>
                        </div>
                        <div class="stepper-node ${node4}">
                            <div class="stepper-dot">${node4 === 'completed' ? '<i class="fas fa-check" style="font-size:8px;"></i>' : '4'}</div>
                            <span class="stepper-label">Resolved</span>
                        </div>
                    </div>

                    <p style="color: #334155; margin: 1rem 0; line-height: 1.6; font-size: 0.95rem; background: rgba(248, 250, 252, 0.8); padding: 0.85rem 1rem; border-radius: 12px; border: 1px solid rgba(226, 232, 240, 0.6);">
                        ${complaint.description}
                    </p>

                    <!-- SLA & Tracking Info -->
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; color: #64748b; background: rgba(241, 245, 249, 0.6); padding: 6px 12px; border-radius: 8px; margin-bottom: 0.8rem; flex-wrap: wrap; gap: 6px;">
                        <span><i class="fas fa-clock" style="color: #f59e0b;"></i> SLA Target: <strong>${slaDue}</strong></span>
                        ${complaint.duplicates_count ? `<span><i class="fas fa-users" style="color: #6366f1;"></i> ${complaint.duplicates_count} similar reports</span>` : ''}
                    </div>

                    <!-- ON-SITE RESIDENT OTP VERIFICATION BLOCK (Research Paper Section V-E) -->
                    ${isOtpVerified ? `
                        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 10px 14px; margin: 10px 0; font-size: 0.84rem; color: #065f46; font-weight: 600; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                            <span style="display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-check-double" style="color: #10b981; font-size: 1rem;"></i> Resolution Confirmed via Resident OTP (${complaint.resolution_otp || 'Verified'})
                            </span>
                            <span style="font-size: 0.75rem; color: #047857;">Ticket Concluded</span>
                        </div>
                    ` : hasOtp ? `
                        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%); border: 1.5px solid #10b981; border-radius: 12px; padding: 12px 16px; margin: 12px 0;">
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                                <div>
                                    <div style="font-weight: 700; color: #065f46; font-size: 0.92rem;"><i class="fas fa-key"></i> On-Site Resident Resolution OTP</div>
                                    <div style="font-size: 0.78rem; color: #047857; margin-top: 2px;">Share with field worker or verify below once work is finished:</div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <div style="background: white; padding: 6px 14px; border-radius: 8px; border: 2px dashed #10b981; font-family: monospace; font-size: 1.25rem; font-weight: 800; color: #065f46; letter-spacing: 2.5px;">
                                        ${complaint.resolution_otp}
                                    </div>
                                    <button type="button" onclick="copyOtpToClipboard('${complaint.resolution_otp}')" title="Copy OTP code" style="padding: 7px 10px; background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; border-radius: 8px; cursor: pointer; font-size: 0.85rem;">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </div>
                            </div>
                            <div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
                                <button onclick="citizenVerifyOTP(${complaint.complaint_id}, '${complaint.resolution_otp}', '${(complaint.category_name || 'Complaint').replace(/'/g, "\\'")}')" style="padding: 7px 16px; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 0.83rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(16,185,129,0.3);">
                                    <i class="fas fa-check-circle"></i> Verify Work Done via OTP
                                </button>
                            </div>
                        </div>
                    ` : ''}

                    ${hasWorker ? `
                        <div style="background: linear-gradient(135deg, rgba(219, 234, 254, 0.6) 0%, rgba(238, 242, 255, 0.85) 100%); padding: 1.1rem; border-radius: 14px; margin: 1rem 0; border: 1px solid rgba(191, 219, 254, 0.8); box-shadow: 0 4px 14px rgba(37, 99, 235, 0.06);">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.6rem;">
                                <div style="display: flex; align-items: center; gap: 0.65rem;">
                                    <div style="width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);">
                                        <i class="fas fa-hard-hat"></i>
                                    </div>
                                    <div>
                                        <span style="font-weight: 700; color: #1e3a8a; font-size: 0.95rem; display: block;">Assigned Specialist</span>
                                        <span style="font-size: 0.72rem; color: #64748b; font-weight: 500;">Municipal Field Worker</span>
                                    </div>
                                </div>
                                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 9999px; background: rgba(16, 185, 129, 0.15); color: #059669; font-size: 0.72rem; font-weight: 700;">
                                    <i class="fas fa-shield-alt"></i> Verified
                                </span>
                            </div>
                            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 0.6rem; border-top: 1px dashed rgba(191, 219, 254, 0.9); flex-wrap: wrap; gap: 8px;">
                                <span style="color: #1e293b; font-weight: 600; font-size: 0.92rem;">
                                    <i class="fas fa-user-circle" style="color: #3b82f6; margin-right: 5px;"></i> ${workerName}
                                </span>
                                ${workerPhone ? `
                                    <a href="tel:${workerPhone}" style="color: #2563eb; text-decoration: none; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; background: white; padding: 5px 12px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); transition: all 0.2s ease;">
                                        <i class="fas fa-phone-alt"></i> ${workerPhone}
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                        ${complaint.status === 'resolved' ? `
                            <div style="background: rgba(240, 253, 244, 0.9); padding: 1.1rem; border-radius: 14px; margin: 1rem 0; border: 1px solid rgba(187, 247, 208, 0.8); box-shadow: 0 4px 14px rgba(16, 185, 129, 0.08);">
                                <div style="display:flex; flex-direction: column; gap:12px;">
                                    ${complaint.citizen_confirmed ? `
                                        <span style="color: #059669; font-weight:700; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-check-circle" style="font-size: 1.1rem;"></i> Thank you for confirming completion
                                        </span>
                                    ` : `
                                        <button class="confirm-btn" onclick="confirmCompletion(${complaint.assignment_id}, ${complaint.complaint_id})" style="padding: 0.65rem 1.2rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.3s; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                                            <i class="fas fa-check"></i> Confirm Work Done
                                        </button>
                                    `}
                                    ${complaint.rating ? `
                                        <div style="margin-top: 0.5rem;">
                                            <strong style="color: #1e3a8a;">Your Rating:</strong>
                                            <span style="color: #f59e0b; font-size: 1.1rem;">${'★'.repeat(complaint.rating)}${'☆'.repeat(5 - complaint.rating)}</span>
                                            ${complaint.review ? `<div style="margin-top: 0.25rem;"><small style="color: #64748b;">"${complaint.review}"</small></div>` : ''}
                                        </div>
                                    ` : `
                                        <div style="background: white; padding: 0.9rem; border-radius: 10px; border: 1px solid rgba(226, 232, 240, 0.8);">
                                            <label style="font-weight:700; color: #1e3a8a; display: block; margin-bottom: 0.5rem; font-size: 0.9rem;">Rate Worker Experience</label>
                                            <div style="display:flex; flex-direction: column; gap:10px;">
                                                <div style="display:flex; gap:8px; align-items:center;">
                                                    <select id="rating-select-${complaint.complaint_id}" style="padding: 0.45rem 0.8rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; background: #f8fafc; font-weight: 600; color: #0f172a;">
                                                        <option value="1">1 ★ Poor</option>
                                                        <option value="2">2 ★★ Fair</option>
                                                        <option value="3">3 ★★★ Good</option>
                                                        <option value="4">4 ★★★★ Very Good</option>
                                                        <option value="5" selected>5 ★★★★★ Excellent</option>
                                                    </select>
                                                </div>
                                                <textarea id="rating-review-${complaint.complaint_id}" placeholder="Share your experience (optional)..." rows="2" style="width:100%; padding:0.6rem; border-radius:8px; border:1px solid #cbd5e1; font-size: 0.88rem; resize: vertical; background: #f8fafc;"></textarea>
                                                <button onclick="submitRating(${complaint.assignment_id}, ${complaint.complaint_id})" style="padding:0.6rem 1.2rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color:white; border:none; border-radius:8px; cursor: pointer; font-weight: 600; transition: all 0.3s; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                                                    <i class="fas fa-star"></i> Submit Rating
                                                </button>
                                            </div>
                                        </div>
                                    `}
                                </div>
                            </div>
                        ` : ''}
                    ` : ''}

                    <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(226, 232, 240, 0.8);">
                        <div style="flex: 1; min-width: 180px;">
                            <small style="color: #64748b; display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                                <i class="fas fa-map-marker-alt" style="color: #ef4444; margin-right: 4px;"></i> Location
                            </small>
                            <span style="color: #0f172a; font-weight: 600; font-size: 0.88rem; display: block; margin-top: 2px;">
                                ${complaint.City || 'City'}, ${complaint.State || 'State'} - ${complaint.Pincode || ''}
                            </span>
                        </div>
                        <div style="flex: 1; min-width: 140px;">
                            <small style="color: #64748b; display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                                <i class="fas fa-calendar-alt" style="color: #3b82f6; margin-right: 4px;"></i> Submitted
                            </small>
                            <span style="color: #0f172a; font-weight: 600; font-size: 0.88rem; display: block; margin-top: 2px;">
                                ${new Date(complaint.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    </div>

                    ${complaint.imageUrl ? `
                        <div style="margin-top: 1rem; border-radius: 12px; overflow: hidden; border: 1px solid rgba(226, 232, 240, 0.8); box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                            <img src="${complaint.imageUrl}" alt="Complaint evidence image"
                                 style="width: 100%; max-height: 220px; object-fit: cover; display: block; cursor: pointer; transition: transform 0.4s ease;"
                                 onmouseover="this.style.transform='scale(1.03)'"
                                 onmouseout="this.style.transform='scale(1)'"
                                 onclick="window.open('${complaint.imageUrl}', '_blank')">
                        </div>
                    ` : ''}
                `;

        container.appendChild(complaintCard);
    });
}

// Display complaints in the UI
function displayComplaints(complaints) {
    const requestsCard = document.querySelector('.requests-card .card-content');
    if (!requestsCard) return;

    requestsCard.innerHTML = '';

    if (complaints.length === 0) {
        requestsCard.innerHTML = '<p style="color: #64748b;">No complaints yet</p>';
        return;
    }

    // Display up to 3 recent complaints
    complaints.slice(0, 3).forEach(complaint => {
        const requestItem = document.createElement('div');
        requestItem.className = 'request-item';

        // Map status to CSS class
        const statusClass = complaint.status === 'resolved' ? 'resolved' :
            complaint.status === 'in-progress' ? 'in-progress' : 'pending';

        // Format status text for display
        const statusText = complaint.status.charAt(0).toUpperCase() + complaint.status.slice(1).replace('-', ' ');

        requestItem.innerHTML = `
                    <div class="request-info">
                        <span>${complaint.category_name || 'Complaint'}</span>
                        <small>Submitted ${new Date(complaint.created_at).toLocaleDateString()}</small>
                    </div>
                    <span class="status ${statusClass}"><span class="status-dot-pulse"></span>${statusText}</span>
                `;

        requestsCard.appendChild(requestItem);
    });

    // Add "View All" button if there are more than 3 complaints
    if (complaints.length > 3) {
        const viewAllBtn = document.createElement('button');
        viewAllBtn.className = 'view-all-btn';
        viewAllBtn.textContent = `View All (${complaints.length})`;
        viewAllBtn.style.cssText = 'margin-top: 10px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;';
        viewAllBtn.onclick = () => showAllComplaints(complaints);
        requestsCard.appendChild(viewAllBtn);
    }
}

// Show all complaints in a guaranteed-visible modal
function showAllComplaints(complaintsList, focusedComplaintId) {
    const complaints = Array.isArray(complaintsList) ? complaintsList : (window.allCitizenComplaints || []);
    const existing = document.getElementById('tracking-modal-overlay');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'tracking-modal-overlay';
    modal.className = 'modal-overlay active';
    modal.style.cssText = 'display: flex !important; align-items: center; justify-content: center; position: fixed; inset: 0; z-index: 99999; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(16px); padding: 1.5rem;';

    const modalContent = document.createElement('div');
    modalContent.className = 'tracking-modal-card';
    modalContent.style.cssText = 'position: relative !important; display: flex !important; flex-direction: column !important; max-width: 960px; width: 100%; max-height: 88vh; padding: 2rem; background: #ffffff; border-radius: 24px; box-shadow: 0 30px 80px rgba(15, 23, 42, 0.4); border: 1px solid rgba(226, 232, 240, 0.95); z-index: 100000; overflow-y: hidden;';

    // Calculate stats
    const total = complaints.length;
    const pending = complaints.filter(c => c.status === 'reported' || c.status === 'pending').length;
    const inprogress = complaints.filter(c => c.status === 'in-progress').length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const rejected = complaints.filter(c => c.status === 'rejected').length;

    let complaintsHTML = `
                <button type="button" class="close-btn" onclick="document.getElementById('tracking-modal-overlay')?.remove()" style="position: absolute; top: 1.5rem; right: 1.5rem; cursor: pointer; font-size: 1.5rem; color: #64748b; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border: none; transition: all 0.2s;" title="Close">&times;</button>
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem;">
                    <div style="width: 50px; height: 50px; border-radius: 12px; background: linear-gradient(135deg, #3b82f6, #60a5fa); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i class="fas fa-route" style="color: white; font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; color: #1e3a8a; font-size: 1.45rem; font-weight: 800;">Track My Civic Complaints</h3>
                        <p style="margin: 3px 0 0; color: #64748b; font-size: 0.88rem;">Live multi-stage lifecycle, field worker dispatch details & on-site resident OTP verification</p>
                    </div>
                </div>

                <!-- Stats Summary -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem;">
                    <div style="background: linear-gradient(135deg, #3b82f6, #60a5fa); padding: 0.85rem 1rem; border-radius: 12px; color: white; text-align: center;">
                        <div style="font-size: 1.8rem; font-weight: 800; line-height: 1.2;">${total}</div>
                        <div style="font-size: 0.8rem; opacity: 0.95; font-weight: 600;">Total</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #f59e0b, #fbbf24); padding: 0.85rem 1rem; border-radius: 12px; color: white; text-align: center;">
                        <div style="font-size: 1.8rem; font-weight: 800; line-height: 1.2;">${pending}</div>
                        <div style="font-size: 0.8rem; opacity: 0.95; font-weight: 600;">Pending</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #8b5cf6, #a78bfa); padding: 0.85rem 1rem; border-radius: 12px; color: white; text-align: center;">
                        <div style="font-size: 1.8rem; font-weight: 800; line-height: 1.2;">${inprogress}</div>
                        <div style="font-size: 0.8rem; opacity: 0.95; font-weight: 600;">In Progress</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #10b981, #34d399); padding: 0.85rem 1rem; border-radius: 12px; color: white; text-align: center;">
                        <div style="font-size: 1.8rem; font-weight: 800; line-height: 1.2;">${resolved}</div>
                        <div style="font-size: 0.8rem; opacity: 0.95; font-weight: 600;">Resolved</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #ef4444, #f87171); padding: 0.85rem 1rem; border-radius: 12px; color: white; text-align: center;">
                        <div style="font-size: 1.8rem; font-weight: 800; line-height: 1.2;">${rejected}</div>
                        <div style="font-size: 0.8rem; opacity: 0.95; font-weight: 600;">Rejected</div>
                    </div>
                </div>

                <!-- Instant Search & Quick Filters Bar -->
                <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center;">
                    <div style="flex: 1; min-width: 240px; position: relative;">
                        <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 0.9rem;"></i>
                        <input type="text" id="track-search-input" placeholder="Search by Complaint #ID, Category, or description..." 
                            style="width: 100%; padding: 8px 12px 8px 36px; border-radius: 10px; border: 1.5px solid #cbd5e1; font-size: 0.88rem; outline: none; background: #f8fafc; transition: all 0.2s;"
                            oninput="filterTrackComplaintsLive()">
                    </div>
                    <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                        <button onclick="filterComplaints('all')" class="filter-btn active" data-filter="all" style="padding: 0.45rem 0.85rem; border: 2px solid #3b82f6; background: #3b82f6; color: white; border-radius: 8px; cursor: pointer; font-size: 0.82rem; font-weight: 700; transition: all 0.2s;">
                            All (${total})
                        </button>
                        <button onclick="filterComplaints('pending')" class="filter-btn" data-filter="pending" style="padding: 0.45rem 0.85rem; border: 2px solid #f59e0b; background: transparent; color: #f59e0b; border-radius: 8px; cursor: pointer; font-size: 0.82rem; font-weight: 700; transition: all 0.2s;">
                            Pending (${pending})
                        </button>
                        <button onclick="filterComplaints('in-progress')" class="filter-btn" data-filter="in-progress" style="padding: 0.45rem 0.85rem; border: 2px solid #8b5cf6; background: transparent; color: #8b5cf6; border-radius: 8px; cursor: pointer; font-size: 0.82rem; font-weight: 700; transition: all 0.2s;">
                            In Progress (${inprogress})
                        </button>
                        <button onclick="filterComplaints('resolved')" class="filter-btn" data-filter="resolved" style="padding: 0.45rem 0.85rem; border: 2px solid #10b981; background: transparent; color: #10b981; border-radius: 8px; cursor: pointer; font-size: 0.82rem; font-weight: 700; transition: all 0.2s;">
                            Resolved (${resolved})
                        </button>
                        <button onclick="filterComplaints('rejected')" class="filter-btn" data-filter="rejected" style="padding: 0.45rem 0.85rem; border: 2px solid #ef4444; background: transparent; color: #ef4444; border-radius: 8px; cursor: pointer; font-size: 0.82rem; font-weight: 700; transition: all 0.2s;">
                            Rejected (${rejected})
                        </button>
                    </div>
                </div>

                <div id="complaints-list" style="display: flex; flex-direction: column; gap: 1rem; flex: 1; max-height: 52vh; overflow-y: auto; padding-right: 0.5rem;">
            `;

    if (complaints.length === 0) {
        complaintsHTML += `
                    <div style="text-align: center; padding: 3rem; color: #64748b; background: #f8fafc; border-radius: 16px; border: 1.5px dashed #cbd5e1;">
                        <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; color: #94a3b8;"></i>
                        <p style="font-size: 1.15rem; font-weight: 700; margin: 0; color: #334155;">No complaints recorded yet</p>
                        <p style="font-size: 0.9rem; margin: 0.5rem 0 1rem; color: #64748b;">Click "Report Issue" to file a civic grievance with instant AI categorization</p>
                        <button onclick="document.getElementById('tracking-modal-overlay')?.remove(); openReportIssue();" style="padding: 8px 18px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">
                            <i class="fas fa-plus-circle"></i> File a New Complaint
                        </button>
                    </div>
                `;
    } else {
        complaints.forEach(complaint => {
            const rawStatus = (complaint.status || 'pending').toLowerCase();
            const statusClass = rawStatus === 'resolved' ? 'resolved' :
                (rawStatus === 'in-progress' || rawStatus === 'inprogress') ? 'in-progress' :
                rawStatus === 'rejected' ? 'rejected' : 'pending';
            const statusText = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).replace('-', ' ');

            const statusColor = statusClass === 'resolved' ? '#10b981' :
                statusClass === 'in-progress' ? '#8b5cf6' :
                statusClass === 'rejected' ? '#ef4444' : '#f59e0b';

            // Worker assignment info
            const hasWorker = !!(complaint.worker_id && (complaint.worker_first_name || complaint.worker_name));
            const workerName = hasWorker ? (complaint.worker_name || `${complaint.worker_first_name || ''} ${complaint.worker_last_name || ''}`).trim() : 'Not assigned yet';
            const workerPhone = hasWorker ? (complaint.worker_phone || '') : '';
            const assignedDate = hasWorker && complaint.assigned_date ?
                new Date(complaint.assigned_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

            // Priority Score
            const pScore = complaint.priority_score ? Math.round(complaint.priority_score) : 50;
            const severity = complaint.severity || 'Medium';
            const pColor = pScore >= 75 ? '#ef4444' : pScore >= 50 ? '#f59e0b' : '#3b82f6';
            const slaText = complaint.sla_due_at ? new Date(complaint.sla_due_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Standard 24h';

            // Stepper state
            const isAssigned = hasWorker;
            const isInProgress = rawStatus === 'in-progress' || rawStatus === 'inprogress' || rawStatus === 'resolved';
            const isResolved = rawStatus === 'resolved';
            const isOtpVerified = !!(complaint.otp_verified_at || complaint.citizen_confirmed);

            const isFocused = focusedComplaintId && (String(complaint.complaint_id) === String(focusedComplaintId));

            complaintsHTML += `
                        <div class="complaint-item" id="track-card-${complaint.complaint_id}" data-id="${complaint.complaint_id}" data-status="${rawStatus}" 
                            style="padding: 1.25rem; background: #ffffff; border-radius: 16px; border: 1.5px solid ${isFocused ? '#3b82f6' : '#e2e8f0'}; border-left: 6px solid ${statusColor}; box-shadow: ${isFocused ? '0 10px 30px rgba(59, 130, 246, 0.25)' : '0 4px 15px rgba(0,0,0,0.04)'}; margin-bottom: 1rem; transition: all 0.3s;">
                            <!-- Header with Category, ID, Priority Badge & Status -->
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 8px;">
                                <div class="request-info" style="flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                        <i class="fas fa-ticket-alt" style="color: ${statusColor}; font-size: 1.1rem;"></i>
                                        <span style="font-weight: 800; font-size: 1.15rem; color: #1e293b;">${complaint.category_name || 'Civic Grievance'}</span>
                                        ${isFocused ? '<span style="background: #eff6ff; color: #2563eb; font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; border: 1px solid #bfdbfe;">SELECTED</span>' : ''}
                                    </div>
                                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; font-size: 0.8rem; color: #64748b;">
                                        <span style="font-weight: 700; color: #0f172a;"><i class="fas fa-hashtag"></i> ID: #${complaint.complaint_id}</span>
                                        <span>•</span>
                                        <span><i class="fas fa-building"></i> ${complaint.department_name || 'Municipal Services'}</span>
                                        <span>•</span>
                                        <span><i class="fas fa-calendar"></i> ${new Date(complaint.created_at || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="background: ${pColor}; color: white; padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                                        <i class="fas fa-bolt"></i> P(i): ${pScore}/100 (${severity})
                                    </span>
                                    <span class="status ${statusClass}" style="white-space: nowrap; font-weight: 700; padding: 4px 12px; border-radius: 9999px; font-size: 0.78rem;">${statusText}</span>
                                </div>
                            </div>

                            <!-- Description -->
                            <p style="color: #334155; margin: 0.75rem 0; line-height: 1.5; font-size: 0.95rem; background: #f8fafc; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid #edf2f7;">${complaint.description}</p>

                            <!-- Dynamic Tracking Lifecycle Stepper -->
                            <div style="margin: 1rem 0; padding: 1.1rem 0.8rem; background: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0;">
                                <div style="display: flex; justify-content: space-between; position: relative;">
                                    <!-- Stepper Progress Line -->
                                    <div style="position: absolute; top: 15px; left: 10%; right: 10%; height: 3px; background: #e2e8f0; z-index: 1;">
                                        <div style="height: 100%; background: #10b981; width: ${isOtpVerified ? '100%' : isResolved ? '75%' : isInProgress ? '50%' : isAssigned ? '25%' : '0%'}; transition: width 0.4s ease;"></div>
                                    </div>

                                    <!-- Step 1: Reported -->
                                    <div style="text-align: center; flex: 1; z-index: 2;">
                                        <div style="width: 32px; height: 32px; margin: 0 auto 5px; border-radius: 50%; background: #10b981; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: 0 2px 8px rgba(16,185,129,0.3);"><i class="fas fa-check"></i></div>
                                        <div style="font-size: 11.5px; font-weight: 700; color: #1e293b;">Reported</div>
                                        <div style="font-size: 10px; color: #64748b;">${new Date(complaint.created_at || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>
                                    </div>

                                    <!-- Step 2: Assigned -->
                                    <div style="text-align: center; flex: 1; z-index: 2;">
                                        <div style="width: 32px; height: 32px; margin: 0 auto 5px; border-radius: 50%; background: ${isAssigned ? '#10b981' : '#cbd5e1'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: ${isAssigned ? '0 2px 8px rgba(16,185,129,0.3)' : 'none'};"><i class="fas fa-hard-hat"></i></div>
                                        <div style="font-size: 11.5px; font-weight: 700; color: ${isAssigned ? '#1e293b' : '#94a3b8'};">Assigned</div>
                                        <div style="font-size: 10px; color: #64748b; max-width: 90px; margin: 0 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${isAssigned ? workerName : 'Pending'}</div>
                                    </div>

                                    <!-- Step 3: In Progress -->
                                    <div style="text-align: center; flex: 1; z-index: 2;">
                                        <div style="width: 32px; height: 32px; margin: 0 auto 5px; border-radius: 50%; background: ${isInProgress ? '#10b981' : '#cbd5e1'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: ${isInProgress ? '0 2px 8px rgba(16,185,129,0.3)' : 'none'};"><i class="fas fa-tools"></i></div>
                                        <div style="font-size: 11.5px; font-weight: 700; color: ${isInProgress ? '#1e293b' : '#94a3b8'};">In Progress</div>
                                        <div style="font-size: 10px; color: #64748b;">SLA: ${slaText}</div>
                                    </div>

                                    <!-- Step 4: OTP Verified Resolution -->
                                    <div style="text-align: center; flex: 1; z-index: 2;">
                                        <div style="width: 32px; height: 32px; margin: 0 auto 5px; border-radius: 50%; background: ${isOtpVerified ? '#10b981' : isResolved ? '#f59e0b' : '#cbd5e1'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: ${isResolved ? '0 2px 8px rgba(245,158,11,0.3)' : 'none'};">
                                            <i class="fas ${isOtpVerified ? 'fa-check-double' : isResolved ? 'fa-key' : 'fa-flag-checkered'}"></i>
                                        </div>
                                        <div style="font-size: 11.5px; font-weight: 700; color: ${isResolved ? '#1e293b' : '#94a3b8'};">${isOtpVerified ? 'Closed' : isResolved ? 'OTP Verify' : 'Resolved'}</div>
                                        <div style="font-size: 10px; color: #64748b;">${isResolved ? (complaint.resolved_at ? new Date(complaint.resolved_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Proof In') : 'Awaiting'}</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Assigned Field Worker Details Card -->
                            ${hasWorker ? `
                                <div style="background: linear-gradient(135deg, #f0fdf4, #e0f2fe); padding: 0.85rem 1rem; border-radius: 12px; margin: 0.75rem 0; border: 1px solid #bfdbfe; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                                        <div style="width: 38px; height: 38px; border-radius: 50%; background: #0284c7; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
                                            <i class="fas fa-user-gear"></i>
                                        </div>
                                        <div>
                                            <div style="font-weight: 700; color: #0c4a6e; font-size: 0.95rem;">Field Worker: ${workerName}</div>
                                            <div style="font-size: 0.8rem; color: #0369a1;">
                                                ${workerPhone ? `<i class="fas fa-phone"></i> ${workerPhone} • ` : ''}
                                                <i class="fas fa-clock"></i> Assigned: ${assignedDate || 'Active'}
                                            </div>
                                        </div>
                                    </div>
                                    ${workerPhone ? `
                                        <a href="tel:${workerPhone}" style="padding: 6px 14px; background: #0284c7; color: white; border-radius: 8px; text-decoration: none; font-size: 0.82rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                                            <i class="fas fa-phone-volume"></i> Call Worker
                                        </a>
                                    ` : ''}
                                </div>
                            ` : `
                                <div style="background: #fef3c7; padding: 0.75rem 1rem; border-radius: 12px; margin: 0.75rem 0; border: 1px solid #fde68a; display: flex; align-items: center; gap: 0.6rem;">
                                    <i class="fas fa-hourglass-half" style="color: #d97706;"></i>
                                    <span style="font-weight: 600; color: #92400e; font-size: 0.88rem;">Department dispatch in queue — field technician will be assigned shortly.</span>
                                </div>
                            `}

                            <!-- RESOLUTION PROOF & OTP VERIFICATION BLOCK -->
                            ${(isResolved || complaint.resolution_otp) ? `
                                <div style="background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.08)); border: 1.5px solid #10b981; border-radius: 12px; padding: 1.1rem; margin: 0.9rem 0;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
                                        <div>
                                            <div style="display: flex; align-items: center; gap: 6px;">
                                                <i class="fas fa-shield-alt" style="color: #059669; font-size: 1.1rem;"></i>
                                                <strong style="color: #065f46; font-size: 1rem;">Resident Resolution OTP Verification</strong>
                                            </div>
                                            <p style="margin: 3px 0 0; color: #047857; font-size: 0.82rem;">
                                                ${complaint.proof_distance_meters !== null && complaint.proof_distance_meters !== undefined ? `GPS Proximity: ${complaint.proof_distance_meters}m • ` : ''}
                                                Share OTP with worker on-site after inspection to verify resolution
                                            </p>
                                        </div>

                                        <!-- OTP Display Pill -->
                                        <div style="text-align: right;">
                                            <div style="font-size: 0.75rem; color: #065f46; font-weight: 700; text-transform: uppercase;">Resident Secret OTP</div>
                                            <div style="display: flex; align-items: center; gap: 6px; justify-content: flex-end;">
                                                <div style="background: #ffffff; padding: 6px 14px; border-radius: 8px; border: 2px dashed #10b981; font-family: monospace; font-size: 1.3rem; font-weight: 800; color: #065f46; letter-spacing: 3px; display: inline-block;">
                                                    ${complaint.resolution_otp || '482910'}
                                                </div>
                                                <button type="button" onclick="copyOtpToClipboard('${complaint.resolution_otp || '482910'}')" title="Copy OTP code" style="padding: 7px 9px; background: #f0fdf4; color: #059669; border: 1px solid #bbf7d0; border-radius: 6px; cursor: pointer;">
                                                    <i class="fas fa-copy"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Proof Photo Preview if uploaded -->
                                    ${complaint.proof_imageUrl ? `
                                        <div style="margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.7); border-radius: 8px; display: flex; align-items: center; gap: 12px;">
                                            <img src="${complaint.proof_imageUrl}" alt="Resolution Proof" style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1; cursor: pointer;" onclick="window.open('${complaint.proof_imageUrl}', '_blank')">
                                            <div>
                                                <div style="font-weight: 600; font-size: 0.85rem; color: #1e293b;">Field Fix Photo Proof</div>
                                                <small style="color: #64748b;">Click thumbnail to inspect full resolution photograph</small>
                                            </div>
                                        </div>
                                    ` : ''}

                                    <!-- OTP Verification Actions -->
                                    <div style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
                                        ${isOtpVerified ? `
                                            <span style="color: #059669; font-weight: 700; font-size: 0.88rem; display: inline-flex; align-items: center; gap: 6px;">
                                                <i class="fas fa-check-double"></i> Resolution Verified & Confirmed by Citizen
                                            </span>
                                        ` : `
                                            <button class="btn-sm" onclick="citizenVerifyOTP(${complaint.complaint_id}, '${complaint.resolution_otp || ''}', '${(complaint.category_name || 'Civic Issue').replace(/'/g, "\\'")}')" style="padding: 7px 16px; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(16,185,129,0.3);">
                                                <i class="fas fa-check-circle"></i> Confirm OTP & Close Ticket
                                            </button>
                                            <button class="btn-sm" onclick="openReopenModal(${complaint.complaint_id})" style="padding: 7px 14px; background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px;">
                                                <i class="fas fa-rotate-left"></i> Reopen Issue
                                            </button>
                                        `}
                                    </div>
                                </div>
                            ` : ''}

                            <!-- Citizen Rating Section when Resolved -->
                            ${complaint.status === 'resolved' ? `
                                <div style="display: flex; gap: 10px; align-items: center; margin-top: 8px; flex-wrap: wrap;">
                                    ${complaint.rating ? `
                                        <div><strong>Worker Rating:</strong> <span style="color: #f59e0b;">${'★'.repeat(complaint.rating)}${'☆'.repeat(5 - complaint.rating)}</span> ${complaint.review ? `<small style="color: #64748b; margin-left: 6px;">"${complaint.review}"</small>` : ''}</div>
                                    ` : `
                                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: #f8fafc; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; width: 100%;">
                                            <label style="font-weight: 600; font-size: 0.85rem; color: #334155;">Rate Worker:</label>
                                            <select id="rating-select-${complaint.complaint_id}" style="padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
                                                <option value="5" selected>5 ★★★★★</option>
                                                <option value="4">4 ★★★★☆</option>
                                                <option value="3">3 ★★★☆☆</option>
                                                <option value="2">2 ★★☆☆☆</option>
                                                <option value="1">1 ★☆☆☆☆</option>
                                            </select>
                                            <input type="text" id="rating-review-${complaint.complaint_id}" placeholder="Optional feedback..." style="flex: 1; min-width: 150px; padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem;">
                                            <button onclick="submitRating(${complaint.assignment_id || complaint.complaint_id}, ${complaint.complaint_id})" style="padding: 4px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 0.82rem; cursor: pointer;">Submit Rating</button>
                                        </div>
                                    `}
                                </div>
                            ` : ''}

                            ${complaint.status === 'rejected' && complaint.rejection_reason ? `
                                <div style="background: #fee2e2; padding: 0.75rem; border-radius: 8px; margin: 0.75rem 0; border-left: 3px solid #ef4444;">
                                    <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
                                        <i class="fas fa-times-circle" style="color: #dc2626; font-size: 0.9rem; margin-top: 2px;"></i>
                                        <div style="flex: 1;">
                                            <div style="font-weight: 600; color: #991b1b; font-size: 0.9rem; margin-bottom: 0.25rem;">
                                                <i class="fas fa-ban"></i> Complaint Rejected
                                            </div>
                                            <div style="color: #7f1d1d; font-size: 0.85rem; line-height: 1.4;">
                                                <strong>Reason:</strong> ${complaint.rejection_reason}
                                            </div>
                                            ${complaint.rejected_at ? `
                                                <small style="color: #991b1b; margin-top: 0.25rem; display: block;">
                                                    Rejected on ${new Date(complaint.rejected_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </small>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            <div style="display: flex; align-items: center; gap: 0.5rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0;">
                                <i class="fas fa-map-marker-alt" style="color: #64748b; font-size: 0.85rem;"></i>
                                <small style="color: #64748b; font-size: 0.85rem;">
                                    ${complaint.City || 'Indore'}, ${complaint.State || 'Madhya Pradesh'} ${complaint.Pincode ? '- ' + complaint.Pincode : ''}
                                </small>
                            </div>
                        </div>
                    `;
        });
    }

    complaintsHTML += '</div>';
    modalContent.innerHTML = complaintsHTML;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Filter functionality
    window.filterComplaints = function (status) {
        const buttons = modal.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            if (btn.dataset.filter === status) {
                btn.style.background = btn.style.borderColor;
                btn.style.color = 'white';
                btn.classList.add('active');
            } else {
                btn.style.background = 'transparent';
                btn.style.color = btn.style.borderColor;
                btn.classList.remove('active');
            }
        });
        window.filterTrackComplaintsLive();
    };

    window.filterTrackComplaintsLive = function () {
        const searchInput = document.getElementById('track-search-input');
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const activeBtn = modal.querySelector('.filter-btn.active');
        const activeStatus = activeBtn ? activeBtn.dataset.filter : 'all';

        const items = modal.querySelectorAll('.complaint-item');
        items.forEach(item => {
            const itemStatus = item.dataset.status;
            const itemId = item.dataset.id || '';
            const itemText = item.textContent.toLowerCase();

            const matchStatus = (activeStatus === 'all') ||
                (activeStatus === 'pending' && (itemStatus === 'reported' || itemStatus === 'pending')) ||
                (itemStatus === activeStatus);

            const matchSearch = !query ||
                itemText.includes(query) ||
                itemId === query ||
                `#${itemId}` === query;

            item.style.display = (matchStatus && matchSearch) ? 'block' : 'none';
        });
    };

    // Scroll focused card into view if specified
    if (focusedComplaintId) {
        setTimeout(() => {
            const targetCard = document.getElementById(`track-card-${focusedComplaintId}`);
            if (targetCard) {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 150);
    }

    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

// Dashboard functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';

    // Set colors based on type
    let bgColor = 'linear-gradient(135deg, #3b82f6, #60a5fa)';
    if (type === 'success') bgColor = 'linear-gradient(135deg, #10b981, #34d399)';
    if (type === 'error') bgColor = 'linear-gradient(135deg, #ef4444, #f87171)';
    if (type === 'warning') bgColor = 'linear-gradient(135deg, #f59e0b, #fbbf24)';

    notification.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: ${bgColor};
                color: white;
                padding: 15px 25px;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                font-weight: 500;
                max-width: 350px;
                animation: slideIn 0.3s ease;
            `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

function toggleNotifications() {
    const panel = document.getElementById('notificationsPanel');
    if (panel) {
        const isActive = panel.classList.contains('active');

        if (!isActive) {
            // Opening panel - load notifications
            panel.classList.add('active');
            loadNotifications();
        } else {
            // Closing panel
            panel.classList.remove('active');
        }
    }
}

// Load notifications from user complaints
async function loadNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;

    // Show loading state
    const loadingText = currentLang === 'hi' ? TRANSLATIONS.hi.loading_notifications : 'Loading notifications...';
    notificationsList.innerHTML = `<p style="text-align: center; padding: 2rem; color: #64748b;"><i class="fas fa-spinner fa-spin"></i> ${loadingText}</p>`;

    try {
        const response = await fetch(`${SERVER_URL}/user/trackComplain`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok && data.complaints && data.complaints.length > 0) {
            notificationsList.innerHTML = '';

            // Create notifications from complaints
            data.complaints.forEach(complaint => {
                const notificationItem = document.createElement('div');
                notificationItem.className = 'notification-item';

                // Mark as unread if status changed recently (within 24 hours)
                const updatedAt = new Date(complaint.updated_at);
                const now = new Date();
                const hoursDiff = (now - updatedAt) / (1000 * 60 * 60);

                if (hoursDiff < 24) {
                    notificationItem.classList.add('unread');
                }

                // Choose icon based on status
                let icon = 'fa-info-circle';
                if (complaint.status === 'resolved') icon = 'fa-check-circle';
                else if (complaint.status === 'in-progress') icon = 'fa-spinner';
                else if (complaint.status === 'pending') icon = 'fa-clock';

                notificationItem.innerHTML = `
                            <i class="fas ${icon}"></i>
                            <div>
                                <p><strong>${complaint.category_name || 'Complaint'}</strong> - ${complaint.status}</p>
                                <small>${complaint.description ? complaint.description.substring(0, 60) + '...' : 'No description'}</small>
                                <br>
                                <small style="color: #94a3b8;">${new Date(complaint.updated_at).toLocaleString()}</small>
                            </div>
                        `;

                notificationsList.appendChild(notificationItem);
            });

            // Update notification badge count
            updateNotificationBadge(data.complaints.length);
        } else {
            const noNotifText = currentLang === 'hi' ? TRANSLATIONS.hi.no_notifications : 'No notifications yet';
            notificationsList.innerHTML = `<p style="text-align: center; padding: 2rem; color: #64748b;">${noNotifText}</p>`;
            updateNotificationBadge(0);
        }
    } catch (error) {
        console.error('❌ Error loading notifications:', error);
        const errorText = currentLang === 'hi' ? TRANSLATIONS.hi.error_loading_notifications : 'Error loading notifications';
        notificationsList.innerHTML = `<p style="text-align: center; padding: 2rem; color: #ef4444;"><i class="fas fa-exclamation-triangle"></i> ${errorText}</p>`;
    }
}

// Update notification badge count
function updateNotificationBadge(count) {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function toggleProfileMenu(event) {
    if (event) event.stopPropagation(); // Prevent event from bubbling up

    const menu = document.getElementById('profileMenu');
    if (menu) {
        // Toggle the 'active' class which controls visibility via CSS
        menu.classList.toggle('active');
    }
}

// Close profile menu when clicking outside
document.addEventListener('click', function (event) {
    const menu = document.getElementById('profileMenu');
    const profileMenuButton = document.querySelector('.profile-menu');

    if (menu && profileMenuButton) {
        // Check if click is outside both the menu and the button
        if (!menu.contains(event.target) && !profileMenuButton.contains(event.target)) {
            menu.classList.remove('active');
        }
    }
});

// --- Modal Functions ---

function openReportIssue() {
    const modal = document.getElementById('report-issue-modal');
    const overlay = document.getElementById('modalOverlay');
    if (modal && overlay) {
        overlay.style.display = 'block';
        modal.style.display = 'block';
        setTimeout(() => {
            overlay.style.opacity = '1';
            modal.style.opacity = '1';
            modal.style.transform = 'translate(-50%, -50%)';
        }, 10);
    }
}

function closeReportModal() {
    const modal = document.getElementById('report-issue-modal');
    const overlay = document.getElementById('modalOverlay');
    if (modal && overlay) {
        overlay.style.opacity = '0';
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -40%)';
        setTimeout(() => {
            overlay.style.display = 'none';
            modal.style.display = 'none';
        }, 300);
    }
}

// ADDED: Functions for the new Settings Modal
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const overlay = document.getElementById('modalOverlay');
    if (modal && overlay) {
        overlay.style.display = 'block';
        modal.style.display = 'block';
        setTimeout(() => {
            overlay.style.opacity = '1';
            modal.style.opacity = '1';
            modal.style.transform = 'translate(-50%, -50%)'; // Use same animation
        }, 10);
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const overlay = document.getElementById('modalOverlay');
    if (modal && overlay) {
        overlay.style.opacity = '0';
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -40%)'; // Use same animation
        setTimeout(() => {
            overlay.style.display = 'none';
            modal.style.display = 'none';
        }, 300);
    }
}

function openhelp(event) {
    if (event && event.preventDefault) event.preventDefault();
    console.log('openhelp called');
    const modal = document.getElementById('help-modal');
    console.log('Help modal element:', modal);

    if (modal) {
        console.log('Opening help modal...');
        modal.style.display = 'block';
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.style.transform = 'translate(-50%, -50%)';
            console.log('Help modal should be visible now');
        }, 10);
    } else {
        console.error('Help modal not found!');
    }
}

// Confirm completion - called by user when work is resolved to their satisfaction
async function confirmCompletion(assignmentId, complaintId) {
    try {
        const res = await fetch(`${SERVER_URL}/user/confirmCompletion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ assignment_id: assignmentId, complaint_id: complaintId, confirmed: true })
        });
        const data = await res.json();
        if (res.ok) {
            showNotification('Thank you. Your confirmation has been recorded.', 'success');
            // refresh complaints display
            openTrackComplaint();
        } else {
            showNotification(data.message || 'Failed to record confirmation', 'error');
        }
    } catch (error) {
        console.error('Error confirming completion:', error);
        showNotification('Error confirming completion', 'error');
    }
}

// Submit rating for worker
async function submitRating(assignmentId, complaintId) {
    const ratingEl = document.getElementById(`rating-select-${complaintId}`);
    const reviewEl = document.getElementById(`rating-review-${complaintId}`);
    if (!ratingEl) return showNotification('Rating element not found', 'error');
    const ratingVal = ratingEl.value;
    const reviewVal = reviewEl ? reviewEl.value.trim() : '';

    try {
        const res = await fetch(`${SERVER_URL}/user/rateWorker`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ assignment_id: assignmentId, complaint_id: complaintId, rating: ratingVal, review: reviewVal })
        });
        const data = await res.json();
        if (res.ok) {
            showNotification('Thank you for rating the worker!', 'success');
            // refresh complaints display
            openTrackComplaint();
        } else {
            showNotification(data.message || 'Failed to submit rating', 'error');
        }
    } catch (error) {
        console.error('Error submitting rating:', error);
        showNotification('Error submitting rating', 'error');
    }
}

function closehelp() {
    console.log('closehelp called');
    const modal = document.getElementById('help-modal');

    if (modal) {
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -40%)';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

// Open My Profile Modal
async function openMyProfile(event) {
    if (event && event.preventDefault) event.preventDefault();
    console.log('openMyProfile called');

    const modal = document.getElementById('profile-modal');
    console.log('Profile modal element:', modal);

    if (modal) {
        console.log('Opening profile modal...');
        modal.style.display = 'block';
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.style.transform = 'translate(-50%, -50%)';
            console.log('Profile modal should be visible now');
        }, 10);

        // Populate from window.currentUser or localStorage immediately
        const u = (window.currentUser && window.currentUser.First_name) ? window.currentUser : (function() {
            try { return JSON.parse(localStorage.getItem('currentUser')); } catch (e) { return null; }
        })() || {};

        if (u.First_name) {
            const firstName = u.First_name;
            const lastName = u.Last_name || '';
            const fullName = `${firstName} ${lastName}`.trim();

            const avatarEl = document.getElementById('profile-avatar-large');
            if (avatarEl) avatarEl.textContent = firstName.charAt(0).toUpperCase();
            const nameEl = document.getElementById('profile-name');
            if (nameEl) nameEl.textContent = fullName;
            const emailEl = document.getElementById('profile-email');
            if (emailEl) emailEl.textContent = u.Email || 'N/A';
            const firstEl = document.getElementById('profile-firstname');
            if (firstEl) firstEl.textContent = firstName;
            const lastEl = document.getElementById('profile-lastname');
            if (lastEl) lastEl.textContent = lastName;
            const phoneEl = document.getElementById('profile-phone');
            if (phoneEl) phoneEl.textContent = u.Phone || 'N/A';
            const pinEl = document.getElementById('profile-pincode');
            if (pinEl) pinEl.textContent = u.Pincode || 'N/A';
            const addrEl = document.getElementById('profile-address');
            if (addrEl) {
                const address = [u.Address_Line, u.City, u.State, u.Pincode].filter(Boolean).join(', ');
                addrEl.textContent = address || 'No address available';
            }
        }

        // Load complaint stats
        try {
            const response = await fetch(`${SERVER_URL}/complaints/my-complaints`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                const complaints = data.complaints || [];

                // Calculate statistics
                const total = complaints.length;
                const pending = complaints.filter(c => c.status === 'reported' || c.status === 'pending').length;
                const resolved = complaints.filter(c => c.status === 'resolved').length;

                document.getElementById('profile-stat-total').textContent = total;
                document.getElementById('profile-stat-pending').textContent = pending;
                document.getElementById('profile-stat-resolved').textContent = resolved;
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }
}

function closeMyProfile() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -40%)';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

// Open Activity History Modal
async function openActivityreport(event) {
    if (event && event.preventDefault) event.preventDefault();
    console.log('openActivityreport called');

    const modal = document.getElementById('activity-modal');
    console.log('Activity modal element:', modal);

    if (modal) {
        console.log('Opening activity modal...');
        modal.style.display = 'block';
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.style.transform = 'translate(-50%, -50%)';
            console.log('Activity modal should be visible now');
        }, 10);

        // Load activity history
        const activityContent = document.getElementById('activity-content');
        activityContent.innerHTML = '<div style="text-align: center; padding: 40px 20px; color: #64748b;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 10px;"></i><p>Loading activity history...</p></div>';

        try {
            const response = await fetch(`${SERVER_URL}/complaints/my-complaints`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                const complaints = data.complaints || [];

                if (complaints.length === 0) {
                    activityContent.innerHTML = '<div style="text-align: center; padding: 40px 20px; color: #64748b;"><i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 10px;"></i><p>No activity history found</p></div>';
                    return;
                }

                // Sort by date (newest first)
                complaints.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                // Build activity timeline
                let html = '<div style="position: relative; padding-left: 30px;">';

                complaints.forEach((complaint, index) => {
                    const date = new Date(complaint.created_at);
                    const formattedDate = date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    const statusColor = complaint.status === 'resolved' ? '#10b981' :
                        complaint.status === 'in-progress' ? '#f59e0b' : '#6366f1';
                    const statusIcon = complaint.status === 'resolved' ? 'check-circle' :
                        complaint.status === 'in-progress' ? 'spinner' : 'clock';

                    html += `
                        <div style="position: relative; margin-bottom: 25px; padding-bottom: 25px; border-bottom: 1px solid #e2e8f0;">
                            <div style="position: absolute; left: -30px; width: 12px; height: 12px; border-radius: 50%; background: ${statusColor}; border: 3px solid white; box-shadow: 0 0 0 2px ${statusColor};"></div>
                            ${index < complaints.length - 1 ? '<div style="position: absolute; left: -24px; top: 12px; width: 2px; height: calc(100% + 13px); background: #e2e8f0;"></div>' : ''}

                            <div style="display: flex; align-items: start; gap: 10px;">
                                <i class="fas fa-${statusIcon}" style="color: ${statusColor}; margin-top: 3px;"></i>
                                <div style="flex: 1;">
                                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 5px;">
                                        <strong style="color: #1e3a8a;">${complaint.category_name || 'Issue'}</strong>
                                        <span style="font-size: 0.75rem; color: #64748b;">${formattedDate}</span>
                                    </div>
                                    <p style="color: #475569; font-size: 0.9rem; margin-bottom: 8px;">${complaint.description || 'No description'}</p>
                                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                        <span style="display: inline-block; padding: 4px 10px; background: ${statusColor}20; color: ${statusColor}; border-radius: 12px; font-size: 0.75rem; font-weight: 500;">
                                            ${complaint.status.toUpperCase()}
                                        </span>
                                        <span style="display: inline-block; padding: 4px 10px; background: #f1f5f9; color: #64748b; border-radius: 12px; font-size: 0.75rem;">
                                            #${complaint.complaint_id}
                                        </span>
                                        ${complaint.department_name ? `
                                            <span style="display: inline-block; padding: 4px 10px; background: #f1f5f9; color: #64748b; border-radius: 12px; font-size: 0.75rem;">
                                                ${complaint.department_name}
                                            </span>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });

                html += '</div>';
                activityContent.innerHTML = html;
            } else {
                activityContent.innerHTML = '<div style="text-align: center; padding: 40px 20px; color: #dc2626;"><i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 10px;"></i><p>Failed to load activity history</p></div>';
            }
        } catch (error) {
            console.error('Error loading activity history:', error);
            activityContent.innerHTML = '<div style="text-align: center; padding: 40px 20px; color: #dc2626;"><i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 10px;"></i><p>Error loading activity history</p></div>';
        }
    }
}

function closeActivityreport() {
    const modal = document.getElementById('activity-modal');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -40%)';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

function submitHelp() {
    const msg = document.getElementById("ticket-message").value.trim();
    const status = document.getElementById("help-status");

    if (!msg) {
        status.style.color = "#dc2626";
        status.textContent = "Please describe your issue.";
        return;
    }

    status.style.color = "#16a34a";
    status.textContent = "Your ticket has been submitted successfully.";
    document.getElementById("ticket-message").value = "";
}

// UPDATED: closeModal now closes all modals
function closeModal() {
    closeReportModal();
    closeSettingsModal();
    try { closehelp(); } catch (e) { }
    try { closeMyProfile(); } catch (e) { }
    try { closeActivityreport(); } catch (e) { }
    try { closePayBillModal(); } catch (e) { }
    try { closeCertificateModal(); } catch (e) { }
    try { closeAppointmentModal(); } catch (e) { }
}

//         async function submitComplaint(event) {
//   event.preventDefault();
//   const form = document.getElementById('report-issue-form');
//   if (!form) return;

//   const formData = new FormData(form);

//   // Debug: log all FormData keys/values (files show as File objects)
//   for (const pair of formData.entries()) {
//     console.log('FormData entry:', pair[0], pair[1]);
//   }

//   try {
//     const res = await fetch(`${SERVER_URL}/user/registerComplain`, { // use SERVER_URL
//       method: 'POST',
//       body: formData,
//       credentials: 'include'
//     });

//     const result = await res.json();
//     if (!res.ok) {
//       const errMsg = result.error || result.message || 'Upload failed';
//       throw new Error(errMsg);
//     }

//     alert('Complaint submitted successfully');
//     form.reset();
//   } catch (err) {
//     console.error('Complaint submit error:', err);
//     alert(err.message || 'Submission failed');
//   }
//         }


async function submitComplaint(event) {
    event.preventDefault();
    const form = document.getElementById('report-issue-form');
    if (!form) return;

    const formData = new FormData();

    // append form controls by name (FormData(form) would work if all names present,
    // but building explicitly helps us control the image file)
    const elements = [
        'category', 'department', 'description',
        'Pincode', 'State', 'City', 'Address_Line',
        // include captured photo coordinates (may be empty)
        'latitude', 'longitude', 'hasFace'
    ];
    elements.forEach(name => {
        const el = form.querySelector(`[name="${name}"]`);
        if (el) formData.append(name, el.value || '');
    });

    // If there's a captured base64 image in hidden input, convert to Blob and append as "image"
    const base64input = document.getElementById('issue-photo');
    if (base64input && base64input.value) {
        const dataURL = base64input.value;
        // validate prefix
        const matches = dataURL.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
        if (!matches) {
            const msg = currentLang === 'hi' ? TRANSLATIONS.hi.invalid_image : 'Captured image is invalid or unsupported format.';
            alert(msg);
            return;
        }
        const mimeType = matches[1];
        const base64Data = matches[3];
        const byteString = atob(base64Data);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeType });
        // create a File for better compatibility (multer expects file)
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: mimeType });
        formData.append('image', file); // must match multer upload.single('image')
    }

    try {
        // debug: show keys and types (File objects will show as File)
        for (const pair of formData.entries()) {
            console.log('FormData entry:', pair[0], pair[1]);
        }

        const res = await fetch(`${SERVER_URL}/user/registerComplain`, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include'
        });

        const result = await res.json();
        if (!res.ok) {
            const errMsg = result.error || result.message || 'Upload failed';
            throw new Error(errMsg);
        }

        // Success message with complaint ID and priority score
        const pScoreText = result.priority_score ? ` (Priority P(i): ${result.priority_score}/100)` : '';
        const successMsg = currentLang === 'hi'
            ? `${TRANSLATIONS.hi.complaint_submitted}! ${TRANSLATIONS.hi.complaint_id}: ${result.complaintId}`
            : `🎉 Complaint #${result.complaintId} submitted successfully!${pScoreText} Dispatched to Municipal Field Team.`;

        if (typeof showNotification === 'function') {
            showNotification(successMsg, 'success');
        } else {
            alert(successMsg);
        }
        console.log('✅ Complaint registered with ID:', result.complaintId);

        // Reset form and close modal
        form.reset();
        closeReportModal();

        // Refresh complaints list to show the new complaint
        if (typeof loadUserComplaints === 'function') {
            await loadUserComplaints();
        }

        // Scroll to complaints view
        const cc = document.getElementById('all-complaints-container');
        if (cc) cc.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (err) {
        console.error('Complaint submit error:', err);
        const errorMsg = currentLang === 'hi'
            ? `${TRANSLATIONS.hi.submission_failed}: ${err.message}`
            : `Submission failed: ${err.message}`;
        alert(errorMsg);
    }
}


// --- Other Action/Helper Functions ---

async function openTrackComplaint(focusedComplaintId) {
    try {
        // Immediate render if complaints are already cached in window
        if (window.allCitizenComplaints && window.allCitizenComplaints.length > 0) {
            showAllComplaints(window.allCitizenComplaints, focusedComplaintId);
        } else {
            showNotification('Loading complaints and live tracking...', 'info');
        }

        const token = localStorage.getItem('token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        let complaints = null;
        try {
            const response = await fetch('/user/trackComplain', {
                headers,
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                complaints = data.complaints || [];
            }
        } catch (e) {
            console.warn('Primary /user/trackComplain fetch failed, checking fallback...', e);
        }

        if (!complaints) {
            try {
                const fallback = await fetch('/complaints/my-complaints', {
                    headers,
                    credentials: 'include'
                });
                if (fallback.ok) {
                    const data = await fallback.json();
                    complaints = data.complaints || [];
                }
            } catch (e) {
                console.warn('Fallback fetch failed:', e);
            }
        }

        if (complaints) {
            window.allCitizenComplaints = complaints;
            showAllComplaints(complaints, focusedComplaintId);
        } else if (!window.allCitizenComplaints || window.allCitizenComplaints.length === 0) {
            showNotification('Failed to load tracking data. Please log in again.', 'error');
        }
    } catch (error) {
        console.error('❌ Error loading complaints:', error);
        showNotification('Error loading tracking data', 'error');
    }
}

window.trackSpecificComplaint = function (id) {
    openTrackComplaint(id);
};

function openViewComplaints() {
    const el = document.getElementById('all-complaints-section') || document.getElementById('all-complaints-container') || document.querySelector('.my-complaints-section') || document.querySelector('.complaints-section');
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        el.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.5), 0 20px 45px rgba(99, 102, 241, 0.2)';
        el.style.borderRadius = '24px';
        setTimeout(() => { el.style.boxShadow = ''; }, 3000);
        if (typeof loadUserComplaints === 'function') {
            loadUserComplaints();
        }
        showNotification('Scrolled to All Complaints below', 'info');
    } else {
        // Fallback: If section is not present on current viewport, open the full tracking modal
        openTrackComplaint();
    }
}

function openPayBill() {
    // Redirect to the dedicated payment integration page
    window.location.href = '/user/payment';
}

function closePayBillModal() {
    const modal = document.getElementById('pay-bill-modal');
    const overlay = document.getElementById('modalOverlay');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -40%)';
        setTimeout(() => {
            modal.style.display = 'none';
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.style.display = 'none'; }, 200);
            }
        }, 300);
    }
}

function payBillItem(btn, billName, amount) {
    // Redirect to payment integration notice page
    window.location.href = '/user/payment';
}

function openRequestCertificate() {
    const modal = document.getElementById('certificate-modal');
    const overlay = document.getElementById('modalOverlay');
    if (modal && overlay) {
        overlay.style.display = 'block';
        modal.style.display = 'block';
        setTimeout(() => {
            overlay.style.opacity = '1';
            modal.style.opacity = '1';
            modal.style.transform = 'translate(-50%, -50%)';
        }, 10);
    }
}

function closeCertificateModal() {
    const modal = document.getElementById('certificate-modal');
    const overlay = document.getElementById('modalOverlay');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -40%)';
        setTimeout(() => {
            modal.style.display = 'none';
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.style.display = 'none'; }, 200);
            }
        }, 300);
    }
}

function submitCertificateRequest(event) {
    if (event && event.preventDefault) event.preventDefault();
    const certType = document.getElementById('cert-type')?.value || 'Certificate';
    const applicantName = document.getElementById('cert-applicant-name')?.value || 'Applicant';

    const alertBox = document.getElementById('cert-success-alert');
    const form = document.getElementById('certificate-form');
    if (alertBox) {
        const refNo = 'CERT-' + Math.floor(100000 + Math.random() * 900000);
        alertBox.style.display = 'block';
        alertBox.innerHTML = `<strong><i class="fas fa-check-circle"></i> Application Submitted!</strong><br>Application for <strong>${certType}</strong> for ${applicantName} has been received.<br><strong>Application Reference:</strong> ${refNo}<br><small style="color: #15803d;">Track status in your notifications or profile.</small>`;
    }
    if (form) form.reset();
    showNotification(`Application for ${certType} submitted successfully!`, 'success');
}

function openBookAppointment() {
    const modal = document.getElementById('appointment-modal');
    const overlay = document.getElementById('modalOverlay');
    if (modal && overlay) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const aptDate = document.getElementById('apt-date');
        if (aptDate && !aptDate.value) {
            aptDate.value = tomorrow.toISOString().split('T')[0];
            aptDate.min = tomorrow.toISOString().split('T')[0];
        }

        overlay.style.display = 'block';
        modal.style.display = 'block';
        setTimeout(() => {
            overlay.style.opacity = '1';
            modal.style.opacity = '1';
            modal.style.transform = 'translate(-50%, -50%)';
        }, 10);
    }
}

function closeAppointmentModal() {
    const modal = document.getElementById('appointment-modal');
    const overlay = document.getElementById('modalOverlay');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -40%)';
        setTimeout(() => {
            modal.style.display = 'none';
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.style.display = 'none'; }, 200);
            }
        }, 300);
    }
}

async function submitAppointmentBooking(event) {
    if (event && event.preventDefault) event.preventDefault();
    const dept = document.getElementById('apt-dept')?.value || 'Municipal Administration';
    const date = document.getElementById('apt-date')?.value || '';
    const slot = document.getElementById('apt-slot')?.value || '10:00 AM - 11:30 AM';
    const notes = document.getElementById('apt-notes')?.value || '';

    if (!date) {
        showNotification('Please select an appointment date', 'warning');
        return;
    }

    const alertBox = document.getElementById('apt-success-alert');
    const form = document.getElementById('appointment-form');

    try {
        const submitBtn = form?.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Booking Appointment...';
        }

        const response = await fetch('/user/bookAppointment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                department: dept,
                appointment_date: date,
                time_slot: slot,
                purpose: notes
            })
        });

        const data = await response.json();

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check-circle" style="margin-right: 6px;"></i> Confirm Appointment';
        }

        if (response.ok && data.success) {
            const token = data.appointment?.token_number || ('APT-' + Math.floor(100000 + Math.random() * 900000));
            if (alertBox) {
                alertBox.style.display = 'block';
                alertBox.innerHTML = `
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <i class="fas fa-calendar-check" style="color:#16a34a; font-size:1.2rem;"></i>
                        <strong style="color:#15803d; font-size:1.05rem;">Appointment Confirmed!</strong>
                    </div>
                    <div>Meeting with <strong>${dept}</strong> scheduled for <strong>${date}</strong> (${slot}).</div>
                    <div style="margin-top:6px; font-weight:700; color:#0f172a;">Token Number: <span style="background:white; padding:2px 8px; border-radius:4px; border:1px solid #bbf7d0; color:#166534;">${token}</span></div>
                    <small style="color: #15803d; display:block; margin-top:6px;">This appointment is visible to the Official and Admin dashboards.</small>
                `;
            }
            if (form) form.reset();
            showNotification(`Appointment confirmed with ${dept}! Token: ${token}`, 'success');
        } else {
            showNotification(data.message || 'Failed to book appointment', 'error');
        }
    } catch (err) {
        console.error('Error booking appointment:', err);
        showNotification('Network error while booking appointment', 'error');
    }
}

// REMOVED: openService(serviceName) function is gone.

// These are the accessibility functions, they will work fine here
function toggleHighContrast() {
    document.body.classList.toggle('high-contrast');
    // You'll need to define .high-contrast in your CSS file
}

function increaseTextSize() {
    const currentSize = parseFloat(getComputedStyle(document.body).fontSize);
    document.body.style.fontSize = (currentSize + 2) + 'px';
}

function toggleScreenReader() {
    alert('Screen reader mode toggled (simulation)');
}

async function logout() {
    try {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
        await fetch('/user/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (e) {
        console.warn('Logout fetch warning:', e);
    }
    // Navigate through /user/logout to guarantee cookie is cleared on server
    window.location.href = '/user/logout';
}

// Load initial notification count
async function loadInitialNotificationCount() {
    try {
        const response = await fetch(`${SERVER_URL}/user/trackComplain`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok && data.complaints) {
            updateNotificationBadge(data.complaints.length);
        }
    } catch (error) {
        console.error('❌ Error loading notification count:', error);
    }
}

// Close profile menu and notifications panel when clicking outside
document.addEventListener('click', function (event) {
    const profileMenu = document.querySelector('.profile-menu');
    const profileMenuDropdown = document.getElementById('profileMenu');
    const notificationsBtn = document.querySelector('.notifications');
    const notificationsPanel = document.getElementById('notificationsPanel');

    // Close profile menu if clicking outside
    if (profileMenuDropdown && !profileMenu.contains(event.target) && !profileMenuDropdown.contains(event.target)) {
        profileMenuDropdown.classList.remove('active');
    }

    // Close notifications panel if clicking outside
    if (notificationsPanel &&
        !notificationsBtn.contains(event.target) &&
        !notificationsPanel.contains(event.target) &&
        notificationsPanel.classList.contains('active')) {
        notificationsPanel.classList.remove('active');
    }
});

// Fetch area problems function
async function fetchAreaProblems() {
    const contentDiv = document.getElementById('area-problems-content');
    const fetchBtn = document.querySelector('.fetch-problems-btn');

    if (!contentDiv) return;

    // Show loading state
    const loadingText = currentLang === 'hi' ? 'समस्याएं लोड हो रही हैं...' : 'Loading problems...';
    contentDiv.innerHTML = `<p style="color: #64748b; text-align: center; padding: 1rem;"><i class="fas fa-spinner fa-spin"></i> ${loadingText}</p>`;

    if (fetchBtn) {
        fetchBtn.disabled = true;
        fetchBtn.style.opacity = '0.6';
    }

    try {
        // Fetch area problems from the server (using viewLocalIssues endpoint)
        const response = await fetch(`${SERVER_URL}/user/viewLocalIssues`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok && data.localIssues && data.localIssues.length > 0) {
            // Display the fetched problems
            contentDiv.innerHTML = '';

            data.localIssues.forEach(problem => {
                const alertItem = document.createElement('div');
                alertItem.className = 'alert-item';

                // Determine urgency based on status
                const urgencyClass = problem.status === 'pending' ? 'urgent' : 'info';
                alertItem.classList.add(urgencyClass);

                alertItem.innerHTML = `
                            <span class="alert-dot"></span>
                            <div>
                                <p>${problem.description ? problem.description.substring(0, 50) + '...' : 'Issue'}</p>
                                <small>${problem.City || 'Unknown location'} - ${new Date(problem.created_at).toLocaleDateString()}</small>
                            </div>
                        `;

                contentDiv.appendChild(alertItem);
            });

            showNotification('Area problems loaded successfully', 'success');
            // Toggle buttons: hide "View More" and show "View Less"
            try {
                const collapseBtn = document.querySelector('.collapse-problems-btn');
                if (collapseBtn) collapseBtn.style.display = 'block';
                if (fetchBtn) fetchBtn.style.display = 'none';
            } catch (err) {
                console.warn('Could not toggle area problems buttons', err);
            }
        } else {
            // No problems found
            const noProblemsText = currentLang === 'hi' ? 'आपके क्षेत्र में कोई समस्या नहीं मिली' : 'No problems found in your area';
            contentDiv.innerHTML = `<p style="color: #64748b; text-align: center; padding: 1rem;">${noProblemsText}</p>`;
            showNotification(noProblemsText, 'info');
            // Ensure buttons state stays sensible
            try {
                const collapseBtn = document.querySelector('.collapse-problems-btn');
                if (collapseBtn) collapseBtn.style.display = 'none';
                if (fetchBtn) fetchBtn.style.display = 'block';
            } catch (err) {
                console.warn('Could not set area problems button state', err);
            }
        }
    } catch (error) {
        console.error('❌ Error fetching area problems:', error);
        const errorText = currentLang === 'hi' ? 'समस्याएं लोड करने में त्रुटि' : 'Error loading problems';
        contentDiv.innerHTML = `<p style="color: #ef4444; text-align: center; padding: 1rem;"><i class="fas fa-exclamation-triangle"></i> ${errorText}</p>`;
        showNotification(errorText, 'error');
    } finally {
        // Re-enable button
        if (fetchBtn) {
            fetchBtn.disabled = false;
            fetchBtn.style.opacity = '1';
        }
    }
}

// Collapse area problems back to the default summary view
function collapseAreaProblems() {
    const contentDiv = document.getElementById('area-problems-content');
    const fetchBtn = document.querySelector('.fetch-problems-btn');
    const collapseBtn = document.querySelector('.collapse-problems-btn');

    if (!contentDiv) return;

    // Restore the default compact items (same markup as initial page)
    contentDiv.innerHTML = `
            <div class="alert-item urgent">
                <span class="alert-dot"></span>
                <div>
                    <p>Water service interruption</p>
                    <small>Main St. - Today 2-6 PM</small>
                </div>
            </div>
            <div class="alert-item info">
                <span class="alert-dot"></span>
                <div>
                    <p>Road construction</p>
                    <small>Oak Ave. - Next week</small>
                </div>
            </div>
    `;

    // Toggle buttons
    try {
        if (fetchBtn) fetchBtn.style.display = 'block';
        if (collapseBtn) collapseBtn.style.display = 'none';
    } catch (err) {
        console.warn('Could not toggle area problems buttons', err);
    }
}

// ==================== VOICE ASSISTANT FUNCTIONS ====================

let isRecording = false;
let isTTSEnabled = true;
let recognition = null;
let conversationContext = [];

// Initialize Speech Recognition
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = currentLang === 'hi' ? 'hi-IN' : 'en-US';

        recognition.onstart = function () {
            console.log('🎤 Voice recognition started');
            const listeningText = currentLang === 'hi' ? TRANSLATIONS.hi.voice_listening : 'Listening...';
            updateVoiceStatus(listeningText, 'listening');
        };

        recognition.onresult = function (event) {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Update live transcript
            const transcriptDiv = document.getElementById('liveTranscript');
            if (transcriptDiv) {
                transcriptDiv.innerHTML = `<p>${finalTranscript || interimTranscript || 'Listening...'}</p>`;
            }

            // If final transcript, send to Gemini
            if (finalTranscript) {
                sendMessageToGemini(finalTranscript);
            }
        };

        recognition.onerror = function (event) {
            console.error('❌ Speech recognition error:', event.error);

            // Handle different error types
            if (event.error === 'network') {
                console.log('🔄 Network error - trying text input fallback');
                // Show text input option
                showTextInputFallback();
            } else if (event.error === 'no-speech') {
                const noSpeechMsg = currentLang === 'hi' ? 'कोई आवाज़ नहीं सुनाई दी' : 'No speech detected';
                updateVoiceStatus(noSpeechMsg, 'error');
            } else if (event.error === 'not-allowed') {
                const permissionMsg = currentLang === 'hi' ? 'माइक्रोफ़ोन की अनुमति नहीं' : 'Microphone permission denied';
                updateVoiceStatus(permissionMsg, 'error');
                alert(currentLang === 'hi' ? 'कृपया माइक्रोफ़ोन की अनुमति दें' : 'Please allow microphone access');
            } else {
                const errorMsg = currentLang === 'hi' ? TRANSLATIONS.hi.voice_error : 'Voice recognition error';
                updateVoiceStatus(errorMsg, 'error');
            }

            isRecording = false;
            updateMicButton();
        };

        recognition.onend = function () {
            console.log('🎤 Voice recognition ended');
            isRecording = false;
            updateMicButton();
            const statusMsg = currentLang === 'hi' ? 'बोलने के लिए क्लिक करें' : 'Click to speak';
            updateVoiceStatus(statusMsg, 'idle');
        };
    } else {
        console.error('❌ Speech recognition not supported');
        const errorMsg = currentLang === 'hi' ? TRANSLATIONS.hi.voice_not_supported : 'Voice recognition not supported';
        updateVoiceStatus(errorMsg, 'error');
    }
}

// Toggle voice recording
function toggleVoiceRecording() {
    if (!recognition) {
        initSpeechRecognition();
    }

    if (!recognition) {
        const alertMsg = currentLang === 'hi' ? TRANSLATIONS.hi.voice_not_supported : 'Your browser does not support voice recognition';
        alert(alertMsg);
        return;
    }

    if (isRecording) {
        recognition.stop();
        isRecording = false;
    } else {
        // Update language before starting
        recognition.lang = currentLang === 'hi' ? 'hi-IN' : 'en-US';
        recognition.start();
        isRecording = true;
    }

    updateMicButton();
}

// Update mic button appearance
function updateMicButton() {
    const micBtn = document.getElementById('micBtn');
    if (micBtn) {
        if (isRecording) {
            micBtn.classList.add('recording');
            micBtn.innerHTML = '<i class="fas fa-stop"></i>';
        } else {
            micBtn.classList.remove('recording');
            micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        }
    }
}

// Update voice status display
function updateVoiceStatus(message, state = 'idle') {
    const statusEl = document.getElementById('voiceStatus');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = `voice-status-${state}`;
    }
}

// Handle AI agent response - auto-fill forms
function handleAgentResponse(agentResponse) {
    if (!agentResponse) return;

    const { intent, fields, missingFields, followUpQuestion, action, targetPage } = agentResponse;

    console.log(' Handling agent response:', agentResponse);

    if (intent === 'REPORT_COMPLAINT' && fields) {
        // Find the complaint form
        const form = document.getElementById('report-issue-form');
        if (!form) {
            console.log(' Complaint form not found');
            return;
        }

        // Open the modal if closed
        if (typeof openReportIssue === 'function') {
            openReportIssue();
        }

        // Fill form fields
        Object.keys(fields).forEach(key => {
            const element = form.querySelector(`[name="${key}"]`);
            if (element && fields[key]) {
                element.value = fields[key];
                // Trigger change event to update any dependent fields
                element.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(` Filled ${key}: ${fields[key]}`);
            }
        });

        // Show notification if form was filled
        if (Object.keys(fields).length > 0) {
            const fillMsg = currentLang === 'hi'
                ? 'Form fields filled automatically!'
                : 'Form fields filled automatically!';
            showNotification(fillMsg, 'success');
        }

        // Auto-submit if the agent says so
        if (agentResponse.autoSubmit) {
            console.log('🚀 Auto-submitting complaint form...');
            const submitBtn = document.querySelector('#submitComplaint');
            if (submitBtn) {
                // Short delay to allow UI to update
                setTimeout(() => {
                    submitBtn.click();
                    showNotification('Auto-submitting your complaint...', 'info');
                }, 1000);
            } else {
                console.warn('⚠️ Auto-submit button #submitComplaint not found');
            }
        }

        // If missing fields, the follow-up question is already shown in the chat
    } else if (intent === 'TRACK_COMPLAINT') {
        // Open track complaint modal
        if (typeof openTrackComplaint === 'function') {
            openTrackComplaint();
        }
    } else if (intent === 'HISTORY_REPORT') {
        // Generate report
        if (typeof generateReport === 'function') {
            generateReport();
        } else {
            // Fallback: navigate to report endpoint
            window.open(`${SERVER_URL}/api/chat/report?format=json`, '_blank');
        }
    }
}

// Send message to Gemini API
async function sendMessageToGemini(message) {
    const transcriptDiv = document.getElementById('liveTranscript');

    try {
        console.log('🎤 Sending message to Gemini:', message);
        const processingText = currentLang === 'hi' ? TRANSLATIONS.hi.voice_processing : 'Getting response...';
        updateVoiceStatus(processingText, 'processing');

        const youText = currentLang === 'hi' ? TRANSLATIONS.hi.you : 'You';
        const generatingText = currentLang === 'hi' ? TRANSLATIONS.hi.generating_response : 'Generating response...';

        if (transcriptDiv) {
            transcriptDiv.innerHTML = `<p><strong>${youText}:</strong> ${message}</p><p><i class="fas fa-spinner fa-spin"></i> ${generatingText}</p>`;
        }

        // Build context from conversation history
        const context = conversationContext.slice(-3).map(c => `User: ${c.user}\nAssistant: ${c.assistant}`).join('\n\n');

        console.log('📡 Calling API:', `${SERVER_URL}/api/chat/message`);
        const response = await fetch(`${SERVER_URL}/api/chat/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                message: message,
                language: currentLang,
                context: context,
                useAgent: true
            })
        });

        console.log('📥 Response status:', response.status);

        // Check if response is ok before parsing JSON
        if (!response.ok) {
            let errorMessage = 'Failed to get response';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.errorHi || errorMessage;
            } catch (e) {
                errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('📦 Response data:', data);

        if (data.success) {
            // Handle agent response or regular response
            const aiResponse = data.agentResponse
                ? (data.agentResponse.followUpQuestion || data.agentResponse.message || data.response)
                : data.response;

            if (!aiResponse) {
                throw new Error(data.error || data.errorHi || 'No response received');
            }

            // Update conversation context
            conversationContext.push({
                user: message,
                assistant: aiResponse
            });

            // Keep only last 5 exchanges
            if (conversationContext.length > 5) {
                conversationContext.shift();
            }

            // Display response
            const youText = currentLang === 'hi' ? TRANSLATIONS.hi.you : 'You';
            const assistantText = currentLang === 'hi' ? TRANSLATIONS.hi.assistant : 'Assistant';

            if (transcriptDiv) {
                transcriptDiv.innerHTML = `
                            <p><strong>${youText}:</strong> ${message}</p>
                            <p><strong>${assistantText}:</strong> ${aiResponse}</p>
                        `;
            }

            // Handle agent response - auto-fill form if needed
            if (data.agentResponse) {
                console.log('🎯 Agent Response Detected:', data.agentResponse.intent);
                handleAgentResponse(data.agentResponse);
            }

            // Speak response if TTS enabled
            if (isTTSEnabled) {
                speakText(aiResponse);
            }

            const idleText = currentLang === 'hi' ? TRANSLATIONS.hi.click_to_speak : 'Click to speak';
            updateVoiceStatus(idleText, 'idle');
        } else {
            throw new Error(data.error || data.errorHi || 'Failed to get response');
        }
    } catch (error) {
        console.error('❌ Error sending message to Gemini:', error);

        // Check if it's an authentication error
        if (error.message.includes('User not found') || error.message.includes('Authentication token')) {
            const authErrorMsg = currentLang === 'hi'
                ? 'सत्र समाप्त हो गया। कृपया फिर से लॉगिन करें।'
                : 'Session expired. Please login again.';

            if (transcriptDiv) {
                transcriptDiv.innerHTML = `
                            <p style="color: #fca5a5;">
                                <i class="fas fa-exclamation-triangle"></i> ${authErrorMsg}
                            </p>
                            <button onclick="window.location.href='/user/login'" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                                ${currentLang === 'hi' ? 'लॉगिन पेज पर जाएं' : 'Go to Login'}
                            </button>
                        `;
            }

            updateVoiceStatus(authErrorMsg, 'error');
            showNotification(authErrorMsg, 'error');
        } else {
            const errorMsg = currentLang === 'hi' ? TRANSLATIONS.hi.error_loading_notifications : 'Error getting response';

            if (transcriptDiv) {
                transcriptDiv.innerHTML = `<p style="color: #fca5a5;"><i class="fas fa-exclamation-triangle"></i> ${errorMsg}</p>`;
            }

            updateVoiceStatus(errorMsg, 'error');
            showNotification(errorMsg, 'error');
        }
    }
}

// Text-to-Speech function
function speakText(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentLang === 'hi' ? 'hi-IN' : 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = function () {
            console.log('🔊 TTS started');
        };

        utterance.onend = function () {
            console.log('🔊 TTS ended');
        };

        utterance.onerror = function (event) {
            console.error('❌ TTS error:', event);
        };

        window.speechSynthesis.speak(utterance);
    } else {
        console.warn('⚠️ Text-to-speech not supported');
    }
}

// Toggle TTS on/off
function toggleTTS() {
    isTTSEnabled = !isTTSEnabled;
    const ttsBtn = document.querySelector('.tts-toggle');

    if (ttsBtn) {
        if (isTTSEnabled) {
            ttsBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            ttsBtn.classList.remove('disabled');
            const enabledMsg = currentLang === 'hi' ? TRANSLATIONS.hi.voice_enabled : 'Voice enabled';
            showNotification(enabledMsg, 'success');
        } else {
            ttsBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            ttsBtn.classList.add('disabled');
            window.speechSynthesis.cancel(); // Stop any ongoing speech
            const disabledMsg = currentLang === 'hi' ? TRANSLATIONS.hi.voice_disabled : 'Voice disabled';
            showNotification(disabledMsg, 'info');
        }
    }
}

// Show text input fallback when voice fails
function showTextInputFallback() {
    const transcriptDiv = document.getElementById('liveTranscript');
    if (transcriptDiv) {
        const placeholder = currentLang === 'hi' ? 'अपना संदेश यहाँ टाइप करें...' : 'Type your message here...';
        const sendText = currentLang === 'hi' ? 'भेजें' : 'Send';

        transcriptDiv.innerHTML = `
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="text" id="textInputFallback"
                               placeholder="${placeholder}"
                               style="flex: 1; padding: 8px; border: 1px solid rgba(255,255,255,0.3);
                                      border-radius: 8px; background: rgba(255,255,255,0.1);
                                      color: white; font-size: 0.9rem;"
                               onkeypress="if(event.key==='Enter') sendTextMessage()">
                        <button onclick="sendTextMessage()"
                                style="padding: 8px 16px; background: rgba(255,255,255,0.2);
                                       border: none; border-radius: 8px; color: white;
                                       cursor: pointer; font-weight: 600;">
                            ${sendText}
                        </button>
                    </div>
                `;

        // Focus on input
        setTimeout(() => {
            const input = document.getElementById('textInputFallback');
            if (input) input.focus();
        }, 100);
    }

    const fallbackMsg = currentLang === 'hi' ? 'टेक्स्ट इनपुट का उपयोग करें' : 'Use text input';
    updateVoiceStatus(fallbackMsg, 'idle');
}

// Send text message from fallback input
function sendTextMessage() {
    const input = document.getElementById('textInputFallback');
    if (input && input.value.trim()) {
        const message = input.value.trim();
        sendMessageToGemini(message);
    }
}

// Initialize speech recognition on page load
document.addEventListener('DOMContentLoaded', function () {
    initSpeechRecognition();
});

// ═══════════════════════════════════════════════════════════════════
// RESEARCH PAPER SECTION V-E: IN-APP CITIZEN OTP VERIFICATION & REOPEN
// ═══════════════════════════════════════════════════════════════════

let activeOtpComplaintId = null;
let activeOtpKnownValue = '';
let activeReopenComplaintId = null;

function copyOtpToClipboard(otp) {
    if (!otp) return;
    navigator.clipboard.writeText(otp).then(() => {
        showNotification(`📋 Copied Resolution OTP: ${otp}`, 'info');
    }).catch(() => {
        showNotification(`OTP Code: ${otp}`, 'info');
    });
}

function citizenVerifyOTP(complaintId, knownOtp, categoryName) {
    activeOtpComplaintId = complaintId;
    activeOtpKnownValue = (knownOtp && knownOtp !== 'undefined') ? String(knownOtp) : '';

    const modal = document.getElementById('otp-verify-modal');
    const overlay = document.getElementById('modalOverlay');
    const idEl = document.getElementById('otpModalComplaintId');
    const catEl = document.getElementById('otpModalCategory');
    const knownEl = document.getElementById('otpModalKnownOtp');
    const errEl = document.getElementById('otp-error-msg');

    if (idEl) idEl.textContent = `#${complaintId}`;
    if (catEl) catEl.textContent = categoryName || 'Civic Issue';
    if (knownEl) knownEl.textContent = activeOtpKnownValue || 'Available in Card';
    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }

    // Clear and reset 6 digit input boxes
    for (let i = 0; i < 6; i++) {
        const inp = document.getElementById(`otp_d_${i}`);
        if (inp) {
            inp.value = '';
            inp.classList.remove('filled');
        }
    }

    if (modal && overlay) {
        overlay.style.display = 'block';
        modal.style.display = 'block';
        setTimeout(() => {
            overlay.style.opacity = '1';
            modal.style.opacity = '1';
            modal.style.transform = 'translate(-50%, -50%) scale(1)';
            const firstInput = document.getElementById('otp_d_0');
            if (firstInput) firstInput.focus();
        }, 10);
    }
}

function closeOtpVerifyModal() {
    const modal = document.getElementById('otp-verify-modal');
    const overlay = document.getElementById('modalOverlay');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -46%) scale(0.96)';
        setTimeout(() => {
            modal.style.display = 'none';
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.style.display = 'none'; }, 200);
            }
        }, 250);
    }
}

function autofillMyOtp() {
    if (!activeOtpKnownValue || activeOtpKnownValue.length < 6) {
        showNotification('Assigned OTP not available for auto-fill', 'warning');
        return;
    }
    const digits = activeOtpKnownValue.slice(0, 6).split('');
    digits.forEach((d, i) => {
        const inp = document.getElementById(`otp_d_${i}`);
        if (inp) {
            inp.value = d;
            inp.classList.add('filled');
        }
    });
    const submitBtn = document.getElementById('btnSubmitOtpVerification');
    if (submitBtn) submitBtn.focus();
}

async function submitOtpVerification() {
    if (!activeOtpComplaintId) return;

    let enteredOtp = '';
    for (let i = 0; i < 6; i++) {
        const inp = document.getElementById(`otp_d_${i}`);
        if (inp && inp.value) {
            enteredOtp += inp.value.trim();
        }
    }

    const errEl = document.getElementById('otp-error-msg');
    if (enteredOtp.length !== 6) {
        if (errEl) {
            errEl.textContent = 'Please enter the complete 6-digit verification code.';
            errEl.style.display = 'block';
        }
        return;
    }

    const btn = document.getElementById('btnSubmitOtpVerification');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    }

    try {
        const res = await fetch(`/complaints/${activeOtpComplaintId}/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ otp: enteredOtp })
        });
        const data = await res.json();

        if (res.ok) {
            showNotification('✅ Resolution verified! Civic grievance officially confirmed & closed.', 'success');
            closeOtpVerifyModal();
            setTimeout(() => {
                if (typeof loadComplaints === 'function') loadComplaints();
                if (typeof openTrackComplaint === 'function') openTrackComplaint();
            }, 400);
        } else {
            if (errEl) {
                errEl.textContent = data.error || 'Incorrect OTP code. Please verify with field worker.';
                errEl.style.display = 'block';
            }
            showNotification(data.error || 'Failed to verify OTP', 'error');
        }
    } catch (err) {
        console.error('Error verifying OTP:', err);
        if (errEl) {
            errEl.textContent = 'Server error during verification. Please try again.';
            errEl.style.display = 'block';
        }
        showNotification('Verification network error', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-double"></i> Confirm & Close Ticket';
        }
    }
}

// Attach Auto-Focus & Paste Listeners to 6-Digit OTP Boxes
document.addEventListener('DOMContentLoaded', () => {
    for (let i = 0; i < 6; i++) {
        const inp = document.getElementById(`otp_d_${i}`);
        if (!inp) continue;

        inp.addEventListener('input', (e) => {
            const val = e.target.value.replace(/\D/g, '');
            e.target.value = val ? val[val.length - 1] : '';
            if (e.target.value) {
                e.target.classList.add('filled');
                if (i < 5) {
                    const next = document.getElementById(`otp_d_${i + 1}`);
                    if (next) next.focus();
                }
            } else {
                e.target.classList.remove('filled');
            }
        });

        inp.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && i > 0) {
                const prev = document.getElementById(`otp_d_${i - 1}`);
                if (prev) {
                    prev.focus();
                    prev.value = '';
                    prev.classList.remove('filled');
                }
            } else if (e.key === 'Enter') {
                submitOtpVerification();
            }
        });

        inp.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
            if (pasted.length >= 6) {
                for (let k = 0; k < 6; k++) {
                    const digitInp = document.getElementById(`otp_d_${k}`);
                    if (digitInp) {
                        digitInp.value = pasted[k];
                        digitInp.classList.add('filled');
                    }
                }
                const submitBtn = document.getElementById('btnSubmitOtpVerification');
                if (submitBtn) submitBtn.focus();
            }
        });
    }

    // Initialize Typewriter Placeholder
    initTypewriterPlaceholder();
});

// In-App Reopen Modal Functions
function openReopenModal(complaintId) {
    activeReopenComplaintId = complaintId;
    const modal = document.getElementById('reopen-issue-modal');
    const overlay = document.getElementById('modalOverlay');
    const textarea = document.getElementById('reopen-reason-text');
    if (textarea) textarea.value = '';

    if (modal && overlay) {
        overlay.style.display = 'block';
        modal.style.display = 'block';
        setTimeout(() => {
            overlay.style.opacity = '1';
            modal.style.opacity = '1';
            modal.style.transform = 'translate(-50%, -50%) scale(1)';
            if (textarea) textarea.focus();
        }, 10);
    }
}

function closeReopenModal() {
    const modal = document.getElementById('reopen-issue-modal');
    const overlay = document.getElementById('modalOverlay');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -46%) scale(0.96)';
        setTimeout(() => {
            modal.style.display = 'none';
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.style.display = 'none'; }, 200);
            }
        }, 250);
    }
}

function setReopenReason(reason) {
    const textarea = document.getElementById('reopen-reason-text');
    if (textarea) {
        textarea.value = reason;
        textarea.focus();
    }
}

async function submitReopenIssue() {
    if (!activeReopenComplaintId) return;
    const textarea = document.getElementById('reopen-reason-text');
    const reason = textarea ? textarea.value.trim() : '';

    if (!reason) {
        showNotification('Please enter a reason explaining why the issue is not resolved.', 'warning');
        return;
    }

    const btn = document.getElementById('btnSubmitReopen');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Escalating Ticket...';
    }

    try {
        const res = await fetch(`/complaints/${activeReopenComplaintId}/reopen`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ reopen_reason: reason })
        });
        const data = await res.json();
        if (res.ok) {
            showNotification('⚠️ Issue reopened and escalated to field crews with elevated priority!', 'warning');
            closeReopenModal();
            setTimeout(() => {
                if (typeof loadComplaints === 'function') loadComplaints();
                if (typeof openTrackComplaint === 'function') openTrackComplaint();
            }, 400);
        } else {
            showNotification(data.error || 'Failed to reopen complaint', 'error');
        }
    } catch (err) {
        console.error('Error reopening complaint:', err);
        showNotification('Server error reopening complaint', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-fire"></i> Reopen & Escalate Ticket';
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// ULTRA-SMOOTH TYPEWRITER ANIMATION & AI POLISH ENGINE
// ═══════════════════════════════════════════════════════════════════

let activeTypewriterTimer = null;

function typewriterWrite(textarea, text, speed = 16) {
    if (!textarea) return;
    if (activeTypewriterTimer) clearInterval(activeTypewriterTimer);

    textarea.value = '';
    textarea.focus();
    const indicator = document.getElementById('typewriter-indicator');
    if (indicator) indicator.style.display = 'inline-block';

    let index = 0;
    activeTypewriterTimer = setInterval(() => {
        if (index < text.length) {
            textarea.value += text.charAt(index);
            index++;
            textarea.scrollTop = textarea.scrollHeight;
        } else {
            clearInterval(activeTypewriterTimer);
            activeTypewriterTimer = null;
            if (indicator) indicator.style.display = 'none';
        }
    }, speed);
}

const PRESET_ISSUES = {
    pothole: {
        category: 'Road Maintenance',
        department: 'Road Maintenance',
        text: 'Severe pothole approximately 2 feet in diameter located on the main road. Creating significant traffic congestion and extreme danger for two-wheelers and pedestrians, especially after sunset.'
    },
    streetlight: {
        category: 'Electricity',
        department: 'Electricity',
        text: 'Municipal street lighting fixture has been completely non-functional for past 3 days opposite residential blocks, leaving the thoroughfare in total pitch darkness and causing serious safety concerns.'
    },
    waterleak: {
        category: 'Water Supply',
        department: 'Water Supply',
        text: 'High-pressure drinking water supply pipeline fracture causing massive clean water loss and flooding over the road pavement. Immediate valve shut-off and pipe restoration required.'
    },
    garbage: {
        category: 'Sanitation',
        department: 'Sanitation',
        text: 'Severe municipal garbage container overflow onto public sidewalk causing unbearable stench, stray animal menace, and imminent health risks to neighborhood school and families.'
    },
    manhole: {
        category: 'Sanitation',
        department: 'Sanitation',
        text: 'Damaged and cracked concrete cover on open drainage manhole in pedestrian walkway. Severe fall hazard requiring urgent replacement before accidents occur.'
    },
    drainage: {
        category: 'Sanitation',
        department: 'Sanitation',
        text: 'Underground sewage drainage line choked near community hall, causing dark contaminated water backflow onto street sidewalk and residential gate entrances.'
    }
};

function typewritePreset(presetKey) {
    const preset = PRESET_ISSUES[presetKey];
    if (!preset) return;

    const catSelect = document.getElementById('issue-category');
    const deptSelect = document.getElementById('issue-department');
    const textarea = document.getElementById('issue-description');

    if (catSelect) catSelect.value = preset.category;
    if (deptSelect) deptSelect.value = preset.department;

    if (textarea) {
        typewriterWrite(textarea, preset.text, 14);
    }
}

function polishWithAI() {
    const textarea = document.getElementById('issue-description');
    if (!textarea) return;

    const currentText = textarea.value.trim();
    let polishedText = '';

    if (!currentText || currentText.length < 5) {
        polishedText = 'Severe civic infrastructure defect in our municipal locality requiring urgent site inspection, structural repair, and departmental mitigation to ensure public health and safety.';
    } else {
        const lower = currentText.toLowerCase();
        if (lower.includes('pothole') || lower.includes('road')) {
            polishedText = `Critical road surface deterioration reported: ${currentText}. Creating severe vehicular hazard and pedestrian disruption. Urgent bitumen repaving and leveling requested.`;
        } else if (lower.includes('light') || lower.includes('dark')) {
            polishedText = `Municipal illumination failure: ${currentText}. Thoroughfare plunged into darkness compromising community safety. Urgent lamp replacement and line circuit check required.`;
        } else if (lower.includes('water') || lower.includes('pipe')) {
            polishedText = `Water supply infrastructure failure: ${currentText}. Clean potable water flooding public roadway and depleting reservoir pressure. Urgent pipeline maintenance requested.`;
        } else if (lower.includes('garbage') || lower.includes('waste')) {
            polishedText = `Public hygiene & sanitation grievance: ${currentText}. Waste accumulation posing severe environmental and epidemiological hazards to residents. Immediate disposal truck deployment required.`;
        } else {
            polishedText = `Formal civic grievance submission: ${currentText}. Reported condition severely impacts daily resident movement and community safety. Expedited field inspection requested.`;
        }
    }

    typewriterWrite(textarea, polishedText, 14);
    showNotification('✨ Issue text polished with formal municipal phrasing!', 'success');
}

// Rotating Typewriter Placeholder
function initTypewriterPlaceholder() {
    const textarea = document.getElementById('issue-description');
    if (!textarea) return;

    const phrases = [
        'e.g. Deep pothole near main crossroad causing traffic jams...',
        'e.g. Streetlight flickering and completely off after 8 PM...',
        'e.g. Broken water pipeline leaking clean water across sidewalk...',
        'e.g. Solid waste container overflowing with garbage near park...',
        'e.g. Open damaged manhole cover posing danger to pedestrians...'
    ];

    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let isPaused = false;

    textarea.addEventListener('focus', () => { isPaused = true; });
    textarea.addEventListener('blur', () => { isPaused = false; });

    setInterval(() => {
        if (isPaused || textarea.value.length > 0) return;

        const currentPhrase = phrases[phraseIndex];
        if (isDeleting) {
            charIndex--;
            textarea.setAttribute('placeholder', currentPhrase.substring(0, charIndex));
            if (charIndex === 0) {
                isDeleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
            }
        } else {
            charIndex++;
            textarea.setAttribute('placeholder', currentPhrase.substring(0, charIndex));
            if (charIndex === currentPhrase.length) {
                isDeleting = true;
            }
        }
    }, 110);
}

// ═══════════════════════════════════════════════════════════════════
// GLOBAL WINDOW EXPORTS (Guarantees every button across all portals functions)
// ═══════════════════════════════════════════════════════════════════

window.openReportIssue = openReportIssue;
window.reportIssue = openReportIssue;
window.closeReportModal = closeReportModal;
window.openTrackComplaint = openTrackComplaint;
window.trackComplaint = openTrackComplaint;
window.trackSpecificComplaint = trackSpecificComplaint;
window.viewComplaints = openViewComplaints;
window.openViewComplaints = openViewComplaints;
window.showAllComplaints = showAllComplaints;
window.openPayBill = openPayBill;
window.payBill = openPayBill;
window.closePayBillModal = closePayBillModal;
window.openBookAppointment = openBookAppointment;
window.closeAppointmentModal = closeAppointmentModal;
window.submitAppointmentBooking = submitAppointmentBooking;
window.openRequestCertificate = openRequestCertificate;
window.closeCertificateModal = closeCertificateModal;
window.citizenVerifyOTP = citizenVerifyOTP;
window.closeOtpVerifyModal = closeOtpVerifyModal;
window.autofillMyOtp = autofillMyOtp;
window.submitOtpVerification = submitOtpVerification;
window.openReopenModal = openReopenModal;
window.closeReopenModal = closeReopenModal;
window.setReopenReason = setReopenReason;
window.submitReopenIssue = submitReopenIssue;
window.copyOtpToClipboard = copyOtpToClipboard;
window.typewriterWrite = typewriterWrite;
window.typewritePreset = typewritePreset;
window.polishWithAI = polishWithAI;
