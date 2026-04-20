const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyPatient, requireCompletePatientProfile } = require('../middlewares/auth');
const { appointmentCreationLimiter, appointmentGeneralLimiter } = require('../middlewares/rateLimiter');

// POST /payment/create-order
// Patient requests a Razorpay order before the checkout modal opens
router.post('/create-order', appointmentGeneralLimiter, verifyPatient, requireCompletePatientProfile, paymentController.createOrder);

// POST /payment/verify
// Called after patient completes payment in Razorpay modal.
// Verifies signature and creates the appointment atomically.
router.post('/verify', appointmentCreationLimiter, verifyPatient, requireCompletePatientProfile, paymentController.verifyAndBook);

module.exports = router;
