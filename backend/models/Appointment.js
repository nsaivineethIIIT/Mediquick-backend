const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: function () { return !this.isBlockedSlot; } 
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled', 'blocked'],
        default: 'pending'
    },
    type: {
        type: String,
        enum: ['online', 'offline'],
        required: function () { return !this.isBlockedSlot; } 
    },
    consultationFee: {
        type: Number,
        required: function () { return !this.isBlockedSlot; } 
    },
    modeOfPayment: {
        type: String,
        enum: ['credit-card', 'upi', 'net-banking', 'wallet', 'cash', null],
        default: null,
        required: false 
    },
    notes: String,
    isBlockedSlot: {
        type: Boolean,
        default: false
    },
    
    doctorNotes: {
        text: {
            type: String,
            default: ''
        },
        files: [{
            filename: String,
            originalName: String,
            path: String,
            uploadedAt: {
                type: Date,
                default: Date.now
            }
        }]
    },
    
    feedback: {
        type: String,
        default: null
    },
    rating: {
        type: Number,
        min: 0,
        max: 10,
        default: null
    },
    reviewedAt: {
        type: Date,
        default: null
    },

    // ─── Razorpay Payment Fields ────────────────────────────────────────────────
    razorpayOrderId: {
        type: String,
        default: null
    },
    razorpayPaymentId: {
        type: String,
        default: null
    },
    razorpaySignature: {
        type: String,
        default: null
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded'],
        default: 'pending'
    },
    // Revenue split (populated when appointment is completed)
    doctorPayoutAmount: {
        type: Number,
        default: 0
    },
    mediquickCommission: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Add indexes for performance optimization
appointmentSchema.index({ patientId: 1 });
appointmentSchema.index({ doctorId: 1 });
appointmentSchema.index({ date: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ doctorId: 1, date: 1, status: 1 });  // Compound index for slot queries

const Appointment = mongoose.model('Appointment', appointmentSchema);
module.exports = Appointment;
