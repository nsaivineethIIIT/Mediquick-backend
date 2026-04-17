const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyAdmin } = require('../middlewares/auth');


router.get('/dashboard', verifyAdmin, adminController.getDashboard);

/**
 * @swagger
 * /admin/api/appointments:
 *   get:
 *     summary: Get All Appointments
 *     description: Retrieves all appointments filtered by date range
 *     tags:
 *       - Admin
 *       - Appointments
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: startDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering appointments (YYYY-MM-DD)
 *       - name: endDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering appointments (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Appointments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: Appointment ID
 *                   patientName:
 *                     type: string
 *                   doctorName:
 *                     type: string
 *                   doctorId:
 *                     type: string
 *                   specialization:
 *                     type: string
 *                   date:
 *                     type: string
 *                     format: date
 *                   time:
 *                     type: string
 *                   fee:
 *                     type: number
 *                   revenue:
 *                     type: number
 *                   status:
 *                     type: string
 *       401:
 *         description: Unauthorized - Admin token required
 *       500:
 *         description: Internal server error
 */
router.get('/api/appointments', verifyAdmin, adminController.getAppointments);

/**
 * @swagger
 * /admin/api/earnings:
 *   get:
 *     summary: Get Earnings Data
 *     description: Retrieves financial earnings and revenue data for the platform
 *     tags:
 *       - Admin
 *       - Finance
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Earnings data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/api/earnings', verifyAdmin, adminController.getEarnings);

/**
 * @swagger
 * /admin/api/signins:
 *   get:
 *     summary: Get Sign-in Activities
 *     description: Retrieves all user sign-in activities and login logs
 *     tags:
 *       - Admin
 *       - Activity
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Sign-in activities retrieved successfully
 */
router.get('/api/signins', verifyAdmin, adminController.getSignins);


router.get('/form', adminController.getForm);

/**
 * @swagger
 * /admin/login:
 *   post:
 *     summary: Admin Login
 *     description: Authenticates an admin user with email, password, and security code
 *     tags:
 *       - Admin
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
 *               - securityCode
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               securityCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 *       401:
 *         description: Invalid email or password
 */
router.post('/login',adminController.login);

/**
 * @swagger
 * /admin/signup:
 *   post:
 *     summary: Admin Signup
 *     description: Creates a new admin account (requires security code)
 *     tags:
 *       - Admin
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - mobile
 *               - address
 *               - password
 *               - securityCode
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               mobile:
 *                 type: string
 *               address:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               securityCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Signup successful
 *       400:
 *         description: Validation failure or duplicate entry
 */
router.post('/signup',adminController.signup);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get All Users
 *     description: Retrieves a list of all users in the system with their details
 *     tags:
 *       - Admin
 *       - Users
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get('/users', verifyAdmin, adminController.getUsers);

/**
 * @swagger
 * /admin/users/{type}/{id}:
 *   delete:
 *     summary: Delete User
 *     description: Removes a user from the system by type and ID
 *     tags:
 *       - Admin
 *       - Users
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: type
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [doctor, patient, supplier, employee]
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */
router.delete('/users/:type/:id', verifyAdmin, adminController.deleteUser);

router.get('/profile', verifyAdmin, adminController.getProfile);


router.get('/edit-profile', verifyAdmin, adminController.getEditProfile);

/**
 * @swagger
 * /admin/update-profile:
 *   post:
 *     summary: Update Admin Profile
 *     description: Updates the current admin's profile information
 *     tags:
 *       - Admin
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
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
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 */
router.post('/update-profile', verifyAdmin, adminController.updateProfile);

/**
 * @swagger
 * /admin/profile-data:
 *   get:
 *     summary: Get Profile Data
 *     description: Retrieves detailed profile data for the admin
 *     tags:
 *       - Admin
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Profile data retrieved successfully
 */
router.get('/profile-data', verifyAdmin, adminController.getProfileData);

/**
 * @swagger
 * /admin/api/finance:
 *   get:
 *     summary: Get Finance Data
 *     description: Retrieves financial transactions and payment information
 *     tags:
 *       - Admin
 *       - Finance
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Finance data retrieved successfully
 */
router.get('/api/finance', verifyAdmin, adminController.getFinanceData);

/**
 * @swagger
 * /admin/api/revenue-summary:
 *   get:
 *     summary: Get Revenue Summary
 *     description: Retrieves a summary of revenue data
 *     tags:
 *       - Admin
 *       - Finance
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Revenue summary retrieved successfully
 */
router.get('/api/revenue-summary', verifyAdmin, adminController.getRevenueSummary);

/**
 * @swagger
 * /admin/api/medicine-finance:
 *   get:
 *     summary: Get Medicine Finance Data
 *     description: Retrieves financial data for medicine orders and commissions
 *     tags:
 *       - Admin
 *       - Finance
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Medicine finance data retrieved successfully
 */
router.get('/api/medicine-finance', verifyAdmin, adminController.getMedicineFinance);

/**
 * @swagger
 * /admin/api/medicine-orders:
 *   get:
 *     summary: Get Medicine Orders
 *     description: Retrieves all medicine orders placed on the platform
 *     tags:
 *       - Admin
 *       - Orders
 *     responses:
 *       200:
 *         description: Medicine orders retrieved successfully
 */
router.get('/api/medicine-orders', adminController.getMedicineOrders);

/**
 * @swagger
 * /admin/api/supplier-analytics:
 *   get:
 *     summary: Get Supplier Analytics
 *     description: Retrieves analytics data for suppliers including performance metrics
 *     tags:
 *       - Admin
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Supplier analytics retrieved successfully
 */
router.get('/api/supplier-analytics', verifyAdmin, adminController.getSupplierAnalytics);

router.get('/api/global-search', verifyAdmin, adminController.searchGlobalData);


router.get('/search-data', verifyAdmin, adminController.getSearchData);

/**
 * @swagger
 * /admin/api/reviews:
 *   get:
 *     summary: Get Reviews with Appointments
 *     description: Retrieves all appointments with associated reviews
 *     tags:
 *       - Admin
 *       - Reviews
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 */
router.get('/api/reviews', verifyAdmin, adminController.getAppointmentsWithReviews);

/**
 * @swagger
 * /admin/api/reviews/{appointmentId}:
 *   delete:
 *     summary: Delete Review
 *     description: Removes a review for a specific appointment
 *     tags:
 *       - Admin
 *       - Reviews
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: appointmentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       404:
 *         description: Review not found
 */
router.delete('/api/reviews/:appointmentId', verifyAdmin, adminController.deleteReview);

/**
 * @swagger
 * /admin/api/employee-requests:
 *   get:
 *     summary: Get Employee Approval Requests
 *     description: Retrieves pending employee approval requests
 *     tags:
 *       - Admin
 *       - Employees
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Employee requests retrieved successfully
 */
router.get('/api/employee-requests', verifyAdmin, adminController.getEmployeeRequestsAPI);

/**
 * @swagger
 * /admin/approve_employee/{id}:
 *   post:
 *     summary: Approve Employee
 *     description: Approves a pending employee request
 *     tags:
 *       - Admin
 *       - Employees
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee approved successfully
 *       404:
 *         description: Employee request not found
 */
router.post('/approve_employee/:id', verifyAdmin, adminController.postApproveEmployee);

/**
 * @swagger
 * /admin/api/doctor-analytics:
 *   get:
 *     summary: Get Doctor Analytics
 *     description: Retrieves analytics data for doctors including performance metrics
 *     tags:
 *       - Admin
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Doctor analytics retrieved successfully
 */
router.get('/api/doctor-analytics', verifyAdmin, adminController.getDoctorAnalytics);

/**
 * @swagger
 * /admin/api/doctor-appointments:
 *   get:
 *     summary: Get Doctor Appointments
 *     description: Retrieves appointments data filtered by doctor
 *     tags:
 *       - Admin
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: doctorId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Doctor ID to filter appointments
 *     responses:
 *       200:
 *         description: Doctor appointments retrieved successfully
 */
router.get('/api/doctor-appointments', verifyAdmin, adminController.getDoctorAppointments);

/**
 * @swagger
 * /admin/api/doctor-appointments-by-date:
 *   get:
 *     summary: Get Doctor Appointments by Date
 *     description: Retrieves appointments for a specific doctor on a given date
 *     tags:
 *       - Admin
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: doctorId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Doctor ID to filter appointments
 *       - name: date
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to filter appointments (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Doctor appointments retrieved successfully
 */
router.get('/api/doctor-appointments-by-date', verifyAdmin, adminController.getDoctorAppointmentsByDate);

/**
 * @swagger
 * /admin/api/patient-analytics:
 *   get:
 *     summary: Get Patient Analytics
 *     description: Retrieves analytics data for patients including usage metrics
 *     tags:
 *       - Admin
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Patient analytics retrieved successfully
 */
router.get('/api/patient-analytics', verifyAdmin, adminController.getPatientAnalytics);

/**
 * @swagger
 * /admin/api/patient-appointments:
 *   get:
 *     summary: Get Patient Appointments
 *     description: Retrieves appointments data filtered by patient
 *     tags:
 *       - Admin
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: patientId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient ID to filter appointments
 *     responses:
 *       200:
 *         description: Patient appointments retrieved successfully
 */
router.get('/api/patient-appointments', verifyAdmin, adminController.getPatientAppointments);

/**
 * @swagger
 * /admin/api/patient-appointments-by-date:
 *   get:
 *     summary: Get Patient Appointments by Date
 *     description: Retrieves appointments for a specific patient on a given date
 *     tags:
 *       - Admin
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     parameters:
 *       - name: patientId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient ID to filter appointments
 *       - name: date
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to filter appointments (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Patient appointments retrieved successfully
 */
router.get('/api/patient-appointments-by-date', verifyAdmin, adminController.getPatientAppointmentsByDate);

module.exports = router;