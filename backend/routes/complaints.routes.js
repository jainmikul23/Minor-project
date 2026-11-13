const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/user.auth');
const { getMyComplaints } = require('../controllers/complaints.controllers/complaints.getMyComplaints.controller');
const {
    checkDuplicates,
    confirmCommunityValidation,
    reopenComplaint,
    verifyCitizenOTP
} = require('../controllers/complaints.controllers/complaints.research.controller');

// Route to get user's own complaints
router.get('/my-complaints', isAuthenticated, getMyComplaints);

// Research Paper Features:
// 1. Geo-spatial duplicate check at submission time (Section V-B)
router.post('/check-duplicates', checkDuplicates);

// 2. Proximity-gated, trust-weighted community validation (Section V-C)
router.post('/:id/confirm', isAuthenticated, confirmCommunityValidation);

// 3. Citizen confirm/reopen mechanism (Section V-E)
router.post('/:id/reopen', isAuthenticated, reopenComplaint);

// 4. Citizen OTP resolution verification (Section V-E)
router.post('/:id/verify-otp', isAuthenticated, verifyCitizenOTP);

module.exports = router;

