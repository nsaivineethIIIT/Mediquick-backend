const Appointment = require('../models/Appointment');


const checkAppointmentOwnershipDoctor = async (req, res, next) => {
    try {
        const appointmentId = req.params.id;
        const doctorId = req.doctorId;

        if (!doctorId) {
            return res.status(401).json({ error: 'Unauthorized: Doctor authentication required' });
        }

        if (!appointmentId) {
            return res.status(400).json({ error: 'Appointment ID is required' });
        }

        // Check if appointment exists and belongs to this doctor
        const appointment = await Appointment.findOne({
            _id: appointmentId,
            doctorId: doctorId
        });

        if (!appointment) {
            return res.status(404).json({ 
                error: 'Appointment not found or you do not have permission to access it' 
            });
        }

        
        req.appointmentExists = appointment;
        next();
    } catch (error) {
        console.error('Error in checkAppointmentOwnershipDoctor:', error);
        return res.status(500).json({ error: 'Error verifying appointment ownership' });
    }
};


const checkAppointmentOwnershipPatient = async (req, res, next) => {
    try {
        const appointmentId = req.params.id;
        const patientId = req.patientId;

        if (!patientId) {
            return res.status(401).json({ error: 'Unauthorized: Patient authentication required' });
        }

        if (!appointmentId) {
            return res.status(400).json({ error: 'Appointment ID is required' });
        }

        
        const appointment = await Appointment.findOne({
            _id: appointmentId,
            patientId: patientId
        });

        if (!appointment) {
            return res.status(404).json({ 
                error: 'Appointment not found or you do not have permission to access it' 
            });
        }

        // Attach appointment to request for potential reuse in controller
        req.appointmentExists = appointment;
        next();
    } catch (error) {
        console.error('Error in checkAppointmentOwnershipPatient:', error);
        return res.status(500).json({ error: 'Error verifying appointment ownership' });
    }
};

module.exports = {
    checkAppointmentOwnershipDoctor,
    checkAppointmentOwnershipPatient
};
