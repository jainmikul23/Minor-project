const express = require('express');
const router = express.Router();
const { registerOfficial } = require('../controllers/admin.controller/admin.registerOfficial.controller');
const { loginAdmin, logoutAdmin } = require('../controllers/admin.controller/admin.login.controller');
const { isAdminAuthenticated } = require('../middlewares/admin.auth');
const {
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
} = require('../controllers/admin.controller/admin.dashboard.controller');
const { getAllAppointments, updateAppointmentStatus } = require('../controllers/appointment.controller');

// Authentication Routes
router.get('/login', (req, res) => {
    const adminToken = req.cookies.adminToken;
    if (adminToken) {
        if (adminToken === 'someSecureToken') {
            return res.redirect('/admin/dashboard');
        }
        try {
            const jwt = require('jsonwebtoken');
            jwt.verify(adminToken, process.env.JWT_SECRET || 'civic_issue_default_jwt_secret');
            return res.redirect('/admin/dashboard');
        } catch (e) {
            res.clearCookie('adminToken', { path: '/' });
        }
    }
    res.render('admin/admin.login.ejs');
});
router.post('/login', loginAdmin);

router.get('/logout', logoutAdmin);
router.post('/logout', logoutAdmin);

// Dashboard & Profile Routes
router.get('/', isAdminAuthenticated, (req, res) => res.redirect('/admin/dashboard'));
router.get('/profile', isAdminAuthenticated, (req, res) => res.redirect('/admin/dashboard'));
router.get('/dashboard', isAdminAuthenticated, renderAdminDashboard);

// Official Registration (form view + API)
router.get('/register', isAdminAuthenticated, (req, res) => {
    res.render('official/official.register.ejs');
});
router.post('/register', isAdminAuthenticated, registerOfficial);

// Admin REST APIs for Dashboard
router.get('/api/stats', isAdminAuthenticated, getAdminStats);
router.get('/api/complaints', isAdminAuthenticated, getAdminComplaints);
router.post('/api/complaints/:id/status', isAdminAuthenticated, updateComplaintStatus);
router.delete('/api/complaints/:id', isAdminAuthenticated, deleteComplaint);

router.get('/api/officials', isAdminAuthenticated, getAdminOfficials);
router.delete('/api/officials/:id', isAdminAuthenticated, deleteOfficial);

router.get('/api/workers', isAdminAuthenticated, getAdminWorkers);
router.post('/api/workers', isAdminAuthenticated, addAdminWorker);
router.delete('/api/workers/:id', isAdminAuthenticated, deleteAdminWorker);

router.get('/api/citizens', isAdminAuthenticated, getAdminCitizens);
router.get('/api/departments', isAdminAuthenticated, getAdminDepartments);
router.get('/api/equity-analytics', isAdminAuthenticated, getEquityAnalytics);

// Citywide Appointments endpoints for Admin
router.get('/api/appointments', isAdminAuthenticated, getAllAppointments);
router.post('/api/appointments/:id/status', isAdminAuthenticated, updateAppointmentStatus);

module.exports = router;
