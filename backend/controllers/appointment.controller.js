const db = require('../database/dbConnect');

/**
 * Citizen books a municipal appointment
 * POST /user/bookAppointment
 */
const bookAppointment = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { department, appointment_date, time_slot, purpose } = req.body;

        if (!appointment_date || !time_slot) {
            return res.status(400).json({
                success: false,
                message: 'Appointment date and time slot are required.'
            });
        }

        const deptName = department || 'General Municipal Administration';

        // Resolve department_id
        let departmentId = null;
        try {
            const [deptRows] = await db.promise().query(
                'SELECT department_id, Name FROM Department WHERE Name = ? OR Name LIKE ? LIMIT 1',
                [deptName, `%${deptName}%`]
            );
            if (deptRows && deptRows.length > 0) {
                departmentId = deptRows[0].department_id;
            }
        } catch (dErr) {
            console.warn('Notice resolving department for appointment:', dErr.message);
        }

        // Generate unique 6-digit municipal appointment token
        const tokenNumber = 'APT-' + Math.floor(100000 + Math.random() * 900000);

        const insertQuery = `
            INSERT INTO Appointment (user_id, department_id, department_name, appointment_date, time_slot, purpose, token_number, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')
        `;

        const [result] = await db.promise().query(insertQuery, [
            userId,
            departmentId,
            deptName,
            appointment_date,
            time_slot,
            purpose || 'Municipal Grievance Consultation',
            tokenNumber
        ]);

        console.log(`✅ Appointment #${result.insertId} booked by User #${userId} with ${deptName} (${tokenNumber})`);

        return res.status(201).json({
            success: true,
            message: `Appointment successfully confirmed with ${deptName}!`,
            token_number: tokenNumber,
            appointment_id: result.insertId,
            appointment: {
                appointment_id: result.insertId,
                token_number: tokenNumber,
                department_name: deptName,
                appointment_date,
                time_slot,
                purpose: purpose || 'Municipal Grievance Consultation',
                status: 'confirmed'
            }
        });
    } catch (err) {
        console.error('Error booking appointment:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error booking appointment',
            error: err.message
        });
    }
};

/**
 * Citizen views their own booked appointments
 * GET /user/appointments
 */
const getUserAppointments = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const query = `
            SELECT 
                a.*,
                d.Contact_info as department_contact
            FROM Appointment a
            LEFT JOIN Department d ON a.department_id = d.department_id
            WHERE a.user_id = ?
            ORDER BY a.appointment_date DESC, a.created_at DESC
        `;

        const [rows] = await db.promise().query(query, [userId]);

        return res.status(200).json({
            success: true,
            appointments: rows
        });
    } catch (err) {
        console.error('Error fetching user appointments:', err);
        return res.status(500).json({
            success: false,
            message: 'Error fetching appointments'
        });
    }
};

/**
 * Official views appointments (both citywide and department-specific)
 * GET /official/appointments
 */
const getDepartmentAppointments = async (req, res) => {
    try {
        const departmentId = req.user.department_id;
        const scope = req.query.scope || 'all'; // Default to all so officials see all municipal appointments

        // Fetch department name
        const [deptRows] = await db.promise().query(
            'SELECT Name FROM Department WHERE department_id = ?',
            [departmentId]
        );
        const deptName = deptRows && deptRows.length > 0 ? deptRows[0].Name : null;

        let query = `
            SELECT 
                a.appointment_id,
                a.token_number,
                a.department_name,
                a.appointment_date,
                a.time_slot,
                a.purpose,
                a.status,
                a.created_at,
                u.user_id,
                u.First_name,
                u.Last_name,
                u.Email,
                u.Phone,
                u.Address_Line,
                u.City,
                u.Pincode,
                CASE WHEN (a.department_id = ? OR (? IS NOT NULL AND a.department_name LIKE ?)) THEN 1 ELSE 0 END AS is_my_department
            FROM Appointment a
            JOIN User u ON a.user_id = u.user_id
        `;

        const queryParams = [
            departmentId,
            deptName,
            deptName ? `%${deptName}%` : null
        ];

        if (scope === 'department') {
            query += ` WHERE a.department_id = ? OR (? IS NOT NULL AND a.department_name LIKE ?)`;
            queryParams.push(departmentId, deptName, deptName ? `%${deptName}%` : null);
        }

        query += ` ORDER BY a.appointment_date ASC, a.created_at DESC`;

        const [rows] = await db.promise().query(query, queryParams);

        return res.status(200).json({
            success: true,
            count: rows.length,
            appointments: rows,
            official_department: deptName
        });
    } catch (err) {
        console.error('Error fetching department appointments:', err);
        return res.status(500).json({
            success: false,
            message: 'Error fetching department appointments'
        });
    }
};

/**
 * Admin views all municipal appointments citywide
 * GET /admin/appointments
 */
const getAllAppointments = async (req, res) => {
    try {
        const query = `
            SELECT 
                a.appointment_id,
                a.token_number,
                a.department_name,
                a.appointment_date,
                a.time_slot,
                a.purpose,
                a.status,
                a.created_at,
                u.user_id,
                u.First_name,
                u.Last_name,
                u.Email,
                u.Phone,
                u.City,
                u.Pincode
            FROM Appointment a
            JOIN User u ON a.user_id = u.user_id
            ORDER BY a.appointment_date ASC, a.created_at DESC
        `;

        const [rows] = await db.promise().query(query);

        return res.status(200).json({
            success: true,
            count: rows.length,
            appointments: rows
        });
    } catch (err) {
        console.error('Error fetching all appointments for admin:', err);
        return res.status(500).json({
            success: false,
            message: 'Error fetching appointments'
        });
    }
};

/**
 * Update appointment status (confirm, complete, cancel)
 * POST /api/appointments/:id/status
 */
const updateAppointmentStatus = async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const { status } = req.body;

        const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        await db.promise().query(
            'UPDATE Appointment SET status = ? WHERE appointment_id = ?',
            [status, appointmentId]
        );

        return res.status(200).json({
            success: true,
            message: `Appointment marked as ${status}`
        });
    } catch (err) {
        console.error('Error updating appointment status:', err);
        return res.status(500).json({
            success: false,
            message: 'Error updating appointment status'
        });
    }
};

module.exports = {
    bookAppointment,
    getUserAppointments,
    getDepartmentAppointments,
    getAllAppointments,
    updateAppointmentStatus
};
