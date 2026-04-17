const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
// const Patient = require('../models/Patient');
const Cart = require('../models/Cart');
const Medicine = require('../models/Medicine');
const patientController = require('../controllers/patientController');
const medicineController = require('../controllers/medicineController');
const cartController = require('../controllers/cartController');
const checkoutController = require('../controllers/checkoutController');
const { uploadBlog, uploadProfile } = require('../middlewares/upload');
const { verifyPatient } = require('../middlewares/auth');

/**
 * @swagger
 * /patient/signup:
 *   post:
 *     summary: Patient Signup - Step 1 (Send OTP)
 *     description: Initiates patient registration by validating email/mobile and sending OTP
 *     tags:
 *       - Patient
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - mobile
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Patient email address
 *               mobile:
 *                 type: string
 *                 pattern: '^[0-9]{10}$'
 *                 description: Patient mobile number (10 digits)
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
 *                 otpSent:
 *                   type: boolean
 *       400:
 *         description: Validation failed or account already exists
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /patient/signup/verify-otp:
 *   post:
 *     summary: Patient Signup - Step 2 (Verify OTP & Create Account)
 *     description: Verifies OTP and creates patient account, returns JWT token
 *     tags:
 *       - Patient
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - mobile
 *               - otp
 *               - name
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               mobile:
 *                 type: string
 *               otp:
 *                 type: string
 *                 description: OTP received via email/SMS
 *               name:
 *                 type: string
 *                 description: Full name of patient
 *               password:
 *                 type: string
 *                 format: password
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account created successfully, JWT token returned
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
 *         description: Invalid OTP or validation failed
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /patient/signup/resend-otp:
 *   post:
 *     summary: Resend OTP
 *     description: Resends OTP to patient email/mobile during signup
 *     tags:
 *       - Patient
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Invalid email or rate limit exceeded
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /patient/login:
 *   post:
 *     summary: Patient Login
 *     description: Authenticates a patient user and returns JWT token
 *     tags:
 *       - Patient
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
 *         description: Login successful, JWT token returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid email or password
 *       500:
 *         description: Internal server error
 */



// Public routes (no authentication required)
router.post('/signup', patientController.signup);
router.post('/signup/verify-otp', patientController.verifySignupOtp);
router.post('/signup/resend-otp', patientController.resendSignupOtp);
router.post('/login', patientController.login); 
router.get('/form', patientController.getForm); 

/**
 * @swagger
 * /patient/profile-data:
 *   get:
 *     summary: Get Profile Data (JSON)
 *     description: Returns patient profile data as JSON
 *     tags:
 *       - Patient
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Profile data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 mobile:
 *                   type: string
 *                 address:
 *                   type: string
 *                 dateOfBirth:
 *                   type: string
 *                   format: date
 *       401:
 *         description: Unauthorized
 */



/**
 * @swagger
 * /patient/update-profile:
 *   post:
 *     summary: Update Patient Profile
 *     description: Updates patient profile information including optional profile photo
 *     tags:
 *       - Patient
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               mobile:
 *                 type: string
 *               address:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *                 description: Profile photo file (optional)
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /patient/profile-photo/upload:
 *   post:
 *     summary: Upload Profile Photo
 *     description: Uploads or updates patient profile photo
 *     tags:
 *       - Patient
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - profilePhoto
 *             properties:
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *                 description: Profile photo image file
 *     responses:
 *       200:
 *         description: Photo uploaded successfully
 *       400:
 *         description: Invalid file or size exceeded
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /patient/profile-photo/remove:
 *   post:
 *     summary: Remove Profile Photo
 *     description: Deletes patient's profile photo
 *     tags:
 *       - Patient
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Photo removed successfully
 *       401:
 *         description: Unauthorized
 */

// Protected routes (require JWT authentication)
router.get('/dashboard', verifyPatient, patientController.getDashboard);
router.get('/profile', verifyPatient, patientController.getProfile);
router.get('/profile-data', verifyPatient, patientController.getProfileData);
router.get('/edit-profile', verifyPatient, patientController.getEditProfile);
router.post('/update-profile', verifyPatient, uploadProfile.single('profilePhoto'), patientController.updateProfile);
router.post('/profile-photo/upload', verifyPatient, uploadProfile.single('profilePhoto'), patientController.uploadProfilePhoto);
router.post('/profile-photo/remove', verifyPatient, patientController.removeProfilePhoto);





/**
 * @swagger
 * /patient/doctor-profile-patient/{id}:
 *   get:
 *     summary: Get Doctor Profile (Patient View)
 *     description: Retrieves detailed doctor profile for patient appointment booking
 *     tags:
 *       - Patient
 *       - Doctors
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Doctor ID
 *     responses:
 *       200:
 *         description: Doctor profile retrieved
 *       404:
 *         description: Doctor not found
 *       401:
 *         description: Unauthorized
 */

router.get('/book-appointment', verifyPatient, patientController.getBookAppointment);
router.get('/book-doc-online', verifyPatient, patientController.getBookDocOnline);
router.get('/doctor-profile-patient/:id', verifyPatient, patientController.getDoctorProfilePatient); 

/**
 * @swagger
 * /patient/order-medicines:
 *   get:
 *     summary: Get All Medicines
 *     description: Retrieves list of all available medicines for ordering
 *     tags:
 *       - Patient
 *       - Medicines
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: number
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Medicines retrieved successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /patient/api/doctors/online:
 *   get:
 *     summary: Get Online Doctors
 *     description: Retrieves list of currently online doctors
 *     tags:
 *       - Patient
 *       - Doctors
 *     responses:
 *       200:
 *         description: Online doctors retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   specialization:
 *                     type: string
 *                   experience:
 *                     type: number
 *                   onlineStatus:
 *                     type: boolean
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /patient/api/doctors/offline:
 *   get:
 *     summary: Get Offline Doctors
 *     description: Retrieves list of currently offline doctors
 *     tags:
 *       - Patient
 *       - Doctors
 *     responses:
 *       200:
 *         description: Offline doctors retrieved
 */

/**
 * @swagger
 * /patient/api/doctors/all:
 *   get:
 *     summary: Get All Doctors
 *     description: Retrieves complete list of all doctors (online and offline)
 *     tags:
 *       - Patient
 *       - Doctors
 *     parameters:
 *       - name: specialization
 *         in: query
 *         schema:
 *           type: string
 *       - name: sort
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: All doctors retrieved
 */

/**
 * @swagger
 * /patient/api/doctor/{id}:
 *   get:
 *     summary: Get Doctor Details
 *     description: Retrieves detailed information for a specific doctor
 *     tags:
 *       - Patient
 *       - Doctors
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Doctor ID
 *     responses:
 *       200:
 *         description: Doctor details retrieved
 *       404:
 *         description: Doctor not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /patient/api/medicines/{id}:
 *   get:
 *     summary: Get Medicine Details
 *     description: Retrieves detailed information for a specific medicine
 *     tags:
 *       - Patient
 *       - Medicines
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Medicine ID
 *     responses:
 *       200:
 *         description: Medicine details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 price:
 *                   type: number
 *                 dosage:
 *                   type: string
 *                 stock:
 *                   type: number
 *       404:
 *         description: Medicine not found
 */

/**
 * @swagger
 * /patient/api/medicines/search:
 *   get:
 *     summary: Search Medicines
 *     description: Searches for medicines by name, dosage, or other criteria
 *     tags:
 *       - Patient
 *       - Medicines
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search results retrieved
 */

/**
 * @swagger
 * /patient/medicines/{id}:
 *   get:
 *     summary: Get Medicine Details (Alternate)
 *     description: Alternate endpoint for retrieving medicine details
 *     tags:
 *       - Patient
 *       - Medicines
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Medicine details retrieved
 *       404:
 *         description: Medicine not found
 */

router.get('/order-medicines', verifyPatient, medicineController.getAllMedicines);

router.get('/api/doctors/online', patientController.getDoctorsOnline);
router.get('/api/doctors/offline', patientController.getDoctorsOffline);
router.get('/api/doctors/all', patientController.getDoctorsAll);
router.get('/api/doctor/:id', verifyPatient, patientController.getDoctorAPI);
router.get('/api/medicines/:id', medicineController.getDetail);
router.get('/api/medicines/search', patientController.getMedicinesSearch);
router.get('/medicines/:id', medicineController.getDetail); 

/**
 * @swagger
 * /patient/orders:
 *   get:
 *     summary: Get Orders Page
 *     description: Returns the patient orders page (HTML)
 *     tags:
 *       - Patient
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Orders page retrieved
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /patient/orders/{id}:
 *   get:
 *     summary: Get Order Details (HTML)
 *     description: Returns detailed order information page (HTML)
 *     tags:
 *       - Patient
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details page retrieved
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /patient/api/orders/{id}:
 *   get:
 *     summary: Get Order Details (JSON)
 *     description: Retrieves detailed order information as JSON
 *     tags:
 *       - Patient
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 orderNumber:
 *                   type: string
 *                 items:
 *                   type: array
 *                 totalAmount:
 *                   type: number
 *                 status:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /patient/api/orders:
 *   get:
 *     summary: Get All Orders
 *     description: Retrieves list of all patient orders
 *     tags:
 *       - Patient
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: number
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *       401:
 *         description: Unauthorized
 */

// Orders routes
router.get('/orders', verifyPatient, (req, res) => res.render('patient_orders'));
router.get('/orders/:id', verifyPatient, patientController.getOrderDetails);
// Patient API routes
router.get('/api/orders/:id', verifyPatient, patientController.getOrderDetailsAPI);
router.get('/api/orders', verifyPatient, patientController.getOrders);

/**
 * @swagger
 * /patient/api/patient/appointments/previous:
 *   get:
 *     summary: Get Previous Appointments
 *     description: Retrieves list of past/completed appointments for the patient
 *     tags:
 *       - Patient
 *       - Appointments
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Previous appointments retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   doctorName:
 *                     type: string
 *                   appointmentDate:
 *                     type: string
 *                     format: date-time
 *                   status:
 *                     type: string
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /patient/api/patient/appointments/upcoming:
 *   get:
 *     summary: Get Upcoming Appointments
 *     description: Retrieves list of scheduled/upcoming appointments for the patient
 *     tags:
 *       - Patient
 *       - Appointments
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Upcoming appointments retrieved
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /patient/prescriptions/download/{id}:
 *   get:
 *     summary: Download Prescription (PDF)
 *     description: Downloads prescription as PDF document
 *     tags:
 *       - Patient
 *       - Prescriptions
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
 *     responses:
 *       200:
 *         description: PDF downloaded
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Prescription not found
 *       401:
 *         description: Unauthorized
 */

router.get('/api/patient/appointments/previous', verifyPatient, patientController.getPreviousAppointments);
router.get('/api/patient/appointments/upcoming', verifyPatient, patientController.getUpcomingAppointments);
router.get('/prescriptions', verifyPatient, patientController.getPrescriptions);
router.get('/prescriptions/download/:id', verifyPatient, patientController.downloadPrescription);

/**
 * @swagger
 * /patient/api/add-to-cart:
 *   post:
 *     summary: Add Item to Cart
 *     description: Adds a medicine to patient's shopping cart
 *     tags:
 *       - Patient
 *       - Cart
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
 *               - medicineId
 *               - quantity
 *             properties:
 *               medicineId:
 *                 type: string
 *                 description: ID of the medicine to add
 *               quantity:
 *                 type: number
 *                 description: Quantity to add
 *     responses:
 *       200:
 *         description: Item added to cart successfully
 *       400:
 *         description: Invalid medicine or quantity
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /patient/cart:
 *   get:
 *     summary: Get Cart (HTML)
 *     description: Returns the shopping cart page (HTML)
 *     tags:
 *       - Patient
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Cart page retrieved
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /patient/api/cart:
 *   get:
 *     summary: Get Cart Contents (JSON)
 *     description: Retrieves cart items and totals as JSON
 *     tags:
 *       - Patient
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Cart contents retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                 subtotal:
 *                   type: number
 *                 tax:
 *                   type: number
 *                 total:
 *                   type: number
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /patient/api/cart/update:
 *   post:
 *     summary: Update Cart Item
 *     description: Updates quantity or details of an item in cart
 *     tags:
 *       - Patient
 *       - Cart
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
 *               - medicineId
 *               - quantity
 *             properties:
 *               medicineId:
 *                 type: string
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Cart item updated
 *       404:
 *         description: Item not found in cart
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /patient/api/cart/item/{medicineId}:
 *   delete:
 *     summary: Remove Item from Cart
 *     description: Removes a medicine from patient's shopping cart
 *     tags:
 *       - Patient
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: medicineId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Medicine ID to remove
 *     responses:
 *       200:
 *         description: Item removed from cart
 *       404:
 *         description: Item not found in cart
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /patient/api/cart/count:
 *   get:
 *     summary: Get Cart Item Count
 *     description: Returns the number of items in patient's cart
 *     tags:
 *       - Patient
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Cart count retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 *       401:
 *         description: Unauthorized
 */

// Cart
router.post('/api/add-to-cart', verifyPatient, cartController.addToCart);
router.get('/cart', verifyPatient, cartController.getCart);
router.get('/api/cart', verifyPatient, cartController.getCartAPI);
router.post('/api/cart/update', verifyPatient, cartController.updateItem);
router.delete('/api/cart/item/:medicineId', verifyPatient, cartController.removeItem);
router.get('/api/cart/count', verifyPatient, cartController.getCartCount);




/**
 * @swagger
 * /patient/api/checkout-data:
 *   get:
 *     summary: Get Checkout Data
 *     description: Retrieves order summary and shipping data for checkout
 *     tags:
 *       - Patient
 *       - Checkout
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Checkout data retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                 subtotal:
 *                   type: number
 *                 shipping:
 *                   type: number
 *                 total:
 *                   type: number
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /patient/api/session-order-details:
 *   get:
 *     summary: Get Session Order Details
 *     description: Retrieves order details from current session
 *     tags:
 *       - Patient
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Order details retrieved
 *       401:
 *         description: Unauthorized
 */



/**
 * @swagger
 * /patient/process-payment:
 *   post:
 *     summary: Process Payment
 *     description: Processes payment for the order
 *     tags:
 *       - Patient
 *       - Payment
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
 *               - orderId
 *               - amount
 *             properties:
 *               orderId:
 *                 type: string
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *               transactionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       400:
 *         description: Payment failed
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /patient/order-success:
 *   get:
 *     summary: Get Order Success Page
 *     description: Returns the order confirmation/success page (HTML)
 *     tags:
 *       - Patient
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Success page retrieved
 *       401:
 *         description: Unauthorized
 */

// Checkout
router.get('/checkout', verifyPatient, checkoutController.getCheckout);
router.post('/checkout', verifyPatient, checkoutController.postCheckout);

router.get('/api/checkout-data', verifyPatient, checkoutController.getCheckoutData);
router.get('/api/session-order-details', verifyPatient, checkoutController.getSessionOrderDetails);

router.get('/order-details', verifyPatient, checkoutController.getOrderDetails);
router.get('/payment', verifyPatient, checkoutController.getPaymentPage);
router.post('/process-payment', verifyPatient, checkoutController.processPayment);
router.get('/order-success', verifyPatient, checkoutController.getOrderSuccess);

module.exports = router;
