const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ============= PROFILE PHOTO UPLOADS =============
// For doctor, patient, employee, supplier profile photos
const profileStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'mediquick/profiles',
        resource_type: 'auto',
        type: 'upload', // Public upload
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif']
    }
});

const uploadProfile = multer({
    storage: profileStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        }
        const error = new Error('Only image files are allowed for profile photos');
        error.status = 400;
        error.type = 'file_validation_error';
        cb(error);
    }
});

// ============= DOCUMENT UPLOADS =============
// For doctor signup, supplier signup, employee verification documents
const documentStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'mediquick/documents',
        resource_type: 'auto',
        type: 'upload', // Public upload
        allowed_formats: ['pdf', 'jpg', 'jpeg', 'png']
    }
});

const uploadDocument = multer({
    storage: documentStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|jpeg|jpg|png/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const isPdf = file.mimetype === 'application/pdf';
        const isImage = allowedTypes.test(file.mimetype);
        
        if (extname && (isPdf || isImage)) {
            return cb(null, true);
        }
        const error = new Error('Only PDF and image files are allowed for documents');
        error.status = 400;
        error.type = 'file_validation_error';
        cb(error);
    }
});

// ============= CHAT FILE UPLOADS =============
// For doctor-patient chat files
const chatStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'mediquick/chat',
        resource_type: 'auto',
        type: 'upload' // Public upload (not signed)
    }
});

const uploadChat = multer({
    storage: chatStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|jpeg|jpg|png|gif|doc|docx|txt/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const isPdf = file.mimetype === 'application/pdf';
        const isImage = /jpeg|jpg|png|gif/.test(file.mimetype);
        const isDoc = /word|msword|document/.test(file.mimetype) || /doc|docx|txt/.test(file.originalname.toLowerCase());
        
        if (extname && (isPdf || isImage || isDoc)) {
            return cb(null, true);
        }
        const error = new Error('Only PDF, images, and common document types are allowed');
        error.status = 400;
        error.type = 'file_validation_error';
        cb(error);
    }
});

// ============= DOCTOR NOTES UPLOADS =============
// For appointment notes and medical records
const doctorNotesStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'mediquick/doctorNotes',
        resource_type: 'auto',
        type: 'upload' // Public upload
    }
});

const uploadDoctorNotes = multer({
    storage: doctorNotesStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|jpeg|jpg|png|gif|doc|docx|txt/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const isPdf = file.mimetype === 'application/pdf';
        const isImage = /jpeg|jpg|png|gif/.test(file.mimetype);
        const isDoc = /word|msword|document/.test(file.mimetype) || /doc|docx|txt/.test(file.originalname.toLowerCase());
        
        if (extname && (isPdf || isImage || isDoc)) {
            return cb(null, true);
        }
        const error = new Error('Only PDF, images, and common document types are allowed');
        error.status = 400;
        error.type = 'file_validation_error';
        cb(error);
    }
});

// ============= BLOG IMAGE UPLOADS =============
// For blog posts
const blogStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'mediquick/blog',
        resource_type: 'auto',
        type: 'upload', // Public upload
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif']
    }
});

const uploadBlog = multer({
    storage: blogStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        const error = new Error('Only images are allowed (jpeg, jpg, png, gif)');
        error.status = 400;
        error.type = 'file_validation_error';
        cb(error);
    }
});

// ============= MEDICINE IMAGE UPLOADS =============
// For medicine/product images
const medicineStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'mediquick/medicines',
        type: 'upload', // Public upload
        resource_type: 'auto',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif']
    }
});

const uploadMedicine = multer({
    storage: medicineStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        const error = new Error('Only image files are allowed for medicine images');
        error.status = 400;
        error.type = 'file_validation_error';
        cb(error);
    }
});

// ============= GENERAL UPLOADS =============
// Fallback for any general uploads
const generalStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'mediquick/uploads',
        resource_type: 'auto',
        type: 'upload' // Public upload
    }
});

const upload = multer({
    storage: generalStorage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ============= COMBINED SIGNUP STORAGE (CLOUDINARY) =============
// For supplier and employee signup with both profile photo and document
const signupStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Route profile photos to profiles folder, documents to documents folder
        let folder = 'mediquick/uploads';
        let allowed_formats = ['pdf', 'jpg', 'jpeg', 'png', 'gif'];
        
        if (file.fieldname === 'profilePhoto') {
            folder = 'mediquick/profiles';
            allowed_formats = ['jpg', 'jpeg', 'png', 'gif'];
        } else if (file.fieldname === 'document') {
            folder = 'mediquick/documents';
            allowed_formats = ['pdf', 'jpg', 'jpeg', 'png'];
        }
        
        return {
            folder: folder,
            resource_type: 'auto',
            type: 'upload',
            allowed_formats: allowed_formats
        };
    }
});

const uploadSignup = multer({
    storage: signupStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'profilePhoto') {
            const allowedTypes = /jpeg|jpg|png|gif/;
            const extname = allowedTypes.test(file.originalname.toLowerCase());
            const mimetype = allowedTypes.test(file.mimetype);
            
            if (extname && mimetype) {
                return cb(null, true);
            }
            const error = new Error('Only image files are allowed for profile photos');
            error.status = 400;
            cb(error);
        } else if (file.fieldname === 'document') {
            const allowedTypes = /pdf|jpeg|jpg|png/;
            const extname = allowedTypes.test(file.originalname.toLowerCase());
            const isPdf = file.mimetype === 'application/pdf';
            const isImage = allowedTypes.test(file.mimetype);
            
            if (extname && (isPdf || isImage)) {
                return cb(null, true);
            }
            const error = new Error('Only PDF and image files are allowed for documents');
            error.status = 400;
            cb(error);
        }
    }
});

// Helper function to normalize and resolve document/profile URLs.
const getCloudinaryUrl = (path, filename) => {
    if (!path) return null;

    // If already a full URL, return as-is.
    if (path.startsWith('http')) {
        return path;
    }

    const normalized = String(path).replace(/\\/g, '/').trim();
    if (!normalized) return null;

    // Preserve local static upload paths.
    if (normalized.startsWith('/uploads/')) {
        return normalized;
    }
    if (normalized.startsWith('uploads/')) {
        return `/${normalized}`;
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const cleanedPath = normalized.replace(/^\/+/, '');

    const lastSegment = cleanedPath.split('/').pop() || '';
    const extFromPath = lastSegment.includes('.')
        ? (lastSegment.split('.').pop() || '').toLowerCase()
        : '';
    const extFromFilename = filename && filename.includes('.')
        ? (filename.split('.').pop() || '').toLowerCase()
        : '';
    const ext = extFromPath || extFromFilename;

    const hasExt = lastSegment.includes('.');
    const finalPath = hasExt || !ext ? cleanedPath : `${cleanedPath}.${ext}`;
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const resourceType = imageExts.includes(ext) ? 'image' : 'raw';

    return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${finalPath}`;
};

module.exports = { 
    upload, 
    uploadBlog, 
    uploadChat, 
    uploadProfile, 
    uploadMedicine, 
    uploadDocument, 
    uploadDoctorNotes,
    uploadSignup,
    getCloudinaryUrl 
};



