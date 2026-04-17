const Appointment = require('../models/Appointment');


const preventDoctorSlotDoubleBooking = async (req, res, next) => {
    try {
        const { doctorId, date, time } = req.body;

        // Skip check if required fields are missing (will be caught by validation middleware)
        if (!doctorId || !date || !time) {
            return next();
        }

        // Check if this doctor slot is already taken or blocked
        const existingAppointment = await Appointment.findOne({
            doctorId: doctorId,
            date: new Date(date),
            time: time,
            $or: [
                { status: { $in: ['pending', 'confirmed'] } }, // Active appointments
                { isBlockedSlot: true } // Blocked slots
            ]
        });

        if (existingAppointment) {
            // Determine the type of conflict
            if (existingAppointment.isBlockedSlot) {
                return res.status(409).json({
                    success: false,
                    message: 'Time slot is blocked',
                    type: 'slot_blocked_error',
                    details: 'This time slot has been blocked by the doctor and is not available for booking'
                });
            } else {
                return res.status(409).json({
                    success: false,
                    message: 'Time slot already booked',
                    type: 'slot_unavailable_error',
                    details: 'This time slot is no longer available. Please select a different time.'
                });
            }
        }

        // Slot is available, proceed to next middleware/controller
        next();

    } catch (error) {
        console.error('Error in preventDoctorSlotDoubleBooking middleware:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking slot availability',
            type: 'server_error'
        });
    }
};

module.exports = {
    preventDoctorSlotDoubleBooking
};
