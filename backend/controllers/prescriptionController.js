const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const asyncHandler = require('../middlewares/asyncHandler');
const { getCache, setCache, deleteCache } = require('../utils/redisClient');

exports.createPrescription = asyncHandler(async (req, res) => {
    try {
        const {
            appointmentId,
            age,
            gender,
            weight,
            symptoms,
            medicines,
            additionalNotes
        } = req.body;

       
        if (!appointmentId || !age || !gender || !weight || !symptoms || !medicines) {
            return res.status(400).json({
                error: 'All fields are required',
                details: 'Missing appointmentId, age, gender, weight, symptoms, or medicines'
            });
        }

        
        if (!Array.isArray(medicines) || medicines.length === 0) {
            return res.status(400).json({
                error: 'Invalid medicines',
                details: 'Medicines must be a non-empty array'
            });
        }

        
        const appointment = await Appointment.findById(appointmentId)
            .populate('patientId', 'name email')
            .populate('doctorId', 'email _id');

        if (!appointment) {
            return res.status(404).json({
                error: 'Appointment not found'
            });
        }

        
        if (appointment.doctorId._id.toString() !== req.doctorId) {
            return res.status(403).json({
                error: 'Unauthorized',
                details: 'You can only create prescriptions for your own appointments'
            });
        }

        
        const existingPrescription = await Prescription.findOne({ appointmentId });
        if (existingPrescription) {
            return res.status(400).json({
                error: 'Prescription already exists',
                details: 'A prescription already exists for this appointment'
            });
        }

        
        const prescription = new Prescription({
            patientName: appointment.patientId.name,
            patientEmail: appointment.patientId.email,
            doctorEmail: appointment.doctorId.email,
            age,
            gender,
            weight,
            appointmentDate: appointment.date,
            appointmentTime: appointment.time,
            symptoms,
            medicines,
            additionalNotes,
            appointmentId,
            doctorId: req.doctorId,
            patientId: appointment.patientId._id
        });

        await prescription.save();

        // Invalidate cache for both doctor and patient prescriptions
        const doctorCacheKey = `prescription:doctor:${req.doctorId}:list`;
        const patientCacheKey = `prescription:patient:${appointment.patientId._id}:list`;
        await deleteCache(doctorCacheKey);
        await deleteCache(patientCacheKey);
        console.log('Cache invalidated for prescriptions after creation');

        res.status(201).json({
            success: true,
            message: 'Prescription created successfully',
            prescription
        });

    } catch (err) {
        console.error("Error creating prescription:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});


exports.getDoctorPrescriptions = asyncHandler(async (req, res) => {
    try {
        if (!req.doctorId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Try cache first
        const cacheKey = `prescription:doctor:${req.doctorId}:list`;
        const cachedPrescriptions = await getCache(cacheKey);
        if (cachedPrescriptions) {
            console.log('✅ Doctor prescriptions from Redis');
            return res.json({
                success: true,
                prescriptions: cachedPrescriptions
            });
        }

        console.log('❌ Doctor prescriptions from DB');
        const prescriptions = await Prescription.find({ doctorId: req.doctorId })
            .populate('patientId', 'name email mobile')
            .populate('appointmentId', 'date time type')
            .sort({ createdAt: -1 })
            .lean();

        // Cache result for 5 minutes (300 seconds)
        await setCache(cacheKey, prescriptions, 300);

        res.json({
            success: true,
            prescriptions
        });

    } catch (err) {
        console.error("Error fetching doctor prescriptions:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});


exports.getPatientPrescriptions = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Try cache first
        const cacheKey = `prescription:patient:${req.patientId}:list`;
        const cachedPrescriptions = await getCache(cacheKey);
        if (cachedPrescriptions) {
            console.log('✅ Patient prescriptions from Redis');
            return res.json({
                success: true,
                prescriptions: cachedPrescriptions
            });
        }

        console.log('❌ Patient prescriptions from DB');
        const prescriptions = await Prescription.find({ patientId: req.patientId })
            .populate('doctorId', 'name specialization email')
            .populate('appointmentId', 'date time type')
            .sort({ createdAt: -1 })
            .lean();

        // Cache result for 5 minutes (300 seconds)
        await setCache(cacheKey, prescriptions, 300);

        res.json({
            success: true,
            prescriptions
        });

    } catch (err) {
        console.error("Error fetching patient prescriptions:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Get prescription by ID
exports.getPrescriptionById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        const prescription = await Prescription.findById(id)
            .populate('patientId', 'name email mobile address')
            .populate('doctorId', 'name specialization email mobile')
            .populate('appointmentId', 'date time type status');

        if (!prescription) {
            return res.status(404).json({
                error: 'Prescription not found'
            });
        }

        // Check authorization
        if (req.doctorId && prescription.doctorId._id.toString() !== req.doctorId) {
            return res.status(403).json({
                error: 'Unauthorized to view this prescription'
            });
        }

        if (req.patientId && prescription.patientId._id.toString() !== req.patientId) {
            return res.status(403).json({
                error: 'Unauthorized to view this prescription'
            });
        }

        res.json({
            success: true,
            prescription
        });

    } catch (err) {
        console.error("Error fetching prescription:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Update prescription
exports.updatePrescription = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { symptoms, medicines, additionalNotes } = req.body;

        const prescription = await Prescription.findById(id);

        if (!prescription) {
            return res.status(404).json({
                error: 'Prescription not found'
            });
        }

        // Only the prescribing doctor can update
        if (prescription.doctorId.toString() !== req.doctorId) {
            return res.status(403).json({
                error: 'Unauthorized to update this prescription'
            });
        }

        // Update fields
        if (symptoms) prescription.symptoms = symptoms;
        if (medicines) prescription.medicines = medicines;
        if (additionalNotes !== undefined) prescription.additionalNotes = additionalNotes;

        await prescription.save();

        // Invalidate cache for both doctor and patient prescriptions
        const doctorCacheKey = `prescription:doctor:${prescription.doctorId}:list`;
        const patientCacheKey = `prescription:patient:${prescription.patientId}:list`;
        await deleteCache(doctorCacheKey);
        await deleteCache(patientCacheKey);
        console.log('Cache invalidated for prescriptions after update');

        res.json({
            success: true,
            message: 'Prescription updated successfully',
            prescription
        });

    } catch (err) {
        console.error("Error updating prescription:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});
