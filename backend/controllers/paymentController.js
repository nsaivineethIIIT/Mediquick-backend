const Razorpay = require('razorpay');
const crypto = require('crypto');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const asyncHandler = require('../middlewares/asyncHandler');
const { deleteCache } = require('../utils/redisClient');

// Initialize Razorpay instance with test keys from .env
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ─── POST /payment/create-order ─────────────────────────────────────────────
// Creates a Razorpay order for the consultation fee.
// Called by patient BEFORE opening the Razorpay checkout modal.
exports.createOrder = asyncHandler(async (req, res, next) => {
    if (!req.patientId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { doctorId } = req.body;

    if (!doctorId) {
        return res.status(400).json({ error: 'doctorId is required' });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
        return res.status(404).json({ error: 'Doctor not found' });
    }

    const fee = doctor.consultationFee || 0;

    // Razorpay amount is in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(fee * 100);

    if (amountInPaise <= 0) {
        return res.status(400).json({ error: 'Consultation fee must be greater than 0' });
    }

    const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `appt_${Date.now()}`,
        notes: {
            doctorId: doctorId.toString(),
            patientId: req.patientId.toString(),
            doctorName: doctor.name,
            consultationFee: fee
        }
    });

    res.status(200).json({
        orderId: order.id,
        amount: order.amount,        // in paise
        currency: order.currency,
        consultationFee: fee,         // in INR (for display)
        doctorName: doctor.name
    });
});

// ─── POST /payment/verify ────────────────────────────────────────────────────
// Verifies Razorpay signature, then creates the appointment.
// This REPLACES the direct POST /appointment/appointments call for online payments.
exports.verifyAndBook = asyncHandler(async (req, res, next) => {
    if (!req.patientId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        // Appointment details
        doctorId,
        date,
        time,
        type,
        notes,
        modeOfPayment
    } = req.body;

    // 1. Verify Razorpay signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

    if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // 2. Verify required appointment fields
    if (!doctorId || !date || !time) {
        return res.status(400).json({ error: 'Missing appointment fields' });
    }

    // 3. Check doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
        return res.status(404).json({ error: 'Doctor not found' });
    }

    // 4. Check slot is still available
    const existingAppointment = await Appointment.findOne({
        doctorId,
        date: new Date(date),
        time,
        status: { $in: ['pending', 'confirmed'] }
    });

    if (existingAppointment) {
        // Slot was taken — issue immediate refund
        try {
            await razorpay.payments.refund(razorpay_payment_id, {
                amount: Math.round(doctor.consultationFee * 100),
                notes: { reason: 'Slot already booked' }
            });
        } catch (refundErr) {
            console.error('Auto-refund failed for taken slot:', refundErr);
        }
        return res.status(400).json({
            error: 'Time slot already booked',
            details: 'Payment has been refunded automatically.'
        });
    }

    // 5. Create the appointment with payment details
    const appointment = new Appointment({
        patientId: req.patientId,
        doctorId,
        date: new Date(date),
        time,
        type: doctor.onlineStatus || type || 'offline',
        consultationFee: doctor.consultationFee,
        notes,
        modeOfPayment: modeOfPayment || 'upi',
        status: 'pending',
        // Payment fields
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentStatus: 'paid'
    });

    await appointment.save();

    // 6. Invalidate booked slots cache
    const dateStr = appointment.date.toISOString().split('T')[0];
    const cacheKey = `doctor:${doctorId}:booked:${dateStr}`;
    await deleteCache(cacheKey);

    console.log('✅ Razorpay payment verified & appointment created:', appointment._id);

    res.status(201).json({
        message: 'Payment verified and appointment booked successfully',
        appointment
    });
});

// ─── POST /payment/refund/:appointmentId ────────────────────────────────────
// Issues a Razorpay refund for a paid appointment.
// Called internally when doctor or patient cancels.
exports.refundPayment = async (appointmentId) => {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
        console.error('Refund failed: appointment not found', appointmentId);
        return false;
    }

    // Only refund if payment was made online via Razorpay
    if (appointment.paymentStatus !== 'paid' || !appointment.razorpayPaymentId) {
        console.log('No online payment to refund for appointment:', appointmentId);
        return false;
    }

    try {
        const refund = await razorpay.payments.refund(appointment.razorpayPaymentId, {
            amount: Math.round(appointment.consultationFee * 100), // full refund in paise
            notes: {
                reason: 'Appointment cancelled',
                appointmentId: appointmentId.toString()
            }
        });

        // Mark as refunded
        appointment.paymentStatus = 'refunded';
        await appointment.save();

        console.log('✅ Razorpay refund issued:', refund.id, 'for appointment:', appointmentId);
        return true;
    } catch (err) {
        console.error('❌ Razorpay refund error:', err.error || err.message);
        return false;
    }
};
