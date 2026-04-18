const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const {checkEmailExists, checkMobileExists} = require('../utils/utils');
const { generateToken } = require('../middlewares/auth');
const asyncHandler = require('../middlewares/asyncHandler');
const fs = require('fs');
const path = require('path');
const { sendOtpEmail } = require('../utils/email');
const { storePending, verifyPending, refreshOtp } = require('../utils/pendingSignups');
const { getCache, setCache, deleteCache } = require('../utils/redisClient');
const doctorSolrClient = require('../utils/doctorSolrClient');

function normalizeWord(value = '') {
    return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshtein(a = '', b = '') {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i += 1) dp[i][0] = i;
    for (let j = 0; j <= n; j += 1) dp[0][j] = j;

    for (let i = 1; i <= m; i += 1) {
        for (let j = 1; j <= n; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }

    return dp[m][n];
}

/**
 * @swagger
 * /doctor/signup:
 *   post:
 *     summary: Doctor Signup - Step 1 (Validate & Send OTP)
 *     description: Initiates doctor registration by validating information, uploading medical document, and sending OTP to email
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
 *               - registrationNumber
 *               - college
 *               - yearOfPassing
 *               - location
 *               - onlineStatus
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
 *                 pattern: '^[0-9]{10}$'
 *               address:
 *                 type: string
 *               registrationNumber:
 *                 type: string
 *               specialization:
 *                 type: string
 *               college:
 *                 type: string
 *               yearOfPassing:
 *                 type: string
 *               location:
 *                 type: string
 *               onlineStatus:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               consultationFee:
 *                 type: number
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               document:
 *                 type: string
 *                 format: binary
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

// ─── STEP 1: Validate, upload file, generate OTP, send email ─────────────────
exports.signup = asyncHandler(async (req, res) => {
    const {
        name, email, mobile, address, registrationNumber,
        specialization, college, yearOfPassing, location,
        onlineStatus, password, consultationFee,
        dateOfBirth, gender
    } = req.body;

    console.log('Received doctor signup request:', {
        name, email, mobile, address, registrationNumber,
        specialization, college, yearOfPassing, location,
        onlineStatus, password: '[REDACTED]',
        consultationFee, dateOfBirth, gender, document: req.file ? req.file.filename : 'None'
    });

    // Validate required fields
    if (!name || !email || !mobile || !address || !registrationNumber ||
        !college || !yearOfPassing || !location || !onlineStatus || !password) {
        return res.status(400).json({
            error: 'All fields are required',
            details: 'Please provide all required fields'
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

    const regNumRegex = /^[a-zA-Z0-9]{6,20}$/;
    if (!regNumRegex.test(registrationNumber)) {
        return res.status(400).json({
            error: 'Invalid registration number',
            details: 'Registration number must be 6-20 alphanumeric characters'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            error: 'Invalid password',
            details: 'Password must be at least 6 characters long'
        });
    }

    const fee = parseFloat(consultationFee) || 100;
    if (isNaN(fee) || fee < 0) {
        return res.status(400).json({
            error: 'Invalid consultation fee',
            details: 'Consultation fee must be a non-negative number'
        });
    }

    if (gender && !['male', 'female', 'other'].includes(gender.toLowerCase())) {
        return res.status(400).json({
            error: 'Invalid gender',
            details: 'Gender must be male, female, or other'
        });
    }

    // Check duplicates BEFORE creating any DB record
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

    const existingDoctor = await Doctor.findOne({ registrationNumber });
    if (existingDoctor) {
        return res.status(400).json({
            error: 'Registration number already in use',
            details: 'A doctor with this registration number already exists'
        });
    }

    // Multer already saved the file to Cloudinary — store its path for use after OTP verify
    const signupData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
        address: address.trim(),
        registrationNumber: registrationNumber.trim(),
        specialization: specialization ? specialization.trim() : '',
        college: college.trim(),
        yearOfPassing: String(yearOfPassing).trim(),
        location: location.trim(),
        onlineStatus: onlineStatus.trim(),
        password,
        documentPath: req.file ? req.file.path : null, // Cloudinary URL
        documentOriginalName: req.file ? req.file.originalname : null, // Store original filename
        consultationFee: fee,
        ...(dateOfBirth && { dateOfBirth }),
        ...(gender && { gender: gender.toLowerCase() })
    };

    const { pendingId, otp } = storePending(signupData);

    try {
        await sendOtpEmail(signupData.email, otp, 'doctor');
        console.log(`OTP sent to ${signupData.email} for doctor signup (pendingId: ${pendingId})`);
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
 * /doctor/signup/verify-otp:
 *   post:
 *     summary: Doctor Signup - Step 2 (Verify OTP & Create Account)
 *     description: Verifies OTP sent to email and creates doctor account. Account requires employee approval before login
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
 *         description: Account created and pending approval
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 redirect:
 *                   type: string
 *       400:
 *         description: Invalid OTP or session expired
 *       500:
 *         description: Internal server error
 */

// ─── STEP 2: Verify OTP → create Doctor → return success (no token; needs approval) ─
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

    // Final edge-case duplicate check
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

    // OTP verified — create the doctor record
    const newDoctor = new Doctor({
        ...signupData,
        password: hashedPassword
    });
    await newDoctor.save();
    console.log('Doctor account created after OTP verification:', signupData.email);

    // Doctors require employee approval before login — no token issued
    return res.status(201).json({
        message: 'Signup successful! Your account is pending approval. You will be able to login once approved.',
        redirect: '/doctor/form'
    });
});

/**
 * @swagger
 * /doctor/signup/resend-otp:
 *   post:
 *     summary: Resend OTP
 *     description: Resends OTP to doctor email during signup process
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
 *               - email
 *             properties:
 *               pendingId:
 *                 type: string
 *                 description: Pending signup ID
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Session expired or invalid pendingId
 *       500:
 *         description: Failed to resend OTP email
 */

// ─── OPTIONAL: Resend OTP ────────────────────────────────────────────────────
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
        await sendOtpEmail(email, refreshed.otp, 'doctor');
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
 * /doctor/login:
 *   post:
 *     summary: Doctor Login
 *     description: Authenticates doctor with email and password. Doctor must be approved by admin. Returns JWT token on successful login
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
 *                 redirect:
 *                   type: string
 *                 doctor:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid credentials or not approved
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



        const doctor = await Doctor.findOne({ email });

        if (!doctor) {
            return res.status(401).json({
                error: 'Invalid credentials',
                details: 'No doctor found with this email'
            });
        }

        if (!doctor.isApproved) {
            return res.status(401).json({
                error: 'Not approved yet. Wait for employee confirmation.'
            });
        }

        // Handle both bcrypt-hashed and plaintext passwords (lazy migration)
        let passwordMatch = false;
        
        if (doctor.password && doctor.password.startsWith('$2')) {
            // Password is bcrypt-hashed — use bcrypt.compare
            passwordMatch = await bcrypt.compare(password, doctor.password);
        } else {
            // Password is plaintext — verify and then migrate to bcrypt
            if (password === doctor.password) {
                passwordMatch = true;
                // Migrate on successful login
                const salt = await bcrypt.genSalt(10);
                doctor.password = await bcrypt.hash(password, salt);
                console.log('Doctor password migrated to bcrypt on login:', email);
            }
        }

        if (!passwordMatch) {
            return res.status(401).json({
                error: 'Invalid credentials',
                details: 'Incorrect password'
            });
        }

        // Update lastLogin
        doctor.lastLogin = new Date();
        await doctor.save();
        
        // Generate JWT token
        const token = generateToken(doctor._id.toString(), 'doctor');
        
        console.log('Doctor logged in, JWT token generated:', {
            doctorId: doctor._id.toString()
        });

        return res.status(200).json({
            message: 'Login successful',
            token: token,
            redirect: '/doctor/dashboard',
            doctor: {
                id: doctor._id,
                name: doctor.name,
                email: doctor.email
            }
        });
    } catch (err) {
        console.error("Error during doctor login:", err.message);
        return res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getProfile = asyncHandler(async (req, res) => {
    try {
        console.log('Session doctorId:', req.doctorId);

        if (!req.doctorId) {
            console.log('No doctorId in session');
            
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(401).json({ success: false, message: 'Unauthorized: Please log in.' });
            }
            return res.redirect('/doctor/form?error=login_required');
        }

        if (!mongoose.Types.ObjectId.isValid(req.doctorId)) {
            console.log('Invalid doctorId format:', req.doctorId);
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(400).json({ success: false, message: 'Invalid session data.' });
            }
            return res.status(400).render('error', {
                message: 'Invalid session data',
                redirect: '/doctor/form'
            });
        }

        const doctor = await Doctor.findById(req.doctorId).lean();
        
        if (!doctor) {
            console.log('Doctor not found');
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(404).json({ success: false, message: 'Doctor not found.' });
            }
            return res.status(404).render('error', {
                message: 'Doctor not found',
                redirect: '/doctor/form'
            });
        }

        if (!doctor.isApproved) {
            console.log('Doctor not approved');
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(403).json({ success: false, message: 'Your account is not yet approved.' });
            }
            return res.status(401).render('error', {
                message: 'Not approved yet. Wait for employee confirmation.',
                redirect: '/doctor/form'
            });
        }

        
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            const safeDoctor = { ...doctor };
            delete safeDoctor.password;
            delete safeDoctor.securityCode;
            return res.json({ success: true, doctor: safeDoctor });
        }

        

        const now = new Date();
        const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const currentTime = now.getHours() * 100 + now.getMinutes();

        const upcomingAppointments = await Appointment.find({
            doctorId: req.doctorId,
            isBlockedSlot: { $ne: true },
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
            status: { $in: ['pending', 'confirmed'] }
        })
        .populate('patientId', 'name')
        .sort({ date: 1, time: 1 })
        .lean();

        const previousAppointments = await Appointment.find({
            doctorId: req.doctorId,
            isBlockedSlot: { $ne: true },
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
        .populate('patientId', 'name')
        .sort({ date: -1, time: -1 })
        .lean();

        const formatAppointment = (appt) => {
            const date = new Date(appt.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            return {
                id: appt._id,
                patientId: appt.patientId || { name: 'Unknown Patient' },
                date: formattedDate,
                time: appt.time,
                type: appt.type,
                status: appt.status,
                notes: appt.notes
            };
        };

        console.log('Rendering doctor_profile view with doctor and appointments');
        res.render('doctor_profile', {
            doctor,
            upcomingAppointments: upcomingAppointments.map(formatAppointment),
            previousAppointments: previousAppointments.map(formatAppointment),
            title: 'Doctor Profile'
        });

    } catch (err) {
       console.error("Error fetching doctor profile:", err.message);
       if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/'
        });
    }      
});

exports.getUpcomingAppointments = asyncHandler(async (req, res) => {
    try {
        if (!req.doctorId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const now = new Date();
        const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const currentTime = now.getHours() * 100 + now.getMinutes();

        const upcomingAppointments = await Appointment.find({
            doctorId: req.doctorId,
            isBlockedSlot: { $ne: true },
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
           
            
        })
        .populate('patientId', 'name')
        .sort({ date: 1, time: 1 })
        .lean();

        res.json(upcomingAppointments);
    } catch (err) {
        console.error("Error fetching upcoming appointments:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getPreviousAppointments = asyncHandler(async (req, res) => {
    try {
        if (!req.doctorId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const now = new Date();
        const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const currentTime = now.getHours() * 100 + now.getMinutes();

        const previousAppointments = await Appointment.find({
            doctorId: req.doctorId,
            isBlockedSlot: { $ne: true },
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
                    }
                },
               
                { status: { $in: ['completed', 'cancelled'] } }
            ]
        })
        .populate('patientId', 'name')
        .sort({ date: -1, time: -1 })
        .lean();

        res.json(previousAppointments);
    } catch (err) {
        console.error("Error fetching previous appointments:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// exports.getUpcomingAppointments = asyncHandler(async (req, res) => {
//     try {
//         if (!req.doctorId) {
//             return res.status(401).json({ error: 'Unauthorized' });
//         }

//         const now = new Date();
//         const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//         const currentTime = now.getHours() * 100 + now.getMinutes();

//         const upcomingAppointments = await Appointment.find({
//             doctorId: req.doctorId,
//             isBlockedSlot: { $ne: true },
//             $or: [
//                 { date: { $gt: currentDate } },
//                 {
//                     date: {
//                         $gte: currentDate,
//                         $lt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
//                     },
//                     $expr: {
//                         $gt: [
//                             {
//                                 $add: [
//                                     { $multiply: [{ $toInt: { $arrayElemAt: [{ $split: ["$time", ":"] }, 0] } }, 100] },
//                                     { $toInt: { $arrayElemAt: [{ $split: [{ $substrBytes: ["$time", 3, 2] }, " "] }, 0] } }
//                                 ]
//                             },
//                             currentTime
//                         ]
//                     }
//                 }
//             ],
//             status: { $in: ['pending', 'confirmed'] }
//         })
//         .populate('patientId', 'name')
//         .sort({ date: 1, time: 1 })
//         .lean();

//         res.json(upcomingAppointments);
//     } catch (err) {
//         console.error("Error fetching upcoming appointments:", err.message);
//         res.status(500).json({
//             error: 'Internal server error',
//             details: process.env.NODE_ENV === 'development' ? err.message : undefined
//         });
//     }
// });

// exports.getPreviousAppointments = asyncHandler(async (req, res) => {
//     try {
//         if (!req.doctorId) {
//             return res.status(401).json({ error: 'Unauthorized' });
//         }

//         const now = new Date();
//         const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//         const currentTime = now.getHours() * 100 + now.getMinutes();

//         const previousAppointments = await Appointment.find({
//             doctorId: req.doctorId,
//             isBlockedSlot: { $ne: true },
//             $or: [
//                 { date: { $lt: currentDate } },
//                 {
//                     date: {
//                         $gte: currentDate,
//                         $lt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
//                     },
//                     $expr: {
//                         $lte: [
//                             {
//                                 $add: [
//                                     { $multiply: [{ $toInt: { $arrayElemAt: [{ $split: ["$time", ":"] }, 0] } }, 100] },
//                                     { $toInt: { $arrayElemAt: [{ $split: [{ $substrBytes: ["$time", 3, 2] }, " "] }, 0] } }
//                                 ]
//                             },
//                             currentTime
//                         ]
//                     },
//                     status: { $nin: ['completed', 'cancelled'] }
//                 },
//                 {
//                     date: {
//                         $gte: currentDate,
//                         $lt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
//                     },
//                     status: { $in: ['completed', 'cancelled'] }
//                 },
//                 {
//                     date: { $lt: currentDate },
//                     status: { $in: ['completed', 'cancelled'] }
//                 }
//             ]
//         })
//         .populate('patientId', 'name')
//         .sort({ date: -1, time: -1 })
//         .lean();

//         res.json(previousAppointments);
//     } catch (err) {
//         console.error("Error fetching previous appointments:", err.message);
//         res.status(500).json({
//             error: 'Internal server error',
//             details: process.env.NODE_ENV === 'development' ? err.message : undefined
//         });
//     }
// });

// Remove profile photo endpoint
exports.removeProfilePhoto = asyncHandler(async (req, res) => {
    try {
        if (!req.doctorId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        const doctorBefore = await Doctor.findById(req.doctorId).lean();
        const updateData = {
            profilePhoto: '/images/default-doctor.svg'
        };

        const updatedDoctor = await Doctor.findByIdAndUpdate(
            req.doctorId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedDoctor) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Doctor not found'
            });
        }

        
        try {
            // Cloudinary URLs don't need manual deletion handling
            // Cloudinary manages storage automatically
            // Old file cleanup happens automatically in Cloudinary
        } catch (err) {
            console.error('Error during cleanup:', err.message);
        }

        res.status(200).json({
            success: true,
            message: 'Profile photo removed successfully',
            profilePhoto: updatedDoctor.profilePhoto
        });
    } catch (err) {
        console.error("Error removing doctor profile photo:", err.message);
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
        console.log('Accessing /doctor_edit_profile, Session doctorId:', req.doctorId);
        if (!req.doctorId) {
            console.log('Redirecting to /doctor_form due to missing session');
            return res.redirect('/doctor/form?error=login_required');
        }

        if (!mongoose.Types.ObjectId.isValid(req.doctorId)) {
            console.log('Invalid doctorId format:', req.doctorId);
            return res.status(400).render('error', {
                message: 'Invalid session data',
                redirect: '/doctor/form'
            });
        }

        const doctor = await Doctor.findById(req.doctorId)
            .select('name email mobile address specialization college yearOfPassing location onlineStatus consultationFee profilePhoto')
            .lean();

        if (!doctor) {
            console.log('Doctor not found, rendering error view');
            return res.status(404).render('error', {
                message: 'Doctor not found',
                redirect: '/doctor/form'
            });
        }

        console.log('Rendering doctor_edit_profile view with doctor:', doctor);
        res.render('doctor_edit_profile', {
            doctor,
            title: 'Edit Doctor Profile'
        });
    } catch (err) {
        console.error("Error fetching doctor data for edit:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/'
        });
    }
});

exports.updateProfile = asyncHandler(async (req, res) => {
    try {
        console.log('Received POST /update_doctor_profile, Session doctorId:', req.doctorId);
        console.log('Request body:', req.body);

        if (!req.doctorId) {
            console.log('Unauthorized: No session doctorId');
            return res.status(401).json({ error: 'Unauthorized: Please log in first' });
        }

        if (!mongoose.Types.ObjectId.isValid(req.doctorId)) {
            console.log('Invalid doctorId format:', req.doctorId);
            return res.status(400).json({ error: 'Invalid session data' });
        }

    const { name, email, mobile, address, specialization, college, yearOfPassing, location, onlineStatus, consultationFee, dateOfBirth, gender, removeProfilePhoto } = req.body;

        if (!name || !email || !mobile || !address || !specialization || !college || !yearOfPassing || !location || !onlineStatus || !consultationFee) {
            console.log('Validation failed: Missing required fields');
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (isNaN(consultationFee) || consultationFee < 0) {
            console.log('Validation failed: Invalid consultation fee:', consultationFee);
            return res.status(400).json({ error: 'Consultation fee must be a valid non-negative number' });
        }
        
        // Validate optional fields
        if (gender && !['male', 'female', 'other'].includes(gender.toLowerCase())) {
            console.log('Validation failed: Invalid gender value:', gender);
            return res.status(400).json({ error: 'Invalid gender value' });
        }
        const ifemailExists = await checkEmailExists(email, req.doctorId);
        if (ifemailExists) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        // Check for existing mobile across all collections
        const ifmobileExists = await checkMobileExists(mobile, req.doctorId);
        if (ifmobileExists) {
            return res.status(400).json({ error: 'Mobile number already in use' });
        }
        const emailExists = await Doctor.findOne({ email, _id: { $ne: req.doctorId } });
        if (emailExists) {
            console.log('Validation failed: Email already in use:', email);
            return res.status(400).json({ error: 'Email already in use' });
        }

        const mobileExists = await Doctor.findOne({ mobile, _id: { $ne: req.doctorId } });
        if (mobileExists) {
            console.log('Validation failed: Mobile number already in use:', mobile);
            return res.status(400).json({ error: 'Mobile number already in use' });
        }

        const doctorBefore = await Doctor.findById(req.doctorId).lean();
        const updateData = { name, email, mobile, address, specialization, college, yearOfPassing, location, onlineStatus, consultationFee };
        
        // Add optional fields if provided
        if (dateOfBirth) {
            updateData.dateOfBirth = dateOfBirth;
        }
        if (gender) {
            updateData.gender = gender.toLowerCase();
        }

        // handle profile photo file if uploaded (uploadProfile stores in Cloudinary)
        if (req.file && req.file.path) {
            updateData.profilePhoto = req.file.path; // Cloudinary URL
        }

        if (removeProfilePhoto === 'on' || removeProfilePhoto === 'true') {
            updateData.profilePhoto = '/images/default-doctor.svg';
        }

        const updatedDoctor = await Doctor.findByIdAndUpdate(
            req.doctorId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedDoctor) {
            console.log('Doctor not found for update, ID:', req.doctorId);
            return res.status(404).json({ error: 'Doctor not found' });
        }

        
        try {
            const oldProfilePhoto = doctorBefore && doctorBefore.profilePhoto;
            const newProfilePhoto = updateData.profilePhoto;
            if (oldProfilePhoto && oldProfilePhoto.startsWith('/uploads/profiles/') && oldProfilePhoto !== newProfilePhoto) {
                const filePath = path.join(process.cwd(), 'public', oldProfilePhoto.replace(/^\//, ''));
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        } catch (err) {
            console.error('Failed to cleanup old doctor profile photo file:', err.message);
        }

        console.log('Doctor profile updated successfully:', updatedDoctor);
        
        // Invalidate doctor profile cache and doctor lists cache
        const doctorProfileCacheKey = `doctor:${req.doctorId}:profile`;
        await deleteCache(doctorProfileCacheKey);
        
        // Invalidate doctor lists (online/offline) as status may have changed
        await deleteCache('doctors:online:list');
        await deleteCache('doctors:offline:list');
        console.log('Cache invalidated for doctor profile and doctor lists after update');

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            redirect: '/doctor/profile',
            profilePhoto: updatedDoctor.profilePhoto,
            name: updatedDoctor.name
        });
    } catch (err) {
        console.error("Error updating doctor profile:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getDashboard = asyncHandler(async (req, res) => {
    // Check if doctor is logged in
    if (!req.doctorId) {
        return res.redirect('/doctor/form?error=login_required');
    }

    try {
        const doctor = await Doctor.findById(req.doctorId);
        if (!doctor) {
            return res.status(404).render('error', { message: 'Doctor not found' });
        }

        res.render('doctor_dashboard', { doctor });
    } catch (err) {
        console.error("Error fetching doctor data:", err);
        res.status(500).render('error', { message: 'Internal server error' });
    }
});

exports.getForm = (req, res) => {
    res.render('doctor_form');
}


exports.getDailyEarnings = asyncHandler(async (req, res) => {
    try {
        if (!req.doctorId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Fetch completed appointments for the doctor
        const appointments = await Appointment.find({
            doctorId: req.doctorId,
            isBlockedSlot: { $ne: true },
            status: 'completed'
        })
        .sort({ date: 1 })
        .lean();

        // Group appointments by date and calculate earnings
        const earningsByDate = {};
        
        appointments.forEach(appt => {
            const dateStr = appt.date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
            
            if (!earningsByDate[dateStr]) {
                earningsByDate[dateStr] = {
                    date: dateStr,
                    count: 0,
                    totalFees: 0,
                    totalRevenue: 0
                };
            }
            
            earningsByDate[dateStr].count++;
            earningsByDate[dateStr].totalFees += appt.consultationFee || 0;
            earningsByDate[dateStr].totalRevenue += (appt.consultationFee || 0) * 0.9; // Doctor keeps 90%
        });

        // Convert to array and sort by date (newest first)
        const dailyEarnings = Object.values(earningsByDate)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(dailyEarnings);
    } catch (err) {
        console.error("Error fetching daily earnings:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getDoctorAppiontments = asyncHandler(async (req, res) => {
    if (!req.doctorId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { status } = req.query;
        //   let query = { doctorId: req.doctorId };
        let query = {
            doctorId: req.doctorId,
            isBlockedSlot: { $ne: true } // Exclude blocked slots
        };

        if (status) {
            query.status = status;
        }

        const appointments = await Appointment.find(query)
            .populate('patientId', 'name email mobile')
            .sort({ date: 1, time: 1 });

        // Categorize appointments based on current date and time
        const now = new Date();
        const categorized = {
            upcoming: [],
            previous: []
        };

        appointments.forEach(appt => {
            const apptDate = new Date(appt.date);
            const [time, period] = appt.time.split(' ');
            let [hours, minutes] = time.split(':').map(Number);

            // Convert to 24-hour format
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;

            apptDate.setHours(hours, minutes, 0, 0);

            if (apptDate >= now && appt.status !== 'cancelled' && appt.status !== 'completed') {
                categorized.upcoming.push(appt);
            } else {
                categorized.previous.push(appt);
            }
        });

        res.json(categorized);
    } catch (err) {
        console.error("Error fetching appointments:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

exports.getDoctorDetails = asyncHandler(async (req, res) => {
    try {
        if (!req.doctorId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Please log in.' });
        }

        const doctor = await Doctor.findById(req.doctorId).lean();
        
        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found.' });
        }

        // Remove sensitive data
        const safeDoctor = { ...doctor };
        delete safeDoctor.password;
        delete safeDoctor.securityCode;

        res.json({ success: true, doctor: safeDoctor });
    } catch (err) {
        console.error("Error fetching doctor profile:", err.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// New code for presrciptions is writter here
// Add these routes to your doctorController.js

// Generate Prescription Page
// exports.getGeneratePrescriptionPage = asyncHandler(async (req, res) => {
//     try {
//         if (!req.doctorId) {
//             return res.redirect('/doctor_form?error=login_required');
//         }

//         // Fetch completed appointments for prescription generation
//         const appointments = await Appointment.find({
//             doctorId: req.doctorId,
//             status: 'completed'
//         })
//         .populate('patientId', 'name email mobile')
//         .sort({ date: -1 })
//         .lean();

//         res.render('generate_prescriptions', {
//             appointments,
//             title: 'Generate Prescription'
//         });
//     } catch (err) {
//         console.error("Error loading generate prescription page:", err.message);
//         res.status(500).render('error', {
//             message: 'Internal server error',
//             details: process.env.NODE_ENV === 'development' ? err.message : undefined,
//             redirect: '/doctor_dashboard'
//         });
//     }
// });

// // View Prescriptions Page
// exports.getPrescriptionsPage = asyncHandler(async (req, res) => {
//     try {
//         if (!req.doctorId) {
//             return res.redirect('/doctor_form?error=login_required');
//         }

//         // Fetch all prescriptions by this doctor
//         const prescriptions = await Prescription.find({ doctorId: req.doctorId })
//             .populate('patientId', 'name email mobile')
//             .populate('appointmentId', 'date time')
//             .sort({ createdAt: -1 })
//             .lean();

//         res.render('prescriptions', {
//             prescriptions,
//             title: 'My Prescriptions'
//         });
//     } catch (err) {
//         console.error("Error loading prescriptions page:", err.message);
//         res.status(500).render('error', {
//             message: 'Internal server error',
//             details: process.env.NODE_ENV === 'development' ? err.message : undefined,
//             redirect: '/doctor_dashboard'
//         });
//     }
// });

// Remove this line that's causing syntax error:
// New code for presrciptions is writter here

// And fix the function (remove the extra text):
exports.getGeneratePrescriptionPage = asyncHandler(async (req, res) => {
    try {
        console.log('Accessing generate prescription page, Session doctorId:', req.doctorId);
        
        if (!req.doctorId) {
            console.log('Redirecting to doctor form - no session');
            return res.redirect('/doctor/form?error=login_required');
        }

        // Verify doctor exists and is approved
        const doctor = await Doctor.findById(req.doctorId);
        if (!doctor) {
            console.log('Doctor not found');
            return res.redirect('/doctor/form?error=doctor_not_found');
        }

        if (!doctor.isApproved) {
            console.log('Doctor not approved');
            return res.redirect('/doctor/form?error=not_approved');
        }

        // Fetch completed appointments for prescription generation
        const appointments = await Appointment.find({
            doctorId: req.doctorId,
            status: 'completed',
            // Exclude appointments that already have prescriptions
            _id: { 
                $nin: await Prescription.distinct('appointmentId', { 
                    doctorId: req.doctorId 
                })
            }
        })
        .populate('patientId', 'name email mobile')
        .sort({ date: -1, time: -1 })
        .lean();

        console.log(`Found ${appointments.length} completed appointments for prescriptions`);

        res.render('generate_prescriptions', {
            appointments,
            title: 'Generate Prescription',
            doctorName: doctor.name
        });

    } catch (err) {
        console.error("Error loading generate prescription page:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/doctor/dashboard'
        });
    }
});

exports.getPrescriptionsPage = asyncHandler(async (req, res) => {
    try {
        console.log('Accessing prescriptions page, Session doctorId:', req.doctorId);
        
        if (!req.doctorId) {
            return res.redirect('/doctor/form?error=login_required');
        }

        
        const doctor = await Doctor.findById(req.doctorId);
        if (!doctor) {
            return res.redirect('/doctor/form?error=doctor_not_found');
        }

        
        const prescriptions = await Prescription.find({ doctorId: req.doctorId })
            .populate('patientId', 'name email mobile')
            .populate('appointmentId', 'date time type')
            .sort({ createdAt: -1 })
            .lean();

        console.log(`Found ${prescriptions.length} prescriptions`);

        res.render('prescriptions', {
            prescriptions,
            title: 'My Prescriptions',
            doctorName: doctor.name
        });

    } catch (err) {
        console.error("Error loading prescriptions page:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/doctor/dashboard'
        });
    }
});
// Add this function to your doctorController.js
// const generatePrescriptionPDF = (prescription) => {
//     const PDFDocument = require('pdfkit');
//     const doc = new PDFDocument();
    
//     // Add content to PDF
//     doc.fontSize(20).text('MEDIQUICK PRESCRIPTION', { align: 'center' });
//     doc.moveDown();
    
//     // Doctor info
//     doc.fontSize(12);
//     doc.text(`Doctor: Dr. ${prescription.doctorId?.name || 'Unknown Doctor'}`);
//     doc.text(`Specialization: ${prescription.doctorId?.specialization || 'General Physician'}`);
//     if (prescription.doctorId?.registrationNumber) {
//         doc.text(`Registration: ${prescription.doctorId.registrationNumber}`);
//     }
//     doc.moveDown();
    
//     // Patient info
//     doc.text(`Patient: ${prescription.patientName}`);
//     doc.text(`Email: ${prescription.patientEmail}`);
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
    
//     // Medicines
//     doc.fontSize(14).text('PRESCRIBED MEDICINES:', { underline: true });
//     doc.moveDown();
    
//     if (prescription.medicines && prescription.medicines.length > 0) {
//         prescription.medicines.forEach((medicine, index) => {
//             doc.text(`${index + 1}. ${medicine.medicineName.toUpperCase()}`, { continued: false });
//             doc.text(`   Dosage: ${medicine.dosage}`, { indent: 20 });
//             doc.text(`   Frequency: ${medicine.frequency}`, { indent: 20 });
//             doc.text(`   Duration: ${medicine.duration}`, { indent: 20 });
//             if (medicine.instructions) {
//                 doc.text(`   Instructions: ${medicine.instructions}`, { indent: 20 });
//             }
//             doc.moveDown();
//         });
//     } else {
//         doc.text('No medicines prescribed');
//         doc.moveDown();
//     }
    
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
//     doc.text(`Doctor: Dr. ${prescription.doctorId?.name || 'Unknown Doctor'}`, { align: 'center' });
    
//     doc.end();
//     return doc;
// };

// Add this download function to your doctorController.js
// exports.downloadPrescription = asyncHandler(async (req, res) => {
//     try {
//         if (!req.doctorId) {
//             return res.status(401).json({ error: 'Unauthorized' });
//         }

//         const prescriptionId = req.params.id;
        
//         const prescription = await Prescription.findById(prescriptionId)
//             .populate('doctorId', 'name specialization registrationNumber')
//             .lean();

//         if (!prescription) {
//             return res.status(404).json({ error: 'Prescription not found' });
//         }

//         // Check if the prescription belongs to the logged-in doctor
//         if (prescription.doctorId && prescription.doctorId._id.toString() !== req.doctorId) {
//             return res.status(403).json({ error: 'Access denied' });
//         }

//         // Generate PDF
//         const pdfContent = generatePrescriptionPDF(prescription);
        
//         // Set headers for PDF download
//         res.setHeader('Content-Type', 'application/pdf');
//         res.setHeader('Content-Disposition', `attachment; filename="prescription-${prescriptionId}.pdf"`);
        
//         // Send PDF
//         pdfContent.pipe(res);
        
//     } catch (err) {
//         console.error("Error downloading prescription:", err.message);
//         res.status(500).json({
//             error: 'Internal server error',
//             details: process.env.NODE_ENV === 'development' ? err.message : undefined
//         });
//     }
// });
// In your doctorController.js or prescriptionController.js
// Updated generatePrescriptionPDF function with better styling
const generatePrescriptionPDF = (prescription) => {
    const PDFDocument = require('pdfkit');
const asyncHandler = require('../middlewares/asyncHandler');
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
//this is the 2nd latest one
// exports.downloadPrescription = asyncHandler(async (req, res) => {
//     try {
//         if (!req.doctorId) {
//             return res.status(401).json({ error: 'Unauthorized' });
//         }

//         const prescriptionId = req.params.id;
        
//         const prescription = await Prescription.findById(prescriptionId)
//             .populate('patientId', 'name email mobile')
//             .lean();

//         if (!prescription) {
//             return res.status(404).json({ error: 'Prescription not found' });
//         }

//         // Check if the prescription belongs to the logged-in doctor
//         if (prescription.doctorId.toString() !== req.doctorId) {
//             return res.status(403).json({ error: 'Access denied' });
//         }

//         // Generate PDF using your existing function (same as patient)
//         const pdfContent = generatePrescriptionPDF(prescription);
        
//         // Set headers for PDF download
//         res.setHeader('Content-Type', 'application/pdf');
//         res.setHeader('Content-Disposition', `attachment; filename="prescription-${prescriptionId}.pdf"`);
        
//         // Send PDF
//         pdfContent.pipe(res);
        
//     } catch (err) {
//         console.error("Error downloading prescription:", err.message);
//         res.status(500).json({
//             error: 'Internal server error',
//             details: process.env.NODE_ENV === 'development' ? err.message : undefined
//         });
//     }
// });

exports.downloadPrescription = asyncHandler(async (req, res) => {
    try {
        if (!req.doctorId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const prescriptionId = req.params.id;
        
        // Get prescription without populate first
        const prescription = await Prescription.findById(prescriptionId)
            .populate('patientId', 'name email mobile')
            .lean();

        if (!prescription) {
            return res.status(404).json({ error: 'Prescription not found' });
        }

        // Check if the prescription belongs to the logged-in doctor
        if (prescription.doctorId.toString() !== req.doctorId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get doctor details separately
        const doctor = await Doctor.findById(req.doctorId)
            .select('name specialization registrationNumber')
            .lean();

        // Create a new object with doctor data
        const prescriptionWithDoctor = {
            ...prescription,
            doctorId: doctor // Replace the ObjectId with actual doctor data
        };

        console.log('=== COMBINED PRESCRIPTION DATA ===');
        console.log('Doctor Name:', prescriptionWithDoctor.doctorId.name);
        console.log('Specialization:', prescriptionWithDoctor.doctorId.specialization);
        console.log('=== END COMBINED DATA ===');

        // Generate PDF with the combined data
        const pdfContent = generatePrescriptionPDF(prescriptionWithDoctor);
        
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

// Remove avatar for doctor (reset to dummy and delete local file)
exports.removeAvatar = asyncHandler(async (req, res) => {
    try {
        if (!req.doctorId) return res.status(401).json({ error: 'Unauthorized' });
        const doctorBefore = await Doctor.findById(req.doctorId).lean();
        const dummy = 'https://static.thenounproject.com/png/638636-200.png';
        const updatedDoctor = await Doctor.findByIdAndUpdate(req.doctorId, { avatar: dummy }, { new: true });
        try {
            const oldAvatar = doctorBefore && doctorBefore.avatar;
            if (oldAvatar && oldAvatar.startsWith('/uploads/')) {
                const filePath = path.join(process.cwd(), 'public', oldAvatar.replace(/^\//, ''));
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        } catch (err) {
            console.error('Failed to cleanup old doctor avatar during remove:', err.message);
        }
        res.json({ success: true, message: 'Avatar removed', avatar: updatedDoctor.avatar, name: updatedDoctor.name });
    } catch (err) {
        console.error('doctor removeAvatar error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get doctor profile data for dashboard (JSON response)
exports.getProfileData = asyncHandler(async (req, res) => {
  try {
    if (!req.doctorId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Try cache first
    const cacheKey = `doctor:${req.doctorId}:profile`;
    const cachedProfile = await getCache(cacheKey);
    if (cachedProfile) {
      console.log('✅ Doctor profile from Redis');
      return res.json(cachedProfile);
    }

    console.log('❌ Doctor profile from DB');
    const doctor = await Doctor.findById(req.doctorId).select('_id name email profilePhoto specialization').lean();
    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }

    const profileData = { success: true, doctor };
    
    // Cache result for 30 minutes (1800 seconds)
    await setCache(cacheKey, profileData, 1800);

    res.json(profileData);
  } catch (err) {
    console.error('Error fetching doctor profile data:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Ensure getDoctorAppointments returns JSON (add or update if needed)
exports.getDoctorAppointments = asyncHandler(async (req, res) => {
  if (!req.doctorId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { status } = req.query;
    let query = {
      doctorId: req.doctorId,
      isBlockedSlot: { $ne: true } // Exclude blocked slots
    };

    if (status) {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name email mobile')
      .sort({ date: 1, time: 1 });

    // Categorize appointments based on current date and time
    const now = new Date();
    const categorized = {
      upcoming: [],
      previous: []
    };

    appointments.forEach(appt => {
      const apptDate = new Date(appt.date);
      const [time, period] = appt.time.split(' ');
      let [hours, minutes] = time.split(':').map(Number);

      // Convert to 24-hour format
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      const apptTime = new Date(apptDate);
      apptTime.setHours(hours, minutes, 0, 0);

      if (apptTime >= now && ['pending', 'confirmed'].includes(appt.status)) {
        categorized.upcoming.push(appt);
      } else {
        categorized.previous.push(appt);
      }
    });

    res.json(categorized);
  } catch (err) {
    console.error("Error fetching doctor's appointments:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add this to your doctorController.js
exports.getDoctorAppointmentsAPI = asyncHandler(async (req, res) => {
  try {
    if (!req.doctorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const appointments = await Appointment.find({
      doctorId: req.doctorId,
      isBlockedSlot: { $ne: true }
    })
    .populate('patientId', 'name email mobile')
    .sort({ date: 1, time: 1 })
    .lean();

    // Categorize appointments
    const now = new Date();
    const categorized = {
      upcoming: [],
      previous: []
    };

    appointments.forEach(appt => {
      const apptDate = new Date(appt.date);
      const [time, period] = appt.time.split(' ');
      let [hours, minutes] = time.split(':').map(Number);

      // Convert to 24-hour format
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      const apptDateTime = new Date(apptDate);
      apptDateTime.setHours(hours, minutes, 0, 0);

      if (apptDateTime >= now && ['pending', 'confirmed'].includes(appt.status)) {
        categorized.upcoming.push(appt);
      } else {
        categorized.previous.push(appt);
      }
    });

    res.json(categorized);
  } catch (err) {
    console.error("Error fetching doctor appointments:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctor schedule for a specific date
exports.getDoctorSchedule = asyncHandler(async (req, res) => {
  try {
    if (!req.doctorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Parse the date and create start/end of day
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Fetch all appointments for the doctor on the specified date
    const appointments = await Appointment.find({
      doctorId: req.doctorId,
      date: { $gte: startDate, $lte: endDate }
    })
    .populate('patientId', 'name email mobile')
    .sort({ time: 1 })
    .lean();

    res.json(appointments);
  } catch (err) {
    console.error("Error fetching doctor schedule:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public doctor search endpoint with Solr-first strategy and MongoDB fallback
exports.searchDoctors = asyncHandler(async (req, res) => {
    try {
        const { query = '', specialization = '', onlineStatus = '' } = req.query;
        const trimmedQuery = String(query || '').trim();
        let doctors = [];
        let source = 'mongodb';

        if (doctorSolrClient.isReady()) {
            try {
                const { docs } = await doctorSolrClient.search(trimmedQuery, { specialization, onlineStatus }, 0, 10);
                if (docs.length > 0) {
                    doctors = docs.map((doc) => ({
                        _id: doc.id,
                        name: doc.name,
                        specialization: doc.specialization,
                        location: doc.location,
                        consultationFee: doc.consultationFee,
                        profilePhoto: doc.profilePhoto,
                        onlineStatus: doc.onlineStatus,
                        registrationNumber: doc.registrationNumber
                    }));
                    source = 'solr';
                }
            } catch (solrErr) {
                console.warn('Doctor Solr search failed, falling back to MongoDB:', solrErr.message);
            }
        }

        if (doctors.length === 0) {
            const searchCondition = { isApproved: true, isRejected: { $ne: true } };

            if (specialization) {
                searchCondition.specialization = { $regex: specialization, $options: 'i' };
            }

            if (onlineStatus) {
                searchCondition.onlineStatus = onlineStatus;
            }

            if (trimmedQuery) {
                searchCondition.$or = [
                    { name: { $regex: trimmedQuery, $options: 'i' } },
                    { specialization: { $regex: trimmedQuery, $options: 'i' } },
                    { location: { $regex: trimmedQuery, $options: 'i' } },
                    { registrationNumber: { $regex: trimmedQuery, $options: 'i' } }
                ];
            }

            doctors = await Doctor.find(searchCondition)
                .select('name specialization location consultationFee profilePhoto onlineStatus registrationNumber')
                .sort({ name: 1 })
                .limit(10)
                .lean();

            // Extra typo-tolerant fallback for hard misspellings (example: vaneeth -> vineeth)
            if (doctors.length === 0 && trimmedQuery.length >= 4) {
                const normalizedQuery = normalizeWord(trimmedQuery);
                const fuzzyBaseCondition = { isApproved: true, isRejected: { $ne: true } };
                if (specialization) {
                    fuzzyBaseCondition.specialization = { $regex: specialization, $options: 'i' };
                }
                if (onlineStatus) {
                    fuzzyBaseCondition.onlineStatus = onlineStatus;
                }

                const allApprovedDoctors = await Doctor.find(fuzzyBaseCondition)
                    .select('name specialization location consultationFee profilePhoto onlineStatus registrationNumber')
                    .lean();

                const candidates = allApprovedDoctors
                    .map((doctor) => {
                        const score = Math.min(
                            levenshtein(normalizedQuery, normalizeWord(doctor.name || '')),
                            levenshtein(normalizedQuery, normalizeWord(doctor.specialization || '')),
                            levenshtein(normalizedQuery, normalizeWord(doctor.location || '')),
                            levenshtein(normalizedQuery, normalizeWord(doctor.registrationNumber || ''))
                        );
                        return { doctor, score };
                    })
                    .filter((item) => item.score <= 3)
                    .sort((a, b) => a.score - b.score)
                    .slice(0, 10)
                    .map((item) => item.doctor);

                if (candidates.length > 0) {
                    doctors = candidates;
                    source = 'fuzzy-fallback';
                }
            }
        }

        return res.status(200).json({
            success: true,
            doctors,
            count: doctors.length,
            source
        });
    } catch (err) {
        console.error('Error searching doctors:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to search doctors',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    }
});