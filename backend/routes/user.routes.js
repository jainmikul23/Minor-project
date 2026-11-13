const express = require('express');
const router = express.Router();
const db = require('../database/dbConnect');
const { registerUser } = require('../controllers/user.controllers/user.register.controller');
const { loginUser } = require('../controllers/user.controllers/user.login.controller');
const { isAuthenticated } = require('../middlewares/user.auth');
const { getUserProfile } = require('../controllers/user.controllers/user.profile.controller');
const { registerUserComplain } = require('../controllers/user.controllers/user.registerComplain.controller');
const { trackUserComplain, confirmCompletion, rateWorker } = require('../controllers/user.controllers/user.complains.controller');
const { changePassword } = require('../controllers/user.controllers/user.changePassword.controller');
const { viewLocalIssues } = require('../controllers/user.controllers/user.viewLocalIssues.controller');
const { viewCityIssues } = require('../controllers/user.controllers/user.viewCityIssues.controller');
const { viewStateIssues } = require('../controllers/user.controllers/user.viewStateIssues.controller');
const { bookAppointment, getUserAppointments } = require('../controllers/appointment.controller');
const upload = require('../upload/multer.middleware');

router.post('/register', registerUser);
router.get('/register', (req, res) => {
    res.render('user/user.register.ejs');
});
router.get('/login', (req, res) => {
    res.render('user/user.login.ejs');
});
router.post('/login', loginUser);
router.get('/profile', isAuthenticated, (req, res) => {
    return res.redirect(`/user/profile/${req.user.user_id}`);
});
router.get('/profile/:id', isAuthenticated, getUserProfile);
router.post('/changePassword', isAuthenticated, changePassword);
router.post('/change-password', isAuthenticated, changePassword);
router.post('/registerComplain', isAuthenticated, upload.single('image'), registerUserComplain);
router.get('/trackComplain', isAuthenticated, trackUserComplain);
router.post('/confirmCompletion', isAuthenticated, confirmCompletion);
router.post('/rateWorker', isAuthenticated, rateWorker);
router.get('/viewLocalIssues', isAuthenticated, viewLocalIssues);
router.get('/viewCityIssues', isAuthenticated, viewCityIssues);
router.get('/viewStateIssues', isAuthenticated, viewStateIssues);

// Appointments
router.post('/bookAppointment', isAuthenticated, bookAppointment);
router.post('/book-appointment', isAuthenticated, bookAppointment);
router.get('/appointments', isAuthenticated, getUserAppointments);

// Payment Integration Notice Page
router.get('/payment', isAuthenticated, (req, res) => {
    res.render('user/user.payment.ejs', { user: req.user });
});
router.get('/logout', (req, res) => {
    res.clearCookie('token', { path: '/' });
    res.clearCookie('token');
    return res.redirect('/user/login');
});
router.post('/logout', (req, res) => { 
  res.clearCookie('token', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax'
  });
  res.clearCookie('token');
  return res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = router;
