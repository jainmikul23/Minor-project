const db = require('../../database/dbConnect');
const { computeEquityWardAnalytics } = require('../../utils/researchPaperCore');

// Render Admin Dashboard Page
const renderAdminDashboard = (req, res) => {
    // Quick initial counts for rendering the shell
    const summaryQuery = `
        SELECT
            (SELECT COUNT(*) FROM Complaint) AS total_complaints,
            (SELECT COUNT(*) FROM Complaint WHERE status = 'reported') AS reported_complaints,
            (SELECT COUNT(*) FROM Complaint WHERE status = 'in-progress') AS in_progress_complaints,
            (SELECT COUNT(*) FROM Complaint WHERE status = 'resolved') AS resolved_complaints,
            (SELECT COUNT(*) FROM Complaint WHERE status = 'rejected') AS rejected_complaints,
            (SELECT COUNT(*) FROM User) AS total_citizens,
            (SELECT COUNT(*) FROM Official) AS total_officials,
            (SELECT COUNT(*) FROM Worker) AS total_workers,
            (SELECT COUNT(*) FROM Department) AS total_departments
    `;

    db.query(summaryQuery, (err, results) => {
        const stats = (results && results[0]) || {
            total_complaints: 0,
            reported_complaints: 0,
            in_progress_complaints: 0,
            resolved_complaints: 0,
            rejected_complaints: 0,
            total_citizens: 0,
            total_officials: 0,
            total_workers: 0,
            total_departments: 0
        };

        res.render('admin/admin.dashboard.ejs', {
            admin: {
                username: process.env.ADMIN_USERNAME || 'admin',
                role: 'Super Administrator',
                department: 'Indore Municipal Corporation'
            },
            stats
        });
    });
};

// API: Get complete system statistics & charts data
const getAdminStats = (req, res) => {
    const countsQuery = `
        SELECT
            (SELECT COUNT(*) FROM Complaint) AS total_complaints,
            (SELECT COUNT(*) FROM Complaint WHERE status = 'reported') AS reported,
            (SELECT COUNT(*) FROM Complaint WHERE status = 'in-progress') AS in_progress,
            (SELECT COUNT(*) FROM Complaint WHERE status = 'resolved') AS resolved,
            (SELECT COUNT(*) FROM Complaint WHERE status = 'rejected') AS rejected,
            (SELECT COUNT(*) FROM User) AS total_citizens,
            (SELECT COUNT(*) FROM Official) AS total_officials,
            (SELECT COUNT(*) FROM Worker) AS total_workers,
            (SELECT COUNT(*) FROM Department) AS total_departments
    `;

    const deptBreakdownQuery = `
        SELECT 
            d.department_id,
            d.Name AS department_name,
            COUNT(c.complaint_id) AS complaint_count,
            SUM(CASE WHEN c.status = 'resolved' THEN 1 ELSE 0 END) AS resolved_count,
            SUM(CASE WHEN c.status = 'in-progress' THEN 1 ELSE 0 END) AS in_progress_count,
            SUM(CASE WHEN c.status = 'reported' THEN 1 ELSE 0 END) AS reported_count
        FROM Department d
        LEFT JOIN Complaint c ON d.department_id = c.department_id
        GROUP BY d.department_id, d.Name
        ORDER BY complaint_count DESC
    `;

    const recentComplaintsQuery = `
        SELECT 
            c.complaint_id,
            c.description,
            c.status,
            c.created_at,
            c.City,
            c.State,
            d.Name AS department_name,
            u.First_name AS citizen_first_name,
            u.Last_name AS citizen_last_name
        FROM Complaint c
        LEFT JOIN Department d ON c.department_id = d.department_id
        LEFT JOIN User u ON c.user_id = u.user_id
        ORDER BY c.created_at DESC
        LIMIT 6
    `;

    db.query(countsQuery, (err, countRows) => {
        if (err) {
            console.error('Error fetching admin counts:', err);
            return res.status(500).json({ success: false, error: 'Database error fetching stats' });
        }

        db.query(deptBreakdownQuery, (err, deptRows) => {
            if (err) {
                console.error('Error fetching department breakdown:', err);
                return res.status(500).json({ success: false, error: 'Database error fetching department stats' });
            }

            db.query(recentComplaintsQuery, (err, recentRows) => {
                if (err) {
                    console.error('Error fetching recent complaints:', err);
                    return res.status(500).json({ success: false, error: 'Database error fetching recent complaints' });
                }

                res.status(200).json({
                    success: true,
                    overview: countRows[0] || {},
                    departmentBreakdown: deptRows || [],
                    recentComplaints: recentRows || []
                });
            });
        });
    });
};

// API: Get all complaints with filters
const getAdminComplaints = (req, res) => {
    const { status, department_id, search } = req.query;

    let query = `
        SELECT 
            c.*,
            d.Name AS department_name,
            cat.Name AS category_name,
            u.First_name AS user_first_name,
            u.Last_name AS user_last_name,
            u.Email AS user_email,
            u.Phone AS user_phone,
            w.worker_id,
            w.First_name AS worker_first_name,
            w.Last_name AS worker_last_name,
            w.Phone AS worker_phone,
            o.official_id,
            o.First_name AS official_first_name,
            o.Last_name AS official_last_name,
            a.assignment_id,
            a.status AS assignment_status,
            a.assigned_date,
            wr.rating,
            wr.review,
            wr.confirmed AS citizen_confirmed
        FROM Complaint c
        LEFT JOIN Department d ON c.department_id = d.department_id
        LEFT JOIN category cat ON c.category_id = cat.category_id
        LEFT JOIN User u ON c.user_id = u.user_id
        LEFT JOIN assignment a ON c.complaint_id = a.complaint_id AND a.status = 'in-progress'
        LEFT JOIN Worker w ON a.worker_id = w.worker_id
        LEFT JOIN Official o ON a.official_id = o.official_id
        LEFT JOIN Worker_Rating wr ON c.complaint_id = wr.complaint_id
        WHERE 1=1
    `;

    const params = [];

    if (status && status !== 'all') {
        query += ' AND c.status = ?';
        params.push(status);
    }

    if (department_id && department_id !== 'all') {
        query += ' AND c.department_id = ?';
        params.push(department_id);
    }

    if (search && search.trim() !== '') {
        const s = `%${search.trim()}%`;
        query += ` AND (
            c.complaint_id LIKE ? OR 
            c.description LIKE ? OR 
            c.City LIKE ? OR 
            c.Address_Line LIKE ? OR 
            u.First_name LIKE ? OR 
            u.Last_name LIKE ? OR 
            u.Email LIKE ?
        )`;
        params.push(s, s, s, s, s, s, s);
    }

    query += ' ORDER BY c.created_at DESC';

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error fetching admin complaints:', err);
            return res.status(500).json({ success: false, error: 'Database error fetching complaints' });
        }
        res.status(200).json({ success: true, complaints: results });
    });
};

// API: Update complaint status & assignment
const updateComplaintStatus = (req, res) => {
    const complaintId = req.params.id;
    const { status, department_id, rejection_reason, worker_id } = req.body;

    if (!complaintId) {
        return res.status(400).json({ success: false, error: 'Complaint ID is required' });
    }

    const updates = [];
    const params = [];

    if (status) {
        updates.push('status = ?');
        params.push(status);

        if (status === 'rejected') {
            updates.push('rejection_reason = ?');
            params.push(rejection_reason || 'Rejected by Administrator');
            updates.push('rejected_at = NOW()');
        } else if (status === 'resolved') {
            updates.push('rejection_reason = NULL');
        }
    }

    if (department_id) {
        updates.push('department_id = ?');
        params.push(department_id);
    }

    if (updates.length === 0 && !worker_id) {
        return res.status(400).json({ success: false, error: 'No fields provided to update' });
    }

    params.push(complaintId);
    const updateComplaintSql = `UPDATE Complaint SET ${updates.join(', ')} WHERE complaint_id = ?`;

    db.query(updateComplaintSql, params, (err) => {
        if (err) {
            console.error('Error updating complaint status:', err);
            return res.status(500).json({ success: false, error: 'Database error updating complaint' });
        }

        // If status resolved, update active assignment to done
        if (status === 'resolved') {
            db.query('UPDATE assignment SET status = "done" WHERE complaint_id = ?', [complaintId], () => {});
        }

        // If assigning a worker
        if (worker_id) {
            const assignSql = `
                INSERT INTO assignment (complaint_id, official_id, worker_id, status)
                VALUES (?, 1, ?, 'in-progress')
                ON DUPLICATE KEY UPDATE worker_id = VALUES(worker_id), status = 'in-progress'
            `;
            db.query(assignSql, [complaintId, worker_id], (assignErr) => {
                if (assignErr) console.warn('Warning updating assignment:', assignErr.message);
                return res.status(200).json({ success: true, message: 'Complaint status and worker assignment updated successfully' });
            });
        } else {
            return res.status(200).json({ success: true, message: 'Complaint status updated successfully' });
        }
    });
};

// API: Delete complaint
const deleteComplaint = (req, res) => {
    const complaintId = req.params.id;

    if (!complaintId) {
        return res.status(400).json({ success: false, error: 'Complaint ID is required' });
    }

    db.query('DELETE FROM Worker_Rating WHERE complaint_id = ?', [complaintId], () => {
        db.query('DELETE FROM assignment WHERE complaint_id = ?', [complaintId], () => {
            db.query('DELETE FROM Complaint WHERE complaint_id = ?', [complaintId], (err) => {
                if (err) {
                    console.error('Error deleting complaint:', err);
                    return res.status(500).json({ success: false, error: 'Database error deleting complaint' });
                }
                res.status(200).json({ success: true, message: 'Complaint deleted successfully' });
            });
        });
    });
};

// API: Get all officials
const getAdminOfficials = (req, res) => {
    const query = `
        SELECT 
            o.official_id,
            o.First_name,
            o.Last_name,
            o.Email,
            o.Phone,
            o.Login_credentials,
            o.department_id,
            d.Name AS department_name,
            COUNT(DISTINCT a.assignment_id) AS total_assignments,
            SUM(CASE WHEN a.status = 'in-progress' THEN 1 ELSE 0 END) AS active_assignments
        FROM Official o
        LEFT JOIN Department d ON o.department_id = d.department_id
        LEFT JOIN assignment a ON o.official_id = a.official_id
        GROUP BY o.official_id, o.First_name, o.Last_name, o.Email, o.Phone, o.Login_credentials, o.department_id, d.Name
        ORDER BY o.official_id ASC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching officials:', err);
            return res.status(500).json({ success: false, error: 'Database error fetching officials' });
        }
        res.status(200).json({ success: true, officials: results });
    });
};

// API: Delete official
const deleteOfficial = (req, res) => {
    const officialId = req.params.id;
    if (!officialId) {
        return res.status(400).json({ success: false, error: 'Official ID is required' });
    }

    db.query('DELETE FROM Official WHERE official_id = ?', [officialId], (err, result) => {
        if (err) {
            console.error('Error deleting official:', err);
            return res.status(500).json({ success: false, error: 'Database error deleting official' });
        }
        res.status(200).json({ success: true, message: 'Official deleted successfully' });
    });
};

// API: Get all field workers
const getAdminWorkers = (req, res) => {
    const query = `
        SELECT 
            w.worker_id,
            w.First_name,
            w.Last_name,
            w.Phone,
            w.Skill_1,
            w.Skill_2,
            w.Skill_3,
            w.Skill_4,
            w.department_id,
            d.Name AS department_name,
            CASE 
                WHEN a.assignment_id IS NOT NULL THEN 'busy'
                ELSE 'available'
            END AS status,
            a.complaint_id AS active_complaint_id
        FROM Worker w
        LEFT JOIN Department d ON w.department_id = d.department_id
        LEFT JOIN assignment a ON w.worker_id = a.worker_id AND a.status = 'in-progress'
        ORDER BY w.worker_id ASC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching workers:', err);
            return res.status(500).json({ success: false, error: 'Database error fetching workers' });
        }
        res.status(200).json({ success: true, workers: results });
    });
};

// API: Add new worker
const addAdminWorker = (req, res) => {
    const { First_name, Last_name, Phone, Skill_1, Skill_2, department_id } = req.body;

    if (!First_name || !Last_name || !Phone || !department_id) {
        return res.status(400).json({ success: false, error: 'First name, last name, phone, and department are required' });
    }

    const query = `
        INSERT INTO Worker (First_name, Last_name, Phone, Skill_1, Skill_2, department_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [First_name, Last_name, Phone, Skill_1 || 'General Service', Skill_2 || null, department_id], (err, result) => {
        if (err) {
            console.error('Error inserting worker:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ success: false, error: 'Worker with this phone already exists' });
            }
            return res.status(500).json({ success: false, error: 'Database error adding worker' });
        }
        res.status(201).json({ success: true, message: 'Worker added successfully', worker_id: result.insertId });
    });
};

// API: Delete worker
const deleteAdminWorker = (req, res) => {
    const workerId = req.params.id;
    if (!workerId) {
        return res.status(400).json({ success: false, error: 'Worker ID is required' });
    }

    db.query('DELETE FROM Worker WHERE worker_id = ?', [workerId], (err) => {
        if (err) {
            console.error('Error deleting worker:', err);
            return res.status(500).json({ success: false, error: 'Database error deleting worker' });
        }
        res.status(200).json({ success: true, message: 'Worker deleted successfully' });
    });
};

// API: Get all registered citizens
const getAdminCitizens = (req, res) => {
    const query = `
        SELECT 
            u.user_id,
            u.First_name,
            u.Last_name,
            u.Email,
            u.Phone,
            u.City,
            u.State,
            u.Pincode,
            u.Address_Line,
            u.created_at,
            COUNT(c.complaint_id) AS total_complaints,
            SUM(CASE WHEN c.status = 'resolved' THEN 1 ELSE 0 END) AS resolved_complaints,
            SUM(CASE WHEN c.status = 'in-progress' THEN 1 ELSE 0 END) AS in_progress_complaints,
            SUM(CASE WHEN c.status = 'reported' THEN 1 ELSE 0 END) AS reported_complaints
        FROM User u
        LEFT JOIN Complaint c ON u.user_id = c.user_id
        GROUP BY u.user_id, u.First_name, u.Last_name, u.Email, u.Phone, u.City, u.State, u.Pincode, u.Address_Line, u.created_at
        ORDER BY u.user_id ASC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching citizens:', err);
            return res.status(500).json({ success: false, error: 'Database error fetching citizens' });
        }
        res.status(200).json({ success: true, citizens: results });
    });
};

// API: Get departments and categories
const getAdminDepartments = (req, res) => {
    const deptQuery = 'SELECT * FROM Department ORDER BY department_id ASC';
    const catQuery = 'SELECT * FROM category ORDER BY department_id ASC, Name ASC';

    db.query(deptQuery, (err, depts) => {
        if (err) {
            console.error('Error fetching departments:', err);
            return res.status(500).json({ success: false, error: 'Database error fetching departments' });
        }

        db.query(catQuery, (err, cats) => {
            if (err) {
                console.error('Error fetching categories:', err);
                return res.status(500).json({ success: false, error: 'Database error fetching categories' });
            }

            // Group categories by department
            const departments = (depts || []).map(d => ({
                ...d,
                categories: (cats || []).filter(c => c.department_id === d.department_id)
            }));

            res.status(200).json({ success: true, departments });
        });
    });
};

// API: Equity-Aware Ward Analytics (Section V-F)
const getEquityAnalytics = async (req, res) => {
    try {
        const analytics = await computeEquityWardAnalytics();
        res.status(200).json({ success: true, ...analytics });
    } catch (err) {
        console.error('Error computing equity ward analytics:', err);
        res.status(500).json({ success: false, error: 'Failed to compute equity analytics' });
    }
};

module.exports = {
    renderAdminDashboard,
    getAdminStats,
    getAdminComplaints,
    updateComplaintStatus,
    deleteComplaint,
    getAdminOfficials,
    deleteOfficial,
    getAdminWorkers,
    addAdminWorker,
    deleteAdminWorker,
    getAdminCitizens,
    getAdminDepartments,
    getEquityAnalytics
};

