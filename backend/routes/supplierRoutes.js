const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const Supplier = require('../models/Supplier');
const { uploadProfile, uploadMedicine, uploadDocument, uploadSignup } = require('../middlewares/upload');
const { verifySupplier } = require('../middlewares/auth');
const asyncHandler = require('../middlewares/asyncHandler');

/**
 * @swagger
 * /supplier/signup:
 *   post:
 *     summary: Supplier Signup
 *     description: Registers a new supplier with profile photo and document upload
 *     tags:
 *       - Supplier
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
 *               - document
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
 *               company:
 *                 type: string
 *               address:
 *                 type: string
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: License/certificate document
 *     responses:
 *       201:
 *         description: Supplier registered successfully (pending approval)
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /supplier/login:
 *   post:
 *     summary: Supplier Login
 *     description: Authenticates supplier and returns JWT token (must be approved)
 *     tags:
 *       - Supplier
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
 *         description: Invalid credentials or not approved
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /supplier/form:
 *   get:
 *     summary: Get Supplier Registration Form
 *     description: Returns supplier signup/login form page (HTML)
 *     tags:
 *       - Supplier
 *       - Forms
 *     responses:
 *       200:
 *         description: Form page retrieved
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /supplier/dashboard:
 *   get:
 *     summary: Get Supplier Dashboard
 *     description: Retrieves supplier dashboard with inventory and order metrics
 *     tags:
 *       - Supplier
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard page retrieved
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */


/**
 * @swagger
 * /supplier/profile-data:
 *   get:
 *     summary: Get Supplier Profile Data
 *     description: Returns supplier profile information as JSON
 *     tags:
 *       - Supplier
 *       - Profile
 *       - API
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Supplier profile data retrieved
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
 *                 supplierID:
 *                   type: string
 *                 address:
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
 * /supplier/update-profile:
 *   post:
 *     summary: Update Supplier Profile
 *     description: Updates supplier profile information and optionally profile photo
 *     tags:
 *       - Supplier
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
 *               supplierID:
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
 * /supplier/api/add-medicine:
 *   post:
 *     summary: Add Medicine to Inventory
 *     description: Adds a new medicine to supplier inventory with image
 *     tags:
 *       - Supplier
 *       - Medicines
 *       - Inventory
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
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *                 format: float
 *               quantity:
 *                 type: integer
 *               category:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Medicine added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /supplier/api/medicines:
 *   get:
 *     summary: Get Supplier Medicines
 *     description: Retrieves all medicines in supplier inventory with pagination
 *     tags:
 *       - Supplier
 *       - Medicines
 *       - Inventory
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
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Search by medicine name
 *     responses:
 *       200:
 *         description: Medicines retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 medicines:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       price:
 *                         type: number
 *                       quantity:
 *                         type: integer
 *                 total:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /supplier/api/medicines/{id}:
 *   delete:
 *     summary: Delete Medicine from Inventory
 *     description: Removes a medicine from supplier inventory
 *     tags:
 *       - Supplier
 *       - Medicines
 *       - Inventory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Medicine ID
 *     responses:
 *       200:
 *         description: Medicine deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Medicine not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /supplier/api/orders:
 *   get:
 *     summary: Get Supplier Orders
 *     description: Retrieves all orders placed to this supplier with pagination and filtering
 *     tags:
 *       - Supplier
 *       - Orders
 *       - API
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, shipped, delivered, cancelled]
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
 *         description: Orders retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       orderId:
 *                         type: string
 *                       status:
 *                         type: string
 *                       total:
 *                         type: number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /supplier/api/orders/{orderId}:
 *   get:
 *     summary: Get Order Details
 *     description: Retrieves detailed information about a specific order
 *     tags:
 *       - Supplier
 *       - Orders
 *       - API
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orderId:
 *                   type: string
 *                 items:
 *                   type: array
 *                 status:
 *                   type: string
 *                 total:
 *                   type: number
 *                 createdAt:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /supplier/api/orders/{orderId}/status:
 *   put:
 *     summary: Update Order Status
 *     description: Updates the status of an order (e.g., pending -> shipped)
 *     tags:
 *       - Supplier
 *       - Orders
 *       - API
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: orderId
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, shipped, delivered, cancelled]
 *               notes:
 *                 type: string
 *                 description: Optional notes about the status update
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /supplier/orders/{orderId}:
 *   get:
 *     summary: Get Order Details Page
 *     description: Retrieves order details page (HTML) for a specific order
 *     tags:
 *       - Supplier
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details page retrieved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /supplier/profile/{id}:
 *   get:
 *     summary: Get Supplier Profile by ID
 *     description: Retrieves a specific supplier profile page (HTML)
 *     tags:
 *       - Supplier
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
 *         description: Supplier profile page retrieved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Supplier not found
 *       500:
 *         description: Internal server error
 */

// Configure multer to handle both profile photo and document with Cloudinary
// This uses uploadSignup from the upload middleware

router.get('/dashboard', verifySupplier, supplierController.getDashboard);
router.get('/form', supplierController.getForm);
router.post('/signup', uploadSignup.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'document', maxCount: 1 }
]), supplierController.signup);
router.post('/login', supplierController.login);
router.get('/profile', verifySupplier, supplierController.getProfile);
router.get('/edit-profile', verifySupplier, supplierController.editProfile);
router.post('/update-profile', verifySupplier, uploadProfile.single('profilePhoto'), supplierController.updateProfile);
router.get('/profile-data', verifySupplier, supplierController.getProfileData);

// Medicines
router.post('/api/add-medicine', verifySupplier, uploadMedicine.single('image'), supplierController.postAddMedicine);
router.get('/api/medicines', verifySupplier, supplierController.getMedicines);
router.delete('/api/medicines/:id', verifySupplier, supplierController.deleteMedicine);

// Orders (only routes with existing handlers)
router.get('/api/orders', verifySupplier, supplierController.getOrders);
router.get('/api/orders/:orderId', verifySupplier, supplierController.getOrderDetails);
router.put('/api/orders/:orderId/status', verifySupplier, supplierController.updateOrderStatus);

router.get('/orders/:orderId', verifySupplier, (req, res) => {
    res.render('supplier_order_details', { title: 'Order Details' });
});

// Profile routes
router.get('/profile/:id', verifySupplier, asyncHandler(async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id).lean();
        if (!supplier) return res.status(404).send('supplier not found');
        res.render('supplier_profile', { supplier });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { error: 'Internal server error' });
    }
}));

module.exports = router;