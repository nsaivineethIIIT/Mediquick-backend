const Prescription = require('../models/Prescription');
const mongoose = require('mongoose');


const checkPrescriptionOwnership = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Skip ownership check if no prescription ID in params (for list/create operations)
        if (!id) {
            return next();
        }

        // Validate prescription ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid prescription ID format',
                type: 'validation_error'
            });
        }

        // Fetch the prescription
        const prescription = await Prescription.findById(id)
            .select('doctorId patientId')
            .lean();

        if (!prescription) {
            return res.status(404).json({
                success: false,
                message: 'Prescription not found',
                type: 'not_found_error'
            });
        }

        // Check permissions based on user role
        let authorized = false;

        // Doctor authorization: can only access prescriptions they created
        if (req.doctorId) {
            authorized = prescription.doctorId.toString() === req.doctorId;
            
            if (!authorized) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied',
                    type: 'permission_error',
                    details: 'You can only access prescriptions you have created'
                });
            }
        }
        
        // Patient authorization: can only access their own prescriptions
        if (req.patientId) {
            authorized = prescription.patientId.toString() === req.patientId;
            
            if (!authorized) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied',
                    type: 'permission_error',
                    details: 'You can only access your own prescriptions'
                });
            }
        }

        // Admin authorization (if admin is authenticated)
        if (req.adminId) {
            authorized = true; // Admins can access all prescriptions
        }

        // If no valid authentication found
        if (!authorized && !req.doctorId && !req.patientId && !req.adminId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                type: 'auth_error',
                details: 'You must be logged in as a doctor, patient, or admin'
            });
        }

        // Authorization successful, attach prescription to request for controller use
        req.prescriptionOwnership = {
            prescriptionId: prescription._id,
            doctorId: prescription.doctorId,
            patientId: prescription.patientId,
            isOwner: authorized
        };

        next();

    } catch (error) {
        console.error('Error in checkPrescriptionOwnership middleware:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking prescription permissions',
            type: 'server_error'
        });
    }
};

/**
 * Middleware to check update permissions
 * Only the prescribing doctor can update a prescription
 */
const checkPrescriptionUpdatePermission = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validate prescription ID
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid prescription ID',
                type: 'validation_error'
            });
        }

        // Fetch the prescription
        const prescription = await Prescription.findById(id)
            .select('doctorId')
            .lean();

        if (!prescription) {
            return res.status(404).json({
                success: false,
                message: 'Prescription not found',
                type: 'not_found_error'
            });
        }

        // Only doctor who created the prescription can update it
        if (!req.doctorId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
                type: 'permission_error',
                details: 'Only doctors can update prescriptions'
            });
        }

        if (prescription.doctorId.toString() !== req.doctorId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
                type: 'permission_error',
                details: 'You can only update prescriptions you have created'
            });
        }

        // Permission granted
        next();

    } catch (error) {
        console.error('Error in checkPrescriptionUpdatePermission middleware:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking update permissions',
            type: 'server_error'
        });
    }
};

module.exports = {
    checkPrescriptionOwnership,
    checkPrescriptionUpdatePermission
};
