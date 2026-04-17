const Appointment = require('../models/Appointment');


const preventPatientDoubleBooking = async (req, res, next) => {
    try {
        // Ensure patient is authenticated (patientId should be set by verifyPatient middleware)
        if (!req.patientId) {
            return res.status(401).json({
                success: false,
                message: 'Patient authentication required',
                type: 'auth_error'
            });
        }

        const { date, time } = req.body;

        // Skip check if date or time is missing (will be caught by validation middleware)
        if (!date || !time) {
            return next();
        }

        // Convert appointment date to Date object
        const appointmentDate = new Date(date);
        appointmentDate.setHours(0, 0, 0, 0);

        // Parse the requested time to get hours and minutes
        const [timePart, period] = time.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        
        // Convert to 24-hour format
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        // Create appointment datetime
        const appointmentDateTime = new Date(appointmentDate);
        appointmentDateTime.setHours(hours, minutes, 0, 0);

        // Appointment duration: 15 minutes (based on frontend slot intervals)
        const APPOINTMENT_DURATION_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
        const appointmentEndTime = new Date(appointmentDateTime.getTime() + APPOINTMENT_DURATION_MS);

        // Check for existing appointments on the same day
        const startOfDay = new Date(appointmentDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(appointmentDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Find all patient's appointments on this date that are not cancelled
        const existingAppointments = await Appointment.find({
            patientId: req.patientId,
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            status: { $in: ['pending', 'confirmed'] } // Only active appointments
        });

        // Check for time conflicts
        for (const existingAppt of existingAppointments) {
            // Parse existing appointment time
            const [existTimePart, existPeriod] = existingAppt.time.split(' ');
            let [existHours, existMinutes] = existTimePart.split(':').map(Number);
            
            if (existPeriod === 'PM' && existHours !== 12) existHours += 12;
            if (existPeriod === 'AM' && existHours === 12) existHours = 0;
            
            const existingDateTime = new Date(existingAppt.date);
            existingDateTime.setHours(existHours, existMinutes, 0, 0);
            
            const existingEndTime = new Date(existingDateTime.getTime() + APPOINTMENT_DURATION_MS);

            
            
            const hasOverlap = (
                (appointmentDateTime >= existingDateTime && appointmentDateTime < existingEndTime) || // starts during
                (appointmentEndTime > existingDateTime && appointmentEndTime <= existingEndTime) || // ends during
                (appointmentDateTime <= existingDateTime && appointmentEndTime >= existingEndTime) // contains
            );

            if (hasOverlap) {
                return res.status(409).json({
                    success: false,
                    message: 'You already have an appointment at this time',
                    type: 'double_booking_error',
                    details: `You have an existing appointment with Dr. ${existingAppt.doctorId} at ${existingAppt.time} on ${existingAppt.date.toISOString().split('T')[0]}`,
                    conflictingAppointment: {
                        id: existingAppt._id,
                        date: existingAppt.date.toISOString().split('T')[0],
                        time: existingAppt.time,
                        doctorId: existingAppt.doctorId,
                        status: existingAppt.status
                    }
                });
            }
        }

        // No conflicts found, proceed to next middleware/controller
        next();

    } catch (error) {
        console.error('Error in preventPatientDoubleBooking middleware:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking for appointment conflicts',
            type: 'server_error'
        });
    }
};

module.exports = {
    preventPatientDoubleBooking
};
