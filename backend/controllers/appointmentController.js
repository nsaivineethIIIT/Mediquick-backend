const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const asyncHandler = require('../middlewares/asyncHandler');
const { getCache, setCache, deleteCache, deleteCachePattern } = require('../utils/redisClient');
const { refundPayment } = require('./paymentController');

exports.postCreate = asyncHandler(async (req, res, next) => {
    if (!req.patientId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { doctorId, date, time, type, notes, modeOfPayment } = req.body;
    
    console.log('=== BACKEND RECEIVED ===');
    console.log('Date received (raw):', date);
    console.log('Date type:', typeof date);
    console.log('new Date(date):', new Date(date));
    console.log('new Date(date) ISO:', new Date(date).toISOString());
    console.log('Time:', time);
    console.log('========================');

    if (!doctorId || !date || !time || !type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        
        const existingAppointment = await Appointment.findOne({
            doctorId,
            date: new Date(date),
            time,
            status: { $in: ['pending', 'confirmed'] }
        });

        if (existingAppointment) {
            return res.status(400).json({
                error: 'Time slot already booked',
                details: 'This time slot is no longer available'
            });
        }

        // Create new appointment
        const appointment = new Appointment({
            patientId: req.patientId,
            doctorId,
            date: new Date(date),
            time,
            type: doctor.onlineStatus,
            consultationFee: doctor.consultationFee,
            notes,
            modeOfPayment: modeOfPayment || null, // Add mode of payment, default to null if not provided
            status: 'pending'
        });

        await appointment.save();
        console.log('=== SAVED TO DB ===');
        console.log('Appointment date field:', appointment.date);
        console.log('Appointment date ISO:', appointment.date.toISOString());
        console.log('Full appointment:', appointment);
        console.log('===================');

        // CACHE INVALIDATION: Clear booked slots cache for this doctor+date
        const cacheKey = `doctor:${doctorId}:booked:${appointment.date.toISOString().split('T')[0]}`;
        await deleteCache(cacheKey);
        console.log('✅ Cache invalidated for doctor slots');

        res.status(201).json({
            message: 'Appointment booked successfully',
            appointment
        });
    } catch (err) {
        console.error("Error booking appointment:", err);
        // Forward error to Express error middleware
        next(err);
    }
});

exports.getDoctorAppointments = asyncHandler(async (req, res, next) => {
    if (!req.doctorId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { status } = req.query;
        //   let query = { doctorId: req.doctorId };
        let query = {
            doctorId: req.doctorId,
            isBlockedSlot: { $ne: true } // Exclude blocked slots
        };

        if (status) {
            query.status = status;
        }

        const appointments = await Appointment.find(query)
            .populate('patientId', 'name email mobile')
            .sort({ date: 1, time: 1 });

        
        const now = new Date();
        const categorized = {
            upcoming: [],
            previous: []
        };

        appointments.forEach(appt => {
            const apptDate = new Date(appt.date);
            const [time, period] = appt.time.split(' ');
            let [hours, minutes] = time.split(':').map(Number);

            
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;

            apptDate.setHours(hours, minutes, 0, 0);

            if (apptDate >= now && appt.status !== 'cancelled' && appt.status !== 'completed') {
                categorized.upcoming.push(appt);
            } else {
                categorized.previous.push(appt);
            }
        });

        res.json(categorized);
    } catch (err) {
        console.error("Error fetching appointments:", err);
        next(err);
    }
});

exports.patchUpdateStatus = asyncHandler(async (req, res, next) => {
    if (!req.doctorId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { status } = req.body;

    if (!status || !['confirmed', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const appointment = await Appointment.findOneAndUpdate(
            {
                _id: req.params.id,
                doctorId: req.doctorId
            },
            { status },
            { new: true }
        ).populate('patientId', 'name email mobile');

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        // ── Revenue split when completed ─────────────────────────────────────
        if (status === 'completed' && appointment.paymentStatus === 'paid') {
            const fee = appointment.consultationFee || 0;
            appointment.doctorPayoutAmount = Math.round(fee * 0.9 * 100) / 100;  // 90%
            appointment.mediquickCommission = Math.round(fee * 0.1 * 100) / 100; // 10%
            await appointment.save();
            console.log(`✅ Revenue split: Doctor ₹${appointment.doctorPayoutAmount}, MediQuick ₹${appointment.mediquickCommission}`);
        }

        // ── Refund when doctor cancels ────────────────────────────────────────
        if (status === 'cancelled') {
            const refunded = await refundPayment(appointment._id);
            if (refunded) {
                console.log('✅ Refund issued for doctor-cancelled appointment:', appointment._id);
            }
        }

        console.log('Appointment status updated:', appointment);

        // CACHE INVALIDATION: Clear booked slots cache when appointment status changes
        const dateStr = appointment.date.toISOString().split('T')[0];
        const cacheKey = `doctor:${appointment.doctorId}:booked:${dateStr}`;
        await deleteCache(cacheKey);

        res.json({
            message: 'Appointment updated successfully',
            appointment
        });
    } catch (err) {
        console.error("Error updating appointment:", err);
        next(err);
    }
});

exports.getAvailableSlots = () => {
    return async (req, res) => {
        try {
            const { doctorId } = req.query;
            if (!doctorId) {
                return res.status(400).json({ error: 'Doctor ID is required' });
            }

            const doctor = await Doctor.findById(doctorId);
            if (!doctor) {
                return res.status(404).json({ error: 'Doctor not found' });
            }

            const existingAppointments = await Appointment.find({
                doctorId,
                $or: [
                    { status: { $in: ['pending', 'confirmed'] } },
                    { isBlockedSlot: true }
                ]
            });

            const slots = generateAvailableSlots(doctor, existingAppointments);
            res.json(slots);
        } catch (err) {
            console.error("Error generating available slots:", err);
            res.status(500).json({ error: 'Internal server error' });
        }
    };
};

exports.getBookedSlots = asyncHandler(async (req, res, next) => {
    try {
        const { doctorId, date } = req.query;
        
        console.log('=== GET BOOKED SLOTS QUERY ===');
        console.log('Date received:', date);
        console.log('new Date(date):', new Date(date));
        console.log('new Date(date) ISO:', new Date(date).toISOString());
        console.log('==============================');

        if (!doctorId || !date) {
            return res.status(400).json({ error: 'Doctor ID and date are required' });
        }

        // STEP 1: Check Redis cache first (PERFORMANCE OPTIMIZATION - CRITICAL)
        const cacheKey = `doctor:${doctorId}:booked:${date}`;
        const cachedSlots = await getCache(cacheKey);
        if (cachedSlots) {
            console.log('✅ Booked slots retrieved from Redis cache');
            return res.json(cachedSlots);
        }
        console.log('❌ Cache miss - querying database');

        // STEP 2: If not in cache, query database
        const appointments = await Appointment.find({
            doctorId,
            date: new Date(date),
            $or: [
                { status: { $in: ['pending', 'confirmed'] } }, 
                { isBlockedSlot: true } 
            ]
        }).select('time');  // Only select time field for optimization
        
        console.log('=== QUERY RESULTS ===');
        console.log('Found appointments:', appointments.length);
        console.log('=====================');

        // STEP 3: Extract times array
        const bookedTimes = appointments.map(a => a.time);

        // STEP 4: Cache the result for 2-3 minutes (150 seconds) since slots change frequently
        await setCache(cacheKey, bookedTimes, 150);
        console.log('✅ Booked slots cached for 2.5 minutes');

        res.json(bookedTimes);
    } catch (err) {
        console.error("Error fetching booked slots:", err);
        next(err);
    }
});

exports.postBlockSlot = asyncHandler(async (req, res, next) => {
    if (!req.doctorId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { date, time } = req.body;

    try {
        
        const existing = await Appointment.findOne({
            doctorId: req.doctorId,
            date: new Date(date),
            time,
            $or: [
                { status: { $in: ['pending', 'confirmed'] } }, 
                { isBlockedSlot: true } 
            ]
        });

        if (existing) {
            return res.status(400).json({
                error: 'Slot not available',
                details: existing.isBlockedSlot ? 'Slot is already blocked' : 'Slot already has an appointment'
            });
        }

        
        const blocked = new Appointment({
            doctorId: req.doctorId,
            date: new Date(date),
            time,
            status: 'blocked',
            isBlockedSlot: true,
            type: 'online',
            consultationFee: 0,
            modeOfPayment: null, 
            patientId: null
        });

        await blocked.save();
        
        // Invalidate booked slots cache for this doctor and date
        const dateStr = new Date(date).toISOString().split('T')[0];
        const cacheKey = `doctor:${req.doctorId}:booked:${dateStr}`;
        await deleteCache(cacheKey);
        console.log('Cache invalidated for doctor slots after blocking');

        res.json({
            message: 'Slot blocked successfully',
            appointmentId: blocked._id
        });
    } catch (err) {
        console.error("Error blocking slot:", err);
        next(err);
    }
});

exports.postUnblockSlot = asyncHandler(async (req, res, next) => {
    if (!req.doctorId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { appointmentId } = req.body;

    try {
        const result = await Appointment.deleteOne({
            _id: appointmentId,
            doctorId: req.doctorId,
            isBlockedSlot: true
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Blocked slot not found' });
        }

        // Get the deleted blocked slot to find its date for cache invalidation
        // Query the appointment that was deleted
        const blockedAppointment = await Appointment.findOne({
            _id: appointmentId,
            isBlockedSlot: true
        });

        // Invalidate booked slots cache if we found the appointment details
        // If not found, we'll still try to invalidate as fallback
        if (blockedAppointment) {
            const dateStr = blockedAppointment.date.toISOString().split('T')[0];
            const cacheKey = `doctor:${req.doctorId}:booked:${dateStr}`;
            await deleteCache(cacheKey);
            console.log('Cache invalidated for doctor slots after unblocking');
        }

        res.json({ message: 'Slot unblocked successfully' });
    } catch (err) {
        console.error("Error unblocking slot:", err);
        next(err);
    }
});

exports.getBlockedSlots = asyncHandler(async (req, res, next) => {
    try {
        const { doctorId, date } = req.query;

        if (!doctorId) {
            return res.status(400).json({ error: 'Doctor ID is required' });
        }

        const query = {
            doctorId,
            isBlockedSlot: true
        };

        if (date) {
            query.date = new Date(date);
        }

        const blockedSlots = await Appointment.find(query)
            .sort({ date: 1, time: 1 });

        res.json(blockedSlots.map(slot => ({
            _id: slot._id,
            date: slot.date.toISOString().split('T')[0],
            time: slot.time
        })));
    } catch (err) {
        console.error("Error fetching blocked slots:", err);
        next(err);
    }
});

function generateAvailableSlots(doctor, existingAppointments) {
    const slots = [];
    const days = 14; 
    const startHour = 9; 
    const endHour = 17; 
    const interval = 30; 

    const now = new Date();

   
    const bookedSlots = new Set();
    existingAppointments.forEach(appt => {
        const dateStr = appt.date.toISOString().split('T')[0];
        bookedSlots.add(`${dateStr}_${appt.time}`);
    });

    for (let day = 0; day <= days; day++) {
        const date = new Date();
        date.setDate(now.getDate() + day);
        const dateStr = date.toISOString().split('T')[0];

        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += interval) {
                
                if (day === 0 && (hour < now.getHours() ||
                    (hour === now.getHours() && minute < now.getMinutes()))) {
                    continue;
                }

                const timeString = `${hour % 12 === 0 ? 12 : hour % 12}:${minute.toString().padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
                const slotKey = `${dateStr}_${timeString}`;

                
                if (!bookedSlots.has(slotKey)) {
                    slots.push({
                        date: dateStr,
                        time: timeString,
                        datetime: `${dateStr}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`
                    });
                }
            }
        }
    }

    return slots;
}

exports.patchCancelByPatient = asyncHandler(async (req, res, next) => {
    if (!req.patientId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const appointment = await Appointment.findOneAndUpdate(
            {
                _id: req.params.id,
                patientId: req.patientId,
                status: { $in: ['pending', 'confirmed'] } 
            },
            { status: 'cancelled' },
            { new: true }
        ).populate('doctorId', 'name specialization');

        if (!appointment) {
            return res.status(404).json({ 
                error: 'Appointment not found or cannot be cancelled',
                details: 'Appointment may have already been completed, cancelled, or does not exist'
            });
        }

        // ── Refund when patient cancels ───────────────────────────────────────
        const refunded = await refundPayment(appointment._id);
        if (refunded) {
            console.log('✅ Refund issued for patient-cancelled appointment:', appointment._id);
        }

        console.log('Appointment cancelled by patient:', appointment);
        res.json({
            message: 'Appointment cancelled successfully',
            appointment
        });
    } catch (err) {
        console.error("Error cancelling appointment:", err);
        next(err);
    }
});


exports.submitFeedback = asyncHandler(async (req, res, next) => {
    if (!req.patientId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { appointmentId } = req.params;
    const { feedback, rating } = req.body;

    try {
        
        if (rating !== undefined && rating !== null) {
            const ratingNum = Number(rating);
            if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 10) {
                return res.status(400).json({ 
                    error: 'Invalid rating',
                    details: 'Rating must be between 0 and 10'
                });
            }
        }

        
        const appointment = await Appointment.findOne({
            _id: appointmentId,
            patientId: req.patientId,
            status: 'completed'
        });

        if (!appointment) {
            return res.status(404).json({ 
                error: 'Appointment not found',
                details: 'Appointment does not exist, does not belong to you, or is not completed'
            });
        }

        
        appointment.feedback = feedback || null;
        appointment.rating = rating !== undefined && rating !== null ? Number(rating) : null;
        appointment.reviewedAt = new Date();

        await appointment.save();

        console.log('Feedback submitted for appointment:', appointmentId);
        res.json({
            message: 'Feedback submitted successfully',
            appointment: {
                _id: appointment._id,
                feedback: appointment.feedback,
                rating: appointment.rating,
                reviewedAt: appointment.reviewedAt
            }
        });
    } catch (err) {
        console.error("Error submitting feedback:", err);
        next(err);
    }
});

// Update doctor notes for an appointment
exports.updateDoctorNotes = asyncHandler(async (req, res, next) => {
    if (!req.doctorId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { appointmentId } = req.params;
    const { notesText } = req.body;

    try {
        // Find appointment and verify ownership
        const appointment = await Appointment.findOne({
            _id: appointmentId,
            doctorId: req.doctorId
        });

        if (!appointment) {
            return res.status(404).json({ 
                error: 'Appointment not found',
                details: 'Appointment does not exist or does not belong to you'
            });
        }

        // Initialize doctorNotes if it doesn't exist
        if (!appointment.doctorNotes) {
            appointment.doctorNotes = { text: '', files: [] };
        }

        // Update notes text if provided
        if (notesText !== undefined) {
            appointment.doctorNotes.text = notesText;
        }

        // Handle file uploads
        if (req.files && req.files.length > 0) {
            const newFiles = req.files.map(file => ({
                filename: file.filename,
                originalName: file.originalname,
                path: file.path,
                uploadedAt: new Date()
            }));
            
            // Append new files to existing files
            appointment.doctorNotes.files = appointment.doctorNotes.files || [];
            appointment.doctorNotes.files.push(...newFiles);
        }

        await appointment.save();

        console.log('Doctor notes updated for appointment:', appointmentId);
        res.json({
            message: 'Doctor notes updated successfully',
            doctorNotes: appointment.doctorNotes
        });
    } catch (err) {
        console.error("Error updating doctor notes:", err);
        next(err);
    }
});

// Delete a doctor notes file
exports.deleteDoctorNotesFile = asyncHandler(async (req, res, next) => {
    if (!req.doctorId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { appointmentId, fileId } = req.params;

    try {
        const appointment = await Appointment.findOne({
            _id: appointmentId,
            doctorId: req.doctorId
        });

        if (!appointment) {
            return res.status(404).json({ 
                error: 'Appointment not found'
            });
        }

        if (!appointment.doctorNotes || !appointment.doctorNotes.files) {
            return res.status(404).json({ 
                error: 'No files found'
            });
        }

        // Find and remove the file
        const fileIndex = appointment.doctorNotes.files.findIndex(
            file => file._id.toString() === fileId
        );

        if (fileIndex === -1) {
            return res.status(404).json({ 
                error: 'File not found'
            });
        }

        // Remove file from array (Cloudinary handles storage cleanup automatically)
        appointment.doctorNotes.files.splice(fileIndex, 1);
        await appointment.save();

        res.json({
            message: 'File deleted successfully'
        });
    } catch (err) {
        console.error("Error deleting doctor notes file:", err);
        next(err);
    }
});

// Get all patients who have had appointments with this doctor
exports.getDoctorPatients = asyncHandler(async (req, res, next) => {
    if (!req.doctorId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const Patient = require('../models/Patient');
        
        // Get all unique patient IDs from appointments with this doctor
        const appointments = await Appointment.find({ 
            doctorId: req.doctorId,
            isBlockedSlot: { $ne: true },
            patientId: { $exists: true, $ne: null }
        }).distinct('patientId');

        // Get patient details
        const patients = await Patient.find({ 
            _id: { $in: appointments } 
        }).select('name email mobile').sort('name');

        res.json({ patients });
    } catch (err) {
        console.error("Error fetching doctor's patients:", err);
        next(err);
    }
});

// Get patient history - all completed appointments between doctor and patient
exports.getPatientHistory = asyncHandler(async (req, res, next) => {
    if (!req.doctorId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { patientId } = req.params;

    if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required' });
    }

    try {
        const Prescription = require('../models/Prescription');
        const Chat = require('../models/Chat');
        const Patient = require('../models/Patient');

        // Get patient details
        const patient = await Patient.findById(patientId).select('name email mobile');
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        // Get all completed appointments between this doctor and patient
        const appointments = await Appointment.find({
            doctorId: req.doctorId,
            patientId: patientId,
            status: 'completed',
            isBlockedSlot: { $ne: true }
        })
        .populate('patientId', 'name email mobile')
        .sort({ date: -1, time: -1 }); // Most recent first

        // For each appointment, get prescription and chat messages
        const appointmentsWithDetails = await Promise.all(
            appointments.map(async (appointment) => {
                const appointmentObj = appointment.toObject();

                // Get prescription if exists
                const prescription = await Prescription.findOne({ 
                    appointmentId: appointment._id 
                }).lean();

                // Get chat messages
                const chatMessages = await Chat.find({ 
                    appointmentId: appointment._id 
                }).sort({ timestamp: 1 }).lean();

                return {
                    ...appointmentObj,
                    prescription: prescription || null,
                    chatMessages: chatMessages || []
                };
            })
        );

        res.json({
            patient,
            appointments: appointmentsWithDetails
        });
    } catch (err) {
        console.error("Error fetching patient history:", err);
        next(err);
    }
});

// Get patient analytics - completed appointments count per patient
exports.getPatientAnalytics = asyncHandler(async (req, res, next) => {
    if (!req.doctorId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const Patient = require('../models/Patient');
        const { startDate, endDate } = req.query;

        // Build query filter
        const queryFilter = {
            doctorId: req.doctorId,
            status: 'completed',
            isBlockedSlot: { $ne: true },
            patientId: { $exists: true, $ne: null }
        };

        // Add date filter if provided
        if (startDate || endDate) {
            queryFilter.date = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                queryFilter.date.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                queryFilter.date.$lte = end;
            }
        }

        // Get all completed appointments for this doctor
        const completedAppointments = await Appointment.find(queryFilter)
        .populate('patientId', 'name email mobile')
        .sort({ date: -1, time: -1 });

        // Group by patient and count
        const patientStats = {};
        completedAppointments.forEach(appt => {
            const patientId = appt.patientId._id.toString();
            if (!patientStats[patientId]) {
                patientStats[patientId] = {
                    patientId: appt.patientId._id,
                    patientName: appt.patientId.name,
                    patientEmail: appt.patientId.email,
                    patientMobile: appt.patientId.mobile,
                    totalAppointments: 0,
                    appointments: []
                };
            }
            patientStats[patientId].totalAppointments++;
            patientStats[patientId].appointments.push({
                _id: appt._id,
                date: appt.date,
                time: appt.time,
                consultationFee: appt.consultationFee,
                type: appt.type
            });
        });

        // Convert to array and sort by total appointments (descending)
        const analyticsData = Object.values(patientStats).sort((a, b) => 
            b.totalAppointments - a.totalAppointments
        );

        res.json({ 
            analytics: analyticsData,
            totalPatients: analyticsData.length,
            totalCompletedAppointments: completedAppointments.length
        });
    } catch (err) {
        console.error("Error fetching patient analytics:", err);
        next(err);
    }
});
