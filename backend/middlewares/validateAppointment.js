const mongoose = require('mongoose');

/**
 * Middleware to validate appointment input data
 * Validates required fields, data types, and formats for appointment booking
 */
const validateAppointmentInput = (req, res, next) => {
    const { doctorId, date, time, type, modeOfPayment, notes } = req.body;
    const errors = [];

    // 1. Validate doctorId
    if (!doctorId) {
        errors.push('Doctor ID is required');
    } else if (!mongoose.Types.ObjectId.isValid(doctorId)) {
        errors.push('Invalid doctor ID format');
    }

    // 2. Validate date
    if (!date) {
        errors.push('Appointment date is required');
    } else {
        const appointmentDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day

        if (isNaN(appointmentDate.getTime())) {
            errors.push('Invalid date format. Expected format: YYYY-MM-DD');
        } else if (appointmentDate < today) {
            errors.push('Appointment date cannot be in the past');
        } else {
            // Check if date is beyond 14 days (based on frontend slot generation)
            const maxDate = new Date();
            maxDate.setDate(today.getDate() + 14);
            if (appointmentDate > maxDate) {
                errors.push('Appointment date must be within the next 14 days');
            }
        }
    }

    // 3. Validate time
    if (!time) {
        errors.push('Appointment time is required');
    } else {
        // Validate time format (e.g., "09:00 AM", "02:30 PM")
        const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
        if (!timeRegex.test(time)) {
            errors.push('Invalid time format. Expected format: HH:MM AM/PM (e.g., 09:00 AM)');
        } else {
            // Validate time is within allowed slots (9 AM - 8 PM)
            const [timePart, period] = time.split(' ');
            let [hours, minutes] = timePart.split(':').map(Number);
            
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            
            if (hours < 9 || hours >= 20) {
                errors.push('Appointment time must be between 9:00 AM and 8:00 PM');
            }

            // Check if appointment time is in the past (for today's date)
            if (date) {
                const appointmentDate = new Date(date);
                const now = new Date();
                
                if (appointmentDate.toDateString() === now.toDateString()) {
                    const appointmentDateTime = new Date(appointmentDate);
                    appointmentDateTime.setHours(hours, minutes, 0, 0);
                    
                    if (appointmentDateTime <= now) {
                        errors.push('Appointment time cannot be in the past');
                    }
                }
            }
        }
    }

    // 4. Validate type (consultation type)
    if (!type) {
        errors.push('Consultation type is required');
    } else if (!['online', 'offline'].includes(type.toLowerCase())) {
        errors.push('Consultation type must be either "online" or "offline"');
    }

    // 5. Validate modeOfPayment (optional but if provided, must be valid)
    if (modeOfPayment) {
        const validPaymentMethods = ['credit-card', 'upi', 'net-banking', 'wallet', 'cash'];
        if (!validPaymentMethods.includes(modeOfPayment)) {
            errors.push(`Invalid payment method. Valid options: ${validPaymentMethods.join(', ')}`);
        }
    }

    // 6. Validate notes (optional, but check length if provided)
    if (notes && typeof notes !== 'string') {
        errors.push('Notes must be a string');
    } else if (notes && notes.length > 500) {
        errors.push('Notes must not exceed 500 characters');
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
    validateAppointmentInput
};
