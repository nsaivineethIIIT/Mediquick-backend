const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Medicine = require('../models/Medicine');
const Appointment = require('../models/Appointment');
const Chat = require('../models/Chat');
const Prescription = require('../models/Prescription');
// const Message = require('../models/Message');
// const Review = require('../models/Review');
// const Slot = require('../models/Slot');
const Order = require('../models/Order');
const {checkEmailExists, checkMobileExists} = require('../utils/utils');
const { generateToken } = require('../middlewares/auth');
const asyncHandler = require('../middlewares/asyncHandler');
const { getCache, setCache, deleteCache } = require('../utils/redisClient');
const fs = require('fs');
const path = require('path');
const { sendOtpEmail } = require('../utils/email');
const { storePending, verifyPending, refreshOtp } = require('../utils/pendingSignups');
const solrClient = require('../utils/solrClient');

/**
 * @swagger
 * /patient/signup:
 *   post:
 *     summary: Patient Signup - Send OTP
 *     description: Validates patient signup details and sends OTP via email
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
 *               - name
 *               - email
 *               - mobile
 *               - address
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Patient's full name
 *               email:
 *                 type: string
 *                 format: email
 *               mobile:
 *                 type: string
 *                 pattern: '^[0-9]{10}$'
 *                 description: 10-digit mobile number
 *               address:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 description: Optional date of birth
 *               gender:
 *                 type: string
 *                 enum:
 *                   - male
 *                   - female
 *                   - other
 *                 description: Optional gender
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
 *         description: Validation failed (invalid email, duplicate account, etc.)
 *       500:
 *         description: Failed to send email
 */

// ─── STEP 1: Validate signup details, generate OTP, send email ───────────────
exports.signup = asyncHandler(async (req, res) => {
    const { name, email, mobile, address, password, dateOfBirth, gender } = req.body;

    console.log('Received patient signup request:', { name, email, mobile, address, dateOfBirth, gender, password: '[REDACTED]' });

    // Validate input fields
    if (!name || !email || !mobile || !address || !password) {
        return res.status(400).json({
            error: 'All fields are required',
            details: 'Please provide name, email, mobile, address, and password'
        });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            error: 'Invalid email format',
            details: 'Please provide a valid email address'
        });
    }

    // Validate mobile number (10 digits)
    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(mobile)) {
        return res.status(400).json({
            error: 'Invalid mobile number',
            details: 'Mobile number must be 10 digits'
        });
    }

    // Validate password length
    if (password.length < 6) {
        return res.status(400).json({
            error: 'Invalid password',
            details: 'Password must be at least 6 characters long'
        });
    }

    // Validate optional gender field
    if (gender && !['male', 'female', 'other'].includes(gender.toLowerCase())) {
        return res.status(400).json({
            error: 'Invalid gender',
            details: 'Gender must be male, female, or other'
        });
    }

    // Check for duplicates BEFORE creating any DB record
    const emailExists = await checkEmailExists(email);
    if (emailExists) {
        return res.status(400).json({
            error: 'Email already in use',
            details: 'This email is already registered with another account'
        });
    }

    const mobileExists = await checkMobileExists(mobile);
    if (mobileExists) {
        return res.status(400).json({
            error: 'Mobile number already in use',
            details: 'This mobile number is already registered with another account'
        });
    }

    // Store pending signup in memory and generate OTP (no DB write yet)
    const signupData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
        address: address.trim(),
        password,
        ...(dateOfBirth && { dateOfBirth }),
        ...(gender && { gender: gender.toLowerCase() })
    };

    const { pendingId, otp } = storePending(signupData);

    // Send OTP via email
    try {
        await sendOtpEmail(signupData.email, otp, 'patient');
        console.log(`OTP sent to ${signupData.email} for signup (pendingId: ${pendingId})`);
    } catch (mailErr) {
        console.error('Failed to send OTP email:', mailErr.message);
        return res.status(500).json({
            error: 'Failed to send OTP email',
            details: 'Could not send verification email. Please check your email address and try again.'
        });
    }

    return res.status(200).json({
        message: 'OTP sent to your email. Please verify to complete signup.',
        pendingId
    });
});

/**
 * @swagger
 * /patient/signup/verify-otp:
 *   post:
 *     summary: Verify OTP and Create Patient Account
 *     description: Verifies OTP sent to email and creates patient account with JWT token
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
 *         description: Account created and OTP verified
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
 *                 redirect:
 *                   type: string
 *       400:
 *         description: Invalid OTP or session expired
 *       500:
 *         description: Internal server error
 */

// ─── STEP 2: Verify OTP → create Patient → return auth token ─────────────────
exports.verifySignupOtp = asyncHandler(async (req, res) => {
    const { pendingId, otp } = req.body;

    if (!pendingId || !otp) {
        return res.status(400).json({
            error: 'Missing fields',
            details: 'pendingId and otp are required'
        });
    }

    const result = verifyPending(pendingId, otp);
    if (!result.valid) {
        return res.status(400).json({
            error: 'OTP verification failed',
            details: result.error
        });
    }

    const { signupData } = result;

    // Final duplicate check (edge case: someone signed up with same email in the 5-minute window)
    const emailExists = await checkEmailExists(signupData.email);
    if (emailExists) {
        return res.status(400).json({
            error: 'Email already in use',
            details: 'This email was registered while your OTP was pending. Please log in instead.'
        });
    }

    // Hash password with bcrypt before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(signupData.password, salt);

    // OTP verified — now create the patient in the database
    const newPatient = new Patient({
        ...signupData,
        password: hashedPassword
    });
    await newPatient.save();
    console.log('Patient account created after OTP verification:', signupData.email);

    // Issue auth token so the user is immediately logged in
    const token = generateToken(newPatient._id.toString(), 'patient');

    return res.status(201).json({
        message: 'Signup successful! Welcome to FDFED.',
        token,
        redirect: '/patient/dashboard'
    });
});

/**
 * @swagger
 * /patient/signup/resend-otp:
 *   post:
 *     summary: Resend OTP to Email
 *     description: Resends OTP email if patient didn't receive it or it expired
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
 *               - pendingId
 *               - email
 *             properties:
 *               pendingId:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Session expired or invalid pendingId
 *       500:
 *         description: Failed to send email
 */

// ─── OPTIONAL STEP: Resend OTP ────────────────────────────────────────────────
exports.resendSignupOtp = asyncHandler(async (req, res) => {
    const { pendingId, email } = req.body;

    if (!pendingId) {
        return res.status(400).json({ error: 'Missing pendingId' });
    }

    const refreshed = refreshOtp(pendingId);
    if (!refreshed) {
        return res.status(400).json({
            error: 'Session expired',
            details: 'Your signup session has expired. Please fill in the signup form again.'
        });
    }

    try {
        await sendOtpEmail(email, refreshed.otp, 'patient');
        console.log(`OTP resent to ${email} (pendingId: ${pendingId})`);
    } catch (mailErr) {
        console.error('Failed to resend OTP email:', mailErr.message);
        return res.status(500).json({
            error: 'Failed to resend OTP',
            details: 'Could not resend verification email. Please try again.'
        });
    }

    return res.status(200).json({ message: 'OTP resent successfully.' });
});

/**
 * @swagger
 * /patient/login:
 *   post:
 *     summary: Patient Login
 *     description: Authenticates patient with email and password, returns JWT token
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
 *                 redirect:
 *                   type: string
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */

exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({
                error: 'All fields are required',
                details: 'Missing email or password'
            });
        }

        const patient = await Patient.findOne({ email });

        if (!patient) {
            return res.status(401).json({
                error: 'Invalid credentials',
                details: 'Incorrect email or password'
            });
        }

        // Handle both bcrypt-hashed and plaintext passwords (lazy migration)
        let passwordMatch = false;
        
        if (patient.password && patient.password.startsWith('$2')) {
            // Password is bcrypt-hashed — use bcrypt.compare
            passwordMatch = await bcrypt.compare(password, patient.password);
        } else {
            // Password is plaintext — verify and then migrate to bcrypt
            if (password === patient.password) {
                passwordMatch = true;
                // Migrate on successful login
                const salt = await bcrypt.genSalt(10);
                patient.password = await bcrypt.hash(password, salt);
                await patient.save();
                console.log('Patient password migrated to bcrypt on login:', email);
            }
        }

        if (!passwordMatch) {
            return res.status(401).json({
                error: 'Invalid credentials',
                details: 'Incorrect email or password'
            });
        }

        // Generate JWT token
        const token = generateToken(patient._id.toString(), 'patient');
        
        return res.status(200).json({
            message: 'Login successful',
            token: token,
            redirect: '/patient/dashboard'
        });
    } catch (err) {
        console.error("Error during patient login:", err.message);
        return res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// exports.getProfile = asyncHandler(async (req, res) => {
//     try {
//         if (!req.patientId) {
//             return res.redirect('/patient/form?error=login_required');
//         }

//         if (!mongoose.Types.ObjectId.isValid(req.patientId)) {
//             return res.status(400).render('error', {
//                 message: 'Invalid session data',
//                 redirect: '/patient/form'
//             });
//         }

//         const patient = await Patient.findById(req.patientId).lean();

//         if (!patient) {
//             return res.status(404).render('error', {
//                 message: 'Patient not found',
//                 redirect: '/patient/form'
//             });
//         }

//         res.render('patient_profile', {
//             patient,
//             title: 'Patient Profile'
//         });
//     } catch (err) {
//         console.error("Error fetching patient profile:", err.message);
//         res.status(500).render('error', {
//             message: 'Internal server error',
//             details: process.env.NODE_ENV === 'development' ? err.message : undefined,
//             redirect: '/patient/form'
//         });
//     }
// });
exports.getProfile = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.redirect('/patient/form?error=login_required');
        }

        // Just render the template without data - data will be fetched via API
        res.render('patient_profile', {
            title: 'Patient Profile'
        });
    } catch (err) {
        console.error("Error rendering patient profile:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/patient/form'
        });
    }
});

// New API endpoint to fetch patient profile data
exports.getProfileData = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(req.patientId)) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid session data' 
            });
        }

        // Try cache first
        const cacheKey = `patient:${req.patientId}:profile`;
        const cachedProfile = await getCache(cacheKey);
        if (cachedProfile) {
            console.log('✅ Patient profile from Redis');
            return res.status(200).json(cachedProfile);
        }

        console.log('❌ Patient profile from DB');
        const patient = await Patient.findById(req.patientId).lean();

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Patient not found'
            });
        }

        const profileData = {
            success: true,
            patient: {
                _id: patient._id,
                name: patient.name,
                email: patient.email,
                mobile: patient.mobile,
                address: patient.address,
                profilePhoto: patient.profilePhoto,
                dateOfBirth: patient.dateOfBirth,
                gender: patient.gender
            }
        };
        
        // Cache result for 30 minutes (1800 seconds)
        await setCache(cacheKey, profileData, 1800);
        
        res.status(200).json(profileData);
    } catch (err) {
        console.error("Error fetching patient profile data:", err.message);
        res.status(500).json({
            success: false,
            error: 'Server Error',
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getPreviousAppointments = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get current date and time for filtering appointments
        const now = new Date();
        const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const currentTime = now.getHours() * 100 + now.getMinutes();

        // Fetch previous appointments
        const previousAppointments = await Appointment.find({
            patientId: req.patientId,
            $or: [
                { date: { $lt: currentDate } },
                {
                    date: {
                        $gte: currentDate,
                        $lt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
                    },
                    $expr: {
                        $lte: [
                            {
                                $add: [
                                    { $multiply: [{ $toInt: { $arrayElemAt: [{ $split: ["$time", ":"] }, 0] } }, 100] },
                                    { $toInt: { $arrayElemAt: [{ $split: [{ $substrBytes: ["$time", 3, 2] }, " "] }, 0] } }
                                ]
                            },
                            currentTime
                        ]
                    },
                    status: { $nin: ['completed', 'cancelled'] }
                },
                {
                    date: {
                        $gte: currentDate,
                        $lt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
                    },
                    status: { $in: ['completed', 'cancelled'] }
                },
                {
                    date: { $lt: currentDate },
                    status: { $in: ['completed', 'cancelled'] }
                }
            ]
        })
        .populate('doctorId', 'name specialization')
        .sort({ date: -1, time: -1 })
        .lean();

        // Format appointments
        const formattedAppointments = previousAppointments.map(appt => {
            const date = new Date(appt.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            return {
                id: appt._id,
                doctorName: appt.doctorId?.name || 'Unknown Doctor',
                specialization: appt.doctorId?.specialization || 'General Physician',
                date: formattedDate,
                time: appt.time,
                type: appt.type,
                status: appt.status,
                notes: appt.notes,
                consultationFee: appt.consultationFee || 0
            };
        });

        res.json(formattedAppointments);
    } catch (err) {
        console.error("Error fetching previous appointments:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getUpcomingAppointments = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get current date and time for filtering appointments
        const now = new Date();
        const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const currentTime = now.getHours() * 100 + now.getMinutes();

        // Fetch upcoming appointments
        const upcomingAppointments = await Appointment.find({
            patientId: req.patientId,
            $or: [
                { date: { $gt: currentDate } },
                {
                    date: {
                        $gte: currentDate,
                        $lt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
                    },
                    $expr: {
                        $gt: [
                            {
                                $add: [
                                    { $multiply: [{ $toInt: { $arrayElemAt: [{ $split: ["$time", ":"] }, 0] } }, 100] },
                                    { $toInt: { $arrayElemAt: [{ $split: [{ $substrBytes: ["$time", 3, 2] }, " "] }, 0] } }
                                ]
                            },
                            currentTime
                        ]
                    }
                }
            ],
            status: { $nin: ['completed', 'cancelled'] }
        })
        .populate('doctorId', 'name specialization')
        .sort({ date: 1, time: 1 })
        .lean();

        // Format appointments
        const formattedAppointments = upcomingAppointments.map(appt => {
            const date = new Date(appt.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            return {
                id: appt._id,
                doctorName: appt.doctorId?.name || 'Unknown Doctor',
                specialization: appt.doctorId?.specialization || 'General Physician',
                date: formattedDate,
                time: appt.time,
                type: appt.type,
                status: appt.status,
                notes: appt.notes,
                consultationFee: appt.consultationFee || 0
            };
        });

        res.json(formattedAppointments);
    } catch (err) {
        console.error("Error fetching upcoming appointments:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getEditProfile = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.redirect('/patient/form?error=login_required');
        }

        if (!mongoose.Types.ObjectId.isValid(req.patientId)) {
            return res.status(400).render('error', {
                message: 'Invalid session data',
                redirect: '/patient/form'
            });
        }

        const patient = await Patient.findById(req.patientId)
            .select('name email mobile address profilePhoto')
            .lean();

        if (!patient) {
            return res.status(404).render('error', {
                message: 'Patient not found',
                redirect: '/patient_form'
            });
        }

        res.render('patient_edit_profile', {
            patient,
            title: 'Edit Patient Profile'
        });
    } catch (err) {
        console.error("Error fetching patient data:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/patient_form'
        });
    }
});

// Quick profile photo upload endpoint
exports.uploadProfilePhoto = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
                message: 'Please select a photo to upload'
            });
        }

        const patientBefore = await Patient.findById(req.patientId).lean();
        const updateData = {
            profilePhoto: req.file.path // Cloudinary URL
        };

        const updatedPatient = await Patient.findByIdAndUpdate(
            req.patientId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedPatient) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Patient not found'
            });
        }

        // Cleanup old profile photo file if it was a local upload
        try {
            const oldProfilePhoto = patientBefore && patientBefore.profilePhoto;
            if (oldProfilePhoto && oldProfilePhoto.startsWith('/uploads/profiles/')) {
                const filePath = path.join(process.cwd(), 'public', oldProfilePhoto.replace(/^\//, ''));
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        } catch (err) {
            console.error('Failed to cleanup old patient profile photo file:', err.message);
        }

        res.status(200).json({
            success: true,
            message: 'Profile photo updated successfully',
            profilePhoto: updatedPatient.profilePhoto
        });
    } catch (err) {
        console.error("Error uploading patient profile photo:", err.message);
        res.status(500).json({
            success: false,
            error: 'Server Error',
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Remove profile photo endpoint
exports.removeProfilePhoto = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        const patientBefore = await Patient.findById(req.patientId).lean();
        const updateData = {
            profilePhoto: '/images/default-patient.svg'
        };

        const updatedPatient = await Patient.findByIdAndUpdate(
            req.patientId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedPatient) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Patient not found'
            });
        }

        // Cleanup old profile photo file if it was a local upload
        try {
            const oldProfilePhoto = patientBefore && patientBefore.profilePhoto;
            if (oldProfilePhoto && oldProfilePhoto.startsWith('/uploads/profiles/')) {
                const filePath = path.join(process.cwd(), 'public', oldProfilePhoto.replace(/^\//, ''));
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        } catch (err) {
            console.error('Failed to cleanup old patient profile photo file:', err.message);
        }

        res.status(200).json({
            success: true,
            message: 'Profile photo removed successfully',
            profilePhoto: updatedPatient.profilePhoto
        });
    } catch (err) {
        console.error("Error removing patient profile photo:", err.message);
        res.status(500).json({
            success: false,
            error: 'Server Error',
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.updateProfile = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(req.patientId)) {
            return res.status(400).json({ error: 'Invalid session data' });
        }

    const { name, email, mobile, address, dateOfBirth, gender, removeProfilePhoto } = req.body;

        if (!name || !email || !mobile || !address) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'All fields are required'
            });
        }
        
        // Validate optional fields
        if (gender && !['male', 'female', 'other'].includes(gender.toLowerCase())) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid gender value'
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

        const emailExists = await Patient.findOne({
            email,
            _id: { $ne: req.patientId }
        });
        if (emailExists) {
            return res.status(400).json({
                error: 'Duplicate Data',
                message: 'Email already in use by another patient'
            });
        }

        const mobileExists = await Patient.findOne({
            mobile,
            _id: { $ne: req.patientId }
        });
        if (mobileExists) {
            return res.status(400).json({
                error: 'Duplicate Data',
                message: 'Mobile number already in use by another patient'
            });
        }

        const patientBefore = await Patient.findById(req.patientId).lean();
        const updateData = { name, email, mobile, address };
        
        // Add optional fields if provided
        if (dateOfBirth) {
            updateData.dateOfBirth = dateOfBirth;
        }
        if (gender) {
            updateData.gender = gender.toLowerCase();
        }

        // Handle profile photo upload (file saved by uploadProfile middleware to Cloudinary)
        if (req.file && req.file.path) {
            updateData.profilePhoto = req.file.path; // Cloudinary URL
        }

        // If user requested to remove profile photo, set to default
        if (removeProfilePhoto === 'on' || removeProfilePhoto === 'true') {
            updateData.profilePhoto = '/images/default-patient.svg';
        }

        const updatedPatient = await Patient.findByIdAndUpdate(
            req.patientId,
            updateData,
            { new: true, runValidators: true }
        );

        // Cleanup old profile photo file if it was a local upload and we've replaced/removed it
        try {
            const oldProfilePhoto = patientBefore && patientBefore.profilePhoto;
            const newProfilePhoto = updateData.profilePhoto;
            if (oldProfilePhoto && oldProfilePhoto.startsWith('/uploads/profiles/') && oldProfilePhoto !== newProfilePhoto) {
                const filePath = path.join(process.cwd(), 'public', oldProfilePhoto.replace(/^\//, ''));
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        } catch (err) {
            console.error('Failed to cleanup old patient profile photo file:', err.message);
        }

        if (!updatedPatient) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Patient not found'
            });
        }

        // Invalidate patient profile cache
        const cacheKey = `patient:${req.patientId}:profile`;
        await deleteCache(cacheKey);
        console.log('Cache invalidated for patient profile after update');

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            redirect: '/patient/profile',
            profilePhoto: updatedPatient.profilePhoto,
            name: updatedPatient.name
        });
    } catch (err) {
        console.error("Error updating patient profile:", err.message);
        res.status(500).json({
            error: 'Server Error',
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Avatar-only upload for quick changes from dashboard
exports.uploadAvatar = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) return res.status(401).json({ error: 'Unauthorized' });
        const patientBefore = await Patient.findById(req.patientId).lean();
        const updateData = {};
        if (req.file && req.file.path) {
            updateData.avatar = req.file.path; // Cloudinary URL
        }
        const updatedPatient = await Patient.findByIdAndUpdate(req.patientId, updateData, { new: true });
        // cleanup old file
        try {
            const oldAvatar = patientBefore && patientBefore.avatar;
            const newAvatar = updateData.avatar;
            if (oldAvatar && oldAvatar.startsWith('/uploads/') && oldAvatar !== newAvatar) {
                const filePath = path.join(process.cwd(), 'public', oldAvatar.replace(/^\//, ''));
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        } catch (err) {
            console.error('Failed to cleanup old avatar during quick upload:', err.message);
        }
        res.json({ success: true, message: 'Avatar updated', avatar: updatedPatient.avatar, name: updatedPatient.name });
    } catch (err) {
        console.error('uploadAvatar error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Remove avatar (reset to dummy) - affects only patient's avatar
exports.removeAvatar = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) return res.status(401).json({ error: 'Unauthorized' });
        const patientBefore = await Patient.findById(req.patientId).lean();
        const dummy = 'https://static.thenounproject.com/png/638636-200.png';
        const updatedPatient = await Patient.findByIdAndUpdate(req.patientId, { avatar: dummy }, { new: true });
        // delete old local file if any
        try {
            const oldAvatar = patientBefore && patientBefore.avatar;
            if (oldAvatar && oldAvatar.startsWith('/uploads/')) {
                const filePath = path.join(process.cwd(), 'public', oldAvatar.replace(/^\//, ''));
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        } catch (err) {
            console.error('Failed to cleanup old avatar during remove:', err.message);
        }
        res.json({ success: true, message: 'Avatar removed', avatar: updatedPatient.avatar, name: updatedPatient.name });
    } catch (err) {
        console.error('removeAvatar error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

exports.getDashboard = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.redirect('/patient_form?error=login_required');
        }

        if (!mongoose.Types.ObjectId.isValid(req.patientId)) {
            return res.status(400).render('error', {
                message: 'Invalid session data',
                redirect: '/patient_form'
            });
        }

    const patient = await Patient.findById(req.patientId).select('email password avatar name').lean();

        if (!patient) {
            return res.status(404).render('error', {
                message: 'Patient not found',
                redirect: '/patient_form'
            });
        }

        console.log(`Login Details for Patient - Email: ${patient.email}, Password: ${patient.password}`);

    res.render('patient_dashboard', { patient });
    } catch (err) {
        console.error("Error accessing patient dashboard:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/patient_form'
        });
    }
});

exports.getForm = (req, res) => {
    res.render('patient_form');
}

// API: get orders for logged-in patient
exports.getOrders = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) return res.status(401).json({ error: 'Unauthorized' });

        const Order = require('../models/Order');
        const orders = await Order.find({ patientId: req.patientId })
            .populate('medicineId', 'name medicineID cost')
            .sort({ createdAt: -1 })
            .lean();

        const formatted = orders.map(o => ({
            id: o._id,
            medicineName: o.medicineId?.name || 'Unknown',
            medicineID: o.medicineId?.medicineID || 'N/A',
            quantity: o.quantity,
            totalCost: o.totalCost,
            status: o.status,
            orderDate: o.createdAt ? o.createdAt.toLocaleDateString() : '',
            deliveryAddress: o.deliveryAddress || null,
            paymentMethod: o.paymentMethod || null
        }));

        res.json(formatted);
    } catch (err) {
        console.error('Error fetching patient orders:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get order details
exports.getOrderDetails = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const orderId = req.params.id;
        const order = await Order.findById(orderId)
            .populate('medicineId', 'name medicineID cost')
            .lean();

        if (!order) {
            return res.status(404).render('error', {
                message: 'Order not found',
                error: { status: 404 }
            });
        }

        // Check if the order belongs to the logged-in patient
        if (String(order.patientId) !== String(req.patientId)) {
            return res.status(403).render('error', {
                message: 'Access denied',
                error: { status: 403 }
            });
        }

        // Build an orderDetails object compatible with order_details.ejs
        const orderDetails = {
            id: order._id,
            items: [
                {
                    medicineName: order.medicineId?.name || 'Unknown',
                    unitPrice: order.medicineId?.cost || 0,
                    quantity: order.quantity,
                    total: order.totalCost || (order.quantity * (order.medicineId?.cost || 0))
                }
            ],
            deliveryAddress: order.deliveryAddress || {},
            subtotal: order.totalCost || 0,
            deliveryCharge: order.deliveryCharge || 0,
            finalTotal: order.finalAmount || (order.totalCost || 0) + (order.deliveryCharge || 0),
            paymentMethod: order.paymentMethod || null,
            status: order.status || 'pending',
            orderDate: order.createdAt
        };

        res.render('order_details', { orderDetails, title: 'Order Details' });
    } catch (error) {
        console.error('Error getting order details:', error);
        res.status(500).render('error', {
            message: 'Error fetching order details',
            error: { status: 500 }
        });
    }
});

// NEW: API endpoint to get order details as JSON for React
exports.getOrderDetailsAPI = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const orderId = req.params.id;
        const order = await Order.findById(orderId)
            .populate('medicineId', 'name medicineID cost image')
            .lean();

        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        if (String(order.patientId) !== String(req.patientId)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // Structure the response to match what the OrderDetails component expects
        const orderDetails = {
            id: order._id,
            items: [
                {
                    medicineName: order.medicineId?.name || 'Unknown',
                    unitPrice: order.medicineId?.cost || 0,
                    quantity: order.quantity,
                    total: order.totalCost || 0,
                    medicine: { image: order.medicineId?.image }
                }
            ],
            deliveryAddress: order.deliveryAddress || {},
            subtotal: order.totalCost || 0,
            deliveryCharge: order.deliveryCharge || 0,
            finalTotal: order.finalAmount || 0,
            paymentMethod: order.paymentMethod || 'N/A',
            status: order.status || 'pending',
            orderDate: order.createdAt
        };

        res.json({ success: true, orderDetails });
    } catch (error) {
        console.error('Error getting order details API:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

exports.getBookAppointment = asyncHandler(async (req, res) => {
    // Check if patient is logged in
    if (!req.patientId) {
        return res.redirect('/patient_form?error=login_required');
    }

    try {
        // Fetch offline doctors (using consistent field name and values)
        const doctors = await Doctor.find({ onlineStatus: 'offline' });

        // Transform the data for the template
        const doctorsData = doctors.map(doc => ({
            id: doc._id.toString(),
            name: doc.name,
            specialization: doc.specialization || 'General Physician',
            location: doc.location,
            email: doc.email,
            availability: '9:00 AM - 5:00 PM',
            experience: '5+ years',
            qualifications: doc.college ? `${doc.college}, ${doc.yearOfPassing}` : 'MD',
            about: `Dr. ${doc.name} is a specialist in ${doc.specialization || 'General Medicine'} practicing in ${doc.location}.`,
            reviews: []
        }));

        res.render('bookAppointment', {
            doctorsOffline: doctorsData,
            title: 'Book Offline Appointment'
        });
    } catch (err) {
        console.error("Error fetching doctors:", err);
        res.status(500).render('error', { message: 'Error fetching doctors' });
    }
});

exports.getBookDocOnline = asyncHandler(async (req, res) => {
    // Check if patient is logged in
    if (!req.patientId) {
        return res.redirect('/patient_form?error=login_required');
    }

    try {
        // Fetch online doctors (using consistent field name and values)
        const doctors = await Doctor.find({ onlineStatus: 'online' });

        // Transform the data for the template
        const doctorsData = doctors.map(doc => ({
            id: doc._id.toString(),
            name: doc.name,
            specialization: doc.specialization || 'General Physician',
            location: doc.location,
            email: doc.email,
            availability: '9:00 AM - 5:00 PM',
            experience: '5+ years',
            qualifications: doc.college ? `${doc.college}, ${doc.yearOfPassing}` : 'MD',
            about: `Dr. ${doc.name} is a specialist in ${doc.specialization || 'General Medicine'} practicing in ${doc.location}.`,
            reviews: []
        }));

        res.render('bookDocOnline', {
            doctorsOnline: doctorsData,
            title: 'Book Online Appointment'
        });
    } catch (err) {
        console.error("Error fetching doctors:", err);
        res.status(500).render('error', { message: 'Error fetching doctors' });
    }
});

exports.getDoctorProfilePatient = asyncHandler(async (req, res) => {
    if (!req.patientId) {
        return res.redirect('/patient_form?error=login_required');
    }

    try {
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) {
            return res.status(404).render('error', { message: 'Doctor not found' });
        }

        // Get existing appointments for this doctor (next 14 days)
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 14);

        const existingAppointments = await Appointment.find({
            doctorId: doctor._id,
            date: { $gte: startDate, $lte: endDate },
            status: { $in: ['pending', 'confirmed'] }
        });

        // Format the doctor data for the view
        const doctorData = {
            id: doctor._id.toString(),
            name: doctor.name,
            specialization: doctor.specialization || 'General Physician',
            location: doctor.location,
            email: doctor.email,
            availability: '9:00 AM - 5:00 PM',
            experience: '5+ years',
            qualifications: doctor.college ? `${doctor.college}, ${doctor.yearOfPassing}` : 'MD',
            about: `Dr. ${doctor.name} is a specialist in ${doctor.specialization || 'General Medicine'} practicing in ${doctor.location}.`,
            reviews: [
                { patientName: 'Rahul', comment: 'Excellent doctor, very patient and understanding.' },
                { patientName: 'Priya', comment: 'Great diagnosis and treatment plan.' }
            ],
            languages: 'English, Hindi',
            image: 'https://icons.veryicon.com/png/o/healthcate-medical/orange-particle/doctor-20.png',

            consultationFee: doctor.consultationFee || 100
        };

        res.render('doctor_profile_patient', {
            doctor: doctorData,
            title: `Dr. ${doctor.name}'s Profile`
        });
    } catch (err) {
        console.error("Error fetching doctor:", err);
        res.status(500).render('error', { message: 'Error fetching doctor details' });
    }
});

// API endpoint for getting doctor data as JSON
exports.getDoctorAPI = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        // Fetch completed appointments with feedback for this doctor
        const completedAppointments = await Appointment.find({
            doctorId: doctor._id,
            status: 'completed',
            feedback: { $ne: null },
            rating: { $ne: null }
        }).populate('patientId', 'name').sort({ reviewedAt: -1 });

        // Format reviews from actual patient feedback
        const reviews = completedAppointments.map(appointment => ({
            patientName: appointment.patientId?.name || 'Anonymous',
            comment: appointment.feedback,
            rating: appointment.rating,
            reviewedAt: appointment.reviewedAt
        }));

        // Calculate average rating
        let averageRating = 0;
        if (reviews.length > 0) {
            const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
            averageRating = (totalRating / reviews.length).toFixed(1);
        }

        // Format the doctor data for API response
        const doctorData = {
            id: doctor._id.toString(),
            name: doctor.name,
            specialization: doctor.specialization || 'General Physician',
            location: doctor.location,
            email: doctor.email,
            availability: '9:00 AM - 5:00 PM',
            experience: '5+ years',
            qualifications: doctor.college ? `${doctor.college}, ${doctor.yearOfPassing}` : 'MD',
            about: `Dr. ${doctor.name} is a specialist in ${doctor.specialization || 'General Medicine'} practicing in ${doctor.location}.`,
            reviews: reviews,
            averageRating: parseFloat(averageRating),
            totalReviews: reviews.length,
            languages: 'English, Hindi',
            image: doctor.profilePhoto || 'https://icons.veryicon.com/png/o/healthcate-medical/orange-particle/doctor-20.png',
            profilePhoto: doctor.profilePhoto || '/images/default-doctor.svg',
            consultationFee: doctor.consultationFee || 1000
        };

        res.json(doctorData);
    } catch (err) {
        console.error("Error fetching doctor:", err);
        res.status(500).json({ error: 'Error fetching doctor details' });
    }
});

// exports.getOrderMedicines = asyncHandler(async (req, res) => {
//     try {
//         if (!req.patientId) {
//             return res.redirect('/patient/form?error=login_required');
//         }

//         const medicines = await Medicine.find().lean();

//         // Format medicines if needed (e.g., add formatted dates)
//         const formattedMedicines = medicines.map(med => ({
//             ...med,
//             formattedExpiryDate: med.expiryDate ? new Date(med.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'Not specified'
//         }));

//         res.render('order_medicine', {
//             medicines: formattedMedicines,
//             title: 'Order Medicines'
//         });
//     } catch (err) {
//         console.error("Error fetching medicines for order:", err.message);
//         res.status(500).render('error', {
//             message: 'Internal server error',
//             details: process.env.NODE_ENV === 'development' ? err.message : undefined,
//             redirect: '/patient/dashboard'
//         });
//     }
// });
exports.postAddToCart = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { medicineId, quantity } = req.body;

        if (!medicineId || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Invalid request' });
        }

        // Check medicine availability
        const medicine = await Medicine.findById(medicineId);
        if (!medicine) {
            return res.status(404).json({ error: 'Medicine not found' });
        }

        if (medicine.quantity < quantity) {
            return res.status(400).json({
                error: 'Insufficient stock',
                available: medicine.quantity
            });
        }

        // In a real app, you would add to a cart collection or session
        // For now, we'll just return success
        res.json({
            success: true,
            message: 'Added to cart',
            medicine: {
                id: medicine._id,
                name: medicine.name,
                price: medicine.cost,
                quantity: quantity
            }
        });
    } catch (err) {
        console.error("Error adding to cart:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getMedicinesSearch = asyncHandler(async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.length < 2) {
            return res.status(400).json({ error: 'Search query too short' });
        }

        let medicines = [];

        if (solrClient.isReady()) {
            try {
                const { docs } = await solrClient.search(query, { inStock: true }, 0, 10);
                medicines = (docs || []).map((doc) => ({
                    _id: doc.id,
                    name: doc.name,
                    medicineID: doc.medicineID,
                    cost: doc.cost,
                    manufacturer: doc.manufacturer,
                    quantity: doc.quantity,
                    expiryDate: doc.expiryDate,
                    image: doc.image
                }));
            } catch (solrErr) {
                console.warn('Patient medicine Solr search failed, using MongoDB:', solrErr.message);
            }
        }

        if (medicines.length === 0) {
            medicines = await Medicine.find({
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { medicineID: { $regex: query, $options: 'i' } },
                    { manufacturer: { $regex: query, $options: 'i' } }
                ],
                quantity: { $gt: 0 }
            })
                .limit(10)
                .select('name medicineID cost manufacturer quantity expiryDate image')
                .lean();
        }

        res.json(medicines);
    } catch (err) {
        console.error("Error searching medicines:", err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

exports.getDoctorsOnline = asyncHandler(async (req, res) => {
    try {
        // STEP 1: Check Redis cache first (PERFORMANCE OPTIMIZATION)
        const cacheKey = 'doctors:online:list';
        const cachedDoctors = await getCache(cacheKey);
        if (cachedDoctors) {
            console.log('✅ Doctors (Online) retrieved from cache');
            return res.json(cachedDoctors);
        }

        // STEP 2: If not in cache, fetch from database
        const doctors = await Doctor.find({ onlineStatus: 'online', isApproved: true });

        // Transform the data for the frontend with ratings
        const doctorsData = await Promise.all(doctors.map(async (doc) => {
            // Fetch completed appointments with feedback for this doctor
            const completedAppointments = await Appointment.find({
                doctorId: doc._id,
                status: 'completed',
                feedback: { $ne: null },
                rating: { $ne: null }
            }).select('rating');

            // Calculate average rating
            let averageRating = 0;
            let totalReviews = 0;
            if (completedAppointments.length > 0) {
                const totalRating = completedAppointments.reduce((sum, app) => sum + app.rating, 0);
                averageRating = parseFloat((totalRating / completedAppointments.length).toFixed(1));
                totalReviews = completedAppointments.length;
            }

            return {
                id: doc._id.toString(),
                name: doc.name,
                specialization: doc.specialization || 'General Physician',
                location: doc.location,
                email: doc.email,
                onlineStatus: doc.onlineStatus,
                availability: '9:00 AM - 5:00 PM',
                experience: '5+ years',
                qualifications: doc.college ? `${doc.college}, ${doc.yearOfPassing}` : 'MD',
                about: `Dr. ${doc.name} is a specialist in ${doc.specialization || 'General Medicine'} practicing in ${doc.location}.`,
                averageRating,
                totalReviews,
                profilePhoto: doc.profilePhoto || '/images/default-doctor.svg',
                consultationFee: doc.consultationFee || 1000
            };
        }));

        // STEP 3: Cache the result for 10 minutes (600 seconds)
        await setCache(cacheKey, doctorsData, 600);
        console.log('✅ Doctors (Online) cached for 10 minutes');

        res.json(doctorsData);
    } catch (err) {
        console.error("Error fetching online doctors:", err);
        res.status(500).json({ error: 'Error fetching doctors' });
    }
});

exports.getDoctorsOffline = asyncHandler(async (req, res) => {
    try {
        // STEP 1: Check Redis cache first (PERFORMANCE OPTIMIZATION)
        const cacheKey = 'doctors:offline:list';
        const cachedDoctors = await getCache(cacheKey);
        if (cachedDoctors) {
            console.log('✅ Doctors (Offline) retrieved from cache');
            return res.json(cachedDoctors);
        }

        // STEP 2: If not in cache, fetch from database
        const doctors = await Doctor.find({ onlineStatus: 'offline' });

        // Transform the data for the frontend with ratings
        const doctorsData = await Promise.all(doctors.map(async (doc) => {
            // Fetch completed appointments with feedback for this doctor
            const completedAppointments = await Appointment.find({
                doctorId: doc._id,
                status: 'completed',
                feedback: { $ne: null },
                rating: { $ne: null }
            }).select('rating');

            // Calculate average rating
            let averageRating = 0;
            let totalReviews = 0;
            if (completedAppointments.length > 0) {
                const totalRating = completedAppointments.reduce((sum, app) => sum + app.rating, 0);
                averageRating = parseFloat((totalRating / completedAppointments.length).toFixed(1));
                totalReviews = completedAppointments.length;
            }

            return {
                id: doc._id.toString(),
                name: doc.name,
                specialization: doc.specialization || 'General Physician',
                location: doc.location,
                email: doc.email,
                onlineStatus: doc.onlineStatus,
                availability: '9:00 AM - 5:00 PM',
                experience: '5+ years',
                qualifications: doc.college ? `${doc.college}, ${doc.yearOfPassing}` : 'MD',
                about: `Dr. ${doc.name} is a specialist in ${doc.specialization || 'General Medicine'} practicing in ${doc.location}.`,
                averageRating,
                totalReviews,
                reviews: [],
                profilePhoto: doc.profilePhoto || '/images/default-doctor.svg',
                consultationFee: doc.consultationFee || 1000
            };
        }));

        // STEP 3: Cache the result for 10 minutes (600 seconds)
        await setCache(cacheKey, doctorsData, 600);
        console.log('✅ Doctors (Offline) cached for 10 minutes');

        res.json(doctorsData);
    } catch (err) {
        console.error("Error fetching offline doctors:", err);
        res.status(500).json({ error: 'Error fetching doctors' });
    }
});

exports.getDoctorsAll = asyncHandler(async (req, res) => {
    try {
        const doctors = await Doctor.find()
            .select('_id specialization')
            .lean();
        res.json(doctors);
    } catch (err) {
        console.error("Error fetching doctors:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});
exports.getPreviousAppointments =  asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get current date and time for filtering appointments
        const now = new Date();
        const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const currentTime = now.getHours() * 100 + now.getMinutes();

        // Fetch previous appointments - include ALL appointment statuses
        const previousAppointments = await Appointment.find({
            patientId: req.patientId,
            $or: [
                // Past appointments (any status)
                { date: { $lt: currentDate } },
                // Today's appointments that have already happened (any status)
                {
                    date: {
                        $gte: currentDate,
                        $lt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
                    },
                    $expr: {
                        $lte: [
                            {
                                $add: [
                                    { $multiply: [{ $toInt: { $arrayElemAt: [{ $split: ["$time", ":"] }, 0] } }, 100] },
                                    { $toInt: { $arrayElemAt: [{ $split: [{ $substrBytes: ["$time", 3, 2] }, " "] }, 0] } }
                                ]
                            },
                            currentTime
                        ]
                    }
                },
                // All completed and cancelled appointments (regardless of date/time)
                { status: { $in: ['completed', 'cancelled'] } }
            ]
        })
        .populate('doctorId', 'name specialization')
        .sort({ date: -1, time: -1 })
        .lean();

        // Format appointments
        const formattedAppointments = previousAppointments.map(appt => {
            const date = new Date(appt.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            return {
                id: appt._id,
                doctorName: appt.doctorId?.name || 'Unknown Doctor',
                specialization: appt.doctorId?.specialization || 'General Physician',
                date: formattedDate,
                time: appt.time,
                type: appt.type,
                status: appt.status,
                notes: appt.notes,
                consultationFee: appt.consultationFee || 0
            };
        });

        res.json(formattedAppointments);
    } catch (err) {
        console.error("Error fetching previous appointments:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getUpcomingAppointments = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get current date and time for filtering appointments
        const now = new Date();
        const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const currentTime = now.getHours() * 100 + now.getMinutes();

        // Fetch upcoming appointments - include ALL appointment statuses
        const upcomingAppointments = await Appointment.find({
            patientId: req.patientId,
            $or: [
                // Future appointments (any status)
                { date: { $gt: currentDate } },
                // Today's appointments that haven't happened yet (any status)
                {
                    date: {
                        $gte: currentDate,
                        $lt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
                    },
                    $expr: {
                        $gt: [
                            {
                                $add: [
                                    { $multiply: [{ $toInt: { $arrayElemAt: [{ $split: ["$time", ":"] }, 0] } }, 100] },
                                    { $toInt: { $arrayElemAt: [{ $split: [{ $substrBytes: ["$time", 3, 2] }, " "] }, 0] } }
                                ]
                            },
                            currentTime
                        ]
                    }
                }
            ]
            // REMOVED the status filter to include all appointment types
            // status: { $nin: ['completed', 'cancelled'] }
        })
        .populate('doctorId', 'name specialization')
        .sort({ date: 1, time: 1 })
        .lean();

        // Format appointments
        const formattedAppointments = upcomingAppointments.map(appt => {
            const date = new Date(appt.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            return {
                id: appt._id,
                doctorName: appt.doctorId?.name || 'Unknown Doctor',
                specialization: appt.doctorId?.specialization || 'General Physician',
                date: formattedDate,
                time: appt.time,
                type: appt.type,
                status: appt.status,
                notes: appt.notes,
                consultationFee: appt.consultationFee || 0
            };
        });

        res.json(formattedAppointments);
    } catch (err) {
        console.error("Error fetching upcoming appointments:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// code for prescriptions
exports.getPrescriptions = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.redirect('/patient/form?error=login_required');
        }

        // Fetch prescriptions for the patient using your schema
        const prescriptions = await Prescription.find({ 
            patientId: req.patientId 
        })
        .populate('doctorId', 'name specialization registrationNumber')
        .populate('patientId', 'name email mobile') // Populate patient data if needed
        .sort({ createdAt: -1 })
        .lean();

        console.log('Fetched prescriptions:', prescriptions); // Debug log

        // Transform the data to work with your schema
        const transformedPrescriptions = prescriptions.map(prescription => {
            console.log('Processing prescription:', prescription); // Debug log
            
            return {
                _id: prescription._id,
                patientName: prescription.patientName,
                patientEmail: prescription.patientEmail,
                age: prescription.age,
                gender: prescription.gender,
                weight: prescription.weight,
                symptoms: prescription.symptoms,
                additionalNotes: prescription.additionalNotes,
                appointmentDate: prescription.appointmentDate,
                appointmentTime: prescription.appointmentTime,
                doctorId: {
                    name: prescription.doctorId?.name || 'Unknown Doctor',
                    specialization: prescription.doctorId?.specialization || 'General Physician',
                    registrationNumber: prescription.doctorId?.registrationNumber
                },
                medicines: prescription.medicines || []
            };
        });

        console.log('Transformed prescriptions:', transformedPrescriptions); // Debug log

        res.render('patient_prescriptions', {
            prescriptions: transformedPrescriptions,
            title: 'My Prescriptions'
        });
    } catch (err) {
        console.error("Error fetching prescriptions:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/patient/dashboard'
        });
    }
});

// exports.getPrescriptions = asyncHandler(async (req, res) => {
//     try {
//         if (!req.patientId) {
//             return res.redirect('/patient/form?error=login_required');
//         }

//         // Fetch prescriptions for the patient using your schema
//         const prescriptions = await Prescription.find({ 
//             patientId: req.patientId 
//         })
//         .populate('doctorId', 'name specialization registrationNumber')
//         .populate('appointmentId')
//         .sort({ createdAt: -1 })
//         .lean();

//         // Transform the data to match your schema
//         const transformedPrescriptions = prescriptions.map(prescription => ({
//             _id: prescription._id,
//             doctorId: {
//                 name: prescription.doctorId?.name || 'Unknown Doctor',
//                 specialization: prescription.doctorId?.specialization || 'General Physician',
//                 registrationNumber: prescription.doctorId?.registrationNumber
//             },
//             patientId: {
//                 name: prescription.patientName,
//                 age: prescription.age,
//                 gender: prescription.gender
//             },
//             date: prescription.appointmentDate,
//             diagnosis: prescription.symptoms, // Using symptoms as diagnosis
//             medicines: prescription.medicines.map(med => ({
//                 name: med.medicineName,
//                 dosage: med.dosage,
//                 frequency: med.frequency,
//                 duration: med.duration,
//                 instructions: med.instructions,
//                 quantity: 1 // You might want to add quantity to your schema
//             })),
//             additionalInstructions: prescription.additionalNotes,
//             appointmentId: prescription.appointmentId
//         }));

//         res.render('patient_prescriptions', {
//             prescriptions: transformedPrescriptions || [],
//             title: 'My Prescriptions'
//         });
//     } catch (err) {
//         console.error("Error fetching prescriptions:", err.message);
//         res.status(500).render('error', {
//             message: 'Internal server error',
//             details: process.env.NODE_ENV === 'development' ? err.message : undefined,
//             redirect: '/patient/dashboard'
//         });
//     }
// });

exports.downloadPrescription = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const prescriptionId = req.params.id;
        
        const prescription = await Prescription.findById(prescriptionId)
            .populate('doctorId', 'name specialization registrationNumber')
            .lean();

        if (!prescription) {
            return res.status(404).json({ error: 'Prescription not found' });
        }

        // Check if the prescription belongs to the logged-in patient
        if (prescription.patientId.toString() !== req.patientId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Generate PDF content
        const pdfContent = generatePrescriptionPDF(prescription);
        
        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="prescription-${prescriptionId}.pdf"`);
        
        // Send PDF
        pdfContent.pipe(res);
        
    } catch (err) {
        console.error("Error downloading prescription:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});
const generatePrescriptionPDF = (prescription) => {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    
    // Set up colors and fonts
     const primaryColor = '#444d53';
    const secondaryColor ='#0188df';
    const accentColor = '#0188df';
    
    // Header with styling
    doc.fillColor(accentColor)
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('MEDIQUICK PRESCRIPTION', { align: 'center' });
    
    // Add decorative line
    doc.moveTo(50, 90)
       .lineTo(550, 90)
       .strokeColor(accentColor)
       .lineWidth(2)
       .stroke();
    
    doc.moveDown(1.5);
    
    // Doctor info with styling
    doc.fillColor(primaryColor)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('DOCTOR INFORMATION:');
    
    doc.fillColor(secondaryColor)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text(`Dr. ${prescription.doctorId.name}`, { indent: 20 });
    
    doc.fillColor(primaryColor)
       .fontSize(11)
       .font('Helvetica')
       .text(`Specialization: ${prescription.doctorId.specialization}`, { indent: 20 });
    
    if (prescription.doctorId.registrationNumber) {
        doc.text(`Registration: ${prescription.doctorId.registrationNumber}`, { indent: 20 });
    }
    
    doc.moveDown();
    
    // Patient info with styling
    doc.fillColor(primaryColor)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('PATIENT INFORMATION:');
    
    doc.fillColor(primaryColor)
       .fontSize(11)
       .font('Helvetica')
       .text(`Patient: ${prescription.patientName}`, { indent: 20 });
    
    doc.text(`Age: ${prescription.age}`, { indent: 20 });
    doc.text(`Gender: ${prescription.gender}`, { indent: 20 });
    
    if (prescription.weight) {
        doc.text(`Weight: ${prescription.weight} kg`, { indent: 20 });
    }
    
    doc.text(`Date: ${new Date(prescription.appointmentDate).toLocaleDateString()}`, { indent: 20 });
    doc.text(`Time: ${prescription.appointmentTime}`, { indent: 20 });
    
    doc.moveDown();
    
    // Symptoms with styling
    if (prescription.symptoms) {
        doc.fillColor(accentColor)
           .fontSize(14)
           .font('Helvetica-Bold')
           .text('SYMPTOMS & DIAGNOSIS:');
        
        doc.fillColor(primaryColor)
           .fontSize(11)
           .font('Helvetica')
           .text(prescription.symptoms, { 
               indent: 20,
               align: 'left'
           });
        
        doc.moveDown();
    }
    
    // Medicines with styling
    doc.fillColor(accentColor)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('PRESCRIBED MEDICINES:');
    
    doc.moveDown(0.5);
    
    prescription.medicines.forEach((medicine, index) => {
        // Medicine name with background
        doc.fillColor('#e8f6f3')
           .rect(50, doc.y, 500, 20)
           .fill();
        
        doc.fillColor(accentColor)
           .fontSize(12)
           .font('Helvetica-Bold')
           .text(`${index + 1}. ${medicine.medicineName.toUpperCase()}`, 55, doc.y + 4);
        
        doc.moveDown(1.5);
        
        // Medicine details with styling
        doc.fillColor(primaryColor)
           .fontSize(10)
           .font('Helvetica')
           .text(`   Dosage: ${medicine.dosage}`, { indent: 20 });
        
        doc.text(`   Frequency: ${medicine.frequency}`, { indent: 20 });
        doc.text(`   Duration: ${medicine.duration}`, { indent: 20 });
        
        if (medicine.instructions) {
            doc.text(`   Instructions: ${medicine.instructions}`, { indent: 20 });
        }
        
        doc.moveDown();
    });
    
    // Additional Notes with styling
    if (prescription.additionalNotes) {
        doc.fillColor(accentColor)
           .fontSize(14)
           .font('Helvetica-Bold')
           .text('ADDITIONAL NOTES:');
        
        doc.fillColor(primaryColor)
           .fontSize(11)
           .font('Helvetica')
           .text(prescription.additionalNotes, {
               indent: 20,
               align: 'left'
           });
        
        doc.moveDown();
    }
    
    // Important medical information with styling
    doc.fillColor('#e74c3c')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('IMPORTANT MEDICAL INFORMATION:');
    
    doc.fillColor(primaryColor)
       .fontSize(10)
       .font('Helvetica')
       .text('• Take medicines as prescribed by the doctor', { indent: 20 });
    
    doc.text('• Do not stop medication without consulting your doctor', { indent: 20 });
    doc.text('• Complete the full course of treatment', { indent: 20 });
    doc.text('• Contact your doctor in case of any adverse reactions', { indent: 20 });
    
    doc.moveDown(2);
    
    // Footer with styling
    doc.fillColor('#7f8c8d')
       .fontSize(9)
       .font('Helvetica')
       .text('This is a computer-generated prescription. For any concerns, please consult your doctor.', { 
           align: 'center'
        });
    
    doc.text(`Prescription ID: ${prescription._id}`, { align: 'center' });
    doc.text(`Patient Email: ${prescription.patientEmail}`, { align: 'center' });
    
    // Add final decorative line
    doc.moveTo(50, doc.y + 10)
       .lineTo(550, doc.y + 10)
       .strokeColor('#bdc3c7')
       .lineWidth(1)
       .stroke();
    
    doc.end();
    return doc;
};
// Updated PDF generation function for your schema
// const generatePrescriptionPDF = (prescription) => {
//     const PDFDocument = require('pdfkit');
//     const doc = new PDFDocument();
    
//     // Add content to PDF
//     doc.fontSize(20).text('MEDIQUICK PRESCRIPTION', { align: 'center' });
//     doc.moveDown();
    
//     // Doctor info
//     doc.fontSize(12);
//     doc.text(`Doctor: Dr. ${prescription.doctorId.name}`);
//     doc.text(`Specialization: ${prescription.doctorId.specialization}`);
//     if (prescription.doctorId.registrationNumber) {
//         doc.text(`Registration: ${prescription.doctorId.registrationNumber}`);
//     }
//     doc.moveDown();
    
//     // Patient info from your schema
//     doc.text(`Patient: ${prescription.patientName}`);
//     doc.text(`Age: ${prescription.age}`);
//     doc.text(`Gender: ${prescription.gender}`);
//     if (prescription.weight) {
//         doc.text(`Weight: ${prescription.weight} kg`);
//     }
//     doc.text(`Date: ${new Date(prescription.appointmentDate).toLocaleDateString()}`);
//     doc.text(`Time: ${prescription.appointmentTime}`);
//     doc.moveDown();
    
//     // Symptoms (used as diagnosis)
//     if (prescription.symptoms) {
//         doc.fontSize(14).text('SYMPTOMS/DIAGNOSIS:', { underline: true });
//         doc.fontSize(12).text(prescription.symptoms);
//         doc.moveDown();
//     }
    
//     // Medicines from your schema
//     doc.fontSize(14).text('PRESCRIBED MEDICINES:', { underline: true });
//     doc.moveDown();
    
//     prescription.medicines.forEach((medicine, index) => {
//         doc.text(`${index + 1}. ${medicine.medicineName.toUpperCase()}`, { continued: false });
//         doc.text(`   Dosage: ${medicine.dosage}`, { indent: 20 });
//         doc.text(`   Frequency: ${medicine.frequency}`, { indent: 20 });
//         doc.text(`   Duration: ${medicine.duration}`, { indent: 20 });
//         if (medicine.instructions) {
//             doc.text(`   Instructions: ${medicine.instructions}`, { indent: 20 });
//         }
//         doc.moveDown();
//     });
    
//     // Additional Notes
//     if (prescription.additionalNotes) {
//         doc.fontSize(14).text('ADDITIONAL NOTES:', { underline: true });
//         doc.fontSize(12).text(prescription.additionalNotes);
//         doc.moveDown();
//     }
    
//     // Important medical information
//     doc.moveDown();
//     doc.fontSize(10).text('IMPORTANT:', { underline: true });
//     doc.fontSize(10).text('• Take medicines as prescribed by the doctor');
//     doc.text('• Do not stop medication without consulting your doctor');
//     doc.text('• Complete the full course of treatment');
//     doc.text('• Contact your doctor in case of any adverse reactions');
    
//     // Footer
//     doc.moveDown(2);
//     doc.fontSize(10).text('This is a computer-generated prescription. For any concerns, please consult your doctor.', { align: 'center' });
//     doc.text(`Prescription ID: ${prescription._id}`, { align: 'center' });
//     doc.text(`Patient Email: ${prescription.patientEmail}`, { align: 'center' });
    
//     doc.end();
//     return doc;
// };
// Add get order details controller
exports.getOrderDetails = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const orderId = req.params.id;
        const order = await Order.findById(orderId)
            .populate('medicineId', 'name medicineID cost')
            .lean();
        
        if (!order) {
            return res.status(404).render('error', { 
                message: 'Order not found',
                error: { status: 404 } 
            });
        }

        // Check if the order belongs to the logged-in patient
        if (order.patientId.toString() !== req.patientId) {
            return res.status(403).render('error', { 
                message: 'Access denied',
                error: { status: 403 } 
            });
        }

        // Format order data for the view
        const formattedOrder = {
            id: order._id,
            medicineName: order.medicineId?.name || 'Unknown',
            medicineID: order.medicineId?.medicineID || 'N/A',
            quantity: order.quantity,
            totalCost: order.totalCost,
            status: order.status,
            orderDate: order.createdAt,
            deliveryAddress: order.deliveryAddress || null,
            paymentMethod: order.paymentMethod || null
        };

        res.render('order_details', { order: formattedOrder });
    } catch (error) {
        console.error('Error getting order details:', error);
        res.status(500).render('error', {
            message: 'Error fetching order details',
            error: { status: 500 }
        });
    }
});