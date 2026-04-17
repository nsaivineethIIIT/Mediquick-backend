const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    address: { type: String, required: true },
    supplierID: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePhoto: { type: String, default: '/images/default-supplier.svg' },
    documentPath: { type: String },
    isApproved: { type: Boolean, default: false },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String },
    isRejected: { type: Boolean, default: false },
    lastLogin: { type: Date }
}, { timestamps: true });

// Add indexes for performance optimization
supplierSchema.index({ isApproved: 1 });
supplierSchema.index({ approvalStatus: 1 });

const Supplier = mongoose.model('Supplier', supplierSchema);
module.exports = Supplier;
