const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const Cart = require('../models/Cart');
const asyncHandler = require('../middlewares/asyncHandler');

// Initialize Razorpay instance with test keys from .env
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ─── POST /medicine-payment/create-order ─────────────────────────────────────────────
exports.createOrder = asyncHandler(async (req, res, next) => {
    if (!req.patientId) return res.status(401).json({ error: 'Unauthorized' });
    if (!req.session || !req.session.orderDetails) {
        return res.status(400).json({ error: 'No pending order found' });
    }

    const { finalTotal } = req.session.orderDetails;
    if (!finalTotal || finalTotal <= 0) {
        return res.status(400).json({ error: 'Invalid order amount' });
    }

    const amountInPaise = Math.round(finalTotal * 100);

    const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `med_order_${Date.now()}`
    });

    res.status(200).json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency
    });
});

// ─── POST /medicine-payment/verify ────────────────────────────────────────────────────
exports.verifyAndCreateOrder = asyncHandler(async (req, res, next) => {
    if (!req.patientId) return res.status(401).json({ error: 'Unauthorized' });
    if (!req.session || !req.session.orderDetails) {
        return res.status(400).json({ error: 'No pending order found' });
    }

    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        paymentMethod
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

    const orderDetails = req.session.orderDetails;

    try {
        const orderPromises = orderDetails.items.map(async (item) => {
            const medicine = await Medicine.findById(item.medicineId);
            if (!medicine) throw new Error(`Medicine not found: ${item.medicineId}`);

            const itemDeliveryCharge = (item.total / orderDetails.subtotal) * orderDetails.deliveryCharge;
            const itemFinalAmount = item.total + itemDeliveryCharge;

            // 95% supplier, 5% mediquick
            const mediquickCommission = parseFloat((itemFinalAmount * 0.05).toFixed(2));
            const supplierPayoutAmount = parseFloat((itemFinalAmount * 0.95).toFixed(2));

            const order = new Order({
                medicineId: item.medicineId,
                patientId: req.patientId,
                supplierId: medicine.supplierId,
                quantity: item.quantity,
                totalCost: item.total,
                deliveryAddress: orderDetails.deliveryAddress,
                paymentMethod: paymentMethod || 'upi',
                deliveryCharge: parseFloat(itemDeliveryCharge.toFixed(2)),
                finalAmount: parseFloat(itemFinalAmount.toFixed(2)),
                status: 'confirmed',
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                paymentStatus: 'paid',
                supplierPayoutAmount: supplierPayoutAmount,
                mediquickCommission: mediquickCommission
            });

            await Medicine.updateOne(
                { _id: item.medicineId },
                { $inc: { quantity: -item.quantity } }
            );

            return await order.save();
        });

        const orders = await Promise.all(orderPromises);

        // Clear cart if it wasn't a single item order
        if (orderDetails.orderType !== 'single') {
            await Cart.updateOne(
                { patientId: req.patientId },
                { $set: { items: [] } }
            );
        }

        // Clear session
        req.session.orderDetails = null;

        res.status(200).json({
            success: true,
            message: 'Payment verified and order placed successfully',
            orders: orders.map(order => order._id)
        });
    } catch (err) {
        console.error('Medicine payment processing error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});
