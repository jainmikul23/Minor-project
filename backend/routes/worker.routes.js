const express = require('express');
const router = express.Router();
const upload = require('../upload/multer.middleware');
const { isWorkerAuthenticated } = require('../middlewares/worker.auth');
const {
    renderWorkerLogin,
    loginWorker,
    logoutWorker,
    renderWorkerDashboard,
    getWorkerTasks,
    startTask,
    completeTaskWithGPSProof,
    verifyResolutionOTP,
    getWorkerProfile
} = require('../controllers/worker.controllers/worker.controller');

// Authentication Routes
router.get('/login', renderWorkerLogin);
router.post('/login', loginWorker);
router.get('/logout', logoutWorker);
router.post('/logout', logoutWorker);

// Dashboard Routes
router.get('/', isWorkerAuthenticated, (req, res) => res.redirect('/worker/dashboard'));
router.get('/profile', isWorkerAuthenticated, (req, res) => res.redirect('/worker/dashboard'));
router.get('/dashboard', isWorkerAuthenticated, renderWorkerDashboard);

// Worker Task APIs
router.get('/api/tasks', isWorkerAuthenticated, getWorkerTasks);
router.post('/api/tasks/start', isWorkerAuthenticated, startTask);
router.post('/api/tasks/complete', isWorkerAuthenticated, upload.single('proof_image'), completeTaskWithGPSProof);
router.post('/api/tasks/:id/verify-otp', isWorkerAuthenticated, verifyResolutionOTP);
router.post('/api/tasks/verify-otp', isWorkerAuthenticated, verifyResolutionOTP);
router.get('/api/profile', isWorkerAuthenticated, getWorkerProfile);

module.exports = router;

