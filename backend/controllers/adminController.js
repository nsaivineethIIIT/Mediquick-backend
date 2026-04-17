const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');
const Supplier = require('../models/Supplier');
const Employee = require('../models/Employee');
const Appointment = require('../models/Appointment');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const bcrypt = require('bcryptjs');
const {checkEmailExists, checkMobileExists} = require('../utils/utils');
const { ADMIN_SECURITY_CODE } = require('../constants/constants');
const mongoose = require('mongoose');
const { generateToken } = require('../middlewares/auth');
const asyncHandler = require('../middlewares/asyncHandler');
const solrClient = require('../utils/solrClient');
const doctorSolrClient = require('../utils/doctorSolrClient');

/**
 * @swagger
 * /admin/signup:
 *   post:
 *     summary: Register new admin user
 *     description: Creates a new admin account with validation
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
 *         description: Admin created successfully
 *       400:
 *         description: Validation failed or duplicate entry
 */
exports.signup = asyncHandler(async (req, res) => {
    const { name, email, mobile, address, password, securityCode } = req.body;

    try {
        if (!name || !email || !mobile || !address || !password || !securityCode) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (securityCode !== ADMIN_SECURITY_CODE) {
            return res.status(400).json({ error: 'Invalid security code' });
        }
        const emailExists = await checkEmailExists(email);
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

        const existingAdmin = await Admin.findOne({ email });

        if (existingAdmin) {
            return res.status(400).json({ error: 'Admin with this email already exists' });
        }

        // Hash password with bcrypt before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newAdmin = new Admin({ name, email, mobile, address, password: hashedPassword });
        await newAdmin.save();

        res.status(201).json({
            message: 'Signup successful',
            redirect: '/admin/form'
        });
    } catch (err) {
        console.error("Error during admin signup:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

/**
 * @swagger
 * /admin/login:
 *   post:
 *     summary: Authenticate admin user
 *     description: Logs in an admin user and returns JWT token
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
 *         description: Login successful, JWT token returned
 *       400:
 *         description: Missing fields or invalid security code
 *       401:
 *         description: Invalid credentials
 */
exports.login = asyncHandler(async (req, res) => {
    const { email, password, securityCode } = req.body;

    try {
        if (!email || !password || !securityCode) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (securityCode !== ADMIN_SECURITY_CODE) {
            return res.status(400).json({ error: 'Invalid security code' });
        }

        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Handle both bcrypt-hashed and plaintext passwords (lazy migration)
        let passwordMatch = false;
        
        if (admin.password && admin.password.startsWith('$2')) {
            // Password is bcrypt-hashed — use bcrypt.compare
            passwordMatch = await bcrypt.compare(password, admin.password);
        } else {
            // Password is plaintext — verify and then migrate to bcrypt
            if (password === admin.password) {
                passwordMatch = true;
                // Migrate on successful login
                const salt = await bcrypt.genSalt(10);
                admin.password = await bcrypt.hash(password, salt);
                console.log('Admin password migrated to bcrypt on login:', email);
            }
        }

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update lastLogin
        admin.lastLogin = new Date();
        await admin.save();
        
        // Generate JWT token
        const token = generateToken(admin._id.toString(), 'admin');
        
        res.status(200).json({
            message: 'Login successful',
            token,
            redirect: '/admin/dashboard'
        });
    } catch (err) {
        console.error("Error during admin login:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// exports.getProfile =  asyncHandler(async (req, res) => {
//     try {
//         if (!req.session.adminId) {
//             return res.redirect('/admin_form?error=login_required');
//         }

//         if (!mongoose.Types.ObjectId.isValid(req.session.adminId)) {
//             return res.status(400).render('error', {
//                 message: 'Invalid session data',
//                 redirect: '/admin_form'
//             });
//         }

//         const admin = await Admin.findById(req.session.adminId).lean();

//         if (!admin) {
//             return res.status(404).render('error', {
//                 message: 'Admin not found',
//                 redirect: '/admin_form'
//             });
//         }

//         admin.completedConsultations = [
//             {
//                 doctorName: "Dr. John",
//                 consultationDate: "10th May 2025",
//                 slot: "10AM - 11AM",
//                 onlineStatus: "Online"
//             },
//             {
//                 doctorName: "Dr. Smith",
//                 consultationDate: "12th May 2025",
//                 slot: "2PM - 3PM",
//                 onlineStatus: "Offline"
//             }
//         ];

//         admin.pendingConsultations = [
//             {
//                 doctorName: "Dr. Alice",
//                 consultationDate: "15th May 2025",
//                 slot: "11AM - 12PM",
//                 onlineStatus: "Online"
//             }
//         ];

//         res.render('admin_profile', {
//             admin,
//             title: 'Admin Profile'
//         });
//     } catch (err) {
//         console.error("Error fetching admin profile:", err.message);
//         res.status(500).render('error', {
//             message: 'Internal server error',
//             details: process.env.NODE_ENV === 'development' ? err.message : undefined,
//             redirect: '/'
//         });
//     }
// });

exports.getProfile = asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.redirect('/admin/form?error=login_required');
        }

        // Just render the template without data - data will be fetched via API
        res.render('admin_profile', {
            title: 'Admin Profile'
        });
    } catch (err) {
        console.error("Error rendering admin profile:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/admin/form'
        });
    }
});

// New API endpoint to fetch admin profile data
exports.getProfileData = asyncHandler(async (req, res) => {
    try {
        console.log('Admin ID:', req.adminId); // Debug log
        
        if (!req.adminId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(req.adminId)) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid session data' 
            });
        }

        const admin = await Admin.findById(req.adminId).lean();

        if (!admin) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Admin not found'
            });
        }

        // Add mock data for consultations (replace with actual data from your database)
        const profileData = {
            success: true,
            admin: {
                name: admin.name,
                email: admin.email,
                mobile: admin.mobile,
                address: admin.address
            },
            completedConsultations: [
                {
                    doctorName: "Dr. John",
                    consultationDate: "10th May 2025",
                    slot: "10AM - 11AM",
                    onlineStatus: "Online"
                },
                {
                    doctorName: "Dr. Smith",
                    consultationDate: "12th May 2025",
                    slot: "2PM - 3PM",
                    onlineStatus: "Offline"
                }
            ],
            pendingConsultations: [
                {
                    doctorName: "Dr. Alice",
                    consultationDate: "15th May 2025",
                    slot: "11AM - 12PM",
                    onlineStatus: "Online"
                }
            ]
        };

        res.status(200).json(profileData);
    } catch (err) {
        console.error("Error fetching admin profile data:", err.message);
        res.status(500).json({
            success: false,
            error: 'Server Error',
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getEditProfile = asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.redirect('/admin_form?error=login_required');
        }

        if (!mongoose.Types.ObjectId.isValid(req.adminId)) {
            return res.status(400).render('error', {
                message: 'Invalid session data',
                redirect: '/admin_form'
            });
        }

        const admin = await Admin.findById(req.adminId)
            .select('name email mobile address')
            .lean();

        if (!admin) {
            return res.status(404).render('error', {
                message: 'Admin not found',
                redirect: '/admin_form'
            });
        }

        res.render('admin_edit_profile', {
            admin,
            title: 'Edit Admin Profile'
        });
    } catch (err) {
        console.error("Error fetching admin data:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/'
        });
    }
});

// exports.updateProfile = asyncHandler(async (req, res) => {
//     try {
//         if (!req.session.adminId) {
//             return res.status(401).json({ error: 'Unauthorized: Please log in first' });
//         }

//         if (!mongoose.Types.ObjectId.isValid(req.session.adminId)) {
//             return res.status(400).json({ error: 'Invalid session data' });
//         }

//         const { name, email, mobile, address } = req.body;

//         if (!name || !email || !mobile || !address) {
//             return res.status(400).json({ error: 'All fields are required' });
//         }

//         const emailExists = await Admin.findOne({ email, _id: { $ne: req.session.adminId } });
//         if (emailExists) {
//             return res.status(400).json({ error: 'Email already in use' });
//         }

//         const mobileExists = await Admin.findOne({ mobile, _id: { $ne: req.session.adminId } });
//         if (mobileExists) {
//             return res.status(400).json({ error: 'Mobile number already in use' });
//         }

//         await Admin.findByIdAndUpdate(
//             req.session.adminId,
//             { name, email, mobile, address },
//             { new: true }
//         );

//         res.redirect('/admin/profile');
//     } catch (err) {
//         console.error("Error updating admin profile:", err.message);
//         res.status(500).json({
//             error: 'Internal server error',
//             details: process.env.NODE_ENV === 'development' ? err.message : undefined
//         });
//     }
// });

exports.updateProfile = asyncHandler(async (req, res) => {
  try {
    if (!req.adminId) {
      return res.status(401).json({ error: 'Unauthorized: Please log in first' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.adminId)) {
      return res.status(400).json({ error: 'Invalid session data' });
    }

    const { name, email, mobile, address } = req.body;

    if (!name || !email || !mobile || !address) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if email already exists in other admin accounts
    const emailExists = await Admin.findOne({ 
      email, 
      _id: { $ne: req.adminId } 
    });
    if (emailExists) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Check if mobile already exists in other admin accounts
    const mobileExists = await Admin.findOne({ 
      mobile, 
      _id: { $ne: req.adminId } 
    });
    if (mobileExists) {
      return res.status(400).json({ error: 'Mobile number already in use' });
    }

    // Update the admin profile
    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.adminId,
      { name, email, mobile, address },
      { new: true, runValidators: true }
    );

    if (!updatedAdmin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Return JSON response for React frontend
    res.status(200).json({ 
      success: true,
      message: 'Profile updated successfully',
      admin: {
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        mobile: updatedAdmin.mobile,
        address: updatedAdmin.address
      }
    });
  } catch (err) {
    console.error("Error updating admin profile:", err.message);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

exports.getSignins = asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.status(401).json({ error: 'Unauthorized: Please log in as admin' });
        }

        // Try cache first
        const cacheKey = 'admin:signins:data';
        const cachedSignins = await getCache(cacheKey);
        if (cachedSignins) {
            console.log('✅ Admin signins from Redis');
            return res.json(cachedSignins);
        }

        console.log('❌ Admin signins from DB');
        const patients = await Patient.find().select('name email lastLogin').lean();
        const doctors = await Doctor.find().select('name email lastLogin').lean();
        const suppliers = await Supplier.find().select('name email lastLogin').lean();
        const employees = await Employee.find().select('name email lastLogin').lean();
        const admins = await Admin.find({ _id: { $ne: req.adminId } }).select('name email lastLogin').lean();

        const signins = [
            ...patients.map(p => ({ ...p, type: 'Patient' })),
            ...doctors.map(d => ({ ...d, type: 'Doctor' })),
            ...suppliers.map(s => ({ ...s, type: 'Supplier' })),
            ...employees.map(e => ({ ...e, type: 'Employee' })),
            ...admins.map(a => ({ ...a, type: 'Admin' }))
        ]
            .filter(user => user.lastLogin) // Only include users with a lastLogin
            .map(user => ({
                name: user.name,
                type: user.type,
                email: user.email,
                date: user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-US') : 'N/A',
                time: user.lastLogin ? new Date(user.lastLogin).toLocaleTimeString('en-US') : 'N/A'
            }))
            .sort((a, b) => new Date(b.lastLogin) - new Date(a.lastLogin)) // Sort by most recent
            .slice(0, 50); // Limit to 50 recent sign-ins

        res.json(signins);
    } catch (err) {
        console.error("Error fetching signins:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getUsers = asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.status(401).json({ error: 'Unauthorized: Please log in as admin' });
        }

        const patients = await Patient.find().select('name email').lean();
        const doctors = await Doctor.find().select('name email').lean();
        const suppliers = await Supplier.find().select('name email').lean();
        const employees = await Employee.find().select('name email').lean();
        const admins = await Admin.find({ _id: { $ne: req.adminId } }).select('name email').lean();

        const users = [
            ...patients.map(p => ({ ...p, type: 'Patient' })),
            ...doctors.map(d => ({ ...d, type: 'Doctor' })),
            ...suppliers.map(s => ({ ...s, type: 'Supplier' })),
            ...employees.map(e => ({ ...e, type: 'Employee' })),
            ...admins.map(a => ({ ...a, type: 'Admin' }))
        ];

        res.json(users);
    } catch (err) {
        console.error("Error fetching users:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.deleteUser = asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.status(401).json({ error: 'Unauthorized: Please log in as admin' });
        }

        const { type, id } = req.params;
        let Model;

        switch (type.toLowerCase()) {
            case 'patient':
                Model = Patient;
                break;
            case 'doctor':
                Model = Doctor;
                break;
            case 'supplier':
                Model = Supplier;
                break;
            case 'employee':
                Model = Employee;
                break;
            case 'admin':
                Model = Admin;
                break;
            default:
                return res.status(400).json({ error: 'Invalid user type' });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

      
        if (type.toLowerCase() === 'admin' && id === req.adminId) {
            return res.status(403).json({ error: 'Cannot delete own admin account' });
        }

     
        if (type.toLowerCase() === 'patient') {
            await Appointment.deleteMany({ patientId: id });
        } else if (type.toLowerCase() === 'doctor') {
            await Appointment.deleteMany({ doctorId: id });
        }

        const deletedUser = await Model.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error("Error deleting user:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getDashboard = asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.redirect('/admin_form?error=login_required');
        }

        if (!mongoose.Types.ObjectId.isValid(req.adminId)) {
            return res.status(400).render('error', {
                message: 'Invalid session data',
                redirect: '/admin_form'
            });
        }

        const admin = await Admin.findById(req.adminId).select('email password').lean();

        if (!admin) {
            return res.status(404).render('error', {
                message: 'Admin not found',
                redirect: '/admin_form'
            });
        }

        console.log(`Login Details for Admin - Email: ${admin.email}, Password: ${admin.password}`);

        res.render('admin_dashboard');
    } catch (err) {
        console.error("Error accessing admin dashboard:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/admin_form'
        });
    }
});

exports.getForm = (req, res) => {
    res.render('admin_form');
};

exports.getAppointments = asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { startDate, endDate } = req.query;
        let query = {
            isBlockedSlot: { $ne: true },
            status: { $ne: 'cancelled' }
        };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const appointments = await Appointment.find(query)
            .populate('patientId', 'name')
            .populate('doctorId', 'name specialization')
            .sort({ date: 1, time: 1 })
            .lean();

        const formattedAppointments = appointments.map(appt => {
            const dateStr = appt.date.toISOString().split('T')[0];
            return {
                _id: appt._id,
                patientName: appt.patientId?.name || 'Unknown Patient',
                doctorName: appt.doctorId?.name || 'Unknown Doctor',
                doctorId: appt.doctorId?._id,
                specialization: appt.doctorId?.specialization || 'General Physician',
                date: dateStr,
                time: appt.time,
                fee: appt.consultationFee || 0,
                revenue: (appt.consultationFee || 0) * 0.1, // 10% revenue
                status: appt.status
            };
        });

        res.json(formattedAppointments);
    } catch (err) {
        console.error("Error fetching appointments:", err.message);
        res.status(500).json({ 
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getEarnings =  asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Define the start date (Jan 1, 2025)
        const startDate = new Date('2025-01-01');
        const endDate = new Date(); // Current date

        // Fetch appointments within the date range
        const appointments = await Appointment.find({
            isBlockedSlot: { $ne: true },
            status: { $ne: 'cancelled' },
            date: { $gte: startDate, $lte: endDate }
        })
            .populate('doctorId', 'specialization')
            .lean();

        // Aggregate daily earnings
        const dailyEarnings = {};
        appointments.forEach(appt => {
            const dateStr = appt.date.toISOString().split('T')[0]; // YYYY-MM-DD
            if (!dailyEarnings[dateStr]) {
                dailyEarnings[dateStr] = {
                    date: dateStr,
                    count: 0,
                    totalFees: 0,
                    totalRevenue: 0
                };
            }
            dailyEarnings[dateStr].count++;
            dailyEarnings[dateStr].totalFees += appt.consultationFee || 0;
            dailyEarnings[dateStr].totalRevenue += (appt.consultationFee || 0) * 0.1;
        });

        // Aggregate monthly earnings
        const monthlyEarnings = {};
        appointments.forEach(appt => {
            const date = new Date(appt.date);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            if (!monthlyEarnings[monthKey]) {
                monthlyEarnings[monthKey] = {
                    month: monthKey,
                    count: 0,
                    totalFees: 0,
                    totalRevenue: 0
                };
            }
            monthlyEarnings[monthKey].count++;
            monthlyEarnings[monthKey].totalFees += appt.consultationFee || 0;
            monthlyEarnings[monthKey].totalRevenue += (appt.consultationFee || 0) * 0.1;
        });

        // Aggregate yearly earnings
        const yearlyEarnings = {};
        appointments.forEach(appt => {
            const year = new Date(appt.date).getFullYear();
            if (!yearlyEarnings[year]) {
                yearlyEarnings[year] = {
                    year,
                    count: 0,
                    totalFees: 0,
                    totalRevenue: 0
                };
            }
            yearlyEarnings[year].count++;
            yearlyEarnings[year].totalFees += appt.consultationFee || 0;
            yearlyEarnings[year].totalRevenue += (appt.consultationFee || 0) * 0.1;
        });

        // Convert to arrays and sort
        const dailyEarningsArray = Object.values(dailyEarnings)
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first
        const monthlyEarningsArray = Object.values(monthlyEarnings)
            .sort((a, b) => a.month.localeCompare(b.month));
        const yearlyEarningsArray = Object.values(yearlyEarnings)
            .sort((a, b) => a.year - b.year);

        res.json({
            daily: dailyEarningsArray,
            monthly: monthlyEarningsArray,
            yearly: yearlyEarningsArray
        });
    } catch (err) {
        console.error("Error fetching earnings:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getSignins = asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get all users from all collections with timestamps
        const [patients, doctors, admins, suppliers, employees] = await Promise.all([
            Patient.find().select('name email createdAt').lean(),
            Doctor.find().select('name email createdAt').lean(),
            Admin.find().select('name email createdAt').lean(),
            Supplier.find().select('name email createdAt').lean(),
            Employee.find().select('name email createdAt').lean()
        ]);

        // Combine all users and add type information
        const allUsers = [
            ...patients.map(u => ({ ...u, type: 'Patient' })),
            ...doctors.map(u => ({ ...u, type: 'Doctor' })),
            ...admins.map(u => ({ ...u, type: 'Admin' })),
            ...suppliers.map(u => ({ ...u, type: 'Supplier' })),
            ...employees.map(u => ({ ...u, type: 'Employee' }))
        ];

        // Sort by lastLogin date (newest first)
        allUsers.sort((a, b) => new Date(b.lastLogin) - new Date(a.lastLogin));

        // Format the data
        const signins = allUsers.map(user => ({
            name: user.name,
            email: user.email,
            date: user.createdAt.toLocaleDateString('en-US'),
            time: user.createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            type: user.type
        }));

        res.json(signins);
    } catch (err) {
        console.error("Error fetching signins:", err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// new api endpoints for finance
exports.getFinanceData = asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const appointments = await Appointment.find({
            isBlockedSlot: { $ne: true },
            status: { $ne: 'cancelled' }
        })
        .populate('patientId', 'name')
        .populate('doctorId', 'name specialization')
        .sort({ date: -1 })
        .lean();

        const financeData = appointments.map(appt => ({
            _id: appt._id,
            patientName: appt.patientId?.name || 'Unknown Patient',
            doctorName: appt.doctorId?.name || 'Unknown Doctor',
            specialization: appt.doctorId?.specialization || 'General Physician',
            date: appt.date.toISOString().split('T')[0],
            time: appt.time,
            fee: appt.consultationFee || 0,
            revenue: (appt.consultationFee || 0) * 0.1, // 10% revenue
            status: appt.status
        }));

        res.json(financeData);
    } catch (err) {
        console.error("Error fetching finance data:", err.message);
        res.status(500).json({ 
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getEarnings = asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }


        
        const startDate = new Date('2025-01-01');

        
        const appointments = await Appointment.find({
            isBlockedSlot: { $ne: true },
            status: { $ne: 'cancelled' },
            date: { $gte: startDate } 
        })
        .populate('doctorId', 'specialization')
        .lean();

        
        const dailyEarnings = {};
        appointments.forEach(appt => {
            const dateStr = appt.date.toISOString().split('T')[0]; 
            if (!dailyEarnings[dateStr]) {
                dailyEarnings[dateStr] = {
                    date: dateStr,
                    count: 0,
                    totalFees: 0,
                    totalRevenue: 0
                };
            }
            dailyEarnings[dateStr].count++;
            dailyEarnings[dateStr].totalFees += appt.consultationFee || 0;
            dailyEarnings[dateStr].totalRevenue += (appt.consultationFee || 0) * 0.1;
        });

        // Aggregate monthly earnings
        const monthlyEarnings = {};
        appointments.forEach(appt => {
            const date = new Date(appt.date);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            if (!monthlyEarnings[monthKey]) {
                monthlyEarnings[monthKey] = {
                    month: monthKey,
                    count: 0,
                    totalFees: 0,
                    totalRevenue: 0
                };
            }
            monthlyEarnings[monthKey].count++;
            monthlyEarnings[monthKey].totalFees += appt.consultationFee || 0;
            monthlyEarnings[monthKey].totalRevenue += (appt.consultationFee || 0) * 0.1;
        });

        // Aggregate yearly earnings
        const yearlyEarnings = {};
        appointments.forEach(appt => {
            const year = new Date(appt.date).getFullYear();
            if (!yearlyEarnings[year]) {
                yearlyEarnings[year] = {
                    year: year.toString(),
                    count: 0,
                    totalFees: 0,
                    totalRevenue: 0
                };
            }
            yearlyEarnings[year].count++;
            yearlyEarnings[year].totalFees += appt.consultationFee || 0;
            yearlyEarnings[year].totalRevenue += (appt.consultationFee || 0) * 0.1;
        });

        // Convert to arrays and sort
        const dailyEarningsArray = Object.values(dailyEarnings)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        const monthlyEarningsArray = Object.values(monthlyEarnings)
            .sort((a, b) => b.month.localeCompare(a.month));
        const yearlyEarningsArray = Object.values(yearlyEarnings)
            .sort((a, b) => b.year - a.year);

        res.json({
            daily: dailyEarningsArray,
            monthly: monthlyEarningsArray,
            yearly: yearlyEarningsArray
        });
    } catch (err) {
        console.error("Error fetching earnings:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// exports.getEarnings = asyncHandler(async (req, res) => {
//     try {
//         if (!req.session.adminId) {
//             return res.status(401).json({ error: 'Unauthorized' });
//         }

//         // Define the start date (Jan 1, 2025)
//         const startDate = new Date('2025-01-01');
//         const endDate = new Date(); // Current date

//         // Fetch appointments within the date range
//         const appointments = await Appointment.find({
//             isBlockedSlot: { $ne: true },
//             status: { $ne: 'cancelled' },
//             date: { $gte: startDate, $lte: endDate }
//         })
//         .populate('doctorId', 'specialization')
//         .lean();

//         // Aggregate daily earnings
//         const dailyEarnings = {};
//         appointments.forEach(appt => {
//             const dateStr = appt.date.toISOString().split('T')[0]; // YYYY-MM-DD
//             if (!dailyEarnings[dateStr]) {
//                 dailyEarnings[dateStr] = {
//                     date: dateStr,
//                     count: 0,
//                     totalFees: 0,
//                     totalRevenue: 0
//                 };
//             }
//             dailyEarnings[dateStr].count++;
//             dailyEarnings[dateStr].totalFees += appt.consultationFee || 0;
//             dailyEarnings[dateStr].totalRevenue += (appt.consultationFee || 0) * 0.1;
//         });

//         // Aggregate monthly earnings
//         const monthlyEarnings = {};
//         appointments.forEach(appt => {
//             const date = new Date(appt.date);
//             const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
//             if (!monthlyEarnings[monthKey]) {
//                 monthlyEarnings[monthKey] = {
//                     month: monthKey,
//                     count: 0,
//                     totalFees: 0,
//                     totalRevenue: 0
//                 };
//             }
//             monthlyEarnings[monthKey].count++;
//             monthlyEarnings[monthKey].totalFees += appt.consultationFee || 0;
//             monthlyEarnings[monthKey].totalRevenue += (appt.consultationFee || 0) * 0.1;
//         });

//         // Aggregate yearly earnings
//         const yearlyEarnings = {};
//         appointments.forEach(appt => {
//             const year = new Date(appt.date).getFullYear();
//             if (!yearlyEarnings[year]) {
//                 yearlyEarnings[year] = {
//                     year: year.toString(),
//                     count: 0,
//                     totalFees: 0,
//                     totalRevenue: 0
//                 };
//             }
//             yearlyEarnings[year].count++;
//             yearlyEarnings[year].totalFees += appt.consultationFee || 0;
//             yearlyEarnings[year].totalRevenue += (appt.consultationFee || 0) * 0.1;
//         });

//         // Convert to arrays and sort
//         const dailyEarningsArray = Object.values(dailyEarnings)
//             .sort((a, b) => new Date(b.date) - new Date(a.date));
//         const monthlyEarningsArray = Object.values(monthlyEarnings)
//             .sort((a, b) => b.month.localeCompare(a.month));
//         const yearlyEarningsArray = Object.values(yearlyEarnings)
//             .sort((a, b) => b.year - a.year);

//         res.json({
//             daily: dailyEarningsArray,
//             monthly: monthlyEarningsArray,
//             yearly: yearlyEarningsArray
//         });
//     } catch (err) {
//         console.error("Error fetching earnings:", err.message);
//         res.status(500).json({
//             error: 'Internal server error',
//             details: process.env.NODE_ENV === 'development' ? err.message : undefined
//         });
//     }
// });

exports.getRevenueSummary = asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }



        const appointments = await Appointment.find({
            isBlockedSlot: { $ne: true },
            status: { $ne: 'cancelled' }
        })
        .populate('doctorId', 'specialization')
        .lean();

        // Calculate totals
        const totalAppointments = appointments.length;
        const totalFees = appointments.reduce((sum, appt) => sum + (appt.consultationFee || 0), 0);
        const totalRevenue = totalFees * 0.1;

        // Calculate by specialization
        const specializationData = {};
        appointments.forEach(appt => {
            const spec = appt.doctorId?.specialization || 'General Physician';
            if (!specializationData[spec]) {
                specializationData[spec] = {
                    specialization: spec,
                    count: 0,
                    totalFees: 0,
                    totalRevenue: 0
                };
            }
            specializationData[spec].count++;
            specializationData[spec].totalFees += appt.consultationFee || 0;
            specializationData[spec].totalRevenue += (appt.consultationFee || 0) * 0.1;
        });

        const specializationArray = Object.values(specializationData)
            .sort((a, b) => b.totalFees - a.totalFees);

        res.json({
            summary: {
                totalAppointments,
                totalFees,
                totalRevenue
            },
            bySpecialization: specializationArray
        });
    } catch (err) {
        console.error("Error fetching revenue summary:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getSearchData = asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.redirect('/admin/form?error=login_required');
        }

        res.render('admin_search_data', {
            title: 'Search Data'
        });
    } catch (err) {
        console.error("Error rendering search data page:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/admin/form'
        });
    }
});


exports.getMedicineFinance = asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }



        
        const orders = await Order.find({ status: 'confirmed' })
            .populate('patientId', 'name')
            .populate('medicineId', 'name')
            .populate('supplierId', 'name')
            .sort({ createdAt: -1 })
            .lean();

        const data = orders.map(o => ({
            _id: o._id,
            patientName: o.patientId?.name || 'Unknown Patient',
            medicineName: o.medicineId?.name || 'Unknown Medicine',
            supplierName: o.supplierId?.name || 'Unknown Supplier',
            date: o.createdAt ? o.createdAt.toISOString().split('T')[0] : '',
            time: o.createdAt ? new Date(o.createdAt).toLocaleTimeString() : '',
            totalAmount: o.totalCost || 0,
            mediQuickCommission: Number(((o.totalCost || 0) * 0.05).toFixed(2)),
            status: o.status
        }));

        // Also compute totals
        const totals = data.reduce((acc, row) => {
            acc.totalOrders++;
            acc.totalAmount += Number(row.totalAmount || 0);
            acc.totalCommission += Number(row.mediQuickCommission || 0);
            return acc;
        }, { totalOrders: 0, totalAmount: 0, totalCommission: 0 });

        // Round totals
        totals.totalAmount = Number(totals.totalAmount.toFixed(2));
        totals.totalCommission = Number(totals.totalCommission.toFixed(2));

        res.json({ rows: data, totals });
    } catch (err) {
        console.error('Error fetching medicine finance data:', err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getSupplierAnalytics = asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }



        // Fetch all medicines with their supplier info
        const allMedicines = await Medicine.find({})
            .populate('supplierId', 'name supplierID')
            .lean();

        // Fetch all confirmed orders with populated data
        const orders = await Order.find({ status: 'confirmed' })
            .populate('medicineId', 'name medicineID manufacturer')
            .populate('supplierId', 'name supplierID')
            .lean();

        // Create analytics maps
        const medicineOrderCount = {}; // Track orders per medicine
        const supplierOrderCount = {}; // Track orders per supplier
        const supplierRevenue = {}; // Track revenue per supplier
        const medicineSuppliers = {}; // Track suppliers for each medicine
        const supplierMedicines = {}; // Track medicines for each supplier

        // Build analytics from orders
        orders.forEach(order => {
            const medicineId = order.medicineId?._id?.toString();
            const medicineName = order.medicineId?.name || 'Unknown Medicine';
            const supplierId = order.supplierId?._id?.toString();
            const supplierName = order.supplierId?.name || 'Unknown Supplier';
            const orderQuantity = order.quantity || 1;
            const revenue = order.totalCost || 0;

            // Count medicine orders
            if (medicineId) {
                medicineOrderCount[medicineId] = (medicineOrderCount[medicineId] || 0) + orderQuantity;
            }

            // Count supplier orders and revenue
            if (supplierId) {
                supplierOrderCount[supplierId] = (supplierOrderCount[supplierId] || 0) + orderQuantity;
                supplierRevenue[supplierId] = (supplierRevenue[supplierId] || 0) + revenue;
            }
        });

        // Build medicine-supplier relationships from all medicines in database
        allMedicines.forEach(medicine => {
            const medicineId = medicine._id.toString();
            const medicineName = medicine.name;
            const supplierId = medicine.supplierId?._id?.toString();
            const supplierName = medicine.supplierId?.name || 'Unknown Supplier';

            // Track which suppliers sell each medicine
            if (!medicineSuppliers[medicineId]) {
                medicineSuppliers[medicineId] = {
                    medicineName: medicineName,
                    medicineID: medicine.medicineID,
                    stock: medicine.quantity || 0,
                    manufacturer: medicine.manufacturer,
                    suppliers: []
                };
            }
            if (supplierId && !medicineSuppliers[medicineId].suppliers.find(s => s.id === supplierId)) {
                medicineSuppliers[medicineId].suppliers.push({
                    id: supplierId,
                    name: supplierName,
                    supplierID: medicine.supplierId?.supplierID
                });
            }

            // Track which medicines each supplier provides
            if (!supplierMedicines[supplierId]) {
                supplierMedicines[supplierId] = {
                    supplierName: supplierName,
                    supplierID: medicine.supplierId?.supplierID,
                    totalOrders: supplierOrderCount[supplierId] || 0,
                    totalRevenue: supplierRevenue[supplierId] || 0,
                    medicines: []
                };
            }
            supplierMedicines[supplierId].medicines.push({
                id: medicineId,
                name: medicineName,
                medicineID: medicine.medicineID,
                stock: medicine.quantity || 0,
                manufacturer: medicine.manufacturer,
                orderCount: medicineOrderCount[medicineId] || 0
            });
        });

        // Find most selling medicine
        let mostSellingMedicine = null;
        let maxMedicineOrders = 0;
        Object.entries(medicineOrderCount).forEach(([medicineId, count]) => {
            if (count > maxMedicineOrders) {
                maxMedicineOrders = count;
                const medicine = allMedicines.find(m => m._id.toString() === medicineId);
                mostSellingMedicine = {
                    medicineId,
                    name: medicine?.name || 'Unknown',
                    medicineID: medicine?.medicineID,
                    totalOrderQuantity: count,
                    currentStock: medicine?.quantity || 0,
                    manufacturer: medicine?.manufacturer,
                    suppliers: medicineSuppliers[medicineId]?.suppliers || []
                };
            }
        });

        // Find best supplier (highest revenue)
        let bestSupplier = null;
        let maxSupplierRevenue = 0;
        Object.entries(supplierRevenue).forEach(([supplierId, revenue]) => {
            if (revenue > maxSupplierRevenue) {
                maxSupplierRevenue = revenue;
                const supplierData = supplierMedicines[supplierId];
                bestSupplier = {
                    supplierId,
                    name: supplierData?.supplierName || 'Unknown',
                    supplierID: supplierData?.supplierID,
                    totalRevenue: revenue,
                    totalOrders: supplierOrderCount[supplierId] || 0,
                    medicineCount: supplierData?.medicines?.length || 0
                };
            }
        });

        res.json({
            analytics: {
                mostSellingMedicine,
                bestSupplier,
                medicineSuppliers: Object.values(medicineSuppliers),
                supplierMedicines: Object.values(supplierMedicines)
            },
            totals: {
                totalMedicines: allMedicines.length,
                totalSuppliers: Object.keys(supplierMedicines).length,
                totalConfirmedOrders: orders.length
            }
        });
    } catch (err) {
        console.error('Error fetching supplier analytics:', err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getMedicineOrders = asyncHandler(async (req, res) => {
    try {
        
        const updateResult = await Order.updateMany(
            { 
                status: 'pending', 
                paymentMethod: { $exists: true, $ne: null } 
            },
            { $set: { status: 'confirmed' } }
        );
        
        if (updateResult.modifiedCount > 0) {
            console.log(`Auto-confirmed ${updateResult.modifiedCount} paid orders that were marked as pending`);
        }

        
        const orders = await Order.find({})
            .populate('patientId', 'name email mobile')
            .populate('supplierId', 'name email mobile')
            .populate('medicineId', 'name price company')
            .sort({ createdAt: -1 }) 
            .lean();

        console.log(`Found ${orders.length} orders in database`);

        
        const formattedOrders = orders.map((order, index) => {
            const formattedOrder = {
                _id: order._id,
                orderId: `ORD-${order._id.toString().slice(-8).toUpperCase()}`, // Generate readable order ID
                patientName: order.patientId?.name || `Patient-${order.patientId || 'Unknown'}`,
                patientEmail: order.patientId?.email || 'N/A',
                medicineName: order.medicineId?.name || `Medicine-${order.medicineId || 'Unknown'}`,
                medicineCompany: order.medicineId?.company || 'N/A',
                supplierName: order.supplierId?.name || `Supplier-${order.supplierId || 'Unknown'}`,
                quantity: order.quantity || 1,
                unitPrice: order.medicineId?.price || 0,
                totalAmount: order.totalCost || order.finalAmount || (order.quantity * (order.medicineId?.price || 0)),
                deliveryCharge: order.deliveryCharge || 0,
                paymentMethod: order.paymentMethod?.toUpperCase() || 'COD',
                status: (order.status || 'pending').toLowerCase(),
                date: order.createdAt ? order.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                time: order.createdAt ? new Date(order.createdAt).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                }) : 'N/A',
                deliveryAddress: order.deliveryAddress ? 
                    `${order.deliveryAddress.street || ''}, ${order.deliveryAddress.city || ''}, ${order.deliveryAddress.state || ''} ${order.deliveryAddress.zip || ''}`.trim() : 
                    'Address not provided'
            };

            
            if (index < 3) {
                console.log(`Order ${index + 1}:`, {
                    orderId: formattedOrder.orderId,
                    patient: formattedOrder.patientName,
                    medicine: formattedOrder.medicineName,
                    supplier: formattedOrder.supplierName,
                    amount: formattedOrder.totalAmount
                });
            }

            return formattedOrder;
        });

        console.log(`Returning ${formattedOrders.length} formatted orders`);

        res.status(200).json({
            message: 'Medicine orders fetched successfully',
            count: formattedOrders.length,
            data: formattedOrders
        });
    } catch (err) {
        console.error('Error fetching medicine orders:', err);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});


exports.getAppointmentsWithReviews = asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }



        
        const appointments = await Appointment.find({
            $or: [
                { feedback: { $ne: null } },
                { rating: { $ne: null } }
            ]
        })
        .populate('patientId', 'name email mobile')
        .populate('doctorId', 'name specialization email')
        .sort({ reviewedAt: -1 }) 
        .lean();

        
        const formattedAppointments = appointments.map(appointment => ({
            id: appointment._id.toString(),
            appointmentDate: appointment.date,
            appointmentTime: appointment.time,
            type: appointment.type,
            status: appointment.status,
            patient: {
                name: appointment.patientId?.name || 'N/A',
                email: appointment.patientId?.email || 'N/A',
                mobile: appointment.patientId?.mobile || 'N/A'
            },
            doctor: {
                name: appointment.doctorId?.name || 'N/A',
                specialization: appointment.doctorId?.specialization || 'N/A',
                email: appointment.doctorId?.email || 'N/A'
            },
            feedback: appointment.feedback,
            rating: appointment.rating,
            reviewedAt: appointment.reviewedAt
        }));

        res.json({
            success: true,
            appointments: formattedAppointments,
            totalReviews: formattedAppointments.length
        });
    } catch (err) {
        console.error('Error fetching appointments with reviews:', err);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});


exports.deleteReview = asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { appointmentId } = req.params;

        
        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        
        appointment.feedback = null;
        appointment.rating = null;
        appointment.reviewedAt = null;

        await appointment.save();

        console.log(`Admin ${req.adminId} deleted review for appointment ${appointmentId}`);
        
        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting review:', err);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Get pending employee requests (not approved)
exports.getEmployeeRequestsAPI = asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }



        const employees = await Employee.find({ isApproved: false })
            .select('name email mobile address profilePhoto documentPath _id createdAt')
            .lean();
        
        res.status(200).json({
            success: true,
            employees: employees
        });
    } catch (err) {
        console.error("Error fetching employee requests:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Approve employee
exports.postApproveEmployee = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    console.log('Approving employee ID:', id);
    console.log('Admin ID:', req.adminId);
    
    try {
        if (!req.adminId) {
            console.log('No admin found');
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid employee ID',
                message: 'The provided employee ID is invalid'
            });
        }

        const updatedEmployee = await Employee.findByIdAndUpdate(id, {
            isApproved: true,
            approvalStatus: 'approved'
        }, { new: true });

        if (!updatedEmployee) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Employee not found'
            });
        }

        console.log('Employee approved successfully:', updatedEmployee.name);
        
        res.status(200).json({
            success: true,
            message: 'Employee approved successfully',
            employee: {
                name: updatedEmployee.name,
                email: updatedEmployee.email
            }
        });
        
    } catch (err) {
        console.error("Error approving employee:", err.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to approve employee',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Doctor Analytics - Get doctor-wise appointment statistics
exports.getDoctorAnalytics = asyncHandler(async (req, res) => {
    try {
        const doctors = await Doctor.find({}).select('name email specialization');
        
        const analytics = await Promise.all(doctors.map(async (doctor) => {
            const appointments = await Appointment.find({ 
                doctorId: doctor._id,
                isBlockedSlot: false 
            });
            
            const stats = {
                _id: doctor._id,
                name: doctor.name,
                email: doctor.email,
                specialization: doctor.specialization,
                totalAppointments: appointments.length,
                completed: appointments.filter(a => a.status === 'completed').length,
                confirmed: appointments.filter(a => a.status === 'confirmed').length,
                pending: appointments.filter(a => a.status === 'pending').length,
                cancelled: appointments.filter(a => a.status === 'cancelled').length,
                blocked: await Appointment.countDocuments({ 
                    doctorId: doctor._id, 
                    isBlockedSlot: true 
                })
            };
            
            return stats;
        }));
        
        res.status(200).json(analytics);
    } catch (err) {
        console.error("Error fetching doctor analytics:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch doctor analytics',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Get all appointments for a doctor
exports.getDoctorAppointments = asyncHandler(async (req, res) => {
    try {
        const { doctorId, patientId } = req.query;
        
        if (!doctorId) {
            return res.status(400).json({ error: 'Doctor ID is required' });
        }
        
        const query = {
            doctorId: doctorId,
            isBlockedSlot: false
        };
        
        // Add patientId filter if provided
        if (patientId) {
            query.patientId = patientId;
        }
        
        const appointments = await Appointment.find(query)
        .populate('patientId', 'name email mobile')
        .sort({ date: -1, time: -1 });
        
        res.status(200).json(appointments);
    } catch (err) {
        console.error("Error fetching doctor appointments:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch appointments',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Get doctor appointments by date
exports.getDoctorAppointmentsByDate = asyncHandler(async (req, res) => {
    try {
        const { doctorId, date } = req.query;
        
        if (!doctorId || !date) {
            return res.status(400).json({ error: 'Doctor ID and date are required' });
        }
        
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        const appointments = await Appointment.find({
            doctorId: doctorId,
            date: { $gte: startDate, $lte: endDate },
            isBlockedSlot: false
        })
        .populate('patientId', 'name email mobile')
        .sort({ time: 1 });
        
        res.status(200).json(appointments);
    } catch (err) {
        console.error("Error fetching doctor appointments by date:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch appointments',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Patient Analytics - Get patient-wise appointment statistics
exports.getPatientAnalytics = asyncHandler(async (req, res) => {
    try {
        const patients = await Patient.find({}).select('name email mobile');
        
        const analytics = await Promise.all(patients.map(async (patient) => {
            const appointments = await Appointment.find({ 
                patientId: patient._id,
                isBlockedSlot: false 
            });
            
            const stats = {
                _id: patient._id,
                name: patient.name,
                email: patient.email,
                mobile: patient.mobile,
                totalAppointments: appointments.length,
                completed: appointments.filter(a => a.status === 'completed').length,
                confirmed: appointments.filter(a => a.status === 'confirmed').length,
                pending: appointments.filter(a => a.status === 'pending').length,
                cancelled: appointments.filter(a => a.status === 'cancelled').length
            };
            
            return stats;
        }));
        
        // Filter out patients with no appointments
        const analyticsWithAppointments = analytics.filter(p => p.totalAppointments > 0);
        
        res.status(200).json(analyticsWithAppointments);
    } catch (err) {
        console.error("Error fetching patient analytics:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch patient analytics',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Get all appointments for a patient
exports.getPatientAppointments = asyncHandler(async (req, res) => {
    try {
        const { patientId, doctorId } = req.query;
        
        if (!patientId) {
            return res.status(400).json({ error: 'Patient ID is required' });
        }
        
        const query = {
            patientId: patientId,
            isBlockedSlot: false
        };
        
        // Add doctorId filter if provided
        if (doctorId) {
            query.doctorId = doctorId;
        }
        
        const appointments = await Appointment.find(query)
        .populate('doctorId', 'name email specialization')
        .sort({ date: -1, time: -1 });
        
        res.status(200).json(appointments);
    } catch (err) {
        console.error("Error fetching patient appointments:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch appointments',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Get patient appointments by date
exports.getPatientAppointmentsByDate = asyncHandler(async (req, res) => {
    try {
        const { patientId, date } = req.query;
        
        if (!patientId || !date) {
            return res.status(400).json({ error: 'Patient ID and date are required' });
        }
        
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        const appointments = await Appointment.find({
            patientId: patientId,
            date: { $gte: startDate, $lte: endDate },
            isBlockedSlot: false
        })
        .populate('doctorId', 'name email specialization')
        .sort({ time: 1 });
        
        res.status(200).json(appointments);
    } catch (err) {
        console.error("Error fetching patient appointments by date:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch appointments',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.searchGlobalData = asyncHandler(async (req, res) => {
    try {
        if (!req.adminId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const query = (req.query.query || '').trim();
        const entity = (req.query.entity || 'all').toLowerCase();
        const parsedLimit = parseInt(req.query.limit, 10);
        const limit = Number.isNaN(parsedLimit) ? 15 : Math.min(Math.max(parsedLimit, 1), 50);

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedQuery, 'i');

        const results = {
            medicines: [],
            doctors: [],
            patients: [],
            suppliers: [],
            employees: [],
            admins: []
        };

        const includeAll = entity === 'all';

        if (includeAll || entity === 'medicine' || entity === 'medicines') {
            const solrResponse = await solrClient.search(query, {}, 0, limit);
            results.medicines = (solrResponse?.docs || []).map((item) => ({
                _id: item.id,
                name: item.name,
                medicineID: item.medicineID,
                manufacturer: item.manufacturer,
                quantity: item.quantity,
                cost: item.cost,
                source: 'solr'
            }));
        }

        if (includeAll || entity === 'doctor' || entity === 'doctors') {
            const solrResponse = await doctorSolrClient.search(query, {}, 0, limit);
            results.doctors = (solrResponse?.docs || []).map((item) => ({
                _id: item.id,
                name: item.name,
                specialization: item.specialization,
                location: item.location,
                consultationFee: item.consultationFee,
                source: 'solr'
            }));
        }

        if (includeAll || entity === 'patient' || entity === 'patients') {
            results.patients = await Patient.find({
                $or: [{ name: regex }, { email: regex }, { patientID: regex }]
            })
                .select('name email patientID mobile')
                .limit(limit)
                .lean();
        }

        if (includeAll || entity === 'supplier' || entity === 'suppliers') {
            results.suppliers = await Supplier.find({
                $or: [{ name: regex }, { email: regex }, { supplierID: regex }]
            })
                .select('name email supplierID mobile')
                .limit(limit)
                .lean();
        }

        if (includeAll || entity === 'employee' || entity === 'employees') {
            results.employees = await Employee.find({
                $or: [{ name: regex }, { email: regex }, { employeeID: regex }]
            })
                .select('name email employeeID mobile')
                .limit(limit)
                .lean();
        }

        if (includeAll || entity === 'admin' || entity === 'admins') {
            results.admins = await Admin.find({
                _id: { $ne: req.adminId },
                $or: [{ name: regex }, { email: regex }]
            })
                .select('name email mobile')
                .limit(limit)
                .lean();
        }

        const counts = {
            medicines: results.medicines.length,
            doctors: results.doctors.length,
            patients: results.patients.length,
            suppliers: results.suppliers.length,
            employees: results.employees.length,
            admins: results.admins.length
        };

        const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

        res.json({
            query,
            entity,
            limit,
            counts,
            total,
            results
        });
    } catch (err) {
        console.error('Error fetching admin global search data:', err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});