const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');
const Supplier = require('../models/Supplier');
const Employee = require('../models/Employee');
const Appointment = require('../models/Appointment');
const Order = require('../models/Order');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cloudinary = require('cloudinary').v2;
const { EMPLOYEE_SECURITY_CODE } = require('../constants/constants');
const { generateToken } = require('../middlewares/auth');
const { getCloudinaryUrl } = require('../middlewares/upload');

const {checkEmailExists, checkMobileExists} = require('../utils/utils');
const asyncHandler = require('../middlewares/asyncHandler');
const { deleteCache } = require('../utils/redisClient');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const parseCloudinaryAssetFromUrl = (url) => {
    try {
        const parsed = new URL(url);
        if (!parsed.hostname.includes('res.cloudinary.com')) return null;

        const parts = parsed.pathname.split('/').filter(Boolean);
        // Expected: /<cloud_name>/<resource_type>/upload/<transforms...>/<version?>/<public_id>
        if (parts.length < 4) return null;

        const resourceType = parts[1];
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex === -1 || uploadIndex + 1 >= parts.length) return null;

        const tail = parts.slice(uploadIndex + 1);
        const versionRegex = /^v\d+$/;

        // Skip transformation segments until a version/public_id section starts.
        let startIndex = tail.findIndex(seg => versionRegex.test(seg));
        if (startIndex === -1) {
            startIndex = tail.findIndex(seg => seg.includes('.'));
            if (startIndex === -1) {
                startIndex = 0;
            }
        } else {
            startIndex += 1;
        }

        const publicSegments = tail.slice(startIndex).filter(Boolean);
        if (!publicSegments.length) return null;

        const last = publicSegments[publicSegments.length - 1];
        const dotIndex = last.lastIndexOf('.');
        const format = dotIndex > -1 ? last.substring(dotIndex + 1).toLowerCase() : undefined;
        if (dotIndex > -1) {
            publicSegments[publicSegments.length - 1] = last.substring(0, dotIndex);
        }

        const publicId = publicSegments.join('/');
        if (!publicId) return null;

        return { resourceType, publicId, format };
    } catch (err) {
        return null;
    }
};

const buildSignedCloudinaryUrl = (url, asAttachment = false) => {
    const asset = parseCloudinaryAssetFromUrl(url);
    if (!asset) return null;

    const options = {
        resource_type: asset.resourceType || 'image',
        type: 'upload',
        secure: true,
        sign_url: true
    };

    if (asset.format) {
        options.format = asset.format;
    }

    if (asAttachment) {
        options.flags = 'attachment';
    }

    return cloudinary.url(asset.publicId, options);
};

const buildCloudinaryCandidateUrls = (url, asAttachment = false) => {
    const asset = parseCloudinaryAssetFromUrl(url);
    if (!asset) return [];

    const resourceType = asset.resourceType || 'image';
    const baseOptions = {
        resource_type: resourceType,
        secure: true,
        sign_url: true
    };

    if (asset.format) {
        baseOptions.format = asset.format;
    }

    if (asAttachment) {
        baseOptions.flags = 'attachment';
    }

    const candidates = [];
    ['upload', 'authenticated', 'private'].forEach((deliveryType) => {
        candidates.push(
            cloudinary.url(asset.publicId, {
                ...baseOptions,
                type: deliveryType
            })
        );
    });

    if (asset.format) {
        try {
            candidates.push(
                cloudinary.utils.private_download_url(asset.publicId, asset.format, {
                    resource_type: resourceType,
                    type: 'upload',
                    attachment: asAttachment
                })
            );
            candidates.push(
                cloudinary.utils.private_download_url(asset.publicId, asset.format, {
                    resource_type: resourceType,
                    type: 'authenticated',
                    attachment: asAttachment
                })
            );
            candidates.push(
                cloudinary.utils.private_download_url(asset.publicId, asset.format, {
                    resource_type: resourceType,
                    type: 'private',
                    attachment: asAttachment
                })
            );

            // Some records are stored as image PDFs; also test raw download API path.
            if (resourceType !== 'raw') {
                candidates.push(
                    cloudinary.utils.private_download_url(asset.publicId, asset.format, {
                        resource_type: 'raw',
                        type: 'upload',
                        attachment: asAttachment
                    })
                );
            }
        } catch (err) {
            // Ignore utility-level errors and proceed with other candidates.
        }
    }

    return candidates.filter(Boolean);
};

const findReachableCloudinaryUrl = async (url, asAttachment = false) => {
    const candidates = buildCloudinaryCandidateUrls(url, asAttachment);
    if (!candidates.length) {
        return url;
    }

    for (const candidate of candidates) {
        try {
            const response = await fetch(candidate, {
                method: 'GET',
                redirect: 'follow',
                headers: {
                    Range: 'bytes=0-0'
                }
            });
            if (response.status >= 200 && response.status < 400) {
                return candidate;
            }
        } catch (err) {
            // Try the next candidate.
        }
    }

    // Fall back to the first signed candidate even if HEAD probes fail.
    return candidates[0];
};

const fetchCloudinaryAsset = async (url, asAttachment = false) => {
    const candidates = buildCloudinaryCandidateUrls(url, asAttachment);
    if (!candidates.length) {
        return null;
    }

    for (const candidate of candidates) {
        try {
            const response = await fetch(candidate, { method: 'GET', redirect: 'follow' });
            if (response.ok) {
                return { response, sourceUrl: candidate };
            }
        } catch (err) {
            // Try the next candidate.
        }
    }

    return null;
};

const resolveDocumentAccessUrl = (documentPath, req, fallbackFilename = 'document.pdf') => {
    if (!documentPath) return null;

    const normalized = String(documentPath).replace(/\\/g, '/').trim();
    if (!normalized) return null;

    if (normalized.startsWith('http')) {
        if (normalized.includes('res.cloudinary.com')) {
            try {
                const parsed = new URL(normalized);
                parsed.searchParams.delete('dl');

                return parsed.toString();
            } catch (err) {
                const stripped = normalized.replace(/([?&])dl=1(&|$)/, (match, p1, p2) => {
                    if (p1 === '?' && p2) return '?';
                    if (p1 === '?' && !p2) return '';
                    if (p1 === '&' && p2) return '&';
                    return '';
                }).replace(/[?&]$/, '');
                return stripped;
            }
        }
        return normalized;
    }

    const localPath = normalized.startsWith('/uploads/')
        ? normalized
        : (normalized.startsWith('uploads/') ? `/${normalized}` : null);

    if (localPath) {
        return `${req.protocol}://${req.get('host')}${localPath}`;
    }

    return getCloudinaryUrl(normalized, fallbackFilename);
};

/**
 * @swagger
 * /employee/signup:
 *   post:
 *     summary: Employee Signup with Security Code
 *     description: Registers a new employee with profile photo, document, and security code verification
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
 *               - address
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
 *               password:
 *                 type: string
 *                 format: password
 *               securityCode:
 *                 type: string
 *                 description: Employee security code for registration
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *               document:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Employee account created
 *       400:
 *         description: Invalid security code, missing fields, or duplicates
 *       500:
 *         description: Internal server error
 */

exports.signup = asyncHandler(async (req, res) => {
    const {
        name,
        email,
        mobile,
        address,
        password,
        securityCode
    } = req.body;

    try {
        if (!name || !email || !mobile || !address || !password || !securityCode) {
            return res.status(400).json({
                error: 'All fields are required',
                details: 'Missing name, email, mobile, address, password, or security code'
            });
        }

        if (securityCode !== EMPLOYEE_SECURITY_CODE) {
            return res.status(400).json({
                error: 'Invalid security code',
                details: 'The provided security code is incorrect'
            });
        }
        // Enforce uniqueness within Employee collection only
        const existingEmployee = await Employee.findOne({ email });

        if (existingEmployee) {
            return res.status(400).json({
                error: 'Employee with this email already exists',
                details: 'Email must be unique'
            });
        }

        // Ensure mobile is unique within Employee collection
        const existingMobileEmployee = await Employee.findOne({ mobile });
        if (existingMobileEmployee) {
            return res.status(400).json({
                error: 'Mobile number already in use',
                details: 'This mobile number is already registered with another employee'
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
        
        // Use the actual uploaded file URLs from Cloudinary
        const profilePhotoFile = req.files.profilePhoto[0];
        const documentFile = req.files.document[0];
        
        const profilePhoto = profilePhotoFile.path; // Cloudinary URL
        const documentPath = documentFile.path; // Cloudinary URL

        // Hash password with bcrypt before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newEmployee = new Employee({
            name,
            email,
            mobile,
            address,
            password: hashedPassword,
            profilePhoto,
            documentPath
        });

        await newEmployee.save();

        res.status(201).json({
            message: 'Signup successful',
            redirect: '/employee_form'
        });
    } catch (err) {
        console.error("Error during employee signup:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

/**
 * @swagger
 * /employee/login:
 *   post:
 *     summary: Employee Login with Security Code
 *     description: Authenticates employee with email, password and security code, returns JWT token
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
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */

exports.login = asyncHandler(async (req, res) => {
    const { email, password, securityCode } = req.body;

    try {
        if (!email || !password || !securityCode) {
            return res.status(400).json({
                error: 'All fields are required',
                details: 'Missing email, password, or security code'
            });
        }

        if (securityCode !== EMPLOYEE_SECURITY_CODE) {
            return res.status(400).json({
                error: 'Invalid security code',
                details: 'The provided security code is incorrect'
            });
        }

        const employee = await Employee.findOne({ email });

        if (!employee) {
            return res.status(401).json({
                error: 'Invalid credentials',
                details: 'Incorrect email or password'
            });
        }

        // Handle both bcrypt-hashed and plaintext passwords (lazy migration)
        let passwordMatch = false;
        
        if (employee.password && employee.password.startsWith('$2')) {
            // Password is bcrypt-hashed — use bcrypt.compare
            passwordMatch = await bcrypt.compare(password, employee.password);
        } else {
            // Password is plaintext — verify and then migrate to bcrypt
            if (password === employee.password) {
                passwordMatch = true;
                // Migrate on successful login
                const salt = await bcrypt.genSalt(10);
                employee.password = await bcrypt.hash(password, salt);
                console.log('Employee password migrated to bcrypt on login:', email);
            }
        }

        if (!passwordMatch) {
            return res.status(401).json({
                error: 'Invalid credentials',
                details: 'Incorrect email or password'
            });
        }
        
        // Check if employee is approved
        if (!employee.isApproved) {
            return res.status(403).json({
                error: 'Account not approved',
                details: 'Your account is pending approval by the admin. Please wait for approval before logging in.'
            });
        }
        
        // Update lastLogin
        employee.lastLogin = new Date();
        await employee.save();
        
        // Generate JWT token
        const token = generateToken(employee._id.toString(), 'employee');
        
        return res.status(200).json({
            message: 'Login successful',
            token,
            redirect: '/employee/dashboard'
        });
    } catch (err) {
        console.error("Error during employee login:", err.message);
        return res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.logout = asyncHandler(async (req, res) => {
    res.status(200).json({
        message: 'Logout successful',
        redirect: '/employee/form'
    });
});

exports.getDoctorRequestsCount = asyncHandler(async (req, res) => {
    const count = await Doctor.countDocuments({ isApproved: false });
    console.log(`Doctor requests count: ${count}`);
        res.status(200).json({
        count
    });
});


// exports.getProfile = asyncHandler(async (req, res) => {
//     try {
//         if (!req.session.employeeId) {
//             return res.redirect('/employee/form?error=login_required');
//         }

//         if (!mongoose.Types.ObjectId.isValid(req.session.employeeId)) {
//             return res.status(400).render('error', {
//                 message: 'Invalid session data',
//                 redirect: '/employee/form'
//             });
//         }

//         const employee = await Employee.findById(req.session.employeeId).lean();

//         if (!employee) {
//             return res.status(404).render('error', {
//                 message: 'Employee not found',
//                 redirect: '/employee/form'
//             });
//         }

//         employee.previousRegistrations = [
//             {
//                 doctorName: "Dr. Smith",
//                 registrationDate: "15th Jan 2025",
//                 status: "Approved"
//             },
//             {
//                 doctorName: "Dr. Johnson",
//                 registrationDate: "22nd Feb 2025",
//                 status: "Rejected"
//             }
//         ];

//         employee.pendingRegistrations = [
//             {
//                 doctorName: "Dr. Williams",
//                 registrationDate: "5th Mar 2025"
//             }
//         ];

//         res.render('employee_profile', {
//             employee,
//             title: 'Employee Profile'
//         });
//     } catch (err) {
//         console.error("Error fetching employee profile:", err.message);
//         res.status(500).render('error', {
//             message: 'Internal server error',
//             details: process.env.NODE_ENV === 'development' ? err.message : undefined,
//             redirect: '/employee_form'
//         });
//     }
// });
exports.getProfile = asyncHandler(async (req, res) => {
    try {
        if (!req.employeeId) {
            return res.redirect('/employee/form?error=login_required');
        }

        if (!mongoose.Types.ObjectId.isValid(req.employeeId)) {
            return res.status(400).render('error', {
                message: 'Invalid session data',
                redirect: '/employee/form'
            });
        }

        const employee = await Employee.findById(req.employeeId)
            .select('name email mobile address profilePhoto')
            .lean();

        if (!employee) {
            return res.status(404).render('error', {
                message: 'Employee not found',
                redirect: '/employee/form'
            });
        }

        // Ensure a fallback profile photo exists
        if (!employee.profilePhoto) {
            employee.profilePhoto = '/images/default-employee.svg';
        }

        res.render('employee_profile', {
            title: 'Employee Profile',
            employee
        });
    } catch (err) {
        console.error("Error rendering employee profile:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/employee/form'
        });
    }
});

exports.getProfileData = asyncHandler(async (req, res) => {
    try {
        if (!req.employeeId) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(req.employeeId)) {
            return res.status(400).json({ error: 'Invalid session data' });
        }

        const employee = await Employee.findById(req.employeeId)
            .select('name email mobile address profilePhoto')
            .lean();

        if (!employee) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Employee not found'
            });
        }

        // Fetch actual registration data from database
        const approvedDoctors = await Doctor.find({ isApproved: true })
            .select('name registrationNumber createdAt _id')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        const rejectedDoctors = await Doctor.find({ isApproved: false, rejectionReason: { $exists: true } })
            .select('name registrationNumber createdAt rejectionReason _id')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        const pendingDoctors = await Doctor.find({ isApproved: false, rejectionReason: { $exists: false } })
            .select('name registrationNumber createdAt documentPath _id')
            .sort({ createdAt: -1 })
            .lean();

        const profileData = {
            employee: {
                name: employee.name,
                email: employee.email,
                mobile: employee.mobile,
                address: employee.address,
                profilePhoto: employee.profilePhoto || '/images/default-employee.svg'
            },
            previousRegistrations: [
                ...approvedDoctors.map(doc => ({
                    _id: doc._id,
                    doctorName: doc.name,
                    registrationNumber: doc.registrationNumber,
                    registrationDate: new Date(doc.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    }),
                    status: "Approved"
                })),
                ...rejectedDoctors.map(doc => ({
                    _id: doc._id,
                    doctorName: doc.name,
                    registrationNumber: doc.registrationNumber,
                    registrationDate: new Date(doc.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    }),
                    status: "Rejected",
                    reason: doc.rejectionReason
                }))
            ],
            pendingRegistrations: pendingDoctors.map(doc => ({
                _id: doc._id,
                doctorName: doc.name,
                registrationNumber: doc.registrationNumber,
                registrationDate: new Date(doc.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                }),
                documentPath: doc.documentPath ? doc.documentPath.replace(/\\/g, '/') : null
            }))
        };

        res.status(200).json(profileData);
    } catch (err) {
        console.error("Error fetching employee profile data:", err.message);
        res.status(500).json({
            error: 'Server Error',
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.editProfile = asyncHandler(async (req, res) => {
    try {
        if (!req.employeeId) {
            return res.redirect('/employee/form?error=login_required');
        }

        if (!mongoose.Types.ObjectId.isValid(req.employeeId)) {
            return res.status(400).render('error', {
                message: 'Invalid session data',
                redirect: '/employee/form'
            });
        }

        const employee = await Employee.findById(req.employeeId)
            .select('name email mobile address profilePhoto')
            .lean();

        if (!employee) {
            return res.status(404).render('error', {
                message: 'Employee not found',
                redirect: '/employee_form'
            });
        }

        res.render('employee_edit_profile', {
            employee,
            title: 'Edit Employee Profile'
        });
    } catch (err) {
        console.error("Error fetching employee data:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/employee_form'
        });
    }
});
exports.updateProfile = asyncHandler(async (req, res) => {
    try {
        if (!req.employeeId) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(req.employeeId)) {
            return res.status(400).json({ error: 'Invalid session data' });
        }

        const { name, email, mobile, address } = req.body;

        if (!name || !email || !mobile || !address) {
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

        const ifemailExists = await checkEmailExists(email, req.employeeId);
        if (ifemailExists) {
            return res.status(400).json({
                error: 'Duplicate Data',
                message: 'Email already in use by another user'
            });
        }

        const ifmobileExists = await checkMobileExists(mobile, req.employeeId);
        if (ifmobileExists) {
            return res.status(400).json({
                error: 'Duplicate Data',
                message: 'Mobile number already in use by another user'
            });
        }

        const emailExists = await Employee.findOne({
            email,
            _id: { $ne: req.employeeId }
        });
        if (emailExists) {
            return res.status(400).json({
                error: 'Duplicate Data',
                message: 'Email already in use by another employee'
            });
        }

        const mobileExists = await Employee.findOne({
            mobile,
            _id: { $ne: req.employeeId }
        });
        if (mobileExists) {
            return res.status(400).json({
                error: 'Duplicate Data',
                message: 'Mobile number already in use by another employee'
            });
        }

        // Handle profile photo upload
        let updateData = { name, email, mobile, address };
        if (req.file) {
            updateData.profilePhoto = req.file.path; // Cloudinary URL
        }

        const updatedEmployee = await Employee.findByIdAndUpdate(
            req.employeeId,
            updateData,
            { new: true, runValidators: true }
        ).select('name email mobile address profilePhoto'); // ADD THIS LINE

        if (!updatedEmployee) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Employee not found'
            });
        }

        // RETURN THE UPDATED EMPLOYEE DATA
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            employee: updatedEmployee, // ADD THIS LINE
            redirect: '/employee/profile'
        });
    } catch (err) {
        console.error("Error updating employee profile:", err.message);
        res.status(500).json({
            error: 'Server Error',
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getDashboard = asyncHandler(async (req, res) => {
    try {
        if (!req.employeeId) {
            return res.redirect('/employee/form?error=login_required');
        }

        if (!mongoose.Types.ObjectId.isValid(req.employeeId)) {
            return res.status(400).render('error', {
                message: 'Invalid session data',
                redirect: '/employee/form'
            });
        }

        const employee = await Employee.findById(req.employeeId).select('email password').lean();

        if (!employee) {
            return res.status(404).render('error', {
                message: 'Employee not found',
                redirect: '/employee/form'
            });
        }

        console.log(`Login Details for Employee - Email: ${employee.email}, Password: ${employee.password}`);

        res.render('employee_dashboard');
    } catch (err) {
        console.error("Error accessing employee dashboard:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/employee_form'
        });
    }
});

exports.getForm = (req, res) => {
    res.render('employee_form');
};

exports.getDoctorRequests = asyncHandler(async (req, res) => {
    try {
        const doctors = await Doctor.find({ isApproved: false }).lean();
        res.render('employee_doctor_requests', { doctors });
    } catch (err) {
        console.error("Error fetching doctor requests:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/employee/dashboard'
        });
    }
});

// exports.postApproveDoctor = asyncHandler(async (req, res) => {
//     const { id } = req.params;
//     try {
//         if (!mongoose.Types.ObjectId.isValid(id)) {
//             return res.status(400).render('error', {
//                 message: 'Invalid doctor ID',
//                 redirect: '/employee/dashboard'
//             });
//         }

//         const ssn = 'DOC-' + Math.floor(100000000 + Math.random() * 900000000);
//         await Doctor.findByIdAndUpdate(id, {
//             isApproved: true,
//             ssn
//         });

//         res.redirect('/employee/dashboard');
//     } catch (err) {
//         console.error("Error approving doctor:", err.message);
//         res.status(500).render('error', {
//             message: 'Internal server error',
//             details: process.env.NODE_ENV === 'development' ? err.message : undefined,
//             redirect: '/employee/dashboard'
//         });
//     }
// });

// In employeeController.js - Fix the postApproveDoctor function
exports.postApproveDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  console.log('Approving doctor ID:', id);
  console.log('Employee ID:', req.employeeId);
  
  try {
    if (!req.employeeId) {
      console.log('No employee found');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Please log in first'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid doctor ID',
        message: 'The provided doctor ID is invalid'
      });
    }

    const ssn = 'DOC-' + Math.floor(100000000 + Math.random() * 900000000);
    const updatedDoctor = await Doctor.findByIdAndUpdate(id, {
      isApproved: true,
      ssn
    }, { new: true });

    if (!updatedDoctor) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Doctor not found'
      });
    }

    await deleteCache('doctors:online:list');
    await deleteCache('doctors:offline:list');
    console.log('Doctor approved successfully:', updatedDoctor.name);
    
    // Return JSON response for React
    res.status(200).json({
      success: true,
      message: 'Doctor approved successfully',
      doctor: {
        name: updatedDoctor.name,
        ssn: updatedDoctor.ssn
      }
    });
    
  } catch (err) {
    console.error("Error approving doctor:", err.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to approve doctor',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Reject doctor
exports.postRejectDoctor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    console.log('Rejecting doctor ID:', id);
    console.log('Employee ID:', req.employeeId);
    console.log('Reason:', reason);
    
    try {
        if (!req.employeeId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid doctor ID',
                message: 'The provided doctor ID is invalid'
            });
        }

        // Mark the doctor as rejected instead of deleting
        const rejectedDoctor = await Doctor.findByIdAndUpdate(id, {
            isRejected: true,
            rejectionReason: reason || 'No reason provided'
        }, { new: true });

        if (!rejectedDoctor) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Doctor not found'
            });
        }

        await deleteCache('doctors:online:list');
        await deleteCache('doctors:offline:list');
        console.log('Doctor rejected successfully:', rejectedDoctor.name);
        
        res.status(200).json({
            success: true,
            message: `Doctor ${rejectedDoctor.name} rejected successfully`,
            reason: reason
        });
        
    } catch (err) {
        console.error("Error rejecting doctor:", err.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to reject doctor',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getDoctorRequestsAPI = asyncHandler(async (req, res) => {
    try {
        const doctors = await Doctor.find({ 
            isApproved: false,
            isRejected: { $ne: true }
        })
            .select('name registrationNumber documentPath _id')
            .lean();
        
        const transformedDoctors = doctors.map(doctor => ({
            ...doctor,
            documentPath: getCloudinaryUrl(doctor.documentPath, 'document.pdf')
        }));
        
        res.status(200).json({
            success: true,
            doctors: transformedDoctors
        });
    } catch (err) {
        console.error("Error fetching doctor requests:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Get pending supplier requests (not approved)
exports.getSupplierRequestsAPI = asyncHandler(async (req, res) => {
    try {
        const suppliers = await Supplier.find({ 
            isApproved: false,
            isRejected: { $ne: true }
        })
            .select('name email mobile address supplierID profilePhoto documentPath _id createdAt')
            .lean();
        
        const transformedSuppliers = suppliers.map(supplier => ({
            ...supplier,
            profilePhoto: getCloudinaryUrl(supplier.profilePhoto, 'photo.jpg'),
            documentPath: getCloudinaryUrl(supplier.documentPath, 'document.pdf')
        }));
        
        res.status(200).json({
            success: true,
            suppliers: transformedSuppliers
        });
    } catch (err) {
        console.error("Error fetching supplier requests:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Get approved doctors
exports.getApprovedDoctorsAPI = asyncHandler(async (req, res) => {
    try {
        const doctors = await Doctor.find({ isApproved: true })
            .select('name registrationNumber email specialization updatedAt _id')
            .sort({ updatedAt: -1 })
            .lean();
        
        res.status(200).json({
            success: true,
            doctors: doctors
        });
    } catch (err) {
        console.error("Error fetching approved doctors:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Get rejected doctors
exports.getRejectedDoctorsAPI = asyncHandler(async (req, res) => {
    try {
        const doctors = await Doctor.find({ isRejected: true })
            .select('name registrationNumber email specialization updatedAt rejectionReason _id')
            .sort({ updatedAt: -1 })
            .lean();
        
        res.status(200).json({
            success: true,
            doctors: doctors
        });
    } catch (err) {
        console.error("Error fetching rejected doctors:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Get approved suppliers
exports.getApprovedSuppliersAPI = asyncHandler(async (req, res) => {
    try {
        const suppliers = await Supplier.find({ isApproved: true })
            .select('name email mobile supplierID updatedAt _id')
            .sort({ updatedAt: -1 })
            .lean();
        
        res.status(200).json({
            success: true,
            suppliers: suppliers
        });
    } catch (err) {
        console.error("Error fetching approved suppliers:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Get rejected suppliers
exports.getRejectedSuppliersAPI = asyncHandler(async (req, res) => {
    try {
        const suppliers = await Supplier.find({ isRejected: true })
            .select('name email mobile supplierID updatedAt rejectionReason _id')
            .sort({ updatedAt: -1 })
            .lean();
        
        res.status(200).json({
            success: true,
            suppliers: suppliers
        });
    } catch (err) {
        console.error("Error fetching rejected suppliers:", err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Approve supplier
exports.postApproveSupplier = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    console.log('Approving supplier ID:', id);
    console.log('Employee ID:', req.employeeId);
    
    try {
        if (!req.employeeId) {
            console.log('No employee found');
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid supplier ID',
                message: 'The provided supplier ID is invalid'
            });
        }

        const updatedSupplier = await Supplier.findByIdAndUpdate(id, {
            isApproved: true,
            approvalStatus: 'approved'
        }, { new: true });

        if (!updatedSupplier) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Supplier not found'
            });
        }

        console.log('Supplier approved successfully:', updatedSupplier.name);
        
        res.status(200).json({
            success: true,
            message: 'Supplier approved successfully',
            supplier: {
                name: updatedSupplier.name,
                supplierID: updatedSupplier.supplierID
            }
        });
        
    } catch (err) {
        console.error("Error approving supplier:", err.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to approve supplier',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Reject supplier
exports.postRejectSupplier = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    console.log('Rejecting supplier ID:', id);
    console.log('Employee ID:', req.employeeId);
    console.log('Reason:', reason);
    
    try {
        if (!req.employeeId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid supplier ID',
                message: 'The provided supplier ID is invalid'
            });
        }

        // Mark the supplier as rejected instead of deleting
        const rejectedSupplier = await Supplier.findByIdAndUpdate(id, {
            isRejected: true,
            approvalStatus: 'rejected',
            rejectionReason: reason || 'No reason provided'
        }, { new: true });

        if (!rejectedSupplier) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Supplier not found'
            });
        }

        console.log('Supplier rejected successfully:', rejectedSupplier.name);
        
        res.status(200).json({
            success: true,
            message: `Supplier ${rejectedSupplier.name} rejected successfully`,
            reason: reason
        });
        
    } catch (err) {
        console.error("Error rejecting supplier:", err.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to reject supplier',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Get appointments with reviews for employee monitoring
exports.getAppointmentsWithReviews = asyncHandler(async (req, res) => {
    try {
        if (!req.employeeId) {
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

// Delete review from an appointment
exports.deleteReview = asyncHandler(async (req, res) => {
    try {
        if (!req.employeeId) {
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

        console.log(`Employee ${req.employeeId} deleted review for appointment ${appointmentId}`);
        
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

// Disapprove doctor
exports.postDisapproveDoctor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    console.log('Disapproving doctor ID:', id);
    console.log('Employee ID:', req.employeeId);
    
    try {
        if (!req.employeeId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid doctor ID',
                message: 'The provided doctor ID is invalid'
            });
        }

        const updatedDoctor = await Doctor.findByIdAndUpdate(id, {
            isApproved: false,
            ssn: null
        }, { new: true });

        if (!updatedDoctor) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Doctor not found'
            });
        }

        await deleteCache('doctors:online:list');
        await deleteCache('doctors:offline:list');
        console.log('Doctor disapproved successfully:', updatedDoctor.name);
        
        res.status(200).json({
            success: true,
            message: 'Doctor disapproved successfully',
            doctor: {
                name: updatedDoctor.name
            }
        });
        
    } catch (err) {
        console.error("Error disapproving doctor:", err.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to disapprove doctor'
        });
    }
});

// Disapprove supplier
exports.postDisapproveSupplier = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    console.log('Disapproving supplier ID:', id);
    console.log('Employee ID:', req.employeeId);
    
    try {
        if (!req.employeeId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid supplier ID',
                message: 'The provided supplier ID is invalid'
            });
        }

        const updatedSupplier = await Supplier.findByIdAndUpdate(id, {
            isApproved: false,
            approvalStatus: 'pending'
        }, { new: true });

        if (!updatedSupplier) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Supplier not found'
            });
        }

        console.log('Supplier disapproved successfully:', updatedSupplier.name);
        
        res.status(200).json({
            success: true,
            message: 'Supplier disapproved successfully',
            supplier: {
                name: updatedSupplier.name
            }
        });
        
    } catch (err) {
        console.error("Error disapproving supplier:", err.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to disapprove supplier'
        });
    }
});

// Un-reject doctor (remove rejection status)
exports.postUnrejectDoctor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    console.log('Un-rejecting doctor ID:', id);
    console.log('Employee ID:', req.employeeId);
    
    try {
        if (!req.employeeId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid doctor ID',
                message: 'The provided doctor ID is invalid'
            });
        }

        const updatedDoctor = await Doctor.findByIdAndUpdate(id, {
            isRejected: false,
            rejectionReason: null
        }, { new: true });

        if (!updatedDoctor) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Doctor not found'
            });
        }

        await deleteCache('doctors:online:list');
        await deleteCache('doctors:offline:list');
        console.log('Doctor un-rejected successfully:', updatedDoctor.name);
        
        res.status(200).json({
            success: true,
            message: 'Doctor un-rejected successfully',
            doctor: {
                name: updatedDoctor.name
            }
        });
        
    } catch (err) {
        console.error("Error un-rejecting doctor:", err.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to un-reject doctor'
        });
    }
});

// Un-reject supplier (remove rejection status)
exports.postUnrejectSupplier = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    console.log('Un-rejecting supplier ID:', id);
    console.log('Employee ID:', req.employeeId);
    
    try {
        if (!req.employeeId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid supplier ID',
                message: 'The provided supplier ID is invalid'
            });
        }

        const updatedSupplier = await Supplier.findByIdAndUpdate(id, {
            isRejected: false,
            rejectionReason: null
        }, { new: true });

        if (!updatedSupplier) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Supplier not found'
            });
        }

        console.log('Supplier un-rejected successfully:', updatedSupplier.name);
        
        res.status(200).json({
            success: true,
            message: 'Supplier un-rejected successfully',
            supplier: {
                name: updatedSupplier.name
            }
        });
        
    } catch (err) {
        console.error("Error un-rejecting supplier:", err.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to un-reject supplier'
        });
    }
});

// Get all platform reviews (from Review model)
exports.getPlatformReviews = asyncHandler(async (req, res) => {
    try {
        if (!req.employeeId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const reviews = await Review.find({})
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        const formattedReviews = reviews.map(review => ({
            id: review._id.toString(),
            userType: review.userType,
            userName: review.userName,
            userEmail: review.userId?.email || 'N/A',
            rating: review.rating,
            reviewText: review.reviewText,
            isApproved: review.isApproved,
            createdAt: review.createdAt
        }));

        res.json({
            success: true,
            reviews: formattedReviews,
            totalReviews: formattedReviews.length
        });
    } catch (err) {
        console.error('Error fetching platform reviews:', err);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Approve platform review
exports.approvePlatformReview = asyncHandler(async (req, res) => {
    try {
        if (!req.employeeId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { reviewId } = req.params;

        const review = await Review.findByIdAndUpdate(
            reviewId,
            { isApproved: true },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }

        console.log(`Employee ${req.employeeId} approved review ${reviewId}`);
        
        res.json({
            success: true,
            message: 'Review approved successfully'
        });
    } catch (err) {
        console.error('Error approving review:', err);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Delete platform review
exports.deletePlatformReview = asyncHandler(async (req, res) => {
    try {
        if (!req.employeeId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { reviewId } = req.params;

        const review = await Review.findByIdAndDelete(reviewId);

        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }

        console.log(`Employee ${req.employeeId} deleted review ${reviewId}`);
        
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

// Get document URL with proper authentication
exports.getDocumentURL = asyncHandler(async (req, res) => {
    try {
        if (!req.employeeId) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Please log in first'
            });
        }

        const { documentPath } = req.query;

        if (!documentPath) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Document path is required'
            });
        }

        const url = resolveDocumentAccessUrl(documentPath, req, 'document.pdf');

        if (!url) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid document path'
            });
        }

        res.status(200).json({
            success: true,
            url: url
        });
    } catch (err) {
        console.error('Error getting document URL:', err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Proxy endpoint to serve documents from Cloudinary with proper headers
exports.serveDocument = asyncHandler(async (req, res) => {
    try {
        const { documentPath, download } = req.query;

        if (!documentPath) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Document path is required'
            });
        }

        let documentUrl = resolveDocumentAccessUrl(documentPath, req, 'document.pdf');

        if (!documentUrl || !documentUrl.startsWith('http')) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid document path'
            });
        }

        const shouldDownload = download === '1' || download === 'true';

        if (documentUrl.includes('res.cloudinary.com')) {
            const proxiedAsset = await fetchCloudinaryAsset(documentUrl, shouldDownload);
            if (proxiedAsset) {
                const { response } = proxiedAsset;
                const contentType = response.headers.get('content-type') || 'application/octet-stream';
                const contentLength = response.headers.get('content-length');
                const contentDisposition = response.headers.get('content-disposition');

                res.setHeader('Content-Type', contentType);
                if (contentLength) {
                    res.setHeader('Content-Length', contentLength);
                }

                if (shouldDownload) {
                    res.setHeader('Content-Disposition', contentDisposition || 'attachment');
                } else if (contentDisposition) {
                    res.setHeader('Content-Disposition', contentDisposition.replace(/^attachment/i, 'inline'));
                }

                const buffer = Buffer.from(await response.arrayBuffer());
                return res.status(200).send(buffer);
            }

            const signedUrl = buildSignedCloudinaryUrl(documentUrl, shouldDownload);
            if (signedUrl) {
                documentUrl = await findReachableCloudinaryUrl(signedUrl, shouldDownload);
            } else if (shouldDownload && documentUrl.includes('/upload/') && !documentUrl.includes('/upload/fl_attachment/')) {
                // Fallback for unexpected Cloudinary URL shapes.
                documentUrl = documentUrl.replace('/upload/', '/upload/fl_attachment/');
            }
        }

        return res.redirect(302, documentUrl);
    } catch (err) {
        console.error('Error serving document:', err.message);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});
