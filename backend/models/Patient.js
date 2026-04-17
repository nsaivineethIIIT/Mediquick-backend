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

const patientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    address: { type: String, required: true },
    password: { type: String, required: true },
    dateOfBirth: { type: Date },
    gender: { 
        type: String, 
        enum: ['male', 'female', 'other'], 
        lowercase: true 
    },
    addresses: [addressSchema],
    profilePhoto: { type: String, default: '/images/default-patient.svg' }
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);