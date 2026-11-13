const db = require('../../database/dbConnect');
const {
    calculateHaversineDistance,
    calculateUserTrustScore,
    calculatePriorityScore,
    findGeospatialDuplicates
} = require('../../utils/researchPaperCore');

// 1. Geospatial Duplicate Detection at Submission (Section V-B)
const checkDuplicates = async (req, res) => {
    try {
        const { category_id, latitude, longitude } = req.body;

        if (!category_id || !latitude || !longitude) {
            return res.status(200).json({ success: true, hasDuplicates: false, duplicates: [] });
        }

        const duplicates = await findGeospatialDuplicates(category_id, latitude, longitude);

        return res.status(200).json({
            success: true,
            hasDuplicates: duplicates.length > 0,
            count: duplicates.length,
            duplicates
        });
    } catch (err) {
        console.error('Error checking duplicates:', err);
        return res.status(500).json({ success: false, error: 'Error checking duplicate reports' });
    }
};

// 2. Proximity-Gated, Trust-Weighted Community Validation (Section V-C)
const confirmCommunityValidation = async (req, res) => {
    try {
        const complaintId = req.params.id;
        const userId = req.user.user_id;
        const { latitude, longitude } = req.body;

        if (!complaintId) {
            return res.status(400).json({ success: false, error: 'Complaint ID is required' });
        }

        // Fetch complaint details
        const [complaintRows] = await db.promise().query(
            'SELECT complaint_id, category_id, latitude, longitude, confirmations_count, duplicates_count, severity, created_at, is_sensitive_zone FROM Complaint WHERE complaint_id = ?',
            [complaintId]
        );

        if (!complaintRows || complaintRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Complaint not found' });
        }

        const complaint = complaintRows[0];

        // Check if user already confirmed this complaint
        const [existing] = await db.promise().query(
            'SELECT confirmation_id FROM Complaint_Confirmation WHERE complaint_id = ? AND user_id = ?',
            [complaintId, userId]
        );

        if (existing && existing.length > 0) {
            return res.status(409).json({ success: false, error: 'You have already confirmed/corroborated this civic issue.' });
        }

        // Proximity gating: GPS fix must be within 300m (Section V-C)
        let distanceMeters = null;
        if (latitude && longitude && complaint.latitude && complaint.longitude) {
            distanceMeters = calculateHaversineDistance(latitude, longitude, complaint.latitude, complaint.longitude);
            if (distanceMeters !== null && distanceMeters > 500) {
                return res.status(403).json({
                    success: false,
                    error: `Proximity validation failed: You are ${Math.round(distanceMeters)}m away. Confirmations must be within 500m of the incident site to resist spam.`,
                    distance_meters: Math.round(distanceMeters)
                });
            }
        }

        // Compute user's smoothed trust score tau_u (Section V-C Equation 2)
        const [userRows] = await db.promise().query('SELECT good_reports, bad_reports FROM User WHERE user_id = ?', [userId]);
        const gu = (userRows && userRows[0]) ? userRows[0].good_reports : 0;
        const bu = (userRows && userRows[0]) ? userRows[0].bad_reports : 0;
        const trustWeight = calculateUserTrustScore(gu, bu);

        // Insert into Complaint_Confirmation
        await db.promise().query(`
            INSERT INTO Complaint_Confirmation (complaint_id, user_id, user_latitude, user_longitude, distance_meters, trust_weight)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            complaintId,
            userId,
            latitude || null,
            longitude || null,
            distanceMeters ? Math.round(distanceMeters) : null,
            trustWeight
        ]);

        // Increment confirmations_count and recompute priority score P(i)
        const newConfirmCount = (complaint.confirmations_count || 0) + 1;
        const priorityResult = calculatePriorityScore({
            category_id: complaint.category_id,
            severity: complaint.severity,
            confirmations_count: newConfirmCount,
            duplicates_count: complaint.duplicates_count,
            created_at: complaint.created_at,
            is_sensitive_zone: complaint.is_sensitive_zone
        });

        await db.promise().query(
            'UPDATE Complaint SET confirmations_count = ?, priority_score = ? WHERE complaint_id = ?',
            [newConfirmCount, priorityResult.score, complaintId]
        );

        console.log(`✅ Community confirmation added for complaint #${complaintId} by user ${userId}. Trust weight: ${trustWeight}, New Priority: ${priorityResult.score}`);

        return res.status(200).json({
            success: true,
            message: 'Thank you! Your proximity-gated corroboration has been recorded and raises the issue urgency.',
            confirmations_count: newConfirmCount,
            priority_score: priorityResult.score,
            distance_meters: distanceMeters ? Math.round(distanceMeters) : null,
            trust_weight: trustWeight
        });
    } catch (err) {
        console.error('Error in community confirmation:', err);
        return res.status(500).json({ success: false, error: 'Database error processing confirmation' });
    }
};

// 3. Citizen Reopen Grievance with Ageing Penalty (Section V-E)
const reopenComplaint = async (req, res) => {
    try {
        const complaintId = req.params.id;
        const userId = req.user.user_id;
        const { reopen_reason } = req.body;

        const [complaints] = await db.promise().query(
            'SELECT complaint_id, user_id, category_id, status, reopened_count, confirmations_count, duplicates_count, is_sensitive_zone, created_at FROM Complaint WHERE complaint_id = ?',
            [complaintId]
        );

        if (!complaints || complaints.length === 0) {
            return res.status(404).json({ success: false, error: 'Complaint not found' });
        }

        const complaint = complaints[0];

        if (complaint.user_id !== userId) {
            return res.status(403).json({ success: false, error: 'Only the original reporting citizen can reopen this issue.' });
        }

        const newReopenedCount = (complaint.reopened_count || 0) + 1;

        // Reopened ticket returns to queue with elevated priority
        const priorityResult = calculatePriorityScore({
            category_id: complaint.category_id,
            severity: 'High', // elevated severity on reopen
            confirmations_count: (complaint.confirmations_count || 0) + 2,
            duplicates_count: complaint.duplicates_count,
            created_at: complaint.created_at,
            is_sensitive_zone: 1
        });

        await db.promise().query(`
            UPDATE Complaint 
            SET status = 'in-progress',
                reopened_count = ?,
                priority_score = ?,
                rejection_reason = ?
            WHERE complaint_id = ?
        `, [
            newReopenedCount,
            priorityResult.score,
            reopen_reason ? `Citizen Reopened: ${reopen_reason}` : 'Citizen unsatisfied with resolution',
            complaintId
        ]);

        // Mark assignment back to in-progress
        await db.promise().query(
            "UPDATE assignment SET status = 'in-progress' WHERE complaint_id = ?",
            [complaintId]
        );

        return res.status(200).json({
            success: true,
            message: 'Grievance reopened and escalated back to field crews with priority penalty.',
            reopened_count: newReopenedCount,
            priority_score: priorityResult.score
        });
    } catch (err) {
        console.error('Error reopening complaint:', err);
        return res.status(500).json({ success: false, error: 'Server error reopening complaint' });
    }
};

// 4. OTP Verification by Citizen (Section V-E)
const verifyCitizenOTP = async (req, res) => {
    try {
        const complaintId = req.params.id;
        const userId = req.user.user_id;
        const { otp } = req.body;

        if (!complaintId || !otp) {
            return res.status(400).json({ success: false, error: 'Complaint ID and 6-digit OTP are required.' });
        }

        const [rows] = await db.promise().query(
            'SELECT complaint_id, user_id, resolution_otp, status FROM Complaint WHERE complaint_id = ? AND user_id = ?',
            [complaintId, userId]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Complaint not found or unauthorized.' });
        }

        const complaint = rows[0];

        if (complaint.resolution_otp && complaint.resolution_otp.trim() === otp.trim()) {
            await db.promise().query(
                `UPDATE Complaint 
                 SET status = 'resolved', 
                     otp_verified_at = NOW() 
                 WHERE complaint_id = ?`,
                [complaintId]
            );

            await db.promise().query(
                "UPDATE assignment SET status = 'done' WHERE complaint_id = ?",
                [complaintId]
            );

            await db.promise().query(
                "UPDATE Worker_Rating SET confirmed = 1 WHERE complaint_id = ?",
                [complaintId]
            );

            await db.promise().query(
                "UPDATE User SET good_reports = good_reports + 1 WHERE user_id = ?",
                [userId]
            );

            return res.status(200).json({
                success: true,
                message: 'OTP verified! Work completion officially confirmed.'
            });
        } else {
            return res.status(400).json({
                success: false,
                error: 'Invalid OTP code. Please enter the correct 6-digit verification code.'
            });
        }
    } catch (err) {
        console.error('Error in verifyCitizenOTP:', err);
        return res.status(500).json({ success: false, error: 'Server error verifying OTP' });
    }
};

module.exports = {
    checkDuplicates,
    confirmCommunityValidation,
    reopenComplaint,
    verifyCitizenOTP
};

