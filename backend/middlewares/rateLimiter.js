const rateLimit = require('express-rate-limit');

// Strict rate limiter for appointment creation - prevents spam bookings
const appointmentCreationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 appointment creation requests per windowMs
    message: {
        error: 'Too many appointment booking requests',
        details: 'Please try again after 15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: false, // Count successful requests
    skipFailedRequests: false, // Count failed requests too
});

// Moderate rate limiter for slot blocking/unblocking (doctor actions)
const slotManagementLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 20, // Limit each IP to 20 slot management requests per windowMs
    message: {
        error: 'Too many slot management requests',
        details: 'Please try again after 10 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Standard rate limiter for general appointment operations (viewing, updating status)
const appointmentGeneralLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests',
        details: 'Please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Lenient rate limiter for read-only operations (viewing available slots, booked slots)
const appointmentReadLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // Limit each IP to 50 read requests per windowMs
    message: {
        error: 'Too many requests',
        details: 'Please try again after a few minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    appointmentCreationLimiter,
    slotManagementLimiter,
    appointmentGeneralLimiter,
    appointmentReadLimiter
};
