
require('dotenv').config();   // loads .env variables (SMTP_USER, SMTP_PASS, etc.)

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const morgan = require('morgan');
const rfs = require('rotating-file-stream');
const fs = require('fs');
const app = express();

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middlewares/auth');
const { initializeRedis } = require('./utils/redisClient');

const PORT = process.env.PORT || 3002; 
const cors = require('cors');


const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}


const accessLogStream = rfs.createStream('access.log', {
    interval: '1d', 
    maxFiles: 30, 
    path: logsDir,
    compress: 'gzip' 
});

const errorLogStream = rfs.createStream('error.log', {
    interval: '1d', 
    maxFiles: 30, 
    path: logsDir,
    compress: 'gzip' 
});


app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:", "http://localhost:3002", "http://localhost:5173", "http://127.0.0.1:3002", "http://127.0.0.1:5173"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "http://localhost:3002", "http://localhost:5173", "http://127.0.0.1:3002", "http://127.0.0.1:5173"],
            frameSrc: ["'self'", "blob:"],
            objectSrc: ["'self'", "blob:"],
            mediaSrc: ["'self'", "blob:"],
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let isDBConnected = false;

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('Connected to MongoDB');
        isDBConnected = true;
        app.locals.dbConnected = true;
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        isDBConnected = false;
        app.locals.dbConnected = false;
        
        console.warn('Server running without database connection');
    }
};

// Initialize Redis cache (optional, non-blocking)
const connectRedis = async () => {
    try {
        await initializeRedis();
        console.log('🚀 Redis Cache initialized successfully');
    } catch (err) {
        console.warn('⚠️ Redis initialization failed (database-only mode):', err.message);
    }
};

mongoose.connection.on('disconnected', () => {
    console.error('MongoDB disconnected!');
    isDBConnected = false;
    app.locals.dbConnected = false;
});

mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
    isDBConnected = true;
    app.locals.dbConnected = true;
});

// Connect to databases
connectDB();
connectRedis();

// Initialize Solr for medicine search
const initializeSolr = async () => {
    try {
        const solrClient = require('./utils/solrClient');
        const { reindexAllMedicines } = require('./utils/solrIndexer');
        const doctorSolrClient = require('./utils/doctorSolrClient');
        const { reindexAllDoctors } = require('./utils/doctorSolrIndexer');
        const blogSolrClient = require('./utils/blogSolrClient');
        const { reindexAllBlogs } = require('./utils/blogSolrIndexer');
        
        // Wait a moment for Solr to be ready
        setTimeout(async () => {
            if (solrClient.isReady()) {
                console.log('🔍 Solr is ready, checking medicine index...');
                const Medicine = require('./models/Medicine');
                const medicineCount = await Medicine.countDocuments();
                
                if (medicineCount > 0) {
                    console.log(`📚 Found ${medicineCount} medicines, reindexing to Solr...`);
                    await reindexAllMedicines(Medicine);
                } else {
                    console.log('📚 No medicines found to index');
                }
            } else {
                console.warn('⚠️  Solr not available for indexing');
            }

            if (doctorSolrClient.isReady()) {
                console.log('🩺 Doctor Solr is ready, checking doctor index...');
                const Doctor = require('./models/Doctor');
                const doctorCount = await Doctor.countDocuments({ isApproved: true });

                if (doctorCount > 0) {
                    console.log(`🩺 Found ${doctorCount} approved doctors, reindexing to Solr...`);
                    await reindexAllDoctors(Doctor);
                } else {
                    console.log('🩺 No approved doctors found to index');
                }
            } else {
                console.warn('⚠️  Doctor Solr not available for indexing');
            }

            if (blogSolrClient.isReady()) {
                console.log('📝 Blog Solr is ready, checking blog index...');
                const Blog = require('./models/Blog');
                const blogCount = await Blog.countDocuments();

                if (blogCount > 0) {
                    console.log(`📝 Found ${blogCount} blogs, reindexing to Solr...`);
                    await reindexAllBlogs(Blog);
                } else {
                    console.log('📝 No blogs found to index');
                }
            } else {
                console.warn('⚠️  Blog Solr not available for indexing');
            }
        }, 5000); // Wait 5 seconds after startup
    } catch (err) {
        console.warn('⚠️  Solr initialization issue:', err.message);
    }
};

initializeSolr();


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CORS must be before static file serving
app.use(cors({
    origin: ['http://localhost', 'http://localhost:80', 'http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1', 'http://127.0.0.1:80', 'http://127.0.0.1:5173'], 
    credentials: true, 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','PATCH', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 200
}));

app.options('*', cors());

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'FFSD Project Final', 'Uploads')));
app.use('/uploads/documents', express.static(path.join(__dirname, 'uploads', 'documents')));
app.use('/uploads/profiles', express.static(path.join(__dirname, 'uploads', 'profiles')));
app.use('/uploads/doctorNotes', express.static(path.join(__dirname, 'uploads', 'doctorNotes')));
app.set('views', path.join(__dirname, 'views'));


// CSP is now handled by helmet above, removing duplicate
// app.use((req, res, next) => {
//     res.setHeader(
//         'Content-Security-Policy',
//         "default-src 'self'; img-src 'self' data: http://localhost:3002; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:;"
//     );
//     next();
// });


// app.use(session({
//     secret: 'mediquick-secret-key',
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//         secure: false, // set to true if using https
//         httpOnly: true,
//         maxAge: 24 * 60 * 60 * 1000 // 24 hours
//     }
// }));

const multer = require('multer');


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './Uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });


const storageBlog = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'public/uploads/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const uploadBlog = multer({
    storage: storageBlog,
    limits: { fileSize: 5 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only images are allowed (jpeg, jpg, png, gif)'));
    }
});


app.use(session({
    secret: 'your-secret-key', 
    resave: false,
    saveUninitialized: false, 
    cookie: {
        secure: false, 
        httpOnly: true,
        sameSite: 'lax', 
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

// Populate `req.user` from Bearer token for improved logging (non-authoritative)
app.use((req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                req.user = decoded; // e.g. { userId, role }
            } catch (e) {
                // ignore invalid token for logging
            }
        }
    } catch (e) {
        // ignore any unexpected errors
    }
    next();
});

// Custom token to extract user ID from session/request
morgan.token('user-id', (req) => {
    // Try to get user ID from various sources; use a local uid variable
    let uid = null;
    if (req.session && req.session.userId) {
        uid = req.session.userId;
    } else if (req.session && req.session.user && req.session.user._id) {
        uid = req.session.user._id;
    } else if (req.user && (req.user.userId || req.user._id || req.user.id)) {
        uid = req.user.userId || req.user._id || req.user.id;
    } else if (req.body && req.body.userId) {
        uid = req.body.userId;
    }

    // Fallback: if still anonymous, try to decode Bearer token for logging (non-authoritative)
    if (!uid) {
        try {
            const authHeader = req.headers.authorization || req.headers.Authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                try {
                    const decodedForLog = jwt.verify(token, JWT_SECRET);
                    uid = decodedForLog?.userId || decodedForLog?._id || decodedForLog?.id || uid;
                } catch (e) {
                    // ignore invalid token for logging
                }
            }
        } catch (e) {
            // ignore any unexpected errors
        }
    }

    return uid || 'anonymous';
});

// Custom token to extract user role
morgan.token('user-role', (req) => {
    if (req.session && req.session.userRole) {
        return req.session.userRole;
    }
    if (req.session && req.session.user && req.session.user.role) {
        return req.session.user.role;
    }
    if (req.user && req.user.role) {
        return req.user.role;
    }
    return 'guest';
});

// Access logging with user ID
app.use(morgan(
    ':remote-addr - :user-id [:user-role] [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms',
    { stream: accessLogStream }
));

// Also log to console in development
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}


const appointmentRoutes = require('./routes/appointmentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const homeRoutes = require('./routes/homeRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const chatRoutes = require('./routes/chatRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const blogRoutes = require('./routes/blogRoutes');
const orderRoutes = require('./routes/orderRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

// Swagger setup
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerConfig');

app.use('/appointment', appointmentRoutes);
app.use('/admin', adminRoutes);
app.use('/supplier', supplierRoutes);
app.use('/patient', patientRoutes);
app.use('/doctor', doctorRoutes);
app.use('/', homeRoutes);
app.use('/employee', employeeRoutes);
app.use('/chat', chatRoutes);
app.use('/medicine', medicineRoutes);
app.use('/blog', blogRoutes);
app.use('/order', orderRoutes);
app.use('/prescription',prescriptionRoutes);
app.use('/review', reviewRoutes);

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
        showRequestHeaders: true,
    },
    customCss: '.topbar { display: none }',
    customSiteName: 'MediQuick API Documentation',
}));


app.get('/about', (req, res) => res.redirect('/about'));
app.get('/faqs', (req, res) => res.redirect('/faqs'));
app.get('/terms', (req, res) => res.redirect('/terms'));
app.get('/privacy', (req, res) => res.redirect('/privacy'));
app.get('/doctor_form', (req, res) => res.redirect('/doctor_form'));
app.get('/patient_form', (req, res) => res.redirect('/patient_form'));
app.get('/admin_form', (req, res) => res.redirect('/admin_form'));
app.get('/supplier_form', (req, res) => res.redirect('/supplier_form'));
app.get('/employee_form', (req, res) => res.redirect('/employee_form'));
app.get('/', (req, res) => res.redirect('/'));
app.get('/logout', (req, res) => res.redirect('/logout'));
app.get('/test-error', (req, res) => res.redirect('/test-error'));


app.get('/health', (req, res) => {
    const dbStatus = app.locals.dbConnected || false;
    
    if (!dbStatus) {
        return res.status(503).json({
            success: false,
            status: 'unhealthy',
            message: 'Database connection unavailable',
            timestamp: new Date().toISOString()
        });
    }
    
    res.status(200).json({
        success: true,
        status: 'healthy',
        message: 'All systems operational',
        database: 'connected',
        timestamp: new Date().toISOString()
    });
});


app.get('/api/test-error', (req, res, next) => {
    const error = new Error('This is a test error');
    error.status = 500;
    next(error);
});


app.use((req, res, next) => {
   
    if (req.path.startsWith('/api/') || 
        req.path.startsWith('/admin/') || 
        req.path.startsWith('/doctor/') || 
        req.path.startsWith('/patient/') || 
        req.path.startsWith('/employee/') || 
        req.path.startsWith('/supplier/')) {
        return res.status(404).json({
            success: false,
            message: 'API endpoint not found',
            path: req.path
        });
    }
    next();
});


app.use((err, req, res, next) => {
    // Get user ID for error logging
    let userId = 'anonymous';
    if (req.session && req.session.userId) {
        userId = req.session.userId;
    } else if (req.session && req.session.user && req.session.user._id) {
        userId = req.session.user._id;
    } else if (req.user && req.user._id) {
        userId = req.user._id;
    } else if (req.user && req.user.id) {
        userId = req.user.id;
    }
    // Determine status and normalized error fields early so they appear in logs
    let statusCode = err.status || err.statusCode || 500;
    let errorMessage = err.message || 'Internal server error';
    let errorType = err.type || 'server_error';
    let errorDetails = err.details;
    
    // Handle Multer file upload errors
    if (err.name === 'MulterError') {
        statusCode = 400;
        errorType = 'file_upload_error';
        if (err.code === 'LIMIT_FILE_SIZE') {
            errorMessage = 'File size exceeds the allowed limit';
            errorDetails = 'Maximum file size is 10MB';
        } else if (err.code === 'LIMIT_FILE_COUNT') {
            errorMessage = 'Too many files uploaded';
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            errorMessage = 'Unexpected file field';
        } else {
            errorMessage = `File upload error: ${err.message}`;
        }
    }
    // Handle custom file filter errors from upload middleware
    else if (err.message && err.message.includes('Only') && err.message.includes('allowed')) {
        statusCode = 400;
        errorType = 'file_validation_error';
        errorMessage = err.message;
    }
    // Handle Mongoose validation errors
    else if (err.name === 'ValidationError') {
        statusCode = 400;
        errorType = 'validation_error';
        const validationErrors = Object.values(err.errors || {}).map(e => e.message);
        errorMessage = validationErrors.length > 0 
            ? validationErrors.join(', ') 
            : 'Validation failed';
        errorDetails = err.errors;
    }
    // Handle Mongoose CastError (invalid ObjectId or type casting)
    else if (err.name === 'CastError') {
        statusCode = 400;
        errorType = 'invalid_id_error';
        errorMessage = `Invalid ${err.path}: ${err.value}`;
        errorDetails = `Expected ${err.kind} for field ${err.path}`;
    }
    // Handle JSON parsing errors
    else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        statusCode = 400;
        errorType = 'json_parse_error';
        errorMessage = 'Invalid JSON in request body';
        errorDetails = err.message;
    }
    // Handle MongoDB duplicate key errors
    else if (err.code === 11000) {
        statusCode = 400;
        errorType = 'duplicate_key_error';
        const field = Object.keys(err.keyPattern || {})[0];
        errorMessage = field 
            ? `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
            : 'Duplicate value error';
        errorDetails = 'A record with this value already exists';
    }
    
    // Build error log after normalization so it reflects the final status/message
    const errorLog = {
        timestamp: new Date().toISOString(),
        statusCode: statusCode,
        userId: (req.session?.userId) || (req.session?.user && req.session.user._id) || (req.user && (req.user.userId || req.user._id || req.user.id)) || (req.body && req.body.userId) || 'anonymous',
        userRole: req.session?.userRole || req.user?.role || 'guest',
        message: errorMessage,
        name: err.name,
        code: err.code,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent')
    };

    // Log to console
    console.error('Error occurred:', {
        statusCode: statusCode,
        message: errorMessage,
        name: err.name,
        code: err.code,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Log to file
    errorLogStream.write(JSON.stringify(errorLog) + '\n');
    
    
    if (!app.locals.dbConnected) {
        return res.status(503).json({
            success: false,
            message: 'Service temporarily unavailable. Database connection error.',
            type: 'database'
        });
    }
    
    
    const isApiRequest = 
        req.path.startsWith('/admin/api/') || 
        req.path.startsWith('/admin/login') || 
        req.path.startsWith('/admin/signup') ||
        req.path.startsWith('/doctor/api/') ||
        req.path.startsWith('/doctor/login') ||
        req.path.startsWith('/doctor/signup') ||
        req.path.startsWith('/patient/api/') ||
        req.path.startsWith('/patient/') ||
        req.path.startsWith('/employee/api/') ||
        req.path.startsWith('/supplier/api/') ||
        req.path.includes('/api/') ||
        req.accepts('json');
    
    if (isApiRequest) {
        const response = {
            success: false,
            message: errorMessage,
            type: errorType
        };
        
        if (errorDetails) {
            response.details = errorDetails;
        }
        
        if (process.env.NODE_ENV === 'development') {
            response.stack = err.stack;
        }
        
        return res.status(statusCode).json(response);
    }
    
    
    try {
        res.status(statusCode).render('error', {
            message: err.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            redirect: '/'
        });
    } catch (renderErr) {
        res.status(statusCode).send(`Error: ${err.message || 'Internal server error'}`);
    }
});


// Start server only when app.js is run directly, not when imported in tests/modules.
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
        console.log('Current date and time:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    });
}

module.exports = app;