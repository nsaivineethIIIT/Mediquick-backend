const express = require('express');
const router = express.Router();
const medicinePaymentController = require('../controllers/medicinePaymentController');
const { verifyPatient } = require('../middlewares/auth');

router.post('/create-order', verifyPatient, medicinePaymentController.createOrder);
router.post('/verify', verifyPatient, medicinePaymentController.verifyAndCreateOrder);

module.exports = router;
