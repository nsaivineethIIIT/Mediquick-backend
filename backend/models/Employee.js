const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    address: { type: String, required: true },
    password: { type: String, required: true },
    profilePhoto: { type: String, default: '/images/default-employee.svg' },
    documentPath: { type: String },
    isApproved: { type: Boolean, default: false },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    lastLogin: { type: Date }
}, { timestamps: true });

// Add indexes for performance optimization
employeeSchema.index({ isApproved: 1 });
employeeSchema.index({ approvalStatus: 1 });

const Employee = mongoose.model('Employee', employeeSchema);
module.exports = Employee;
