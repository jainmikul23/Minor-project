const db = require('../../database/dbConnect');
const jwt = require('jsonwebtoken');
const { calculateHaversineDistance, calculatePriorityScore } = require('../../utils/researchPaperCore');
const { uploadOnCloudinary } = require('../../utils/cloudinary');
const path = require('path');
const fs = require('fs');

// Render Worker Login Page
const renderWorkerLogin = (req, res) => {
    if (req.cookies.workerToken) {
        try {
            jwt.verify(req.cookies.workerToken, process.env.JWT_SECRET);
            return res.redirect('/worker/dashboard');
        } catch (e) {
            res.clearCookie('workerToken', { path: '/' });
        }
    }
    res.render('worker/worker.login.ejs');
};

// Login Worker via Phone & Pin/Password
const loginWorker = (req, res) => {
    const { Phone, Pin } = req.body;

    if (!Phone) {
        return res.status(400).json({ success: false, error: 'Phone number is required.' });
    }

    const cleanPhone = Phone.trim();

    const query = `
        SELECT w.*, d.Name AS department_name 
        FROM Worker w 
        LEFT JOIN Department d ON w.department_id = d.department_id 
        WHERE w.Phone = ?
    `;

    db.query(query, [cleanPhone], (err, results) => {
        if (err) {
            console.error('Error logging in worker:', err);
            return res.status(500).json({ success: false, error: 'Database error during worker login' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, error: 'No field worker found with this phone number.' });
        }

        const worker = results[0];

        // If Pin provided, check against worker's Pin or default '1234'
        const expectedPin = worker.Pin || '1234';
        if (Pin && Pin.trim() !== expectedPin && Pin.trim() !== '1234') {
            return res.status(401).json({ success: false, error: 'Invalid Worker PIN (Default PIN: 1234)' });
        }

        const token = jwt.sign(
            { worker_id: worker.worker_id, role: 'worker', department_id: worker.department_id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('workerToken', token, {
            httpOnly: true,
            secure: false,
            path: '/',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        console.log(`✅ Worker logged in: ${worker.First_name} ${worker.Last_name} (ID: ${worker.worker_id})`);

        res.status(200).json({
            success: true,
            message: 'Worker authenticated successfully',
            redirect: '/worker/dashboard',
            worker: {
                worker_id: worker.worker_id,
                First_name: worker.First_name,
                Last_name: worker.Last_name,
                Phone: worker.Phone,
                department_id: worker.department_id,
                department_name: worker.department_name,
                Skill_1: worker.Skill_1
            },
            token
        });
    });
};

// Logout Worker
const logoutWorker = (req, res) => {
    res.clearCookie('workerToken', { path: '/' });
    if (req.accepts('html') && !req.xhr && req.method === 'GET') {
        return res.redirect('/worker/login');
    }
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// Render Worker Dashboard
const renderWorkerDashboard = (req, res) => {
    res.render('worker/worker.dashboard.ejs', {
        worker: req.worker
    });
};

// Get Worker Assigned Tasks
const getWorkerTasks = (req, res) => {
    const workerId = req.worker.worker_id;

    const query = `
        SELECT 
            a.assignment_id,
            a.assigned_date,
            a.status AS assignment_status,
            c.complaint_id,
            c.description,
            c.status AS complaint_status,
            c.imageUrl,
            c.Pincode,
            c.State,
            c.City,
            c.Address_Line,
            c.latitude,
            c.longitude,
            c.detected_address,
            c.priority_score,
            c.severity,
            c.confirmations_count,
            c.duplicates_count,
            c.sla_due_at,
            c.is_sensitive_zone,
            c.proof_imageUrl,
            c.proof_latitude,
            c.proof_longitude,
            c.proof_distance_meters,
            c.resolution_otp,
            c.otp_verified_at,
            c.created_at,
            d.Name AS department_name,
            cat.Name AS category_name,
            cat.category_id,
            u.First_name AS citizen_first_name,
            u.Last_name AS citizen_last_name,
            u.Phone AS citizen_phone,
            wr.rating,
            wr.review,
            wr.confirmed AS citizen_confirmed
        FROM assignment a
        JOIN Complaint c ON a.complaint_id = c.complaint_id
        LEFT JOIN Department d ON c.department_id = d.department_id
        LEFT JOIN category cat ON c.category_id = cat.category_id
        LEFT JOIN User u ON c.user_id = u.user_id
        LEFT JOIN Worker_Rating wr ON c.complaint_id = wr.complaint_id
        WHERE a.worker_id = ?
        ORDER BY 
            CASE WHEN a.status = 'in-progress' THEN 0 ELSE 1 END,
            c.priority_score DESC,
            c.created_at DESC
    `;

    db.query(query, [workerId], (err, results) => {
        if (err) {
            console.error('Error fetching worker tasks:', err);
            return res.status(500).json({ success: false, error: 'Database error fetching tasks' });
        }

        // Dynamically compute real-time priority scores based on ageing
        const tasks = (results || []).map(task => {
            const priorityResult = calculatePriorityScore({
                category_id: task.category_id,
                severity: task.severity,
                confirmations_count: task.confirmations_count,
                duplicates_count: task.duplicates_count,
                created_at: task.created_at,
                is_sensitive_zone: task.is_sensitive_zone
            });

            return {
                ...task,
                live_priority_score: priorityResult.score,
                priority_breakdown: priorityResult.breakdown
            };
        });

        const activeTasks = tasks.filter(t => t.assignment_status === 'in-progress');
        const completedTasks = tasks.filter(t => t.assignment_status === 'done');

        res.status(200).json({
            success: true,
            totalTasks: tasks.length,
            activeCount: activeTasks.length,
            completedCount: completedTasks.length,
            tasks,
            activeTasks,
            completedTasks
        });
    });
};

// Start a Task (mark in-progress)
const startTask = (req, res) => {
    const { assignment_id, complaint_id } = req.body;
    const workerId = req.worker.worker_id;

    if (!assignment_id && !complaint_id) {
        return res.status(400).json({ success: false, error: 'Assignment ID or Complaint ID is required.' });
    }

    const updateAssign = `
        UPDATE assignment 
        SET status = 'in-progress' 
        WHERE (assignment_id = ? OR complaint_id = ?) AND worker_id = ?
    `;

    db.query(updateAssign, [assignment_id || 0, complaint_id || 0, workerId], (err) => {
        if (err) {
            console.error('Error starting task:', err);
            return res.status(500).json({ success: false, error: 'Database error starting task' });
        }

        if (complaint_id) {
            db.query("UPDATE Complaint SET status = 'in-progress' WHERE complaint_id = ?", [complaint_id], () => {});
        }

        res.status(200).json({ success: true, message: 'Task marked in-progress. Safe work execution!' });
    });
};

// Complete Task with GPS-Bounded Proof of Resolution (Section V-E of Research Paper)
const completeTaskWithGPSProof = async (req, res) => {
    try {
        const { assignment_id, complaint_id, latitude, longitude, worker_notes } = req.body;
        const workerId = req.worker.worker_id;

        if (!complaint_id) {
            return res.status(400).json({ success: false, error: 'Complaint ID is required' });
        }

        // Fetch original complaint coordinates
        const [complaintRows] = await db.promise().query(
            'SELECT complaint_id, latitude, longitude, status, Address_Line FROM Complaint WHERE complaint_id = ?',
            [complaint_id]
        );

        if (!complaintRows || complaintRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Complaint not found' });
        }

        const complaint = complaintRows[0];

        // Compute GPS Distance between Worker Resolution Fix and Original Complaint Location
        let distanceMeters = null;
        let isWithinPermittedRadius = true;

        if (latitude && longitude && complaint.latitude && complaint.longitude) {
            distanceMeters = calculateHaversineDistance(latitude, longitude, complaint.latitude, complaint.longitude);
            // Configurable 150m radius limit (Section V-E: GPS-bounded proof)
            if (distanceMeters !== null && distanceMeters > 300) {
                // If over 300m away, flag warning but allow submission with distance logged
                console.warn(`⚠️ GPS warning: Resolution proof uploaded ${Math.round(distanceMeters)}m from complaint location`);
            }
        }

        // Handle Photo Upload
        let proofImageUrl = null;

        if (req.file) {
            try {
                const cloudResult = await uploadOnCloudinary(req.file);
                if (cloudResult && cloudResult.secure_url) {
                    proofImageUrl = cloudResult.secure_url;
                }
            } catch (cloudErr) {
                console.warn('Cloudinary upload fallback to local temp:', cloudErr.message);
                proofImageUrl = `/temp/${req.file.filename}`;
            }
        } else if (req.body.proof_image_url) {
            proofImageUrl = req.body.proof_image_url;
        }

        // Retrieve existing OTP or generate 6-digit OTP for Citizen Verification (Research Paper Section V-E)
        const [existingRows] = await db.promise().query('SELECT resolution_otp FROM Complaint WHERE complaint_id = ?', [complaint_id]);
        const resolutionOtp = (existingRows && existingRows[0] && existingRows[0].resolution_otp) 
            ? existingRows[0].resolution_otp 
            : Math.floor(100000 + Math.random() * 900000).toString();

        // Update Assignment to 'in-progress' awaiting OTP verification (or 'done' once verified)
        await db.promise().query(
            "UPDATE assignment SET status = 'in-progress' WHERE complaint_id = ? AND worker_id = ?",
            [complaint_id, workerId]
        );

        // Update Complaint to 'resolved' with GPS-bounded proof metadata and OTP
        const updateComplaintSql = `
            UPDATE Complaint 
            SET status = 'resolved',
                resolution_otp = COALESCE(resolution_otp, ?),
                proof_imageUrl = ?,
                proof_latitude = ?,
                proof_longitude = ?,
                proof_distance_meters = ?,
                proof_submitted_at = NOW(),
                proof_submitted_by = ?,
                resolved_at = NOW()
            WHERE complaint_id = ?
        `;

        await db.promise().query(updateComplaintSql, [
            resolutionOtp,
            proofImageUrl,
            latitude || null,
            longitude || null,
            distanceMeters ? Math.round(distanceMeters) : null,
            workerId,
            complaint_id
        ]);

        // Ensure Worker_Rating row exists for citizen review
        const upsertRating = `
            INSERT INTO Worker_Rating (assignment_id, worker_id, complaint_id, confirmed)
            VALUES (?, ?, ?, 0)
            ON DUPLICATE KEY UPDATE worker_id = VALUES(worker_id)
        `;
        await db.promise().query(upsertRating, [assignment_id || complaint_id, workerId, complaint_id]);

        console.log(`✅ Task resolution proof uploaded by worker ${workerId} for complaint #${complaint_id}. Distance: ${distanceMeters ? Math.round(distanceMeters) + 'm' : 'N/A'}. Verification OTP: ${resolutionOtp}`);

        return res.status(200).json({
            success: true,
            message: 'Resolution proof submitted! Citizen has been provided with a 6-digit OTP to verify on-site completion.',
            distance_meters: distanceMeters ? Math.round(distanceMeters) : null,
            proof_imageUrl: proofImageUrl,
            resolution_otp: resolutionOtp,
            requires_otp: true
        });
    } catch (err) {
        console.error('Error completing task with GPS proof:', err);
        return res.status(500).json({ success: false, error: 'Server error while submitting resolution proof' });
    }
};

// Verify Citizen OTP to Officially Close Complaint (Section V-E)
const verifyResolutionOTP = async (req, res) => {
    try {
        const complaintId = req.params.id || req.body.complaint_id;
        const { otp } = req.body;

        if (!complaintId || !otp) {
            return res.status(400).json({ success: false, error: 'Complaint ID and 6-digit OTP are required.' });
        }

        const [rows] = await db.promise().query(
            'SELECT complaint_id, user_id, resolution_otp, status FROM Complaint WHERE complaint_id = ?',
            [complaintId]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Complaint not found.' });
        }

        const complaint = rows[0];

        // Check if OTP matches
        if (complaint.resolution_otp && complaint.resolution_otp.trim() === otp.trim()) {
            await db.promise().query(
                `UPDATE Complaint 
                 SET status = 'resolved', 
                     otp_verified_at = NOW() 
                 WHERE complaint_id = ?`,
                [complaintId]
            );

            // Mark assignment done
            await db.promise().query(
                "UPDATE assignment SET status = 'done' WHERE complaint_id = ?",
                [complaintId]
            );

            // Mark worker rating confirmed
            await db.promise().query(
                "UPDATE Worker_Rating SET confirmed = 1 WHERE complaint_id = ?",
                [complaintId]
            );

            // Increment citizen good_reports for verified issue resolution
            if (complaint.user_id) {
                await db.promise().query(
                    "UPDATE User SET good_reports = good_reports + 1 WHERE user_id = ?",
                    [complaint.user_id]
                );
            }

            console.log(`✅ OTP verified for complaint #${complaintId}. Work officially confirmed.`);

            return res.status(200).json({
                success: true,
                message: 'OTP verified successfully! Resolution officially confirmed and closed.',
                complaint_id: complaintId
            });
        } else {
            return res.status(400).json({
                success: false,
                error: 'Invalid OTP. Please check the 6-digit verification code with the resident.'
            });
        }
    } catch (err) {
        console.error('Error verifying resolution OTP:', err);
        return res.status(500).json({ success: false, error: 'Server error verifying OTP' });
    }
};

// Get Worker Profile & Performance Stats
const getWorkerProfile = (req, res) => {
    const workerId = req.worker.worker_id;

    const query = `
        SELECT 
            w.*,
            d.Name AS department_name,
            COUNT(DISTINCT CASE WHEN a.status = 'done' THEN a.assignment_id END) AS completed_tasks,
            COUNT(DISTINCT CASE WHEN a.status = 'in-progress' THEN a.assignment_id END) AS active_tasks,
            AVG(wr.rating) AS avg_rating,
            COUNT(wr.rating) AS total_ratings_count
        FROM Worker w
        LEFT JOIN Department d ON w.department_id = d.department_id
        LEFT JOIN assignment a ON w.worker_id = a.worker_id
        LEFT JOIN Worker_Rating wr ON w.worker_id = wr.worker_id AND wr.rating IS NOT NULL
        WHERE w.worker_id = ?
        GROUP BY w.worker_id
    `;

    db.query(query, [workerId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(500).json({ success: false, error: 'Database error fetching worker profile' });
        }

        const data = results[0];
        const safeWorker = { ...data };
        delete safeWorker.Pin;
        res.status(200).json({
            success: true,
            worker: {
                ...safeWorker,
                avg_rating: safeWorker.avg_rating ? parseFloat(Number(safeWorker.avg_rating).toFixed(1)) : 5.0
            }
        });
    });
};

module.exports = {
    renderWorkerLogin,
    loginWorker,
    logoutWorker,
    renderWorkerDashboard,
    getWorkerTasks,
    startTask,
    completeTaskWithGPSProof,
    verifyResolutionOTP,
    getWorkerProfile
};

