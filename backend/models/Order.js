const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    label: { type: String },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true },
    isDefault: { type: Boolean, default: false }
});

const orderSchema = new mongoose.Schema({
    medicineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine',
        required: true
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    totalCost: Number,
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    deliveryAddress: addressSchema,
    paymentMethod: {
        type: String,
        enum: ['cod', 'card', 'upi'],
        default: 'cod'
    },
    deliveryCharge: {
        type: Number,
        default: 10
    },
    finalAmount: Number,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded', 'failed'],
        default: 'pending'
    },
    supplierPayoutAmount: Number,
    mediquickCommission: Number
}, { timestamps: true });

// Add indexes for performance optimization
orderSchema.index({ patientId: 1 });
orderSchema.index({ supplierId: 1 });
orderSchema.index({ medicineId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ patientId: 1, status: 1 });  // Compound index for patient order history

module.exports = mongoose.model('Order', orderSchema);