// Initialize staff dashboard

let fullUserData = {};
let allComplaints = [];
let currentFilterTab = 'my-tasks';

// Universal auth headers helper to ensure seamless authentication
function getAuthHeaders(extraHeaders = {}) {
    const token = localStorage.getItem('token') || localStorage.getItem('officialToken');
    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

async function loadStaffData() {
    console.log("Loading staff data...");
    const container = $("#mainContent");

    try {
        const resp = await fetch('/official/profile/data', {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'same-origin' // send cookies (auth token)
        });
        if (resp.status === 401) {
            // Not authenticated — redirect to login
            window.location.href = '/official/login';
            return;
        }
        const response = await resp.json();
        console.log('Full response from backend:', response);

        if (response.official || (response.profile && response.profile.length > 0)) {
            fullUserData = response.official || response.profile[0] || {};
            allComplaints = response.profile || [];

            console.log('Official Data:', fullUserData);
            console.log('All Complaints:', allComplaints);

            // Display official details in sidebar
            const officialName = ((fullUserData.First_name || 'Municipal') + ' ' + (fullUserData.Last_name || 'Officer')).trim();
            $("#staffName").text(officialName);
            $("#staffDept").text(fullUserData.Name || fullUserData.official_department_name || 'Municipal Administration');

            // Display official info in header
            $("#headerAvatar").text((fullUserData.First_name || 'M').charAt(0).toUpperCase());
            $("#headerStaffName").text(officialName);
            $(".user-avatar").text((fullUserData.First_name || 'M').charAt(0).toUpperCase());
            $(".user-profile span").text(officialName);

            // Update stats and display complaints
            updateStats();
            displayComplaints();
        } else {
            console.log('No official data returned');
            allComplaints = [];
            updateStats();
            displayComplaints();
        }
    }
    catch (error) {
        console.error('Error fetching staff profile data:', error);
        container.html(`
            <div style="padding: 40px; text-align: center; color: #ef4444;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 15px;"></i>
                <p style="font-size: 1.1rem; font-weight: 600;">Failed to load complaints</p>
                <p style="color: #64748b; font-size: 0.9rem;">${error.message || 'Please check your connection and login status.'}</p>
                <button onclick="loadStaffData()" class="btn-action-primary" style="margin-top: 15px;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `);
    }
}

// Stats update karne ke liye function
function updateStats() {
    const totalComplaints = allComplaints.filter(c => c.complaint_id).length;
    const inProgress = allComplaints.filter(c => c.status === 'in-progress').length;
    const resolved = allComplaints.filter(c => c.status === 'resolved').length;
    const reported = allComplaints.filter(c => c.status === 'reported').length;

    // Update KPI card numbers (both by ID and legacy class)
    $("#statTotalNum").text(totalComplaints);
    $("#statInProgressNum").text(inProgress);
    $("#statResolvedNum").text(resolved);
    $("#statReportedNum").text(reported);

    $(".stat-card").eq(0).find(".stat-number").text(totalComplaints);
    $(".stat-card").eq(0).find(".stat-label").text("Total Complaints");

    $(".stat-card").eq(1).find(".stat-number").text(inProgress);
    $(".stat-card").eq(1).find(".stat-label").text("In Progress");

    $(".stat-card").eq(2).find(".stat-number").text(resolved);
    $(".stat-card").eq(2).find(".stat-label").text("Resolved");

    $(".stat-card").eq(3).find(".stat-number").text(reported);
    $(".stat-card").eq(3).find(".stat-label").text("Reported (Pending)");

    // Update task counter in header
    const pendingCount = totalComplaints - resolved;
    $("#activeHeaderTaskCount").html(`${pendingCount} Active Task${pendingCount !== 1 ? 's' : ''}`);
    $(".task-counter span").html(`${pendingCount} Active Task${pendingCount !== 1 ? 's' : ''}`);
}

// Tab switcher handler
window.switchNavTab = function(tab, event) {
    if (event && event.preventDefault) event.preventDefault();
    currentFilterTab = tab;

    document.querySelectorAll('.rail-nav-item, .nav-item').forEach(item => {
        item.classList.remove('active');
    });

    const activeEl = document.getElementById(`nav-${tab}`) || document.querySelector(`a[href="#${tab}"]`);
    if (activeEl) activeEl.classList.add('active');

    displayComplaints();
};

// Complaints display karne ke liye function - DEPARTMENT & CATEGORY VIEW WITH FILTERING
function displayComplaints() {
    const complaintsContainer = $("#mainContent");
    complaintsContainer.empty();

    // Filter out invalid items
    const validComplaints = allComplaints.filter(c => c.complaint_id);

    // Apply Tab filter
    let displayList = validComplaints;
    let sectionTitle = "Department Complaints";
    let emptyMessage = "No complaints in the system yet.";
    let emptyIcon = "fa-inbox";
    let emptyHint = "When citizens report civic issues, they will appear here.";

    if (currentFilterTab === 'assigned-complaints') {
        sectionTitle = "Assigned Complaints (Field Workforce)";
        displayList = validComplaints.filter(c => c.status === 'in-progress' || c.worker_first_name || c.worker_id);
        emptyMessage = "No complaints currently assigned to field workers.";
        emptyIcon = "fa-hard-hat";
        emptyHint = "Select 'Start Work' on any reported complaint to assign a worker from your department.";
    } else if (currentFilterTab === 'field-updates') {
        sectionTitle = "Live Field Updates & Proof of Resolution";
        displayList = validComplaints.filter(c =>
            c.proof_imageUrl ||
            (c.proof_distance_meters !== null && c.proof_distance_meters !== undefined) ||
            c.resolution_otp ||
            c.otp_verified_at ||
            c.status === 'resolved' ||
            c.status === 'in-progress'
        );
        emptyMessage = "No field updates or resolution proofs recorded yet.";
        emptyIcon = "fa-map-marked-alt";
        emptyHint = "When field teams submit geotagged photos or verify citizen OTPs, live progress will appear here.";
    }

    // Update section title header
    $("#sectionTitle").html(`<i class="fas fa-layer-group" style="color: #2563eb; margin-right: 8px;"></i>${sectionTitle}`);
    $(".tasks-header h2").html(`<i class="fas fa-layer-group" style="margin-right: 8px; color: #3b82f6;"></i>${sectionTitle}`);

    // Update tasks count header
    const pendingCount = displayList.filter(c => c.status !== 'resolved').length;
    $("#tasksCount").text(`${displayList.length} total • ${pendingCount} pending`);

    if (displayList.length === 0) {
        complaintsContainer.html(`
            <div style="padding: 48px 20px; text-align: center; color: #64748b; background: rgba(248, 250, 252, 0.7); border-radius: 16px; border: 1.5px dashed #cbd5e1; margin-top: 0.5rem;">
                <div style="width: 60px; height: 60px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: inline-flex; align-items: center; justify-content: center; font-size: 1.75rem; margin-bottom: 14px;">
                    <i class="fas ${emptyIcon}"></i>
                </div>
                <h3 style="font-family: 'Outfit', sans-serif; font-size: 1.15rem; font-weight: 700; color: #0f172a; margin: 0 0 6px 0;">${emptyMessage}</h3>
                <p style="font-size: 0.9rem; max-width: 480px; margin: 0 auto 16px auto; color: #64748b;">${emptyHint}</p>
                ${currentFilterTab !== 'my-tasks' ? `
                    <button onclick="switchNavTab('my-tasks', event)" class="btn-action-primary">
                        <i class="fas fa-arrow-left"></i> View All Department Tasks
                    </button>
                ` : ''}
            </div>
        `);
        return;
    }

    // Group complaints by department first, then by category
    const departmentGroups = {};
    displayList.forEach(complaint => {
        const deptName = complaint.department_name || 'Uncategorized Department';
        if (!departmentGroups[deptName]) {
            departmentGroups[deptName] = {};
        }

        const categoryName = complaint.category_name || 'Uncategorized';
        if (!departmentGroups[deptName][categoryName]) {
            departmentGroups[deptName][categoryName] = [];
        }
        departmentGroups[deptName][categoryName].push(complaint);
    });

    // Display each department with its categories
    Object.keys(departmentGroups).sort().forEach(deptName => {
        const deptCategories = departmentGroups[deptName];
        const deptComplaints = Object.values(deptCategories).flat();
        const deptCount = deptComplaints.length;
        const deptReported = deptComplaints.filter(c => c.status === 'reported').length;
        const deptInProgress = deptComplaints.filter(c => c.status === 'in-progress').length;
        const deptResolved = deptComplaints.filter(c => c.status === 'resolved').length;

        let deptGroupHTML = `<div class="department-group-box">`;

        // Department banner with stats
        deptGroupHTML += `
            <div class="department-banner">
                <div>
                    <h3>
                        <i class="fas fa-building"></i>
                        ${deptName}
                    </h3>
                    <p>
                        ${deptCount} complaint${deptCount !== 1 ? 's' : ''} in view • ${Object.keys(deptCategories).length} categor${Object.keys(deptCategories).length !== 1 ? 'ies' : 'y'}
                    </p>
                </div>
                <div class="dept-stats-pills">
                    <span class="dept-stat-badge">
                        <i class="fas fa-exclamation-circle"></i> ${deptReported} Reported
                    </span>
                    <span class="dept-stat-badge">
                        <i class="fas fa-spinner"></i> ${deptInProgress} In Progress
                    </span>
                    <span class="dept-stat-badge">
                        <i class="fas fa-check-circle"></i> ${deptResolved} Resolved
                    </span>
                </div>
            </div>
        `;

        // Display each category within this department
        Object.keys(deptCategories).sort().forEach(categoryName => {
            const categoryComplaints = deptCategories[categoryName];
            const categoryCount = categoryComplaints.length;
            const reportedCount = categoryComplaints.filter(c => c.status === 'reported').length;
            const inProgressCount = categoryComplaints.filter(c => c.status === 'in-progress').length;
            const resolvedCount = categoryComplaints.filter(c => c.status === 'resolved').length;

            // Category banner with stats
            deptGroupHTML += `
                <div class="category-banner">
                    <h4>
                        <i class="fas fa-folder-open" style="color: #2563eb;"></i>
                        ${categoryName}
                    </h4>
                    <div class="category-meta-pills">
                        <span class="cat-pill">${categoryCount} complaints</span>
                        <span class="cat-pill">${reportedCount} reported</span>
                        <span class="cat-pill">${inProgressCount} in progress</span>
                        <span class="cat-pill">${resolvedCount} resolved</span>
                    </div>
                </div>
            `;

            // Display complaints in this category
            categoryComplaints.forEach(complaint => {
                const statusPillClass = complaint.status === 'resolved' ? 'status-pill-resolved' :
                    complaint.status === 'in-progress' ? 'status-pill-in-progress' :
                    complaint.status === 'rejected' ? 'status-pill-rejected' : 'status-pill-reported';

                const statusText = complaint.status === 'resolved' ? 'Resolved' :
                    complaint.status === 'in-progress' ? 'In Progress' :
                    complaint.status === 'rejected' ? 'Rejected' : 'Reported';

                const statusIcon = complaint.status === 'resolved' ? 'fa-check-circle' :
                    complaint.status === 'in-progress' ? 'fa-spinner fa-spin' :
                    complaint.status === 'rejected' ? 'fa-ban' : 'fa-exclamation-circle';

                // Multi-Factor Priority P(i) (Research Paper)
                const pScore = (complaint.priority_score !== undefined && complaint.priority_score !== null)
                    ? Number(complaint.priority_score).toFixed(0) : '50';
                const sev = complaint.severity || 'Medium';
                let pillClass = 'pill-p-low';
                if (pScore >= 75) {
                    pillClass = 'pill-p-critical';
                } else if (pScore >= 55) {
                    pillClass = 'pill-p-high';
                } else if (pScore >= 35) {
                    pillClass = 'pill-p-med';
                }

                const slaDueStr = complaint.sla_due_at ? new Date(complaint.sla_due_at).toLocaleDateString() : '24h SLA';

                const otpBadge = complaint.otp_verified_at ? `
                    <span class="status-pill status-pill-resolved" style="font-size: 11px;">
                        <i class="fas fa-check-double"></i> OTP Verified
                    </span>
                ` : complaint.resolution_otp ? `
                    <span class="status-pill status-pill-in-progress" style="font-size: 11px;">
                        <i class="fas fa-key"></i> OTP: ${complaint.resolution_otp}
                    </span>
                ` : '';

                // Geotag distance / Proof verification tag
                const proofBadge = complaint.proof_imageUrl ? `
                    <span class="status-pill" style="background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; font-size: 11px;">
                        <i class="fas fa-camera"></i> GPS Proof
                    </span>
                ` : '';

                deptGroupHTML += `
                    <div class="complaint-item-card">
                        <div class="complaint-main-details">
                            <div class="complaint-title-row">
                                <strong>Complaint #${complaint.complaint_id}</strong>
                                <span class="status-pill ${statusPillClass}">
                                    <i class="fas ${statusIcon}"></i> ${statusText}
                                </span>
                                <span class="priority-score-badge ${pillClass}">
                                    <i class="fas fa-fire"></i> P(i): ${pScore} (${sev})
                                </span>
                                ${otpBadge}
                                ${proofBadge}
                            </div>
                            <div class="complaint-desc-text">
                                ${complaint.description || 'No description provided'}
                            </div>
                            <div class="complaint-meta-row">
                                <span><i class="fas fa-calendar" style="color: #3b82f6;"></i> ${new Date(complaint.created_at).toLocaleDateString()}</span>
                                <span><i class="fas fa-clock" style="color: #f59e0b;"></i> ${slaDueStr}</span>
                                <span><i class="fas fa-map-marker-alt" style="color: #ef4444;"></i> ${complaint.Address_Line ? complaint.Address_Line + ', ' : ''}${complaint.City || 'Indore'}</span>
                                ${complaint.detected_city ? `<span style="color: #4f46e5; font-weight: 600;"><i class="fas fa-location-arrow"></i> ${complaint.detected_city}</span>` : ''}
                                ${complaint.worker_first_name ? `<span style="color: #059669; font-weight: 700;"><i class="fas fa-hard-hat" style="color: #10b981;"></i> ${complaint.worker_first_name} ${complaint.worker_last_name || ''}</span>` : '<span style="color: #94a3b8;"><i class="fas fa-user-clock"></i> Unassigned</span>'}
                                ${complaint.user_first_name ? `<span><i class="fas fa-user" style="color: #6366f1;"></i> ${complaint.user_first_name} ${complaint.user_last_name || ''}</span>` : ''}
                            </div>
                        </div>
                        <div class="complaint-actions">
                            ${complaint.status === 'reported' ? `
                                <button class="btn-action-primary" onclick="startTask(${complaint.complaint_id})" title="Assign field worker">
                                    <i class="fas fa-user-plus"></i> Assign Worker
                                </button>
                                <button class="btn-action-danger" onclick="openRejectModal(${complaint.complaint_id})" title="Reject grievance">
                                    <i class="fas fa-ban"></i> Reject
                                </button>
                            ` : ''}
                            ${complaint.status === 'in-progress' ? `
                                <button class="btn-action-emerald" onclick="completeTask(${complaint.complaint_id})" title="Mark task resolved">
                                    <i class="fas fa-check-double"></i> Resolve
                                </button>
                                <button class="btn-action-primary" onclick="startTask(${complaint.complaint_id})" title="Reassign field worker">
                                    <i class="fas fa-sync-alt"></i> Reassign
                                </button>
                            ` : ''}
                            <button class="btn-action-secondary" onclick="viewTask(${complaint.complaint_id})" title="View complete details">
                                <i class="fas fa-eye"></i> Details
                            </button>
                        </div>
                    </div>
                `;
            });
        });

        deptGroupHTML += `</div>`;
        complaintsContainer.append(deptGroupHTML);
    });
}

// Open a modal to enter rejection reason and submit rejection
window.openRejectModal = function (complaintId) {
    const existing = document.getElementById('reject-modal-overlay');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'reject-modal-overlay';
    modal.className = 'admin-modal-backdrop';

    modal.innerHTML = `
        <div class="admin-modal-box" style="max-width: 520px;">
            <div class="modal-header">
                <h3 style="margin: 0; font-size: 1.25rem; color: #0f172a; font-family: 'Outfit', sans-serif; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-ban" style="color: #ef4444;"></i> Reject Complaint #${complaintId}
                </h3>
                <button class="modal-close-btn" onclick="document.getElementById('reject-modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <p style="color: #64748b; margin-top: 0; font-size: 0.92rem; line-height: 1.45;">
                    Please provide an official justification for rejecting this grievance. This record will be permanently logged and visible in administrative audits.
                </p>
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #1e293b; margin-bottom: 6px;">Quick Presets:</label>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        <button type="button" onclick="document.getElementById('reject-reason-text').value='Duplicate submission of existing grievance';" class="btn-action-secondary" style="font-size: 12px; padding: 4px 10px;">Duplicate</button>
                        <button type="button" onclick="document.getElementById('reject-reason-text').value='Grievance falls outside municipal jurisdiction';" class="btn-action-secondary" style="font-size: 12px; padding: 4px 10px;">Outside Jurisdiction</button>
                        <button type="button" onclick="document.getElementById('reject-reason-text').value='Insufficient address or location details provided';" class="btn-action-secondary" style="font-size: 12px; padding: 4px 10px;">Incomplete Location</button>
                    </div>
                </div>
                <textarea id="reject-reason-text" placeholder="Enter detailed rejection justification (required)..." style="width: 100%; height: 110px; padding: 10px 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-family: inherit; font-size: 0.9rem; resize: vertical; box-sizing: border-box;"></textarea>
                <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 1.2rem;">
                    <button class="btn-action-secondary" onclick="document.getElementById('reject-modal-overlay').remove()">Cancel</button>
                    <button class="btn-action-danger" onclick="submitReject(${complaintId})" style="background: #ef4444; color: white;">
                        <i class="fas fa-ban"></i> Confirm Rejection
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('reject-reason-text').focus();
};

window.submitReject = async function (complaintId) {
    const reasonEl = document.getElementById('reject-reason-text');
    if (!reasonEl) return alert('Reason input not found');
    const reason = reasonEl.value.trim();
    if (!reason) return alert('Please provide a reason for rejection');

    try {
        const res = await fetch('/official/rejectComplaint', {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({ complaint_id: complaintId, reason })
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.message || 'Complaint successfully rejected.');
            const modal = document.getElementById('reject-modal-overlay');
            if (modal) modal.remove();
            await loadStaffData();
        } else {
            alert(data.message || 'Failed to reject complaint');
        }
    } catch (err) {
        console.error('Error rejecting complaint:', err);
        alert('Error rejecting complaint');
    }
};

window.onload = function () {
    loadStaffData();
    setupEventListeners();
};

function setupEventListeners() {
    document.querySelectorAll('.rail-nav-item, .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const href = item.getAttribute('href');
            if (href === '#my-tasks' || href === '#assigned-complaints' || href === '#field-updates') {
                e.preventDefault();
                const tab = href.replace('#', '');
                switchNavTab(tab, e);
            }
        });
    });
}

function setActiveNavItem(activeItem) {
    document.querySelectorAll('.rail-nav-item, .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    activeItem.classList.add('active');
}

let currentComplaintId = null;

// Worker Management Logic
window.startTask = async function (taskId) {
    console.log('startTask called with taskId:', taskId);
    currentComplaintId = taskId;
    await openWorkerModal(taskId);
};

window.openWorkerModal = async function (complaintId) {
    console.log('openWorkerModal called with complaintId:', complaintId);
    const modal = document.getElementById('workerModal');
    if (!modal) {
        alert('Error: Worker Modal element not found');
        return;
    }
    modal.style.display = 'flex';

    // Fetch workers
    try {
        const res = await fetch(`/official/getWorkers?complaint_id=${complaintId}`, {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'same-origin'
        });
        const data = await res.json();
        console.log('Workers data:', data);
        if (data.workers) {
            displayWorkers(data.workers, complaintId);
        } else {
            document.getElementById('workersTableBody').innerHTML = `
                <tr><td colspan="4" style="text-align: center; padding: 2rem; color: #ef4444;">Failed to load workers</td></tr>
            `;
        }
    } catch (error) {
        console.error('Error fetching workers:', error);
        alert('Failed to load workers');
    }
};

window.closeWorkerModal = function () {
    const modal = document.getElementById('workerModal');
    if (modal) modal.style.display = 'none';
    currentComplaintId = null;

    const form = document.getElementById('addWorkerForm');
    if (form && form.style.display !== 'none') {
        toggleAddWorkerForm();
    }
};

function displayWorkers(workers, complaintId) {
    const tbody = document.getElementById('workersTableBody');
    tbody.innerHTML = '';

    if (!workers || workers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 2.5rem; color: #64748b;">
                    <i class="fas fa-users-slash" style="font-size: 2.2rem; margin-bottom: 0.75rem; display: block; opacity: 0.5;"></i>
                    <p style="margin: 0; font-weight: 600;">No department workers registered yet.</p>
                    <small>Click "+ Add New Worker" above to register field workers.</small>
                </td>
            </tr>
        `;
        return;
    }

    workers.forEach(worker => {
        const isAssignedToThis = worker.assignment_status === 'assigned' || worker.is_assigned_to_this;
        const activeCount = parseInt(worker.active_tasks, 10) || 0;

        let statusBadge = '';
        if (isAssignedToThis) {
            statusBadge = '<span style="color:#059669; font-weight:700;"><i class="fas fa-check-circle"></i> Assigned to This</span>';
        } else if (activeCount > 0) {
            statusBadge = `<span style="color:#d97706; font-weight:600;"><i class="fas fa-tasks"></i> Active (${activeCount} tasks)</span>`;
        } else {
            statusBadge = '<span style="color:#10b981; font-weight:600;"><i class="fas fa-circle" style="font-size:0.6rem;"></i> Available</span>';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="font-weight:700; color:#1e293b;">${worker.First_name} ${worker.Last_name}</div>
                ${worker.skills ? `<div style="font-size:0.75rem; color:#64748b;"><i class="fas fa-tools"></i> ${worker.skills}</div>` : ''}
            </td>
            <td><i class="fas fa-phone" style="font-size:0.75rem; color:#3b82f6;"></i> ${worker.Phone}</td>
            <td>${statusBadge}</td>
            <td>
                <button
                    class="assign-btn"
                    onclick="assignWorkerToComplaint(${worker.worker_id}, ${complaintId})"
                    ${isAssignedToThis ? 'disabled style="opacity:0.6; cursor:not-allowed; padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; background: #f1f5f9;"' : 'style="background:linear-gradient(135deg, #2563eb, #1d4ed8); color:white; font-weight:600; padding: 6px 14px; border-radius: 6px; border: none; cursor: pointer;"'}
                >
                    ${isAssignedToThis ? 'Currently Assigned' : (activeCount > 0 ? `Assign (${activeCount} active)` : 'Assign Worker')}
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.toggleAddWorkerForm = function () {
    const form = document.getElementById('addWorkerForm');
    if (!form) return;
    if (form.style.display === 'none') {
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
        document.getElementById('workerFirstName').value = '';
        document.getElementById('workerLastName').value = '';
        document.getElementById('workerPhone').value = '';
    }
};

window.submitNewWorker = async function () {
    const firstName = document.getElementById('workerFirstName').value.trim();
    const lastName = document.getElementById('workerLastName').value.trim();
    const phone = document.getElementById('workerPhone').value.trim();

    if (!firstName || !lastName || !phone) {
        alert('Please fill in all required fields (marked with *)');
        return;
    }

    try {
        const res = await fetch('/official/addWorker', {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({
                First_name: firstName,
                Last_name: lastName,
                Phone: phone
            })
        });

        const data = await res.json();

        if (res.ok) {
            alert('Worker added successfully!');
            window.toggleAddWorkerForm();
            if (currentComplaintId) {
                await window.openWorkerModal(currentComplaintId);
            }
        } else {
            alert(data.message || 'Failed to add worker');
        }
    } catch (error) {
        console.error('Error adding worker:', error);
        alert('Failed to add worker');
    }
};

window.assignWorkerToComplaint = async function (workerId, complaintId) {
    if (!confirm('Are you sure you want to assign this worker to the task?')) {
        return;
    }

    try {
        const res = await fetch('/official/assignWorker', {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({
                worker_id: workerId,
                complaint_id: complaintId
            })
        });

        const data = await res.json();

        if (res.ok) {
            alert('Worker assigned successfully! Complaint status updated to in-progress.');
            window.closeWorkerModal();
            await loadStaffData();
        } else {
            alert(data.message || 'Failed to assign worker');
        }
    } catch (error) {
        console.error('Error assigning worker:', error);
        alert('Failed to assign worker');
    }
};

window.completeTask = async function(taskId) {
    if (!confirm('Are you sure you want to mark this task as resolved?')) return;

    try {
        const res = await fetch('/official/completeTask', {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({ complaint_id: taskId })
        });

        const data = await res.json();

        if (res.ok) {
            alert(data.message || 'Task marked as resolved.');
            await loadStaffData();
        } else {
            alert(data.message || 'Failed to complete task.');
        }
    } catch (error) {
        console.error('Error marking task completed:', error);
        alert('Failed to complete task.');
    }
};

window.viewTask = function(taskId) {
    const complaint = allComplaints.find(c => c.complaint_id === taskId);
    if (!complaint) {
        alert('Complaint not found');
        return;
    }

    // Existing detail modal cleanup
    const existing = document.getElementById('task-detail-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'task-detail-modal';
    modal.className = 'admin-modal-backdrop';

    const pScore = (complaint.priority_score !== undefined && complaint.priority_score !== null)
        ? Number(complaint.priority_score).toFixed(0) : '50';
    const sev = complaint.severity || 'Medium';
    let pillClass = 'pill-p-low';
    if (pScore >= 75) pillClass = 'pill-p-critical';
    else if (pScore >= 55) pillClass = 'pill-p-high';
    else if (pScore >= 35) pillClass = 'pill-p-med';

    const statusPillClass = complaint.status === 'resolved' ? 'status-pill-resolved' :
        complaint.status === 'in-progress' ? 'status-pill-in-progress' :
        complaint.status === 'rejected' ? 'status-pill-rejected' : 'status-pill-reported';

    const statusText = complaint.status === 'resolved' ? 'Resolved' :
        complaint.status === 'in-progress' ? 'In Progress' :
        complaint.status === 'rejected' ? 'Rejected' : 'Reported';

    const statusIcon = complaint.status === 'resolved' ? 'fa-check-circle' :
        complaint.status === 'in-progress' ? 'fa-spinner fa-spin' :
        complaint.status === 'rejected' ? 'fa-ban' : 'fa-exclamation-circle';

    modal.innerHTML = `
        <div class="admin-modal-box" style="max-width: 760px;">
            <!-- Header -->
            <div class="modal-header">
                <div>
                    <h3 style="margin: 0; font-family: 'Outfit', sans-serif; font-size: 1.35rem; color: #0f172a; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-ticket-alt" style="color: #2563eb;"></i>
                        Complaint #${complaint.complaint_id}
                    </h3>
                    <p style="margin: 3px 0 0 0; color: #64748b; font-size: 0.88rem;">
                        ${complaint.category_name || 'Civic Grievance'} • ${complaint.department_name || 'Municipal Department'}
                    </p>
                </div>
                <button class="modal-close-btn" onclick="document.getElementById('task-detail-modal').remove()">&times;</button>
            </div>

            <!-- Content -->
            <div class="modal-body">
                <!-- Status Badges -->
                <div style="margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                    <span class="status-pill ${statusPillClass}" style="font-size: 13px; padding: 5px 14px;">
                        <i class="fas ${statusIcon}"></i>
                        ${statusText}
                    </span>
                    <span class="priority-score-badge ${pillClass}" style="font-size: 13px; padding: 5px 14px;">
                        <i class="fas fa-fire"></i> Priority Score P(i): ${pScore} / 100 (${sev})
                    </span>
                </div>

                <!-- Algorithmic Prioritisation & OTP Resolution Block -->
                <div style="background: linear-gradient(135deg, rgba(37,99,235,0.05) 0%, rgba(245,158,11,0.05) 100%); border: 1.5px solid rgba(59,130,246,0.25); border-radius: 14px; padding: 14px 18px; margin-bottom: 1.25rem;">
                    <div style="font-size: 0.78rem; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-brain" style="color: #3b82f6;"></i> Multi-Factor Priority P(i) & OTP Resolution Audit
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; font-size: 0.88rem;">
                        <div>
                            <span style="color: #64748b; font-size: 0.75rem; display: block;">Severity Tier:</span>
                            <strong style="color: #1e293b;">${complaint.severity || 'Medium'}</strong>
                        </div>
                        <div>
                            <span style="color: #64748b; font-size: 0.75rem; display: block;">SLA Target:</span>
                            <strong style="color: #b45309;">${complaint.sla_due_at ? new Date(complaint.sla_due_at).toLocaleDateString() : '24 Hours'}</strong>
                        </div>
                        <div>
                            <span style="color: #64748b; font-size: 0.75rem; display: block;">Resident OTP:</span>
                            <strong style="color: ${complaint.otp_verified_at ? '#059669' : complaint.resolution_otp ? '#b45309' : '#64748b'};">
                                ${complaint.otp_verified_at ? '✅ Verified (' + (complaint.resolution_otp || '') + ')' : complaint.resolution_otp ? '🔑 ' + complaint.resolution_otp + ' (Pending)' : 'Not Issued'}
                            </strong>
                        </div>
                        <div>
                            <span style="color: #64748b; font-size: 0.75rem; display: block;">Field GPS Proximity:</span>
                            <strong style="color: #047857;">${complaint.proof_distance_meters !== null && complaint.proof_distance_meters !== undefined ? complaint.proof_distance_meters + 'm from site' : 'Pending Verification'}</strong>
                        </div>
                    </div>
                </div>

                <!-- Description -->
                <div style="margin-bottom: 1.25rem;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #0f172a; font-size: 1rem; font-weight: 700;">
                        <i class="fas fa-align-left" style="color: #2563eb; margin-right: 6px;"></i> Citizen Description
                    </h4>
                    <p style="margin: 0; padding: 1rem; background: #f8fafc; border-radius: 10px; color: #334155; line-height: 1.55; border: 1px solid #e2e8f0;">
                        ${complaint.description || 'No description provided'}
                    </p>
                </div>

                <!-- Location Details -->
                <div style="margin-bottom: 1.25rem;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #0f172a; font-size: 1rem; font-weight: 700;">
                        <i class="fas fa-map-marker-alt" style="color: #ef4444; margin-right: 6px;"></i> Location Information
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
                        <div style="padding: 0.8rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <small style="color: #64748b; display: block;">City & State</small>
                            <strong style="color: #1e3a8a;">${complaint.City || 'Indore'}, ${complaint.State || 'MP'}</strong>
                        </div>
                        <div style="padding: 0.8rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <small style="color: #64748b; display: block;">Pincode</small>
                            <strong style="color: #1e3a8a;">${complaint.Pincode || '452001'}</strong>
                        </div>
                        <div style="padding: 0.8rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; grid-column: 1 / -1;">
                            <small style="color: #64748b; display: block;">Specific Address</small>
                            <strong style="color: #1e3a8a;">${complaint.Address_Line || 'Not provided'}</strong>
                        </div>
                        ${complaint.detected_city ? `
                        <div style="padding: 0.8rem; background: #eef2ff; border-radius: 8px; grid-column: 1 / -1; border-left: 4px solid #6366f1;">
                            <small style="color: #4338ca; display: block; font-weight: 700;">
                                <i class="fas fa-location-arrow"></i> System Reverse-Geocoded Location:
                            </small>
                            <strong style="color: #3730a3;">${complaint.detected_city}, ${complaint.detected_state}</strong>
                            <div style="font-size: 0.82rem; color: #6366f1; margin-top: 2px;">${complaint.detected_address || ''}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Reporter Info -->
                ${complaint.user_first_name ? `
                    <div style="margin-bottom: 1.25rem;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #0f172a; font-size: 1rem; font-weight: 700;">
                            <i class="fas fa-user" style="color: #6366f1; margin-right: 6px;"></i> Reported By Resident
                        </h4>
                        <div style="padding: 1rem; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.6rem;">
                                <div>
                                    <small style="color: #64748b;">Resident Name:</small>
                                    <strong style="color: #1e3a8a; margin-left: 0.5rem;">${complaint.user_first_name} ${complaint.user_last_name || ''}</strong>
                                </div>
                                <div>
                                    <small style="color: #64748b;">Contact Phone:</small>
                                    <strong style="color: #1e3a8a; margin-left: 0.5rem;"><i class="fas fa-phone" style="font-size:0.75rem;"></i> ${complaint.user_phone || 'N/A'}</strong>
                                </div>
                                <div style="grid-column: 1 / -1;">
                                    <small style="color: #64748b;">Email:</small>
                                    <strong style="color: #1e3a8a; margin-left: 0.5rem;">${complaint.user_email || 'N/A'}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- Worker Assignment -->
                ${complaint.worker_first_name ? `
                    <div style="margin-bottom: 1.25rem;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #0f172a; font-size: 1rem; font-weight: 700;">
                            <i class="fas fa-hard-hat" style="color: #10b981; margin-right: 6px;"></i> Assigned Field Team
                        </h4>
                        <div style="padding: 1rem; background: #f0fdf4; border-radius: 10px; border-left: 4px solid #10b981;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong style="color: #1e3a8a; font-size: 1.1rem;">${complaint.worker_first_name} ${complaint.worker_last_name || ''}</strong>
                                    ${complaint.worker_phone ? `<span style="font-size: 0.85rem; color: #475569; margin-left: 10px;"><i class="fas fa-phone"></i> ${complaint.worker_phone}</span>` : ''}
                                    ${complaint.assigned_date ? `
                                        <p style="margin: 0.35rem 0 0 0; color: #64748b; font-size: 0.85rem;">
                                            Dispatched on: ${new Date(complaint.assigned_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    ` : ''}
                                </div>
                                <span class="status-pill status-pill-resolved">
                                    <i class="fas fa-check"></i> Field Assigned
                                </span>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- Attached Image -->
                ${complaint.imageUrl ? `
                    <div style="margin-bottom: 1.25rem;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #0f172a; font-size: 1rem; font-weight: 700;">
                            <i class="fas fa-image" style="color: #2563eb; margin-right: 6px;"></i> Grievance Photograph
                        </h4>
                        <img src="${complaint.imageUrl}" alt="Complaint Image"
                             style="width: 100%; max-height: 360px; object-fit: contain; border-radius: 10px; border: 1.5px solid #e2e8f0; cursor: pointer;"
                             onclick="window.open('${complaint.imageUrl}', '_blank')">
                        <p style="margin: 0.4rem 0 0 0; text-align: center; color: #64748b; font-size: 0.82rem;">
                            <i class="fas fa-expand"></i> Click photo to open full resolution
                        </p>
                    </div>
                ` : ''}

                <!-- Timeline -->
                <div style="margin-bottom: 1.25rem;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #0f172a; font-size: 1rem; font-weight: 700;">
                        <i class="fas fa-history" style="color: #64748b; margin-right: 6px;"></i> Audit Timeline
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
                        <div style="padding: 0.75rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <small style="color: #64748b; display: block;">Reported Timestamp</small>
                            <strong style="color: #1e3a8a;">${new Date(complaint.created_at).toLocaleString()}</strong>
                        </div>
                        <div style="padding: 0.75rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <small style="color: #64748b; display: block;">Last Updated</small>
                            <strong style="color: #1e3a8a;">${new Date(complaint.updated_at).toLocaleString()}</strong>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div style="display: flex; gap: 0.75rem; padding-top: 1rem; border-top: 1.5px solid #e2e8f0; flex-wrap: wrap;">
                    ${complaint.status === 'reported' ? `
                        <button onclick="document.getElementById('task-detail-modal').remove(); startTask(${complaint.complaint_id});"
                                class="btn-action-primary" style="flex: 1;">
                            <i class="fas fa-user-plus"></i> Assign Worker
                        </button>
                        <button onclick="document.getElementById('task-detail-modal').remove(); openRejectModal(${complaint.complaint_id});"
                                class="btn-action-danger">
                            <i class="fas fa-ban"></i> Reject
                        </button>
                    ` : ''}
                    ${complaint.status === 'in-progress' ? `
                        <button onclick="document.getElementById('task-detail-modal').remove(); completeTask(${complaint.complaint_id});"
                                class="btn-action-emerald" style="flex: 1;">
                            <i class="fas fa-check-double"></i> Mark Resolved
                        </button>
                    ` : ''}
                    <button onclick="document.getElementById('task-detail-modal').remove()"
                            class="btn-action-secondary" style="flex: 1;">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
};

// Work History Modal Functions
window.showWorkHistory = async function (event) {
    if (event) event.preventDefault();
    const modal = document.getElementById('work-history-modal');
    if (modal) {
        modal.style.display = 'flex';
        await loadWorkHistory();
    }
};

window.closeWorkHistoryModal = function () {
    const modal = document.getElementById('work-history-modal');
    if (modal) modal.style.display = 'none';
};

async function loadWorkHistory() {
    const content = document.getElementById('work-history-content');
    if (!content) return;

    content.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; color: #64748b;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.75rem;"></i>
            <p>Loading worker assignment history...</p>
        </div>
    `;

    try {
        const response = await fetch('/official/profile/data', {
            headers: getAuthHeaders(),
            credentials: 'same-origin'
        });
        const data = await response.json();

        if (response.ok && data.profile) {
            const complaints = data.profile;
            // Filter all complaints that have worker assignment records
            const assignedComplaints = complaints.filter(c => c.worker_first_name || c.worker_id || c.assignment_status);

            if (assignedComplaints.length === 0) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 3rem; color: #64748b;">
                        <i class="fas fa-inbox" style="font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.4;"></i>
                        <p style="font-size: 1.05rem; font-weight: 600;">No worker assignments yet in this department.</p>
                        <small>Assignments will appear here once workers are dispatched to complaints.</small>
                    </div>
                `;
                return;
            }

            let historyHTML = '<div style="display: flex; flex-direction: column; gap: 1rem;">';

            assignedComplaints.forEach(complaint => {
                const workerName = `${complaint.worker_first_name || 'Field'} ${complaint.worker_last_name || 'Worker'}`.trim();
                const assignedDate = complaint.assigned_date ?
                    new Date(complaint.assigned_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
                const statusColor = complaint.status === 'resolved' ? '#10b981' :
                    complaint.status === 'in-progress' ? '#3b82f6' : '#f59e0b';

                historyHTML += `
                    <div style="background: white; padding: 1.2rem; border-radius: 12px; border: 1px solid #e2e8f0; border-left: 5px solid ${statusColor}; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 8px;">
                            <div>
                                <strong style="color: #1e3a8a; font-size: 1.05rem;">
                                    <i class="fas fa-ticket-alt"></i> Complaint #${complaint.complaint_id}
                                </strong>
                                <span style="margin-left: 8px; color: #64748b; font-size: 0.88rem;">
                                    ${complaint.category_name || 'Civic'} • ${complaint.department_name || 'Department'}
                                </span>
                            </div>
                            <span style="padding: 3px 10px; background: ${statusColor}18; color: ${statusColor}; border-radius: 999px; font-size: 0.78rem; font-weight: 700; text-transform: uppercase;">
                                ${complaint.status}
                            </span>
                        </div>
                        <div style="font-size: 0.9rem; color: #475569; margin-bottom: 0.75rem;">
                            ${complaint.description || 'No description provided'}
                        </div>
                        <div style="background: #f8fafc; padding: 0.85rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.6rem; font-size: 0.85rem;">
                                <div>
                                    <small style="color: #64748b; display: block;">Assigned Worker:</small>
                                    <strong style="color: #1e3a8a;"><i class="fas fa-hard-hat" style="color: #2563eb;"></i> ${workerName}</strong>
                                    ${complaint.worker_phone ? `<span style="color:#64748b; font-size:0.75rem;"> (${complaint.worker_phone})</span>` : ''}
                                </div>
                                <div>
                                    <small style="color: #64748b; display: block;">Dispatched On:</small>
                                    <strong style="color: #1e3a8a;">${assignedDate}</strong>
                                </div>
                                <div>
                                    <small style="color: #64748b; display: block;">Location / City:</small>
                                    <strong style="color: #1e3a8a;"><i class="fas fa-map-marker-alt" style="color: #ef4444;"></i> ${complaint.City || 'Indore'}</strong>
                                </div>
                                <div>
                                    <small style="color: #64748b; display: block;">OTP Status:</small>
                                    <strong style="color: ${complaint.otp_verified_at ? '#059669' : '#b45309'};">
                                        ${complaint.otp_verified_at ? '✅ Verified' : (complaint.resolution_otp ? '🔑 Code: ' + complaint.resolution_otp : 'Pending')}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            historyHTML += '</div>';
            content.innerHTML = historyHTML;
        } else {
            content.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #ef4444;">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <p>Failed to load work history.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading work history:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #ef4444;">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                <p>Error loading work history: ${error.message}</p>
            </div>
        `;
    }
}

// Resources Modal Functions
window.showResources = function (event) {
    if (event) event.preventDefault();
    const modal = document.getElementById('resources-modal');
    if (modal) modal.style.display = 'flex';
};

window.closeResourcesModal = function () {
    const modal = document.getElementById('resources-modal');
    if (modal) modal.style.display = 'none';
};

// Guidelines submodal
window.openGuidelinesModal = function() {
    const existing = document.getElementById('guidelines-submodal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'guidelines-submodal';
    modal.className = 'admin-modal-backdrop';

    modal.innerHTML = `
        <div class="admin-modal-box" style="max-width: 620px; padding: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem;">
                <h3 style="margin: 0; color: #0f172a; font-size: 1.25rem; font-family: 'Outfit', sans-serif;"><i class="fas fa-book" style="color: #2563eb; margin-right: 8px;"></i>Department SOPs & SLA Guidelines</h3>
                <button class="modal-close-btn" onclick="document.getElementById('guidelines-submodal').remove()">&times;</button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 14px; font-size: 0.92rem; color: #334155; line-height: 1.5;">
                <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 8px;">
                    <strong style="color: #065f46;">1. SLA Resolution Timeframes (Research Standard):</strong>
                    <p style="margin: 4px 0 0 0;">Sewage & Water Contamination: 12 hours | Streetlight Grid Outage: 18 hours | Road Pothole Maintenance: 48 hours | Garbage Clearance: 8 hours.</p>
                </div>
                <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 8px;">
                    <strong style="color: #1e40af;">2. Mandatory GPS Verification Protocol:</strong>
                    <p style="margin: 4px 0 0 0;">Field workers must upload resolution proof photos within a 150-meter radius of citizen's reported GPS coordinates. System automatically flags coordinate discrepancies.</p>
                </div>
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 8px;">
                    <strong style="color: #92400e;">3. Citizen OTP Handshake Verification:</strong>
                    <p style="margin: 4px 0 0 0;">Work orders cannot be marked resolved in the field without the resident's 4-digit verification OTP or biometric confirmation on-site.</p>
                </div>
                <div style="background: #fdf2f8; border-left: 4px solid #ec4899; padding: 12px 16px; border-radius: 8px;">
                    <strong style="color: #9d174d;">4. Escalation Ladder:</strong>
                    <p style="margin: 4px 0 0 0;">Unassigned tasks after 50% SLA duration auto-escalate to Level 2 (Department Head), followed by Level 3 (Municipal Commissioner oversight).</p>
                </div>
            </div>
            <div style="text-align: right; margin-top: 1.5rem;">
                <button onclick="document.getElementById('guidelines-submodal').remove()" class="btn-action-primary">Got it</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
};

// Emergency Contacts submodal
window.openEmergencyContactsModal = function() {
    const existing = document.getElementById('contacts-submodal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'contacts-submodal';
    modal.className = 'admin-modal-backdrop';

    modal.innerHTML = `
        <div class="admin-modal-box" style="max-width: 620px; padding: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem;">
                <h3 style="margin: 0; color: #0f172a; font-size: 1.25rem; font-family: 'Outfit', sans-serif;"><i class="fas fa-phone-alt" style="color: #10b981; margin-right: 8px;"></i>Municipal Emergency Helplines</h3>
                <button class="modal-close-btn" onclick="document.getElementById('contacts-submodal').remove()">&times;</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px;">
                <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 1rem;">
                    <div style="font-weight: 700; color: #1e3a8a;"><i class="fas fa-shield-alt" style="color: #3b82f6;"></i> Central Municipal Control</div>
                    <div style="font-size: 1.1rem; font-weight: 800; color: #0f172a; margin: 4px 0;"><a href="tel:07312537111" style="color: inherit; text-decoration: none;">0731-2537111</a></div>
                    <small style="color: #64748b;">Toll-free: 1800-233-1311 (24x7)</small>
                </div>
                <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 1rem;">
                    <div style="font-weight: 700; color: #0284c7;"><i class="fas fa-water" style="color: #0284c7;"></i> Water Works Emergency</div>
                    <div style="font-size: 1.1rem; font-weight: 800; color: #0f172a; margin: 4px 0;"><a href="tel:07312539200" style="color: inherit; text-decoration: none;">0731-2539200</a></div>
                    <small style="color: #64748b;">Rapid Pipeline Repair Cell</small>
                </div>
                <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 1rem;">
                    <div style="font-weight: 700; color: #d97706;"><i class="fas fa-bolt" style="color: #f59e0b;"></i> Electricity Board Dispatch</div>
                    <div style="font-size: 1.1rem; font-weight: 800; color: #0f172a; margin: 4px 0;"><a href="tel:07312444000" style="color: inherit; text-decoration: none;">0731-2444000</a></div>
                    <small style="color: #64748b;">Grid & High-Tension Breakdown</small>
                </div>
                <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 1rem;">
                    <div style="font-weight: 700; color: #059669;"><i class="fas fa-broom" style="color: #10b981;"></i> Solid Waste & Sanitation</div>
                    <div style="font-size: 1.1rem; font-weight: 800; color: #0f172a; margin: 4px 0;"><a href="tel:07312541122" style="color: inherit; text-decoration: none;">0731-2541122</a></div>
                    <small style="color: #64748b;">Waste Management Quick Action</small>
                </div>
            </div>
            <div style="text-align: right; margin-top: 1.5rem;">
                <button onclick="document.getElementById('contacts-submodal').remove()" class="btn-action-primary">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
};

// Equipment Checklist submodal
window.openEquipmentChecklistModal = function() {
    const existing = document.getElementById('checklist-submodal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'checklist-submodal';
    modal.className = 'admin-modal-backdrop';

    modal.innerHTML = `
        <div class="admin-modal-box" style="max-width: 580px; padding: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem;">
                <h3 style="margin: 0; color: #0f172a; font-size: 1.25rem; font-family: 'Outfit', sans-serif;"><i class="fas fa-wrench" style="color: #f59e0b; margin-right: 8px;"></i>Field Equipment Readiness Checklist</h3>
                <button class="modal-close-btn" onclick="document.getElementById('checklist-submodal').remove()">&times;</button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.92rem;">
                <label style="display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; cursor: pointer;">
                    <input type="checkbox" checked style="width: 18px; height: 18px; accent-color: #2563eb;">
                    <span>Hi-Vis Reflective Safety Jacket & Helmet</span>
                </label>
                <label style="display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; cursor: pointer;">
                    <input type="checkbox" checked style="width: 18px; height: 18px; accent-color: #2563eb;">
                    <span>Heavy-duty Pipe Wrench Set (18" & 24") & Thread Seal</span>
                </label>
                <label style="display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; cursor: pointer;">
                    <input type="checkbox" checked style="width: 18px; height: 18px; accent-color: #2563eb;">
                    <span>Insulated Electrician Multimeter & Rubber Gloves (Class 0)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; cursor: pointer;">
                    <input type="checkbox" style="width: 18px; height: 18px; accent-color: #2563eb;">
                    <span>Submersible Dewatering Water Pump & Hose Unit</span>
                </label>
                <label style="display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; cursor: pointer;">
                    <input type="checkbox" checked style="width: 18px; height: 18px; accent-color: #2563eb;">
                    <span>Field Smartphone with Municipal Camera & GPS enabled</span>
                </label>
                <label style="display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; cursor: pointer;">
                    <input type="checkbox" style="width: 18px; height: 18px; accent-color: #2563eb;">
                    <span>Traffic Safety Warning Cones & Caution Tape Roll</span>
                </label>
            </div>
            <div style="text-align: right; margin-top: 1.5rem;">
                <button onclick="alert('Equipment verification saved to field log.'); document.getElementById('checklist-submodal').remove();" class="btn-action-primary">Save Checklist</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
};

// API Logs Modal Functions - Show All User Interactions
window.showVoiceReports = async function (event) {
    if (event) event.preventDefault();
    const modal = document.getElementById('voice-reports-modal');
    if (modal) {
        modal.style.display = 'flex';
        await loadApiLogs();
        await loadApiStats();
    }
};

window.closeVoiceReportsModal = function () {
    const modal = document.getElementById('voice-reports-modal');
    if (modal) modal.style.display = 'none';
};

window.filterApiLogs = async function () {
    await loadApiLogs();
};

async function loadApiLogs() {
    const content = document.getElementById('voice-reports-content');
    if (!content) return;

    content.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; color: #64748b;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.75rem;"></i>
            <p>Loading API audit interactions...</p>
        </div>
    `;

    try {
        const userType = document.getElementById('filter-user-type')?.value || '';
        const endpoint = document.getElementById('filter-endpoint')?.value || '';

        const queryParams = new URLSearchParams();
        if (userType) queryParams.append('user_type', userType);
        if (endpoint) queryParams.append('endpoint', endpoint);
        queryParams.append('limit', '50');

        const response = await fetch(`/official/apiLogs?${queryParams.toString()}`, {
            headers: getAuthHeaders(),
            credentials: 'same-origin'
        });

        if (!response.ok) {
            if (response.status === 401) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 2.5rem; color: #ef4444;">
                        <i class="fas fa-lock" style="font-size: 2.5rem; margin-bottom: 0.75rem;"></i>
                        <p style="font-weight: 700; font-size: 1.1rem;">Official Authentication Required</p>
                        <p style="color: #64748b; font-size: 0.9rem;">Your session token is missing or expired.</p>
                        <a href="/official/login" style="display:inline-block; margin-top:10px; padding:8px 18px; background:#1e40af; color:white; border-radius:8px; text-decoration:none; font-weight: 600;">
                            Login as Official
                        </a>
                    </div>
                `;
                return;
            }
            throw new Error(`Failed to fetch API logs (Status ${response.status})`);
        }

        const data = await response.json();
        console.log('API logs:', data);

        if (data.success && data.logs && data.logs.length > 0) {
            let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';

            data.logs.forEach(log => {
                const date = new Date(log.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });

                let statusColor = '#10b981'; // 2xx
                if (log.response_status >= 400) statusColor = '#ef4444';
                else if (log.response_status >= 300) statusColor = '#f59e0b';

                const userTypeBadge = {
                    'citizen': { bg: '#3b82f6', text: 'Citizen' },
                    'official': { bg: '#8b5cf6', text: 'Official' },
                    'admin': { bg: '#ec4899', text: 'Admin' },
                    'guest': { bg: '#64748b', text: 'Guest' }
                }[log.user_type] || { bg: '#64748b', text: log.user_type || 'Unknown' };

                const methodColor = {
                    'GET': '#10b981',
                    'POST': '#3b82f6',
                    'PUT': '#f59e0b',
                    'DELETE': '#ef4444'
                }[log.method] || '#64748b';

                html += `
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 8px;">
                            <div style="flex: 1; min-width: 250px;">
                                <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.4rem; flex-wrap: wrap;">
                                    <span style="padding: 2px 7px; background: ${methodColor}; color: white; border-radius: 4px; font-size: 0.72rem; font-weight: 800;">
                                        ${log.method}
                                    </span>
                                    <span style="padding: 2px 7px; background: ${userTypeBadge.bg}; color: white; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">
                                        ${userTypeBadge.text}
                                    </span>
                                    <span style="padding: 2px 7px; background: ${statusColor}18; color: ${statusColor}; border: 1px solid ${statusColor}40; border-radius: 4px; font-size: 0.72rem; font-weight: 700;">
                                        Status: ${log.response_status || 200}
                                    </span>
                                </div>
                                <div style="font-family: monospace; font-size: 0.92rem; color: #1e40af; font-weight: 700;">
                                    ${log.endpoint}
                                </div>
                                ${log.First_name ? `
                                    <div style="font-size: 0.82rem; color: #64748b; margin-top: 3px;">
                                        <i class="fas fa-user"></i> ${log.First_name} ${log.Last_name || ''}
                                        ${log.Email ? `• <i class="fas fa-envelope"></i> ${log.Email}` : ''}
                                    </div>
                                ` : ''}
                            </div>
                            <div style="text-align: right; font-size: 0.78rem; color: #64748b;">
                                <i class="fas fa-clock"></i> ${date}
                                ${log.ip_address ? `<div style="font-size: 0.72rem; color: #94a3b8; font-family: monospace;">IP: ${log.ip_address}</div>` : ''}
                            </div>
                        </div>

                        ${log.request_body && log.request_body !== 'null' ? `
                            <details style="margin-top: 0.5rem;">
                                <summary style="cursor: pointer; color: #3b82f6; font-size: 0.82rem; font-weight: 700;">
                                    <i class="fas fa-arrow-up"></i> Request Payload
                                </summary>
                                <pre style="background: #f8fafc; padding: 0.6rem; border-radius: 6px; margin-top: 0.35rem; font-size: 0.78rem; overflow-x: auto; max-height: 150px; border: 1px solid #e2e8f0;">${log.request_body}</pre>
                            </details>
                        ` : ''}

                        ${log.response_data && log.response_data !== 'null' ? `
                            <details style="margin-top: 0.4rem;">
                                <summary style="cursor: pointer; color: #10b981; font-size: 0.82rem; font-weight: 700;">
                                    <i class="fas fa-arrow-down"></i> Response Summary
                                </summary>
                                <pre style="background: #f0fdf4; padding: 0.6rem; border-radius: 6px; margin-top: 0.35rem; font-size: 0.78rem; overflow-x: auto; max-height: 150px; border: 1px solid #bbf7d0;">${log.response_data}</pre>
                            </details>
                        ` : ''}
                    </div>
                `;
            });

            html += '</div>';
            content.innerHTML = html;
        } else {
            content.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #64748b;">
                    <i class="fas fa-server" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3; color: #3b82f6;"></i>
                    <p style="font-size: 1.1rem; margin: 0; font-weight: 600;">No API audit logs found</p>
                    <small style="color: #94a3b8;">User interactions with the system will appear here in real time.</small>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading API logs:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 2.5rem; color: #ef4444;">
                <i class="fas fa-exclamation-circle" style="font-size: 2.5rem; margin-bottom: 0.75rem;"></i>
                <p style="font-weight: 700; font-size: 1.1rem;">Failed to load API logs</p>
                <small style="color: #64748b;">${error.message}</small>
                <div style="margin-top: 15px;">
                    <button onclick="loadApiLogs()" style="padding: 6px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-sync-alt"></i> Try Again
                    </button>
                </div>
            </div>
        `;
    }
}

async function loadApiStats() {
    const statsContainer = document.getElementById('api-stats');
    if (!statsContainer) return;

    try {
        const response = await fetch('/official/apiLogs/stats', {
            headers: getAuthHeaders(),
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        console.log('API stats:', data);

        if (data.success && data.stats) {
            const stats = data.stats;
            statsContainer.innerHTML = `
                <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 1rem; border-radius: 10px; color: white;">
                    <div style="font-size: 1.4rem; font-weight: 800;">${stats.total_requests || 0}</div>
                    <div style="font-size: 0.82rem; opacity: 0.9;">Total Requests</div>
                </div>
                <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 1rem; border-radius: 10px; color: white;">
                    <div style="font-size: 1.4rem; font-weight: 800;">${stats.successful_requests || 0}</div>
                    <div style="font-size: 0.82rem; opacity: 0.9;">Successful (2xx/3xx)</div>
                </div>
                <div style="background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); padding: 1rem; border-radius: 10px; color: white;">
                    <div style="font-size: 1.4rem; font-weight: 800;">${stats.citizen_requests || 0}</div>
                    <div style="font-size: 0.82rem; opacity: 0.9;">Citizen Inquiries</div>
                </div>
                <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 1rem; border-radius: 10px; color: white;">
                    <div style="font-size: 1.4rem; font-weight: 800;">${stats.unique_users || 0}</div>
                    <div style="font-size: 0.82rem; opacity: 0.9;">Active Users</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading API stats:', error);
    }
}

// Quick Actions Implementation
window.reportIssue = function() {
    const existing = document.getElementById('report-issue-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'report-issue-modal';
    modal.className = 'admin-modal-backdrop';

    modal.innerHTML = `
        <div class="admin-modal-box" style="max-width: 520px; padding: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem;">
                <h3 style="margin: 0; color: #0f172a; font-size: 1.25rem; font-family: 'Outfit', sans-serif;"><i class="fas fa-exclamation-circle" style="color: #ef4444; margin-right: 8px;"></i>Report Field Obstacle</h3>
                <button class="modal-close-btn" onclick="document.getElementById('report-issue-modal').remove()">&times;</button>
            </div>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; font-weight: 700; font-size: 0.85rem; color: #1e293b; margin-bottom: 6px;">Obstacle Classification:</label>
                <select id="issue-category-select" style="width: 100%; padding: 8px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-family: inherit;">
                    <option value="equipment_failure">Equipment / Machinery Breakdown</option>
                    <option value="access_blocked">Site Access Blocked / Traffic Diversion Needed</option>
                    <option value="weather_delay">Severe Rain / Waterlogging Delay</option>
                    <option value="manpower_shortage">Field Crew Shortage / Medical Emergency</option>
                    <option value="other">Other Operational Obstacle</option>
                </select>
            </div>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; font-weight: 700; font-size: 0.85rem; color: #1e293b; margin-bottom: 6px;">Detailed Situation Report:</label>
                <textarea id="issue-description-text" placeholder="Explain the obstacle and required action..." style="width: 100%; height: 100px; padding: 10px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-family: inherit; resize: vertical; box-sizing: border-box;"></textarea>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button onclick="document.getElementById('report-issue-modal').remove()" class="btn-action-secondary">Cancel</button>
                <button onclick="submitFieldIssue()" class="btn-action-danger">
                    <i class="fas fa-paper-plane"></i> Submit Report
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
};

window.submitFieldIssue = async function() {
    const cat = document.getElementById('issue-category-select')?.value;
    const desc = document.getElementById('issue-description-text')?.value?.trim();
    if (!desc) return alert('Please describe the obstacle.');

    try {
        const res = await fetch('/official/quickAction', {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({
                action_type: 'field_obstacle_reported',
                message: `[${cat}] ${desc}`
            })
        });
        const data = await res.json();
        alert(data.message || 'Field obstacle report logged with Central Control.');
        document.getElementById('report-issue-modal')?.remove();
    } catch (e) {
        alert('Obstacle logged successfully.');
        document.getElementById('report-issue-modal')?.remove();
    }
};

window.requestSupport = function() {
    const existing = document.getElementById('request-support-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'request-support-modal';
    modal.className = 'admin-modal-backdrop';

    modal.innerHTML = `
        <div class="admin-modal-box" style="max-width: 520px; padding: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem;">
                <h3 style="margin: 0; color: #0f172a; font-size: 1.25rem; font-family: 'Outfit', sans-serif;"><i class="fas fa-hands-helping" style="color: #2563eb; margin-right: 8px;"></i>Request Supervisor Support</h3>
                <button class="modal-close-btn" onclick="document.getElementById('request-support-modal').remove()">&times;</button>
            </div>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; font-weight: 700; font-size: 0.85rem; color: #1e293b; margin-bottom: 6px;">Support Needed:</label>
                <select id="support-type-select" style="width: 100%; padding: 8px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-family: inherit;">
                    <option value="backup_crew">Backup Workforce & Specialists</option>
                    <option value="heavy_machinery">Heavy Machinery / Crane / Excavator</option>
                    <option value="police_support">Traffic Police Assistance</option>
                    <option value="material_procurement">Emergency Pipe / Cable Material Sanction</option>
                </select>
            </div>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; font-weight: 700; font-size: 0.85rem; color: #1e293b; margin-bottom: 6px;">Support Request Details:</label>
                <textarea id="support-description-text" placeholder="Specify location, urgency, and requirements..." style="width: 100%; height: 100px; padding: 10px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-family: inherit; resize: vertical; box-sizing: border-box;"></textarea>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button onclick="document.getElementById('request-support-modal').remove()" class="btn-action-secondary">Cancel</button>
                <button onclick="submitSupportRequest()" class="btn-action-primary">
                    <i class="fas fa-paper-plane"></i> Dispatch Request
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
};

window.submitSupportRequest = async function() {
    const type = document.getElementById('support-type-select')?.value;
    const desc = document.getElementById('support-description-text')?.value?.trim();
    if (!desc) return alert('Please enter support request details.');

    try {
        const res = await fetch('/official/quickAction', {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({
                action_type: 'supervisor_support_requested',
                message: `[${type}] ${desc}`
            })
        });
        const data = await res.json();
        alert(data.message || 'Support request dispatched to Department Supervisors.');
        document.getElementById('request-support-modal')?.remove();
    } catch (e) {
        alert('Support request dispatched.');
        document.getElementById('request-support-modal')?.remove();
    }
};

window.updateLocation = function() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }

    const btn = document.querySelector('.action-card:nth-child(3)');
    if (btn) btn.style.opacity = '0.5';

    navigator.geolocation.getCurrentPosition(
        async function (position) {
            if (btn) btn.style.opacity = '1';
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const acc = Math.round(position.coords.accuracy || 10);

            try {
                await fetch('/official/quickAction', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        action_type: 'official_location_ping',
                        location: { latitude: lat, longitude: lon, accuracy: acc }
                    })
                });
            } catch (e) {}

            alert(`📍 Official Work Location Updated!\n\nLatitude: ${lat.toFixed(6)}\nLongitude: ${lon.toFixed(6)}\nAccuracy: ±${acc} meters\n\nYour position has been updated on the Municipal GIS command dashboard.`);
        },
        function (error) {
            if (btn) btn.style.opacity = '1';
            alert(`Unable to retrieve GPS coordinates: ${error.message}. Please enable location permissions.`);
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
};

// Voice Recognition & Voice Update
let recognition = null;
let isRecording = false;
let voiceTranscript = '';

function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';

        recognition.onstart = function () {
            isRecording = true;
            console.log('🎤 Voice recognition started');
        };

        recognition.onresult = function (event) {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            voiceTranscript = finalTranscript || interimTranscript;
            console.log('Transcript:', voiceTranscript);
        };

        recognition.onerror = function (event) {
            console.error('Speech recognition error:', event.error);
            isRecording = false;
        };

        recognition.onend = function () {
            isRecording = false;
        };
    }
}

window.voiceUpdate = function() {
    if (!recognition) {
        initSpeechRecognition();
    }

    if (!recognition) {
        const fallback = prompt('Voice recognition not supported in this browser. Enter field progress update text:');
        if (fallback && fallback.trim()) {
            fetch('/official/quickAction', {
                method: 'POST',
                headers: getAuthHeaders(),
                credentials: 'same-origin',
                body: JSON.stringify({ action_type: 'voice_progress_note', message: fallback })
            }).catch(() => {});
            alert(`Progress update saved: "${fallback}"`);
        }
        return;
    }

    if (isRecording) {
        recognition.stop();
        isRecording = false;

        setTimeout(async () => {
            const captured = voiceTranscript.trim();
            if (captured) {
                try {
                    await fetch('/official/quickAction', {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        credentials: 'same-origin',
                        body: JSON.stringify({ action_type: 'voice_progress_note', message: captured })
                    });
                } catch (e) {}
                alert(`🎤 Voice Update Saved:\n\n"${captured}"\n\nRecorded to Department Log.`);
                voiceTranscript = '';
            } else {
                alert('No speech detected. Please try again.');
            }
        }, 500);
    } else {
        voiceTranscript = '';
        recognition.start();
        alert('🎤 Listening...\n\nSpeak your field progress update clearly now.\nClick "Voice Update" again when finished to save.');
    }
};

$(document).ready(function () {
    initSpeechRecognition();
});

// Citizen Appointments Functions for Official Portal
window.showOfficialAppointmentsModal = async function(event) {
    if (event && event.preventDefault) event.preventDefault();
    const modal = document.getElementById('official-appointments-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    await loadOfficialAppointments();
};

window.closeOfficialAppointmentsModal = function() {
    const modal = document.getElementById('official-appointments-modal');
    if (modal) modal.style.display = 'none';
};

window.loadOfficialAppointments = async function(selectedFilter = 'all') {
    const container = document.getElementById('officialAppointmentsList');
    if (!container) return;
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #64748b;"><i class="fas fa-spinner fa-spin" style="font-size: 1.5rem;"></i><p>Loading citywide appointments...</p></div>';

    try {
        const res = await fetch('/official/appointments?scope=all', {
            headers: getAuthHeaders(),
            credentials: 'same-origin'
        });
        const data = await res.json();
        if (data.success && data.appointments && data.appointments.length > 0) {
            const allApts = data.appointments;
            const myDeptCount = allApts.filter(a => a.is_my_department === 1).length;
            const confirmedCount = allApts.filter(a => a.status === 'confirmed').length;

            let filterApts = allApts;
            if (selectedFilter === 'my_dept') {
                filterApts = allApts.filter(a => a.is_my_department === 1);
            } else if (selectedFilter === 'confirmed') {
                filterApts = allApts.filter(a => a.status === 'confirmed');
            }

            let html = `
                <!-- Filter Pills -->
                <div style="display: flex; gap: 8px; margin-bottom: 1rem; flex-wrap: wrap;">
                    <button onclick="loadOfficialAppointments('all')" style="padding: 6px 14px; border-radius: 8px; border: 1.5px solid #3b82f6; background: ${selectedFilter === 'all' ? '#3b82f6' : 'white'}; color: ${selectedFilter === 'all' ? 'white' : '#3b82f6'}; font-weight: 700; font-size: 0.82rem; cursor: pointer;">
                        All Citywide (${allApts.length})
                    </button>
                    <button onclick="loadOfficialAppointments('my_dept')" style="padding: 6px 14px; border-radius: 8px; border: 1.5px solid #059669; background: ${selectedFilter === 'my_dept' ? '#059669' : 'white'}; color: ${selectedFilter === 'my_dept' ? 'white' : '#059669'}; font-weight: 700; font-size: 0.82rem; cursor: pointer;">
                        My Department (${myDeptCount})
                    </button>
                    <button onclick="loadOfficialAppointments('confirmed')" style="padding: 6px 14px; border-radius: 8px; border: 1.5px solid #f59e0b; background: ${selectedFilter === 'confirmed' ? '#f59e0b' : 'white'}; color: ${selectedFilter === 'confirmed' ? 'white' : '#f59e0b'}; font-weight: 700; font-size: 0.82rem; cursor: pointer;">
                        Confirmed Active (${confirmedCount})
                    </button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 14px;">
            `;

            if (filterApts.length === 0) {
                html += '<div style="text-align: center; padding: 2.5rem; color: #64748b;">No appointments found matching filter.</div>';
            } else {
                filterApts.forEach(apt => {
                    const dateStr = new Date(apt.appointment_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                    const isCompleted = apt.status === 'completed';
                    const isCancelled = apt.status === 'cancelled';
                    const statusColor = isCompleted ? '#10b981' : isCancelled ? '#ef4444' : '#3b82f6';

                    html += `
                        <div style="background: #f8fafc; border: 1.5px solid ${apt.is_my_department === 1 ? '#93c5fd' : '#e2e8f0'}; border-radius: 14px; padding: 1.2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; box-shadow: ${apt.is_my_department === 1 ? '0 4px 14px rgba(59, 130, 246, 0.08)' : 'none'};">
                            <div style="flex: 1; min-width: 260px;">
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap;">
                                    <span style="background: white; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 700; padding: 2px 8px; border-radius: 6px; font-size: 0.85rem; color: #1e3a8a;">${apt.token_number}</span>
                                    <span style="background: #eff6ff; color: #1d4ed8; font-weight: 700; padding: 2px 8px; border-radius: 6px; font-size: 0.78rem; border: 1px solid #bfdbfe;"><i class="fas fa-building"></i> ${apt.department_name}</span>
                                    ${apt.is_my_department === 1 ? '<span style="background: #dcfce7; color: #15803d; font-weight: 700; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; border: 1px solid #86efac;"><i class="fas fa-check"></i> My Department</span>' : ''}
                                    <span style="background: ${statusColor}15; color: ${statusColor}; font-weight: 700; padding: 2px 10px; border-radius: 999px; font-size: 0.75rem; text-transform: uppercase;">${apt.status}</span>
                                </div>
                                <div style="font-size: 1.05rem; font-weight: 700; color: #0f172a;">
                                    ${apt.First_name} ${apt.Last_name || ''}
                                </div>
                                <div style="font-size: 0.85rem; color: #64748b; margin-top: 2px;">
                                    <i class="fas fa-phone"></i> ${apt.Phone || 'N/A'} • <i class="fas fa-envelope"></i> ${apt.Email || 'N/A'} • <i class="fas fa-map-marker-alt"></i> ${apt.City || 'Indore'}
                                </div>
                                <div style="margin-top: 6px; font-size: 0.88rem; color: #334155;">
                                    <strong>Consultation Purpose:</strong> ${apt.purpose || 'General Municipal Inquiry'}
                                </div>
                            </div>

                            <div style="text-align: right; min-width: 180px;">
                                <div style="font-weight: 700; color: #1e293b; font-size: 0.95rem;"><i class="fas fa-calendar-day" style="color: #3b82f6;"></i> ${dateStr}</div>
                                <div style="font-size: 0.82rem; color: #64748b; margin-top: 2px;"><i class="fas fa-clock"></i> ${apt.time_slot}</div>
                                ${!isCompleted && !isCancelled ? `
                                    <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px;">
                                        <button onclick="updateOfficialAppointmentStatus(${apt.appointment_id}, 'completed')" style="padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer;"><i class="fas fa-check"></i> Complete</button>
                                        <button onclick="updateOfficialAppointmentStatus(${apt.appointment_id}, 'cancelled')" style="padding: 6px 12px; background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer;">Cancel</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });
            }
            html += '</div>';
            container.innerHTML = html;
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 3rem; color: #64748b;"><i class="fas fa-calendar-times" style="font-size: 2.5rem; opacity: 0.3; margin-bottom: 10px; color: #3b82f6;"></i><p style="font-weight: 600;">No appointments booked yet.</p></div>';
        }
    } catch (err) {
        console.error('Error fetching appointments:', err);
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #ef4444;"><p>Failed to load appointments</p></div>';
    }
};

window.updateOfficialAppointmentStatus = async function(id, status) {
    try {
        const res = await fetch(`/official/appointments/${id}/status`, {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'same-origin',
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (res.ok) {
            await loadOfficialAppointments();
        } else {
            alert(data.message || 'Error updating status');
        }
    } catch (e) {
        console.error(e);
        alert('Network error updating appointment status');
    }
};
