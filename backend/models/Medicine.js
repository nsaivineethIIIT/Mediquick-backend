const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
    name: { type: String, required: true },
    medicineID: { type: String, required: true, unique: true },
    quantity: { type: Number, required: true, min: 0 },
    cost: { type: Number, required: true, min: 0 },
    manufacturer: { type: String, required: true },
    expiryDate: { type: Date, required: true },
    image: { type: String, default: null },
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    }
}, { timestamps: true });

// Add indexes for performance optimization
medicineSchema.index({ name: 'text' });  // Text index for search
medicineSchema.index({ supplierId: 1 });
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ quantity: 1 });

const Medicine = mongoose.model('Medicine', medicineSchema);

module.exports = Medicine; // Add this line to export the model
