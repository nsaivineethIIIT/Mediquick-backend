const mongoose = require('mongoose');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const asyncHandler = require('../middlewares/asyncHandler');

exports.create = asyncHandler(async (req, res) => {
    try {
        // Validate session
        if (!req.session.patientId) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        // Validate request body
        const { medicineId, quantity } = req.body;
        if (!mongoose.Types.ObjectId.isValid(medicineId)) {
            return res.status(400).json({
                error: 'Invalid medicine ID format',
                code: 'INVALID_MEDICINE_ID'
            });
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({
                error: 'Invalid quantity',
                code: 'INVALID_QUANTITY'
            });
        }

        // Get medicine
        // REMOVED: .session(session)
        const medicine = await Medicine.findById(medicineId)
            .select('quantity cost supplierId')
            .lean();

        if (!medicine) {
            // Throwing a custom error to be caught below
            const error = new Error('Medicine not found');
            error.statusCode = 404;
            throw error;
        }

        // Check stock
        if (medicine.quantity < quantity) {
            const error = new Error(`Only ${medicine.quantity} items available`);
            error.statusCode = 400;
            error.code = 'INSUFFICIENT_STOCK';
            error.available = medicine.quantity; // Include available stock in error
            throw error;
        }

        // 1. Update stock (decrement quantity)
        // This is now outside a transaction, meaning stock update and order creation are not atomic.
        const updatedMedicine = await Medicine.findByIdAndUpdate(
            medicineId,
            { $inc: { quantity: -quantity } },
            { new: true, runValidators: true }
        );

        if (!updatedMedicine) {
            const error = new Error('Failed to update stock for medicine');
            error.statusCode = 500;
            throw error;
        }

        // 2. Create order
        const order = new Order({
            medicineId,
            patientId: req.session.patientId,
            supplierId: medicine.supplierId,
            quantity,
            totalCost: medicine.cost * quantity,
            status: 'pending'
        });

        // Save without session/transaction
        await order.save();

        res.json({
            success: true,
            order: {
                _id: order._id,
                status: order.status,
                totalCost: order.totalCost
            }
        });

    } catch (err) {
        console.error("Order Error:", err.message);
        // Handle custom stock error with 400 status
        if (err.code === 'INSUFFICIENT_STOCK') {
            return res.status(400).json({
                error: err.message,
                code: err.code,
                available: err.available
            });
        }
        
        // Handle Not Found (404) errors
        if (err.statusCode === 404) {
             return res.status(404).json({
                error: err.message,
                code: 'NOT_FOUND'
            });
        }

        // Generic server error
        res.status(err.statusCode || 500).json({
            error: err.message,
            code: err.code || 'SERVER_ERROR',
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});