const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { upload, uploadBlog, uploadProfile } = require('../middlewares/upload');
const { verifyDoctor } = require('../middlewares/auth');



/**
 * @swagger
 * /doctor/signup:
 *   post:
 *     summary: Doctor Signup - Step 1 (Validate & Send OTP)
 *     description: Initiates doctor registration by validating info, uploading medical document, and sending OTP
 *     tags:
 *       - Doctor
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - mobile
 *               - address
 *               - registrationNumber
 *               - college
 *               - yearOfPassing
 *               - location
 *               - onlineStatus
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Doctor's full name
 *               email:
 *                 type: string
 *                 format: email
 *               mobile:
 *                 type: string
 *                 pattern: '^[0-9]{10}$'
 *                 description: 10-digit mobile number
 *               address:
 *                 type: string
 *                 description: Doctor's address
 *               registrationNumber:
 *                 type: string
 *                 description: Medical registration number
 *               specialization:
 *                 type: string
 *                 description: Medical specialization
 *               college:
 *                 type: string
 *                 description: Medical college name
 *               yearOfPassing:
 *                 type: string
 *                 description: Year of passing from medical college
 *               location:
 *                 type: string
 *                 description: Practice location
 *               onlineStatus:
 *                 type: boolean
 *                 description: Whether doctor provides online consultation
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Account password (minimum 6 characters)
 *               consultationFee:
 *                 type: number
 *                 description: Consultation fee amount (optional, default 100)
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 description: Doctor's date of birth (optional)
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 description: Doctor's gender (optional)
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: Medical qualification document (PDF/Image) (optional)
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 pendingId:
 *                   type: string
 *       400:
 *         description: Validation failed or duplicate account
 *       500:
 *         description: Failed to send OTP email
 */

/**
 * @swagger
 * /doctor/signup/verify-otp:
 *   post:
 *     summary: Doctor Signup - Step 2 (Verify OTP & Create Account)
 *     description: Verifies OTP and creates doctor account, returns JWT token
 *     tags:
 *       - Doctor
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pendingId
 *               - otp
 *             properties:
 *               pendingId:
 *                 type: string
 *                 description: Pending signup ID from signup response
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP sent to email
 *     responses:
 *       201:
 *         description: Account created and verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *       400:
 *         description: Invalid OTP or session expired
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /doctor/signup/resend-otp:
 *   post:
 *     summary: Resend OTP
 *     description: Resends OTP to doctor email during signup
 *     tags:
 *       - Doctor
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pendingId
 *             properties:
 *               pendingId:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Session expired or invalid pendingId
 *       500:
 *         description: Failed to resend OTP
 */

/**
 * @swagger
 * /doctor/login:
 *   post:
 *     summary: Doctor Login
 *     description: Authenticates doctor with email and password, returns JWT token
 *     tags:
 *       - Doctor
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */

// Public routes (no authentication required)
router.get('/form', doctorController.getForm);
router.get('/search', doctorController.searchDoctors);
router.post('/signup', upload.single('document'), doctorController.signup);
router.post('/signup/verify-otp', doctorController.verifySignupOtp);
router.post('/signup/resend-otp', doctorController.resendSignupOtp);
router.post('/login', doctorController.login);



/**
 * @swagger
 * /doctor/api/daily-earnings:
 *   get:
 *     summary: Get Daily Earnings
 *     description: Retrieves doctor's earnings for the current day (API endpoint)
 *     tags:
 *       - Doctor
 *       - Earnings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily earnings retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 earnings:
 *                   type: number
 *                   description: Total earnings for the day
 *                 appointmentCount:
 *                   type: number
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */



/**
 * @swagger
 * /doctor/api/profile:
 *   get:
 *     summary: Get Doctor Profile Details (API)
 *     description: Retrieves doctor profile information as JSON
 *     tags:
 *       - Doctor
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor profile details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 specialization:
 *                   type: string
 *                 licenseNumber:
 *                   type: string
 *                 experience:
 *                   type: number
 *                 address:
 *                   type: string
 *                 profilePhoto:
 *                   type: string
 *                   format: uri
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Doctor not found
 *       500:
 *         description: Internal server error
 */



/**
 * @swagger
 * /doctor/update-profile:
 *   post:
 *     summary: Update Doctor Profile
 *     description: Updates doctor profile information and optionally profile photo
 *     tags:
 *       - Doctor
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - mobile
 *               - address
 *               - specialization
 *               - college
 *               - yearOfPassing
 *               - location
 *               - onlineStatus
 *               - consultationFee
 *             properties:
 *               name:
 *                 type: string
 *                 description: Doctor's full name
 *               email:
 *                 type: string
 *                 format: email
 *               mobile:
 *                 type: string
 *                 pattern: '^[0-9]{10}$'
 *                 description: 10-digit mobile number
 *               address:
 *                 type: string
 *                 description: Doctor's address
 *               specialization:
 *                 type: string
 *                 description: Medical specialization
 *               college:
 *                 type: string
 *                 description: Medical college name
 *               yearOfPassing:
 *                 type: string
 *                 description: Year of passing from medical college
 *               location:
 *                 type: string
 *                 description: Practice location
 *               onlineStatus:
 *                 type: string
 *                 description: Whether doctor provides online consultation
 *               consultationFee:
 *                 type: number
 *                 description: Consultation fee amount
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 description: Doctor's date of birth (optional)
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 description: Doctor's gender (optional)
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *                 description: Profile photo image file (optional)        
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 doctor:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /doctor/profile-photo/remove:
 *   post:
 *     summary: Remove Profile Photo
 *     description: Removes doctor's profile photo
 *     tags:
 *       - Doctor
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile photo removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */



/**
 * @swagger
 * /doctor/api/appointments:
 *   get:
 *     summary: Get All Appointments (API)
 *     description: Retrieves doctor's appointments categorized as upcoming and previous
 *     tags:
 *       - Doctor
 *       - Appointments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Appointments retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 upcoming:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       patientId:
 *                         type: object
 *                       date:
 *                         type: string
 *                         format: date
 *                       time:
 *                         type: string
 *                       status:
 *                         type: string
 *                 previous:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       patientId:
 *                         type: object
 *                       date:
 *                         type: string
 *                         format: date
 *                       time:
 *                         type: string
 *                       status:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /doctor/api/schedule:
 *   get:
 *     summary: Get Doctor Schedule
 *     description: Retrieves doctor's availability schedule
 *     tags:
 *       - Doctor
 *       - Appointments
 *       - Schedule
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: date
 *         in: query
 *         required: true
 *         description: Date for which schedule is requested (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *           example: '2026-03-17'
 *     responses:
 *       200:
 *         description: Schedule retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 schedule:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       day:
 *                         type: string
 *                       startTime:
 *                         type: string
 *                       endTime:
 *                         type: string
 *                       isAvailable:
 *                         type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /doctor/appointments/previous:
 *   get:
 *     summary: Get Previous Appointments
 *     description: Retrieves completed/past appointments
 *     tags:
 *       - Doctor
 *       - Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: number
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: Previous appointments retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 appointments:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /doctor/appointments/upcoming:
 *   get:
 *     summary: Get Upcoming Appointments
 *     description: Retrieves future appointments scheduled with this doctor
 *     tags:
 *       - Doctor
 *       - Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: number
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: Upcoming appointments retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 appointments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       patientName:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date
 *                       time:
 *                         type: string
 *                       status:
 *                         type: string
 *                 total:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /doctor/prescriptions/download/{id}:
 *   get:
 *     summary: Download Prescription
 *     description: Downloads prescription document as PDF for a specific appointment
 *     tags:
 *       - Doctor
 *       - Prescriptions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Prescription/Appointment ID
 *     responses:
 *       200:
 *         description: Prescription PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Prescription not found
 *       500:
 *         description: Internal server error
 */


// Protected routes (require JWT authentication)
router.get('/dashboard', verifyDoctor, doctorController.getDashboard);
router.get('/api/daily-earnings', verifyDoctor, doctorController.getDailyEarnings);
router.get('/profile', verifyDoctor, doctorController.getProfile);
router.get('/api/profile', verifyDoctor, doctorController.getDoctorDetails);
router.get('/edit-profile', verifyDoctor, doctorController.getEditProfile);
router.post('/update-profile', verifyDoctor, uploadProfile.single('profilePhoto'), doctorController.updateProfile);
router.post('/profile-photo/remove', verifyDoctor, doctorController.removeProfilePhoto);
router.get('/appointments', verifyDoctor, doctorController.getDoctorAppiontments);
router.get('/api/appointments', verifyDoctor, doctorController.getDoctorAppointmentsAPI);
router.get('/api/schedule', verifyDoctor, doctorController.getDoctorSchedule);
router.get('/appointments/previous', verifyDoctor, doctorController.getPreviousAppointments);
router.get('/appointments/upcoming', verifyDoctor, doctorController.getUpcomingAppointments);
router.get('/prescriptions/download/:id', verifyDoctor, doctorController.downloadPrescription);
router.get('/generate-prescriptions', verifyDoctor, doctorController.getGeneratePrescriptionPage);
router.get('/prescriptions', verifyDoctor, doctorController.getPrescriptionsPage);
module.exports = router;