const jwt = require('jsonwebtoken');
const Patient = require('../models/Patient');


const JWT_SECRET = process.env.JWT_SECRET || 'mediquick-jwt-secret-key-2024';


const generateToken = (userId, role) => {
    return jwt.sign(
        { userId, role },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
};


const verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]; 

        if (!token) {
            const error = new Error('No token provided');
            error.status = 401;
            error.type = 'auth';
            error.details = 'Authentication required';
            return next(error);
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { userId, role }
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            const err = new Error('Token expired');
            err.status = 401;
            err.type = 'auth';
            err.details = 'Please login again';
            return next(err);
        }
        const err = new Error('Invalid token');
        err.status = 401;
        err.type = 'auth';
        err.details = 'Authentication failed';
        return next(err);
    }
};

// Middleware to verify patient role
const verifyPatient = (req, res, next) => {
    verifyToken(req, res, (err) => {
        if (err) return next(err);
        
        if (req.user.role === 'patient') {
            req.patientId = req.user.userId; 
            next();
        } else {
            const error = new Error('Access denied');
            error.status = 403;
            error.type = 'auth';
            error.details = 'Patient access required';
            return next(error);
        }
    });
};

const isPatientProfileIncomplete = (patient) => {
    if (!patient || patient.authProvider !== 'google') {
        return false;
    }

    const mobile = (patient.mobile || '').trim();
    const address = (patient.address || '').trim();

    return !mobile || mobile === '0000000000' || !address || address === 'OAuth signup - please update your profile';
};

const requireCompletePatientProfile = async (req, res, next) => {
    try {
        if (!req.patientId) {
            const error = new Error('Authentication required');
            error.status = 401;
            error.type = 'auth';
            error.details = 'Patient authentication required';
            return next(error);
        }

        const patient = await Patient.findById(req.patientId)
            .select('authProvider mobile address')
            .lean();

        if (!patient) {
            const error = new Error('Patient not found');
            error.status = 401;
            error.type = 'auth';
            error.details = 'Please login again';
            return next(error);
        }

        if (isPatientProfileIncomplete(patient)) {
            return res.status(403).json({
                error: 'Profile incomplete',
                details: 'Please complete your profile before booking appointments or making payments',
                code: 'PROFILE_INCOMPLETE',
                redirect: '/patient/edit-profile'
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

// Middleware to verify doctor role
const verifyDoctor = (req, res, next) => {
    verifyToken(req, res, (err) => {
        if (err) return next(err);
        
        if (req.user.role === 'doctor') {
            req.doctorId = req.user.userId; 
            next();
        } else {
            const error = new Error('Access denied');
            error.status = 403;
            error.type = 'auth';
            error.details = 'Doctor access required';
            return next(error);
        }
    });
};

// Middleware to verify token and set user IDs based on role (for chat, etc.)
const verifyTokenAndSetUser = (req, res, next) => {
    verifyToken(req, res, (err) => {
        if (err) return next(err);
        
        
        if (req.user.role === 'patient') {
            req.patientId = req.user.userId;
        } else if (req.user.role === 'doctor') {
            req.doctorId = req.user.userId;
        }
        next();
    });
};

// Middleware to verify admin role
const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, (err) => {
        if (err) return next(err);
        
        if (req.user.role === 'admin') {
            req.adminId = req.user.userId; // Set adminId for controllers
            next();
        } else {
            const error = new Error('Access denied');
            error.status = 403;
            error.type = 'auth';
            error.details = 'Admin access required';
            return next(error);
        }
    });
};

// Middleware to verify employee role
const verifyEmployee = (req, res, next) => {
    verifyToken(req, res, (err) => {
        if (err) return next(err);
        
        if (req.user.role === 'employee') {
            req.employeeId = req.user.userId; // Set employeeId for controllers
            next();
        } else {
            const error = new Error('Access denied');
            error.status = 403;
            error.type = 'auth';
            error.details = 'Employee access required';
            return next(error);
        }
    });
};

// Middleware to verify supplier role
const verifySupplier = (req, res, next) => {
    verifyToken(req, res, (err) => {
        if (err) return next(err);
        
        if (req.user.role === 'supplier') {
            req.supplierId = req.user.userId; // Set supplierId for controllers
            next();
        } else {
            const error = new Error('Access denied');
            error.status = 403;
            error.type = 'auth';
            error.details = 'Supplier access required';
            return next(error);
        }
    });
};

// Middleware to verify authenticated user (patient, doctor, or employee) for blog posting
const verifyAuthenticatedUser = (req, res, next) => {
    verifyToken(req, res, (err) => {
        if (err) return next(err);
        
        if (req.user.role === 'patient') {
            req.patientId = req.user.userId;
            req.userRole = 'patient';
        } else if (req.user.role === 'doctor') {
            req.doctorId = req.user.userId;
            req.userRole = 'doctor';
        } else if (req.user.role === 'employee') {
            req.employeeId = req.user.userId;
            req.userRole = 'employee';
        } else {
            const error = new Error('Access denied');
            error.status = 403;
            error.type = 'auth';
            error.details = 'Authentication required';
            return next(error);
        }
        next();
    });
};

module.exports = {
    generateToken,
    verifyToken,
    verifyPatient,
    verifyDoctor,
    verifyTokenAndSetUser,
    verifyAdmin,
    verifyEmployee,
    verifySupplier,
    verifyAuthenticatedUser,
    requireCompletePatientProfile,
    JWT_SECRET
};
