const db = require('../../database/dbConnect');

/**
 * Fetch all field workers for the official's department with live workload stats
 */
const getWorkersForOfficial = async (req, res) => {
    try {
        const departmentId = req.user.department_id;
        const complaintId = parseInt(req.query.complaint_id, 10) || 0;

        // Query workers in this department with their active load and status for this complaint
        const query = `
            SELECT
                w.worker_id,
                w.First_name,
                w.Last_name,
                w.Phone,
                w.Skill_1,
                w.Skill_2,
                w.Skill_3,
                w.department_id,
                COUNT(CASE WHEN a.status = 'in-progress' THEN 1 END) as active_tasks,
                MAX(CASE WHEN a.complaint_id = ? AND a.status = 'in-progress' THEN 1 ELSE 0 END) as is_assigned_to_this,
                MAX(CASE WHEN a.complaint_id = ? AND a.status = 'in-progress' THEN a.assignment_id ELSE NULL END) as this_assignment_id
            FROM Worker w
            LEFT JOIN assignment a ON w.worker_id = a.worker_id
            WHERE w.department_id = ?
            GROUP BY w.worker_id, w.First_name, w.Last_name, w.Phone, w.Skill_1, w.Skill_2, w.Skill_3, w.department_id
            ORDER BY is_assigned_to_this DESC, active_tasks ASC, w.First_name ASC
        `;

        const [results] = await db.promise().query(query, [complaintId, complaintId, departmentId]);

        const mappedWorkers = (results || []).map(w => {
            const isAssigned = Number(w.is_assigned_to_this) === 1;
            const activeCount = Number(w.active_tasks || 0);

            let status = 'available';
            if (isAssigned) {
                status = 'assigned';
            } else if (activeCount > 0) {
                status = 'busy';
            }

            return {
                worker_id: w.worker_id,
                First_name: w.First_name,
                Last_name: w.Last_name,
                Phone: w.Phone,
                skills: [w.Skill_1, w.Skill_2, w.Skill_3].filter(Boolean).join(', '),
                assignment_status: status,
                active_tasks: activeCount,
                this_assignment_id: w.this_assignment_id
            };
        });

        return res.status(200).json({
            success: true,
            workers: mappedWorkers,
            complaint_id: complaintId
        });
    } catch (err) {
        console.error('Error fetching workers for official:', err);
        return res.status(500).json({ success: false, message: 'Internal server error fetching workers' });
    }
};

/**
 * Add a new field worker to the department
 */
const addWorker = async (req, res) => {
    try {
        const { First_name, Last_name, Phone, Skill_1 = 'General' } = req.body;
        const departmentId = req.user.department_id;

        if (!First_name || !Last_name || !Phone) {
            return res.status(400).json({ success: false, message: 'First name, Last name, and Phone are required.' });
        }

        const query = `
            INSERT INTO Worker (First_name, Last_name, Phone, Skill_1, department_id, Pin)
            VALUES (?, ?, ?, ?, ?, '1234')
        `;

        const [result] = await db.promise().query(query, [First_name, Last_name, Phone, Skill_1, departmentId]);

        return res.status(201).json({
            success: true,
            message: 'Field worker added successfully.',
            worker_id: result.insertId
        });
    } catch (err) {
        console.error('Error adding worker:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Worker with this phone number already exists.' });
        }
        return res.status(500).json({ success: false, message: 'Internal server error adding worker' });
    }
};

/**
 * Assign or reassign a field worker to a complaint
 * Supports dynamic reassignment and queuing
 */
const assignWorker = async (req, res) => {
    try {
        const { worker_id, complaint_id } = req.body;
        const officialId = req.user.official_id;
        const departmentId = req.user.department_id;

        if (!worker_id || !complaint_id) {
            return res.status(400).json({ success: false, message: 'Worker ID and Complaint ID are required.' });
        }

        // Verify worker exists and belongs to official's department
        const [workerRows] = await db.promise().query(
            'SELECT worker_id, First_name, Last_name, Phone, department_id FROM Worker WHERE worker_id = ?',
            [worker_id]
        );

        if (!workerRows || workerRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Worker not found.' });
        }

        const worker = workerRows[0];
        if (worker.department_id && worker.department_id !== departmentId) {
            return res.status(403).json({ success: false, message: 'Worker belongs to a different department.' });
        }

        // Check if an assignment already exists for this complaint
        const [existingAssignments] = await db.promise().query(
            'SELECT assignment_id, worker_id, status FROM assignment WHERE complaint_id = ?',
            [complaint_id]
        );

        if (existingAssignments && existingAssignments.length > 0) {
            const current = existingAssignments[0];
            if (Number(current.worker_id) === Number(worker_id) && current.status === 'in-progress') {
                return res.status(200).json({
                    success: true,
                    message: `${worker.First_name} ${worker.Last_name} is already assigned to this task.`
                });
            }

            // Update existing assignment record to point to new worker
            await db.promise().query(
                `UPDATE assignment 
                 SET worker_id = ?, official_id = ?, status = 'in-progress', assigned_date = CURRENT_TIMESTAMP 
                 WHERE complaint_id = ?`,
                [worker_id, officialId, complaint_id]
            );
        } else {
            // Create new assignment record
            await db.promise().query(
                `INSERT INTO assignment (complaint_id, official_id, worker_id, status, assigned_date) 
                 VALUES (?, ?, ?, 'in-progress', CURRENT_TIMESTAMP)`,
                [complaint_id, officialId, worker_id]
            );
        }

        // Ensure complaint status is in-progress
        await db.promise().query(
            `UPDATE Complaint SET status = 'in-progress', updated_at = CURRENT_TIMESTAMP WHERE complaint_id = ?`,
            [complaint_id]
        );

        console.log(`✅ Official #${officialId} assigned Complaint #${complaint_id} to Worker #${worker_id} (${worker.First_name} ${worker.Last_name})`);

        return res.status(200).json({
            success: true,
            message: `Task successfully assigned to ${worker.First_name} ${worker.Last_name}. Status updated to in-progress.`
        });
    } catch (err) {
        console.error('Error in assignWorker:', err);
        return res.status(500).json({ success: false, message: 'Internal server error assigning worker' });
    }
};

/**
 * Mark a task / complaint completed from official portal
 */
const completeTask = async (req, res) => {
    try {
        const { complaint_id } = req.body;
        const officialId = req.user.official_id;

        if (!complaint_id) {
            return res.status(400).json({ success: false, message: 'Complaint ID is required.' });
        }

        // Mark any assignment for this complaint as done
        await db.promise().query(
            `UPDATE assignment SET status = 'done' WHERE complaint_id = ?`,
            [complaint_id]
        );

        // Update complaint status to resolved
        await db.promise().query(
            `UPDATE Complaint SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE complaint_id = ?`,
            [complaint_id]
        );

        return res.status(200).json({
            success: true,
            message: 'Task marked as completed and complaint successfully resolved.'
        });
    } catch (err) {
        console.error('Error completing task:', err);
        return res.status(500).json({ success: false, message: 'Internal server error completing task' });
    }
};

/**
 * Reject a complaint with an official justification reason
 */
const rejectComplaint = async (req, res) => {
    try {
        const { complaint_id, reason } = req.body;
        const officialId = req.user.official_id;
        const departmentId = req.user.department_id;

        if (!complaint_id) {
            return res.status(400).json({ success: false, message: 'Complaint ID is required.' });
        }

        const [rows] = await db.promise().query(
            'SELECT complaint_id, department_id, status FROM Complaint WHERE complaint_id = ?',
            [complaint_id]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Complaint not found.' });
        }

        const complaint = rows[0];
        if (complaint.department_id && complaint.department_id !== departmentId) {
            return res.status(403).json({ success: false, message: 'You are not authorized to reject complaints from another department.' });
        }

        if (complaint.status === 'resolved') {
            return res.status(400).json({ success: false, message: 'Cannot reject an already resolved complaint.' });
        }

        // Close any active assignments
        await db.promise().query(
            `UPDATE assignment SET status = 'done' WHERE complaint_id = ?`,
            [complaint_id]
        );

        // Update complaint to rejected
        const updateQuery = `
            UPDATE Complaint 
            SET status = 'rejected', rejection_reason = ?, rejected_by = ?, rejected_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
            WHERE complaint_id = ?
        `;
        await db.promise().query(updateQuery, [reason || 'Rejected by department official', officialId, complaint_id]);

        return res.status(200).json({
            success: true,
            message: 'Complaint successfully rejected and logged with reason.'
        });
    } catch (err) {
        console.error('Error rejecting complaint:', err);
        return res.status(500).json({ success: false, message: 'Internal server error rejecting complaint' });
    }
};

module.exports = {
    getWorkersForOfficial,
    addWorker,
    assignWorker,
    completeTask,
    rejectComplaint
};
