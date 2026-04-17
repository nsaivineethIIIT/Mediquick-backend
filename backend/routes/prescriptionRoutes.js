const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { verifyDoctor, verifyPatient } = require('../middlewares/auth');
const { validatePrescriptionInput } = require('../middlewares/validatePrescription');
const { 
    checkPrescriptionOwnership, 
    checkPrescriptionUpdatePermission 
} = require('../middlewares/checkPrescriptionPermissions');

/**
 * @swagger
 * /prescription/doctor/prescriptions:
 *   post:
 *     tags:
 *       - Prescriptions
 *     summary: Create a new prescription
 *     description: Creates a new prescription for a completed appointment. Doctor can only create prescriptions for appointments they conducted. Includes patient details, symptoms, medications, and additional medical notes.
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
 *               - appointmentId
 *               - age
 *               - gender
 *               - weight
 *               - symptoms
 *               - medicines
 *             properties:
 *               appointmentId:
 *                 type: string
 *                 description: MongoDB ID of the appointment this prescription is for
 *                 example: "60d5ec49c1234567890ab124"
 *               age:
 *                 type: number
 *                 description: Patient's age in years
 *                 example: 35
 *               gender:
 *                 type: string
 *                 enum: ['male', 'female', 'other']
 *                 description: Patient's gender
 *                 example: "male"
 *               weight:
 *                 type: number
 *                 description: Patient's weight in kg
 *                 example: 75.5
 *               symptoms:
 *                 type: string
 *                 description: Patient's symptoms and complaints
 *                 example: "Persistent headache, fever, body ache"
 *               medicines:
 *                 type: array
 *                 minItems: 1
 *                 description: List of prescribed medications
 *                 items:
 *                   type: object
 *                   required:
 *                     - medicineName
 *                     - dosage
 *                     - frequency
 *                     - duration
 *                   properties:
 *                     medicineName:
 *                       type: string
 *                       example: "Paracetamol"
 *                     dosage:
 *                       type: string
 *                       example: "500mg"
 *                     frequency:
 *                       type: string
 *                       example: "Twice daily"
 *                     duration:
 *                       type: string
 *                       example: "5 days"
 *                     instructions:
 *                       type: string
 *                       example: "Take after meals"
 *               additionalNotes:
 *                 type: string
 *                 description: Optional additional medical notes and instructions
 *                 example: "Rest and stay hydrated. Follow up if symptoms persist."
 *     responses:
 *       201:
 *         description: Prescription created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Prescription created successfully"
 *                 prescription:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     patientName:
 *                       type: string
 *                     age:
 *                       type: number
 *                     gender:
 *                       type: string
 *                     weight:
 *                       type: number
 *                     symptoms:
 *                       type: string
 *                     medicines:
 *                       type: array
 *                     additionalNotes:
 *                       type: string
 *                     appointmentId:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Missing required fields or prescription already exists for this appointment
 *       401:
 *         description: Unauthorized (doctor authentication required)
 *       403:
 *         description: You can only create prescriptions for your own appointments
 *       404:
 *         description: Appointment not found
 *       500:
 *         description: Server error
 */
router.post('/doctor/prescriptions', verifyDoctor, validatePrescriptionInput, prescriptionController.createPrescription);

/**
 * @swagger
 * /prescription/doctor/prescriptions:
 *   get:
 *     tags:
 *       - Prescriptions
 *     summary: Get all prescriptions created by a doctor
 *     description: Retrieves all prescriptions created by the authenticated doctor, sorted by most recent first. Includes patient and appointment information.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: List of prescriptions created by doctor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 prescriptions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       patientName:
 *                         type: string
 *                       patientEmail:
 *                         type: string
 *                       age:
 *                         type: number
 *                       gender:
 *                         type: string
 *                       weight:
 *                         type: number
 *                       symptoms:
 *                         type: string
 *                       medicines:
 *                         type: array
 *                       additionalNotes:
 *                         type: string
 *                       appointmentDate:
 *                         type: string
 *                         format: date
 *                       appointmentTime:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized (doctor authentication required)
 *       500:
 *         description: Server error
 */
router.get('/doctor/prescriptions', verifyDoctor, prescriptionController.getDoctorPrescriptions);

/**
 * @swagger
 * /prescription/doctor/prescriptions/{id}:
 *   get:
 *     tags:
 *       - Prescriptions
 *     summary: Get a specific prescription by ID (doctor view)
 *     description: Retrieves detailed information about a specific prescription. Doctor can only view prescriptions they created.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Prescription ID
 *         example: "60d5ec49c1234567890ab126"
 *     responses:
 *       200:
 *         description: Prescription details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 prescription:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     patientId:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         mobile:
 *                           type: string
 *                         address:
 *                           type: string
 *                     doctorId:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         specialization:
 *                           type: string
 *                         email:
 *                           type: string
 *                         mobile:
 *                           type: string
 *                     appointmentId:
 *                       type: object
 *                       properties:
 *                         date:
 *                           type: string
 *                           format: date
 *                         time:
 *                           type: string
 *                         type:
 *                           type: string
 *                         status:
 *                           type: string
 *                     age:
 *                       type: number
 *                     weight:
 *                       type: number
 *                     symptoms:
 *                       type: string
 *                     medicines:
 *                       type: array
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Unauthorized to view this prescription
 *       404:
 *         description: Prescription not found
 *       500:
 *         description: Server error
 */
router.get('/doctor/prescriptions/:id', verifyDoctor, checkPrescriptionOwnership, prescriptionController.getPrescriptionById);


router.put('/doctor/prescriptions/:id', verifyDoctor, validatePrescriptionInput, checkPrescriptionUpdatePermission, prescriptionController.updatePrescription);

/**
 * @swagger
 * /prescription/patient/prescriptions:
 *   get:
 *     tags:
 *       - Prescriptions
 *     summary: Get all prescriptions for a patient
 *     description: Retrieves all prescriptions issued to the authenticated patient, sorted by most recent first. Includes doctor and appointment information.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: List of prescriptions for patient
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 prescriptions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       doctorId:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           specialization:
 *                             type: string
 *                           email:
 *                             type: string
 *                       age:
 *                         type: number
 *                       gender:
 *                         type: string
 *                       weight:
 *                         type: number
 *                       symptoms:
 *                         type: string
 *                       medicines:
 *                         type: array
 *                       additionalNotes:
 *                         type: string
 *                       appointmentDate:
 *                         type: string
 *                         format: date
 *                       appointmentTime:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized (patient authentication required)
 *       500:
 *         description: Server error
 */
router.get('/patient/prescriptions', verifyPatient, prescriptionController.getPatientPrescriptions);

/**
 * @swagger
 * /prescription/patient/prescriptions/{id}:
 *   get:
 *     tags:
 *       - Prescriptions
 *     summary: Get a specific prescription by ID (patient view)
 *     description: Retrieves detailed information about a specific prescription. Patient can only view prescriptions issued to them.
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Prescription ID
 *         example: "60d5ec49c1234567890ab126"
 *     responses:
 *       200:
 *         description: Prescription details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 prescription:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     doctorid:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         specialization:
 *                           type: string
 *                         email:
 *                           type: string
 *                         mobile:
 *                           type: string
 *                     age:
 *                       type: number
 *                     gender:
 *                       type: string
 *                     weight:
 *                       type: number
 *                     symptoms:
 *                       type: string
 *                     medicines:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           dosage:
 *                             type: string
 *                           frequency:
 *                             type: string
 *                           duration:
 *                             type: string
 *                           instructions:
 *                             type: string
 *                     additionalNotes:
 *                       type: string
 *                     appointmentDate:
 *                       type: string
 *                       format: date
 *                     appointmentTime:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Unauthorized to view this prescription
 *       404:
 *         description: Prescription not found
 *       500:
 *         description: Server error
 */
router.get('/patient/prescriptions/:id', verifyPatient, checkPrescriptionOwnership, prescriptionController.getPrescriptionById);

module.exports = router;