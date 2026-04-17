const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');
const Supplier = require('../models/Supplier');
const Employee = require('../models/Employee');
const Appointment = require('../models/Appointment');
const Order = require('../models/Order');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Medicine = require('../models/Medicine');
const Cart = require('../models/Cart');
const { SUPPLIER_SECURITY_CODE } = require('../constants/constants');

const {checkEmailExists, checkMobileExists} = require('../utils/utils');
const { generateToken } = require('../middlewares/auth');
const asyncHandler = require('../middlewares/asyncHandler');

/**
 * @swagger
 * /supplier/signup:
 *   post:
 *     summary: Supplier Signup with Security Code
 *     description: Registers a new supplier with profile photo, document, and security code verification. Account requires employee approval before login
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
 *               - address
 *               - supplierID
 *               - password
 *               - securityCode
 *               - profilePhoto
 *               - document
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
 *               supplierID:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               securityCode:
 *                 type: string
 *               company:
 *                 type: string
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *               document:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Supplier account created (pending approval)
 *       400:
 *         description: Validation error or invalid security code
 *       500:
 *         description: Internal server error
 */

exports.signup = asyncHandler(async (req, res) => {
    
    const {
        name,
        email,
        mobile,
        address,
        supplierID,
        password,
        securityCode
    } = req.body;

    try {
        console.log('Supplier signup attempt:', { name, email, mobile, supplierID });

        // Normalize email to lowercase to avoid duplicates due to case
        const normalizedEmail = (email || '').toLowerCase();
        if (!name || !email || !mobile || !address || !supplierID || !password || !securityCode) {
            return res.status(400).json({
                error: 'All fields are required',
                details: 'Missing name, email, mobile, address, supplierID, password, or security code'
            });
        }

        if (securityCode !== SUPPLIER_SECURITY_CODE) {
            return res.status(400).json({
                error: 'Invalid security code',
                details: 'The provided security code is incorrect'
            });
        }
    const emailExists = await checkEmailExists(normalizedEmail);
        if (emailExists) {
            return res.status(400).json({
                error: 'Email already in use',
                details: 'This email is already registered with another account'
            });
        }

        // Check for existing mobile across all collections
        const mobileExists = await checkMobileExists(mobile);
        if (mobileExists) {
            return res.status(400).json({
                error: 'Mobile number already in use',
                details: 'This mobile number is already registered with another account'
            });
        }
        const existingSupplier = await Supplier.findOne({
            $or: [
                { email: normalizedEmail },
                { supplierID }
            ]
        });

        if (existingSupplier) {
            return res.status(400).json({
                error: 'Supplier with same email or supplier ID already exists',
                details: 'Email or supplier ID must be unique'
            });
        }

        // Require profile photo upload
        if (!req.files || !req.files.profilePhoto) {
            return res.status(400).json({
                error: 'Profile photo is required',
                details: 'Please upload a profile photo to continue'
            });
        }
        
        // Require document upload
        if (!req.files || !req.files.document) {
            return res.status(400).json({
                error: 'Document is required',
                details: 'Please upload a verification document to continue'
            });
        }
        
        // Use the actual uploaded file paths
        const profilePhotoFile = req.files.profilePhoto[0];
        const documentFile = req.files.document[0];
        
        const profilePhoto = `/uploads/profiles/${profilePhotoFile.filename}`;
        const documentPath = `/uploads/documents/${documentFile.filename}`;

        // Hash password with bcrypt before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newSupplier = new Supplier({
            name,
            email: normalizedEmail,
            mobile,
            address,
            supplierID,
            password: hashedPassword,
            profilePhoto,
            documentPath
        });

        await newSupplier.save();

        res.status(201).json({
            message: 'Signup successful',
            redirect: '/supplier/form'
        });
    } catch (err) {
        console.error("Error during supplier signup:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

/**
 * @swagger
 * /supplier/login:
 *   post:
 *     summary: Supplier Login with Security Code
 *     description: Authenticates supplier with email, password and security code, returns JWT token. Supplier must be approved by admin
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *       400:
 *         description: Missing fields or invalid security code
 *       401:
 *         description: Invalid credentials or not approved
 *       500:
 *         description: Internal server error
 */

exports.login =  asyncHandler(async (req, res) => {
  
    const { email, password, securityCode } = req.body;

    try {
        console.log('Supplier login attempt:', { email, hasPassword: !!password });

        if (!email || !password || !securityCode) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (securityCode !== SUPPLIER_SECURITY_CODE) {
            return res.status(400).json({ error: 'Invalid security code' });
        }

        // Normalize email when searching to avoid issues with capital letters
        const normalizedEmail = (email || '').toLowerCase();

        const supplier = await Supplier.findOne({ email: normalizedEmail });

        if (!supplier) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Handle both bcrypt-hashed and plaintext passwords (lazy migration)
        let passwordMatch = false;
        
        if (supplier.password && supplier.password.startsWith('$2')) {
            // Password is bcrypt-hashed — use bcrypt.compare
            passwordMatch = await bcrypt.compare(password, supplier.password);
        } else {
            // Password is plaintext — verify and then migrate to bcrypt
            if (password === supplier.password) {
                passwordMatch = true;
                // Migrate on successful login
                const salt = await bcrypt.genSalt(10);
                supplier.password = await bcrypt.hash(password, salt);
                console.log('Supplier password migrated to bcrypt on login:', normalizedEmail);
            }
        }

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Check if supplier is approved
        if (!supplier.isApproved) {
            return res.status(403).json({
                error: 'Account not approved',
                details: 'Your account is pending approval by an employee. Please wait for approval before logging in.'
            });
        }
        
        // Update lastLogin
        supplier.lastLogin = new Date();
        await supplier.save();
        
        // Generate JWT token
        const token = generateToken(supplier._id.toString(), 'supplier');
        
        res.status(200).json({
            message: 'Login successful',
            token,
            redirect: '/supplier/dashboard'
        });
    } catch (err) {
        console.error("Error during supplier login:", err);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? (err.message || String(err)) : undefined
        });
    }
});

exports.getProfile = asyncHandler(async (req, res) => {
    try {
        if (!req.supplierId) {
            return res.redirect('/supplier/form?error=login_required');
        }

        if (!mongoose.Types.ObjectId.isValid(req.supplierId)) {
            return res.status(400).render('error', {
                message: 'Invalid session data',
                redirect: '/supplier/form'
            });
        }

        const supplier = await Supplier.findById(req.supplierId)
            .select('name email mobile address supplierID profilePhoto')
            .lean();

        if (!supplier) {
            return res.status(404).render('error', {
                message: 'Supplier not found',
                redirect: '/supplier/form'
            });
        }

        if (!supplier.profilePhoto) {
            supplier.profilePhoto = '/images/default-supplier.svg';
        }

        res.render('supplier_profile', {
            title: 'Supplier Profile',
            supplier
        });
    } catch (err) {
        console.error("Error rendering supplier profile:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/supplier/form'
        });
    }
});

// New API endpoint to fetch supplier profile data
exports.getProfileData = asyncHandler(async (req, res) => {
    try {
        console.log('Supplier ID:', req.supplierId);
        
        if (!req.supplierId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(req.supplierId)) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid session data' 
            });
        }

        const supplier = await Supplier.findById(req.supplierId)
            .select('name email mobile address supplierID profilePhoto')
            .lean();

        if (!supplier) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Supplier not found'
            });
        }

        const profileData = {
            success: true,
            supplier: {
                _id: supplier._id,
                name: supplier.name,
                email: supplier.email,
                mobile: supplier.mobile,
                address: supplier.address,
                supplierID: supplier.supplierID,
                profilePhoto: supplier.profilePhoto || '/images/default-supplier.png'
            },
            previousOrders: [
                {
                    orderId: "ORD-1001",
                    orderDate: "10th Jan 2025",
                    status: "Delivered"
                },
                {
                    orderId: "ORD-1002",
                    orderDate: "15th Feb 2025",
                    status: "Cancelled"
                }
            ],
            pendingOrders: [
                {
                    orderId: "ORD-1003",
                    orderDate: "5th Mar 2025"
                }
            ]
        };

        res.status(200).json(profileData);
    } catch (err) {
        console.error("Error fetching supplier profile data:", err.message);
        res.status(500).json({
            success: false,
            error: 'Server Error',
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// exports.getProfile = asyncHandler(async (req, res) => {
//     try {
//         if (!req.session.supplierId) {
//             return res.redirect('/supplier/form?error=login_required');
//         }

//         if (!mongoose.Types.ObjectId.isValid(req.session.supplierId)) {
//             return res.status(400).render('error', {
//                 message: 'Invalid session data',
//                 redirect: '/supplier/form'
//             });
//         }

//         const supplier = await Supplier.findById(req.session.supplierId).lean();

//         if (!supplier) {
//             return res.status(404).render('error', {
//                 message: 'Supplier not found',
//                 redirect: '/supplier/form'
//             });
//         }

//         supplier.previousOrders = [
//             {
//                 orderId: "ORD-1001",
//                 orderDate: "10th Jan 2025",
//                 status: "Delivered"
//             },
//             {
//                 orderId: "ORD-1002",
//                 orderDate: "15th Feb 2025",
//                 status: "Cancelled"
//             }
//         ];

//         supplier.pendingOrders = [
//             {
//                 orderId: "ORD-1003",
//                 orderDate: "5th Mar 2025"
//             }
//         ];

//         res.render('supplier_profile', {
//             supplier,
//             title: 'Supplier Profile'
//         });
//     } catch (err) {
//         console.error("Error fetching supplier profile:", err.message);
//         res.status(500).render('error', {
//             message: 'Internal server error',
//             details: process.env.NODE_ENV === 'development' ? err.message : undefined,
//             redirect: '/supplier/form'
//         });
//     }
// });

exports.editProfile = asyncHandler(async (req, res) => {
    try {
        if (!req.supplierId) {
            return res.redirect('/supplier/form?error=login_required');
        }

        if (!mongoose.Types.ObjectId.isValid(req.supplierId)) {
            return res.status(400).render('error', {
                message: 'Invalid session data',
                redirect: '/supplier/form'
            });
        }

        const supplier = await Supplier.findById(req.supplierId)
            .select('name email mobile address supplierID')
            .lean();

        if (!supplier) {
            return res.status(404).render('error', {
                message: 'Supplier not found',
                redirect: '/supplier/form'
            });
        }

        res.render('supplier_edit_profile', {
            supplier,
            title: 'Edit Supplier Profile'
        });
    } catch (err) {
        console.error("Error fetching supplier data:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/supplier/form'
        });
    }
});

exports.updateProfile = asyncHandler(async (req, res) => {
    try {
        if (!req.supplierId) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(req.supplierId)) {
            return res.status(400).json({ error: 'Invalid session data' });
        }

        const { name, email, mobile, address, supplierID } = req.body;

        if (!name || !email || !mobile || !address || !supplierID) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'All fields are required'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid email format'
            });
        }

        const mobileRegex = /^\d{10}$/;
        if (!mobileRegex.test(mobile)) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Mobile number must be 10 digits'
            });
        }

        const ifemailExists = await checkEmailExists(email, req.supplierId);
        if (ifemailExists) {
            return res.status(400).json({
                error: 'Duplicate Data',
                message: 'Email already in use by another user'
            });
        }

        const ifmobileExists = await checkMobileExists(mobile, req.supplierId);
        if (ifmobileExists) {
            return res.status(400).json({
                error: 'Duplicate Data',
                message: 'Mobile number already in use by another user'
            });
        }

        const emailExists = await Supplier.findOne({
            email,
            _id: { $ne: req.supplierId }
        });
        if (emailExists) {
            return res.status(400).json({
                error: 'Duplicate Data',
                message: 'Email already in use by another supplier'
            });
        }

        const mobileExists = await Supplier.findOne({
            mobile,
            _id: { $ne: req.supplierId }
        });
        if (mobileExists) {
            return res.status(400).json({
                error: 'Duplicate Data',
                message: 'Mobile number already in use by another supplier'
            });
        }

        const supplierIDExists = await Supplier.findOne({
            supplierID,
            _id: { $ne: req.supplierId }
        });
        if (supplierIDExists) {
            return res.status(400).json({
                error: 'Duplicate Data',
                message: 'Supplier ID already in use by another supplier'
            });
        }

        // Handle profile photo upload
        let updateData = { name, email, mobile, address, supplierID };
        if (req.file) {
            updateData.profilePhoto = `/uploads/profiles/${req.file.filename}`;
        }

        const updatedSupplier = await Supplier.findByIdAndUpdate(
            req.supplierId,
            updateData,
            { new: true, runValidators: true }
        ).select('name email mobile address supplierID profilePhoto');

        if (!updatedSupplier) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Supplier not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            supplier: updatedSupplier,
            redirect: '/supplier/profile'
        });
    } catch (err) {
        console.error("Error updating supplier profile:", err.message);
        res.status(500).json({
            error: 'Server Error',
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// exports.getOrders = asyncHandler(async (req, res) => {
//     try {
//         if (!req.session.supplierId) {
//             return res.status(401).json({ error: 'Unauthorized' });
//         }

//         const orders = await Order.find({ supplierId: req.session.supplierId })
//             .populate('medicineId', 'name medicineID')
//             .populate('patientId', 'name email')
//             .sort({ createdAt: -1 })
//             .lean();

//         res.json(orders.map(order => ({
//             id: order._id,
//             medicine: order.medicineId.name,
//             medicineId: order.medicineId.medicineID,
//             patient: order.patientId.name,
//             quantity: order.quantity,
//             totalCost: order.totalCost,
//             status: order.status,
//             orderDate: order.createdAt.toLocaleDateString()
//         })));
//     } catch (err) {
//         console.error("Error fetching supplier orders:", err.message);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

exports.getOrders = asyncHandler(async (req, res) => {
    try {
        if (!req.supplierId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        console.log('Fetching orders for supplier:', req.supplierId);

        // Auto-confirm any pending orders for this supplier that have payment methods
        const updateResult = await Order.updateMany(
            { 
                supplierId: req.supplierId,
                status: 'pending', 
                paymentMethod: { $exists: true, $ne: null } 
            },
            { $set: { status: 'confirmed' } }
        );
        
        if (updateResult.modifiedCount > 0) {
            console.log(`Auto-confirmed ${updateResult.modifiedCount} paid orders for supplier`);
        }

        const orders = await Order.find({ supplierId: req.supplierId })
            .populate('medicineId', 'name medicineID')
            .populate('patientId', 'name email mobile')
            .sort({ createdAt: -1 })
            .lean();

        console.log('Found orders:', orders.length);

        // Also get cart items as pending orders
        const allMedicines = await Medicine.find({ supplierId: req.supplierId });
        const medicineIds = allMedicines.map(m => m._id);
        
        const cartItems = await Cart.aggregate([
            { $unwind: '$items' },
            { $match: { 'items.medicineId': { $in: medicineIds } } },
            {
                $lookup: {
                    from: 'medicines',
                    localField: 'items.medicineId',
                    foreignField: '_id',
                    as: 'medicineInfo'
                }
            },
            {
                $lookup: {
                    from: 'patients',
                    localField: 'patientId',
                    foreignField: '_id',
                    as: 'patientInfo'
                }
            }
        ]);

        const pendingOrders = cartItems.map(item => ({
            id: `cart-${item._id}-${item.items.medicineId}`,
            medicine: item.medicineInfo[0]?.name || 'Unknown Medicine',
            medicineId: item.medicineInfo[0]?.medicineID || 'N/A',
            patient: item.patientInfo[0]?.name || 'Unknown Patient',
            quantity: item.items.quantity,
            totalCost: (item.medicineInfo[0]?.cost || 0) * item.items.quantity,
            status: 'in_cart',
            orderDate: 'Pending Order'
        }));

        const formattedOrders = orders.map(order => ({
            id: order._id,
            medicine: order.medicineId?.name || 'Unknown Medicine',
            medicineId: order.medicineId?.medicineID || 'N/A',
            patient: order.patientId?.name || 'Unknown Patient',
            patientEmail: order.patientId?.email,
            patientMobile: order.patientId?.mobile,
            quantity: order.quantity,
            totalCost: order.totalCost,
            status: order.status,
            orderDate: order.createdAt.toLocaleDateString(),
            deliveryAddress: order.deliveryAddress,
            paymentMethod: order.paymentMethod,
            deliveryCharge: order.deliveryCharge,
            finalAmount: order.finalAmount
        }));

        // Combine both actual orders and cart items
        const allOrders = [...formattedOrders, ...pendingOrders];

        res.json(allOrders);
    } catch (err) {
        console.error("Error fetching supplier orders:", err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

exports.getDashboard = asyncHandler(async (req, res) => {
    try {
        if (!req.supplierId) {
            return res.redirect('/supplier/form?error=login_required');
        }

        if (!mongoose.Types.ObjectId.isValid(req.supplierId)) {
            return res.status(400).render('error', {
                message: 'Invalid session data',
                redirect: '/supplier/form'
            });
        }

        const supplier = await Supplier.findById(req.supplierId).select('email password').lean();

        if (!supplier) {
            return res.status(404).render('error', {
                message: 'Supplier not found',
                redirect: '/supplier/form'
            });
        }

        console.log(`Login Details for Supplier - Email: ${supplier.email}, Password: ${supplier.password}`);

        res.render('supplier_dashboard');
    } catch (err) {
        console.error("Error accessing supplier dashboard:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/supplier/form'
        });
    }
});

exports.getForm = (req, res) => {
    res.render('supplier_form');
};

exports.postAddMedicine = asyncHandler(async (req, res) => {
    if (!req.supplierId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, medicineID, quantity, cost, manufacturer, expiryDate } = req.body;

    try {
        if (!name || !medicineID || !quantity || !cost || !manufacturer || !expiryDate) {
            return res.status(400).json({
                error: 'All fields are required',
                details: 'Missing required fields'
            });
        }

        // Validate quantity and cost
        if (quantity < 0 || cost < 0) {
            return res.status(400).json({
                error: 'Invalid input',
                details: 'Quantity and cost cannot be negative'
            });
        }

        // Check for existing medicineID
        const existingMedicine = await Medicine.findOne({ medicineID });
        if (existingMedicine) {
            return res.status(400).json({
                error: 'Medicine ID already exists',
                details: 'A medicine with this ID already exists'
            });
        }

        const newMedicine = new Medicine({
            name: name.trim(),
            medicineID: medicineID.trim(),
            quantity: parseInt(quantity),
            cost: parseFloat(cost),
            manufacturer: manufacturer.trim(),
            expiryDate: new Date(expiryDate),
            image: req.file ? '/uploads/medicines/' + req.file.filename : null,
            supplierId: req.supplierId
        });

        await newMedicine.save();
        res.status(201).json({
            message: 'Medicine added successfully',
            medicine: newMedicine
        });
    } catch (err) {
        console.error("Error adding medicine:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// exports.getMedicines = asyncHandler(async (req, res) => {
//     if (!req.session.supplierId) {
//         return res.status(401).json({ error: 'Unauthorized' });
//     }

//     try {
//         const medicines = await Medicine.find({ supplierId: req.session.supplierId })
//             .sort({ createdAt: -1 })
//             .lean();

//         const formattedMedicines = medicines.map(med => ({
//             id: med._id,
//             name: med.name,
//             medicineID: med.medicineID,
//             quantity: med.quantity,
//             cost: med.cost.toFixed(2),
//             manufacturer: med.manufacturer,
//             expiryDate: new Date(med.expiryDate).toLocaleDateString('en-US')
//         }));

//         res.json(formattedMedicines);
//     } catch (err) {
//         console.error("Error fetching medicines:", err.message);
//         res.status(500).json({
//             error: 'Internal server error',
//             details: process.env.NODE_ENV === 'development' ? err.message : undefined
//         });
//     }
// });

exports.getMedicines = asyncHandler(async (req, res) => {
    if (!req.supplierId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('Fetching medicines for supplier:', req.supplierId);
        
        const medicines = await Medicine.find({ supplierId: req.supplierId })
            .sort({ createdAt: -1 })
            .lean();

        console.log('Found medicines:', medicines.length);

        const formattedMedicines = medicines.map(med => ({
            id: med._id,
            name: med.name,
            medicineID: med.medicineID,
            quantity: med.quantity,
            cost: med.cost.toFixed(2),
            manufacturer: med.manufacturer,
            expiryDate: new Date(med.expiryDate).toLocaleDateString('en-US')
        }));

        res.json(formattedMedicines);
    } catch (err) {
        console.error("Error fetching medicines:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.deleteMedicine = asyncHandler(async (req, res) => {
    if (!req.supplierId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid medicine ID' });
        }

        const result = await Medicine.deleteOne({
            _id: id,
            supplierId: req.supplierId
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Medicine not found or unauthorized' });
        }

        res.json({ message: 'Medicine removed successfully' });
    } catch (err) {
        console.error("Error removing medicine:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// New function to get order details
exports.getOrderDetails = asyncHandler(async (req, res) => {
    try {
        if (!req.supplierId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { orderId } = req.params;

        // Check if it's a cart item or actual order
        if (orderId.startsWith('cart-')) {
            // Handle cart item details
            const parts = orderId.split('-');
            const cartId = parts[1];
            const medicineId = parts[2];

            const cart = await Cart.findById(cartId)
                .populate('patientId', 'name email mobile address')
                .populate('items.medicineId');

            if (!cart) {
                return res.status(404).json({ error: 'Cart item not found' });
            }

            const cartItem = cart.items.find(item => item.medicineId._id.toString() === medicineId);

            if (!cartItem) {
                return res.status(404).json({ error: 'Cart item not found' });
            }

            const orderDetails = {
                type: 'cart_item',
                medicine: cartItem.medicineId,
                patient: cart.patientId,
                quantity: cartItem.quantity,
                totalCost: cartItem.medicineId.cost * cartItem.quantity,
                status: 'in_cart',
                createdAt: cart.createdAt
            };

            res.json(orderDetails);
        } else {
            // Handle actual order
            const order = await Order.findById(orderId)
                .populate('medicineId')
                .populate('patientId', 'name email mobile address')
                .populate('supplierId');

            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            if (order.supplierId._id.toString() !== req.supplierId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            res.json(order);
        }
    } catch (err) {
        console.error("Error fetching order details:", err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update order status
exports.updateOrderStatus = asyncHandler(async (req, res) => {
    try {
        if (!req.supplierId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { orderId } = req.params;
        const { status } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.supplierId.toString() !== req.supplierId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        order.status = status;
        await order.save();

        res.json({ success: true, message: 'Order status updated successfully' });
    } catch (err) {
        console.error("Error updating order status:", err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});