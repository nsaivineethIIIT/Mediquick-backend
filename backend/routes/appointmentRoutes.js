const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { verifyPatient, verifyDoctor } = require('../middlewares/auth');
const {
    appointmentCreationLimiter,
    slotManagementLimiter,
    appointmentGeneralLimiter,
    appointmentReadLimiter
} = require('../middlewares/rateLimiter');
const { validateAppointmentInput } = require('../middlewares/validateAppointment');
const { preventPatientDoubleBooking } = require('../middlewares/checkPatientDoubleBooking');
const { preventDoctorSlotDoubleBooking } = require('../middlewares/checkDoctorSlotAvailability');
const { checkAppointmentOwnershipDoctor, checkAppointmentOwnershipPatient } = require('../middlewares/checkAppointmentOwnership');
const { uploadDoctorNotes } = require('../middlewares/upload');

/**
 * @swagger
 * /appointment:
 *   post:
 *     tags:
 *       - Appointments
 *     summary: Create a new appointment
 *     description: Books a new appointment for a patient with a doctor. Validates availability, prevents double bookings, and checks slot availability.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - doctorId
 *               - date
 *               - time
 *               - type
 *             properties:
 *               doctorId:
 *                 type: string
 *                 description: MongoDB ID of the doctor
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Appointment date (YYYY-MM-DD)
 *               time:
 *                 type: string
 *                 description: Appointment time (HH:MM format)
 *               type:
 *                 type: string
 *                 enum: ['online', 'offline']
 *                 description: Type of appointment
 *               notes:
 *                 type: string
 *                 description: Optional patient notes
 *               modeOfPayment:
 *                 type: string
 *                 enum: ['cash', 'card', 'insurance', 'online']
 *                 description: Payment method
 *     responses:
 *       201:
 *         description: Appointment created successfully
 *       400:
 *         description: Validation error or slot unavailable
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post('/', appointmentCreationLimiter, verifyPatient, validateAppointmentInput, preventPatientDoubleBooking, preventDoctorSlotDoubleBooking, appointmentController.postCreate); // Create a new appointment (patient)

/**
 * @swagger
 * /appointment/doctor/appointments:
 *   get:
 *     tags:
 *       - Appointments
 *     summary: Get all doctor's appointments
 *     description: Retrieves all appointments for the authenticated doctor, optionally filtered by status.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: ['pending', 'confirmed', 'completed', 'cancelled']
 *         description: Filter by appointment status
 *     responses:
 *       200:
 *         description: List of doctor's appointments
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.get('/doctor/appointments', appointmentReadLimiter, verifyDoctor, appointmentController.getDoctorAppointments); // Get doctor's appointments

/**
 * @swagger
 * /appointment/{id}:
 *   patch:
 *     tags:
 *       - Appointments
 *     summary: Update appointment status
 *     description: Allows a doctor to update the status of an appointment (confirm, complete, or cancel).
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ['confirmed', 'completed', 'cancelled']
 *     responses:
 *       200:
 *         description: Appointment status updated successfully
 *       400:
 *         description: Invalid status
 *       403:
 *         description: Not authorized to update this appointment
 *       404:
 *         description: Appointment not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.patch('/:id', appointmentGeneralLimiter, verifyDoctor, checkAppointmentOwnershipDoctor, appointmentController.patchUpdateStatus); // Update appointment status (doctor)

/**
 * @swagger
 * /appointment/api/available-slots:
 *   get:
 *     tags:
 *       - Appointments
 *       - Slot Management
 *     summary: Get available appointment slots
 *     description: Retrieves available time slots for a doctor on a specific date. No authentication required.
 *     parameters:
 *       - name: doctorId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Doctor ID
 *       - name: date
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Available slots retrieved
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Doctor not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.get('/api/available-slots', appointmentReadLimiter, appointmentController.getAvailableSlots()); // Get available slots for a doctor

/**
 * @swagger
 * /appointment/api/booked-slots:
 *   get:
 *     tags:
 *       - Slot Management
 *     summary: Get booked appointment slots
 *     description: Retrieves all booked slots for a doctor on a specific date.
 *     parameters:
 *       - name: doctorId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: date
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Booked slots retrieved
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Doctor not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.get('/api/booked-slots', appointmentReadLimiter, appointmentController.getBookedSlots); // Get booked slots for a doctor on a date

/**
 * @swagger
 * /appointment/api/block-slot:
 *   post:
 *     tags:
 *       - Slot Management
 *     summary: Block a time slot
 *     description: Allows a doctor to block a time slot to make it unavailable for patient bookings.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - time
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date to block (YYYY-MM-DD)
 *               time:
 *                 type: string
 *                 description: Time to block (HH:MM)
 *               reason:
 *                 type: string
 *                 description: Optional reason for blocking
 *     responses:
 *       201:
 *         description: Slot blocked successfully
 *       400:
 *         description: Invalid date/time
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post('/api/block-slot', slotManagementLimiter, verifyDoctor, appointmentController.postBlockSlot); // Block a slot (doctor)


router.post('/api/unblock-slot', slotManagementLimiter, verifyDoctor, appointmentController.postUnblockSlot); // Unblock a slot (doctor)

/**
 * @swagger
 * /appointment/api/blocked-slots:
 *   get:
 *     tags:
 *       - Slot Management
 *     summary: Get all blocked slots
 *     description: Retrieves all blocked time slots for the authenticated doctor.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: startDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: endDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of blocked slots
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.get('/api/blocked-slots', appointmentReadLimiter, appointmentController.getBlockedSlots);

/**
 * @swagger
 * /appointment/appointments:
 *   post:
 *     tags:
 *       - Appointments
 *     summary: Create appointment (alternative endpoint)
 *     description: Alternative endpoint for booking a new appointment. Same functionality as POST /appointment.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - doctorId
 *               - date
 *               - time
 *               - type
 *             properties:
 *               doctorId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               time:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: ['online', 'offline']
 *     responses:
 *       201:
 *         description: Appointment created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post('/appointments', appointmentCreationLimiter, verifyPatient, validateAppointmentInput, preventPatientDoubleBooking, preventDoctorSlotDoubleBooking, appointmentController.postCreate); // Create appointment (alternative)

/**
 * @swagger
 * /appointment/patient/{id}/cancel:
 *   patch:
 *     tags:
 *       - Appointments
 *     summary: Cancel appointment by patient
 *     description: Allows a patient to cancel their own appointment.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancellationReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appointment cancelled
 *       400:
 *         description: Cannot cancel this appointment
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to cancel
 *       404:
 *         description: Appointment not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.patch('/patient/:id/cancel', appointmentGeneralLimiter, verifyPatient, checkAppointmentOwnershipPatient, appointmentController.patchCancelByPatient);

/**
 * @swagger
 * /appointment/{appointmentId}/feedback:
 *   post:
 *     tags:
 *       - Appointments
 *     summary: Submit feedback for appointment
 *     description: Allows a patient to submit feedback and ratings for a completed appointment.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: appointmentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - feedback
 *               - rating
 *             properties:
 *               feedback:
 *                 type: string
 *                 description: Patient's feedback about the appointment
 *               rating:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 10
 *                 description: Rating from 0 to 10
 *     responses:
 *       200:
 *         description: Feedback submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 appointment:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     feedback:
 *                       type: string
 *                     rating:
 *                       type: number
 *                     reviewedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid feedback
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Appointment not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post('/:appointmentId/feedback', appointmentGeneralLimiter, verifyPatient, appointmentController.submitFeedback); // Submit feedback for completed appointment

/**
 * @swagger
 * /appointment/{appointmentId}/doctor-notes:
 *   patch:
 *     tags:
 *       - Appointments
 *     summary: Update doctor notes
 *     description: Allows a doctor to add or update clinical notes and attach supporting documents.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: appointmentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               notesText:
 *                 type: string
 *                 description: Clinical notes text
 *               files:
 *                 type: array
 *                 description: Supporting documents (max 5 files)
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Doctor notes updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Appointment not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.patch('/:appointmentId/doctor-notes', appointmentGeneralLimiter, verifyDoctor, uploadDoctorNotes.array('files', 5), appointmentController.updateDoctorNotes); // Update doctor notes

/**
 * @swagger
 * /appointment/{appointmentId}/doctor-notes/files/{fileId}:
 *   delete:
 *     tags:
 *       - Appointments
 *     summary: Delete doctor notes file
 *     description: Allows a doctor to delete a previously uploaded file attachment from doctor notes.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: appointmentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: fileId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Appointment or file not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.delete('/:appointmentId/doctor-notes/files/:fileId', appointmentGeneralLimiter, verifyDoctor, appointmentController.deleteDoctorNotesFile); // Delete doctor notes file

/**
 * @swagger
 * /appointment/doctor/patients:
 *   get:
 *     tags:
 *       - Appointments
 *     summary: Get all patients of a doctor
 *     description: Retrieves a list of all unique patients who have had appointments with the doctor.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: searchTerm
 *         in: query
 *         schema:
 *           type: string
 *         description: Search by patient name, email, or mobile
 *       - name: limit
 *         in: query
 *         schema:
 *           type: number
 *           default: 10
 *       - name: page
 *         in: query
 *         schema:
 *           type: number
 *           default: 1
 *     responses:
 *       200:
 *         description: List of patients retrieved
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.get('/doctor/patients', appointmentReadLimiter, verifyDoctor, appointmentController.getDoctorPatients); // Get all patients of this doctor

/**
 * @swagger
 * /appointment/doctor/patient-history/{patientId}:
 *   get:
 *     tags:
 *       - Appointments
 *     summary: Get patient appointment history
 *     description: Retrieves all appointments for a specific patient under the authenticated doctor.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         schema:
 *           type: number
 *           default: 10
 *       - name: page
 *         in: query
 *         schema:
 *           type: number
 *           default: 1
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: ['completed', 'cancelled', 'all']
 *     responses:
 *       200:
 *         description: Patient history retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Can only view your own patients
 *       404:
 *         description: Patient not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.get('/doctor/patient-history/:patientId', appointmentReadLimiter, verifyDoctor, appointmentController.getPatientHistory); // Get patient history

/**
 * @swagger
 * /appointment/doctor/analytics:
 *   get:
 *     tags:
 *       - Appointments
 *     summary: Get patient analytics
 *     description: Provides analytics and statistics about the doctor's patients and appointment patterns.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: timeRange
 *         in: query
 *         schema:
 *           type: string
 *           enum: ['week', 'month', 'quarter', 'year', 'all']
 *           default: 'month'
 *     responses:
 *       200:
 *         description: Analytics data retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPatients:
 *                   type: number
 *                 totalAppointments:
 *                   type: number
 *                 completedAppointments:
 *                   type: number
 *                 cancelledAppointments:
 *                   type: number
 *                 averageRating:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/doctor/analytics', verifyDoctor, appointmentController.getPatientAnalytics); // Get patient analytics
module.exports = router;