const mongoose = require('mongoose');

/**
 * Middleware to validate prescription input data
 * Validates all required fields and data formats for prescription creation/update
 */
const validatePrescriptionInput = (req, res, next) => {
    const { appointmentId, age, gender, weight, symptoms, medicines, additionalNotes } = req.body;
    const errors = [];

    // 1. Validate appointmentId (required for creation)
    if (req.method === 'POST') {
        if (!appointmentId) {
            errors.push('Appointment ID is required');
        } else if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
            errors.push('Invalid appointment ID format');
        }
    }

    // 2. Validate age
    if (age !== undefined) {
        const ageNum = parseInt(age);
        if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
            errors.push('Age must be a number between 1 and 120');
        }
    } else if (req.method === 'POST') {
        errors.push('Age is required');
    }

    // 3. Validate gender
    if (gender !== undefined) {
        const validGenders = ['male', 'female', 'other'];
        if (!validGenders.includes(gender.toLowerCase())) {
            errors.push('Gender must be one of: male, female, other');
        }
    } else if (req.method === 'POST') {
        errors.push('Gender is required');
    }

    // 4. Validate weight
    if (weight !== undefined) {
        const weightNum = parseFloat(weight);
        if (isNaN(weightNum) || weightNum <= 0 || weightNum > 500) {
            errors.push('Weight must be a positive number between 0 and 500 kg');
        }
    } else if (req.method === 'POST') {
        errors.push('Weight is required');
    }

    // 5. Validate symptoms
    if (symptoms !== undefined) {
        if (typeof symptoms !== 'string' || symptoms.trim().length === 0) {
            errors.push('Symptoms must be a non-empty string');
        } else if (symptoms.trim().length < 3) {
            errors.push('Symptoms must be at least 3 characters long');
        } else if (symptoms.length > 2000) {
            errors.push('Symptoms must not exceed 2000 characters');
        } else {
            // Check for valid symptoms text (no invalid patterns)
            const invalidPattern = /^[\-_=+*#@!$%^&(){}\[\]|\\;:"'<>?/~`\s]*$/;
            const hasValidContent = /[a-zA-Z]/.test(symptoms);
            if (invalidPattern.test(symptoms) || !hasValidContent) {
                errors.push('Symptoms must contain valid text (letters and basic punctuation)');
            }
        }
    } else if (req.method === 'POST') {
        errors.push('Symptoms and diagnosis are required');
    }

    // 6. Validate medicines array
    if (medicines !== undefined) {
        if (!Array.isArray(medicines)) {
            errors.push('Medicines must be an array');
        } else if (medicines.length === 0) {
            errors.push('At least one medicine is required');
        } else if (medicines.length > 20) {
            errors.push('Maximum 20 medicines allowed per prescription');
        } else {
            // Validate each medicine
            medicines.forEach((med, index) => {
                // Validate medicine name
                if (!med.medicineName || typeof med.medicineName !== 'string') {
                    errors.push(`Medicine #${index + 1}: Medicine name is required`);
                } else if (med.medicineName.trim().length < 2) {
                    errors.push(`Medicine #${index + 1}: Medicine name must be at least 2 characters`);
                } else if (!/^[a-zA-Z][a-zA-Z0-9\s\-]*$/.test(med.medicineName.trim())) {
                    errors.push(`Medicine #${index + 1}: Invalid medicine name format`);
                }

                // Validate dosage
                if (!med.dosage || typeof med.dosage !== 'string') {
                    errors.push(`Medicine #${index + 1}: Dosage is required`);
                } else if (med.dosage.trim().length === 0) {
                    errors.push(`Medicine #${index + 1}: Dosage cannot be empty`);
                } else if (med.dosage.length > 100) {
                    errors.push(`Medicine #${index + 1}: Dosage must not exceed 100 characters`);
                }

                // Validate frequency
                if (!med.frequency || typeof med.frequency !== 'string') {
                    errors.push(`Medicine #${index + 1}: Frequency is required`);
                } else if (med.frequency.trim().length < 3) {
                    errors.push(`Medicine #${index + 1}: Frequency must be at least 3 characters`);
                } else if (med.frequency.length > 100) {
                    errors.push(`Medicine #${index + 1}: Frequency must not exceed 100 characters`);
                }

                // Validate duration
                if (!med.duration || typeof med.duration !== 'string') {
                    errors.push(`Medicine #${index + 1}: Duration is required`);
                } else if (med.duration.trim().length < 3) {
                    errors.push(`Medicine #${index + 1}: Duration must be at least 3 characters`);
                } else if (med.duration.length > 100) {
                    errors.push(`Medicine #${index + 1}: Duration must not exceed 100 characters`);
                }

                // Validate instructions (optional)
                if (med.instructions && typeof med.instructions !== 'string') {
                    errors.push(`Medicine #${index + 1}: Instructions must be a string`);
                } else if (med.instructions && med.instructions.length > 500) {
                    errors.push(`Medicine #${index + 1}: Instructions must not exceed 500 characters`);
                }
            });
        }
    } else if (req.method === 'POST') {
        errors.push('Medicines list is required');
    }

    // 7. Validate additional notes (optional)
    if (additionalNotes !== undefined) {
        if (typeof additionalNotes !== 'string') {
            errors.push('Additional notes must be a string');
        } else if (additionalNotes.length > 1000) {
            errors.push('Additional notes must not exceed 1000 characters');
        }
    }

    // If there are validation errors, return 400 response
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            type: 'validation_error',
            errors: errors
        });
    }

    // Validation passed, proceed to next middleware
    next();
};

module.exports = {
    validatePrescriptionInput
};
