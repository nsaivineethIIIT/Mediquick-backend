const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const Employee = require('../models/Employee');
const { uploadProfile, uploadDocument, uploadSignup } = require('../middlewares/upload');
const { verifyEmployee } = require('../middlewares/auth');
const asyncHandler = require('../middlewares/asyncHandler');

/**
 * @swagger
 * /employee/signup:
 *   post:
 *     summary: Employee Signup
 *     description: Registers a new employee with profile photo and document upload
 *     tags:
 *       - Employee
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
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               mobile:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *               document:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Employee registered successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/login:
 *   post:
 *     summary: Employee Login
 *     description: Authenticates employee and returns JWT token
 *     tags:
 *       - Employee
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
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/form:
 *   get:
 *     summary: Get Employee Registration Form
 *     description: Returns employee signup/login form page (HTML)
 *     tags:
 *       - Employee
 *       - Forms
 *     responses:
 *       200:
 *         description: Form page retrieved
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/logout:
 *   get:
 *     summary: Employee Logout
 *     description: Logs out employee and clears session
 *     tags:
 *       - Employee
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /employee/doctor_requests:
 *   get:
 *     summary: Get Doctor Requests Page
 *     description: Displays pending doctor registration requests (HTML)
 *     tags:
 *       - Employee
 *       - Doctor Management
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor requests page retrieved
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/doctor_requests_count:
 *   get:
 *     summary: Get Doctor Requests Count
 *     description: Returns total count of pending doctor requests
 *     tags:
 *       - Employee
 *       - Doctor Management
 *     responses:
 *       200:
 *         description: Count retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/api/doctor-requests:
 *   get:
 *     summary: Get Doctor Requests (API)
 *     description: Returns pending doctor registration requests as JSON with pagination
 *     tags:
 *       - Employee
 *       - Doctor Management
 *       - API
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
 *         description: Doctor requests retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/api/supplier-requests:
 *   get:
 *     summary: Get Supplier Requests (API)
 *     description: Returns pending supplier registration requests as JSON with pagination
 *     tags:
 *       - Employee
 *       - Supplier Management
 *       - API
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
 *         description: Supplier requests retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/api/approved-doctors:
 *   get:
 *     summary: Get Approved Doctors (API)
 *     description: Returns list of approved doctors
 *     tags:
 *       - Employee
 *       - Doctor Management
 *       - API
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Approved doctors list retrieved
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/api/rejected-doctors:
 *   get:
 *     summary: Get Rejected Doctors (API)
 *     description: Returns list of rejected doctors
 *     tags:
 *       - Employee
 *       - Doctor Management
 *       - API
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rejected doctors list retrieved
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/api/approved-suppliers:
 *   get:
 *     summary: Get Approved Suppliers (API)
 *     description: Returns list of approved suppliers
 *     tags:
 *       - Employee
 *       - Supplier Management
 *       - API
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Approved suppliers list retrieved
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/api/rejected-suppliers:
 *   get:
 *     summary: Get Rejected Suppliers (API)
 *     description: Returns list of rejected suppliers
 *     tags:
 *       - Employee
 *       - Supplier Management
 *       - API
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rejected suppliers list retrieved
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/approve_doctor/{id}:
 *   post:
 *     summary: Approve Doctor Registration
 *     description: Approves a pending doctor registration request by ID
 *     tags:
 *       - Employee
 *       - Doctor Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Doctor ID to approve
 *     responses:
 *       200:
 *         description: Doctor approved successfully
 *       400:
 *         description: Invalid doctor ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Doctor not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/reject_doctor/{id}:
 *   post:
 *     summary: Reject Doctor Registration
 *     description: Rejects a pending doctor registration request by ID
 *     tags:
 *       - Employee
 *       - Doctor Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Doctor ID to reject
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Doctor rejected successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Doctor not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/disapprove_doctor/{id}:
 *   post:
 *     summary: Disapprove Approved Doctor
 *     description: Revokes approval of a previously approved doctor
 *     tags:
 *       - Employee
 *       - Doctor Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Doctor disapproved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Doctor not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/unreject_doctor/{id}:
 *   post:
 *     summary: Unreject Rejected Doctor
 *     description: Reverses a rejection of a doctor registration
 *     tags:
 *       - Employee
 *       - Doctor Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Doctor unreject successful
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Doctor not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/approve_supplier/{id}:
 *   post:
 *     summary: Approve Supplier Registration
 *     description: Approves a pending supplier registration request by ID
 *     tags:
 *       - Employee
 *       - Supplier Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Supplier approved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Supplier not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/reject_supplier/{id}:
 *   post:
 *     summary: Reject Supplier Registration
 *     description: Rejects a pending supplier registration request by ID
 *     tags:
 *       - Employee
 *       - Supplier Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Supplier rejected successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Supplier not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/disapprove_supplier/{id}:
 *   post:
 *     summary: Disapprove Approved Supplier
 *     description: Revokes approval of a previously approved supplier
 *     tags:
 *       - Employee
 *       - Supplier Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Supplier disapproved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Supplier not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/unreject_supplier/{id}:
 *   post:
 *     summary: Unreject Rejected Supplier
 *     description: Reverses a rejection of a supplier registration
 *     tags:
 *       - Employee
 *       - Supplier Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Supplier unreject successful
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Supplier not found
 *       500:
 *         description: Internal server error
 */



/**
 * @swagger
 * /employee/profile-data:
 *   get:
 *     summary: Get Employee Profile Data
 *     description: Returns employee profile information as JSON
 *     tags:
 *       - Employee
 *       - Profile
 *       - API
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Employee profile data retrieved
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
 *                 mobile:
 *                   type: string
 *                 profilePhoto:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */



/**
 * @swagger
 * /employee/update-profile:
 *   post:
 *     summary: Update Employee Profile
 *     description: Updates employee profile information and optionally profile photo
 *     tags:
 *       - Employee
 *       - Profile
 *     security:
 *       - bearerAuth: []
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
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/api/reviews:
 *   get:
 *     summary: Get Appointments with Reviews
 *     description: Retrieves appointments along with patient reviews
 *     tags:
 *       - Employee
 *       - Reviews
 *       - API
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
 *         description: Reviews retrieved
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/api/reviews/{appointmentId}:
 *   delete:
 *     summary: Delete Review
 *     description: Deletes a review for a specific appointment
 *     tags:
 *       - Employee
 *       - Reviews
 *       - API
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: appointmentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Review not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /employee/profile/{id}:
 *   get:
 *     summary: Get Employee Profile by ID
 *     description: Retrieves a specific employee profile page (HTML)
 *     tags:
 *       - Employee
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee profile page retrieved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Internal server error
 */

// Configure multer to handle both profile photo and document with Cloudinary
// This uses uploadSignup from the upload middleware

router.post('/signup', uploadSignup.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'document', maxCount: 1 }
]), employeeController.signup);
router.post('/login', employeeController.login);
router.get('/dashboard', verifyEmployee, employeeController.getDashboard);
router.get('/form', employeeController.getForm);
router.get('/doctor_requests', verifyEmployee, employeeController.getDoctorRequests);
router.get('/logout', employeeController.logout);
router.get('/doctor_requests_count', employeeController.getDoctorRequestsCount);
router.get('/profile', verifyEmployee, employeeController.getProfile);
router.get('/edit-profile', verifyEmployee, employeeController.editProfile);
router.post('/update-profile', verifyEmployee, uploadProfile.single('profilePhoto'), employeeController.updateProfile);
router.post('/approve_doctor/:id', verifyEmployee, employeeController.postApproveDoctor);
router.post('/reject_doctor/:id', verifyEmployee, employeeController.postRejectDoctor);
router.get('/profile-data', verifyEmployee, employeeController.getProfileData);
router.get('/api/doctor-requests', verifyEmployee, employeeController.getDoctorRequestsAPI);
router.get('/api/supplier-requests', verifyEmployee, employeeController.getSupplierRequestsAPI);
router.get('/api/approved-doctors', verifyEmployee, employeeController.getApprovedDoctorsAPI);
router.get('/api/rejected-doctors', verifyEmployee, employeeController.getRejectedDoctorsAPI);
router.get('/api/approved-suppliers', verifyEmployee, employeeController.getApprovedSuppliersAPI);
router.get('/api/rejected-suppliers', verifyEmployee, employeeController.getRejectedSuppliersAPI);
router.post('/approve_supplier/:id', verifyEmployee, employeeController.postApproveSupplier);
router.post('/reject_supplier/:id', verifyEmployee, employeeController.postRejectSupplier);
router.post('/disapprove_doctor/:id', verifyEmployee, employeeController.postDisapproveDoctor);
router.post('/disapprove_supplier/:id', verifyEmployee, employeeController.postDisapproveSupplier);
router.post('/unreject_doctor/:id', verifyEmployee, employeeController.postUnrejectDoctor);
router.post('/unreject_supplier/:id', verifyEmployee, employeeController.postUnrejectSupplier);
router.get('/api/reviews', verifyEmployee, employeeController.getAppointmentsWithReviews);
router.delete('/api/reviews/:appointmentId', verifyEmployee, employeeController.deleteReview);
router.get('/api/document-url', verifyEmployee, employeeController.getDocumentURL);
router.get('/api/serve-document', employeeController.serveDocument);
router.get('/profile/:id', verifyEmployee, asyncHandler(async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id).lean();
        if (!employee) return res.status(404).send('Employee not found');
        res.render('employee_profile', { employee });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { error: 'Internal server error' });
    }
}));

module.exports = router;