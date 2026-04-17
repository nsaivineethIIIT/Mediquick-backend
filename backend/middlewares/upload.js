const path = require('path');
const fs = require('fs');
const multer = require('multer');


const generalStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(process.cwd(), 'FFSD Project Final', 'Uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: generalStorage });

// Blog image uploads to public/uploads
// const blogStorage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         const dir = path.join(process.cwd(), 'FFSD Project Final', 'public', 'uploads');
//         if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
//         cb(null, dir);
//     },
//     filename: (req, file, cb) => {
//         cb(null, Date.now() + path.extname(file.originalname));
//     }
// });

// const uploadBlog = multer({
//     storage: blogStorage,
//     limits: { fileSize: 5 * 1024 * 1024 },
//     fileFilter: (req, file, cb) => {
//         const filetypes = /jpeg|jpg|png|gif/;
//         const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//         const mimetype = filetypes.test(file.mimetype);
//         if (extname && mimetype) {
//             return cb(null, true);
//         }
//         cb(new Error('Only images are allowed (jpeg, jpg, png, gif)'));
//     }
// });

const blogStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const uploadBlog = multer({
    storage: blogStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        const error = new Error('Only images are allowed (jpeg, jpg, png, gif)');
        error.status = 400;
        error.type = 'file_validation_error';
        cb(error);
    }
});

// Medicine image uploads to public/uploads/medicines
const medicineStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'public', 'uploads', 'medicines');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const uploadMedicine = multer({
    storage: medicineStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for medicine images
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
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

// Profile photo uploads to backend/uploads/profiles
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads', 'profiles');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const uploadProfile = multer({
    storage: profileStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for profile photos
    fileFilter: (req, file, cb) => {
        // Allow only images
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
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
// Chat file uploads to public/uploads/chat
const chatStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'public', 'uploads', 'chat');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const uploadChat = multer({
    storage: chatStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for chat files
    fileFilter: (req, file, cb) => {
        // Allow PDFs, images, and common document types
        const allowedTypes = /pdf|jpeg|jpg|png|gif|doc|docx|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';
        
        if (extname || mimetype) {
            return cb(null, true);
        }
        const error = new Error('Only PDF, images, and common document types are allowed');
        error.status = 400;
        error.type = 'file_validation_error';
        cb(error);
    }
});

// Document uploads for employee and supplier verification
const documentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads', 'documents');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const uploadDocument = multer({
    storage: documentStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for documents
    fileFilter: (req, file, cb) => {
        // Allow PDFs and images for documents
        const allowedTypes = /pdf|jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';
        
        if (extname || mimetype) {
            return cb(null, true);
        }
        const error = new Error('Only PDF and image files are allowed for documents');
        error.status = 400;
        error.type = 'file_validation_error';
        cb(error);
    }
});

// Doctor notes uploads to uploads/doctorNotes
const doctorNotesStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads', 'doctorNotes');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const uploadDoctorNotes = multer({
    storage: doctorNotesStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for doctor notes files
    fileFilter: (req, file, cb) => {
        // Allow PDFs, images, and common document types
        const allowedTypes = /pdf|jpeg|jpg|png|gif|doc|docx|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';
        
        if (extname || mimetype) {
            return cb(null, true);
        }
        const error = new Error('Only PDF, images, and common document types are allowed');
        error.status = 400;
        error.type = 'file_validation_error';
        cb(error);
    }
});

module.exports = { upload, uploadBlog, uploadChat, uploadProfile, uploadMedicine, uploadDocument, uploadDoctorNotes };



