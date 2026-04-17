const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderType: { type: String, enum: ['patient', 'doctor'], required: true },
    message: { type: String, required: true },
    filePath: { type: String }, 
    fileName: { type: String }, 
    fileType: { type: String }, 
    isFile: { type: Boolean, default: false }, 
    timestamp: { type: Date, default: Date.now }
});

// Add indexes for performance optimization
chatSchema.index({ appointmentId: 1 });
chatSchema.index({ senderId: 1 });
chatSchema.index({ timestamp: -1 });

const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;
