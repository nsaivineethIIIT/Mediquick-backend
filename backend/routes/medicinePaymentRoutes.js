const express = require('express');
const router = express.Router();
const medicinePaymentController = require('../controllers/medicinePaymentController');
const { verifyPatient, requireCompletePatientProfile } = require('../middlewares/auth');

router.post('/create-order', verifyPatient, requireCompletePatientProfile, medicinePaymentController.createOrder);
router.post('/verify', verifyPatient, requireCompletePatientProfile, medicinePaymentController.verifyAndCreateOrder);

module.exports = router;
