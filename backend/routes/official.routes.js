const express = require('express');
const router = express.Router();
const db = require('../database/dbConnect');
const { registerOfficial } = require('../controllers/admin.controller/admin.registerOfficial.controller');
const { loginOfficial } = require('../controllers/official.controllers/official.login.controller');
const { isAuthenticated } = require('../middlewares/admin.auth');
const { getOfficialProfile } = require('../controllers/official.controllers/official.profile.controller');
const { isOfficialAuthenticated } = require('../middlewares/official.auth');
const { loginAdmin } = require('../controllers/admin.controller/admin.login.controller');
const { isAdminAuthenticated } = require('../middlewares/admin.auth');
const { getWorkersForOfficial, addWorker, assignWorker, completeTask, rejectComplaint } = require('../controllers/official.controllers/official.getWorkers.controller');
const { getChatHistoryByUser, getChatHistoryForDepartment } = require('../controllers/chat.controllers/chat.saveChatHistory.controller');
const { getApiLogs, getApiStats } = require('../controllers/official.controllers/official.apiLogs.controller');
const { getDepartmentAppointments, updateAppointmentStatus } = require('../controllers/appointment.controller');


router.post('/register', isAdminAuthenticated, registerOfficial);
router.get('/register', isAdminAuthenticated, (req, res) => {
    res.render('official/official.register.ejs');
});
router.get('/login', (req, res) => {
    res.render('official/official.login.ejs');
});
router.get('/profile', isOfficialAuthenticated, (req, res) => {
    console.log('Official profile accessed:', req.user);
    res.render('official/official.profile.ejs');
});
router.get('/profile/data', isOfficialAuthenticated, getOfficialProfile);
router.post('/login', loginOfficial);
router.get('/getWorkers', isOfficialAuthenticated, getWorkersForOfficial);
router.post('/addWorker', isOfficialAuthenticated, addWorker);
router.post('/assignWorker', isOfficialAuthenticated, assignWorker);
router.post('/completeTask', isOfficialAuthenticated, completeTask);
router.post('/rejectComplaint', isOfficialAuthenticated, rejectComplaint);

// Chat history endpoints
router.get('/chatHistory', isOfficialAuthenticated, getChatHistoryForDepartment);
router.get('/chatHistory/user', isOfficialAuthenticated, getChatHistoryByUser);

// API Logs & System Activity endpoints
router.get('/apiLogs', isOfficialAuthenticated, getApiLogs);
router.get('/apiLogs/stats', isOfficialAuthenticated, getApiStats);

// Department Appointments endpoints
router.get('/appointments', isOfficialAuthenticated, getDepartmentAppointments);
router.post('/appointments/:id/status', isOfficialAuthenticated, updateAppointmentStatus);

// Quick Action dispatch endpoint
router.post('/quickAction', isOfficialAuthenticated, async (req, res) => {
    try {
        const { action_type, message, location } = req.body;
        const officialId = req.user.official_id;
        await db.promise().query(
            `INSERT INTO api_logs (user_id, user_type, method, endpoint, request_body, response_status, response_data, ip_address)
             VALUES (?, 'official', 'POST', '/official/quickAction', ?, 200, '{"success":true}', ?)`,
            [
                officialId,
                JSON.stringify({ action_type, message, location, official_name: `${req.user.First_name} ${req.user.Last_name}` }),
                req.ip || '127.0.0.1'
            ]
        );
        return res.status(200).json({
            success: true,
            message: `Official ${action_type || 'action'} recorded and dispatched to Central Operations.`
        });
    } catch (e) {
        console.error('Quick action error:', e);
        return res.status(500).json({ success: false, message: 'Failed to record action' });
    }
});

// Logout endpoints
router.get('/logout', (req, res) => {
    res.clearCookie('officialToken', { path: '/' });
    res.clearCookie('token', { path: '/' });
    return res.redirect('/official/login');
});
router.post('/logout', (req, res) => {
    res.clearCookie('officialToken', { path: '/' });
    res.clearCookie('token', { path: '/' });
    return res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = router;