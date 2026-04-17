/**
 * Async Handler Middleware
 * Wraps async route handlers to catch errors and forward to Express error middleware
 * 
 * Usage:
 * const asyncHandler = require('./middlewares/asyncHandler');
 * 
 * router.get('/route', asyncHandler(async (req, res, next) => {
 *   // Your async code here
 *   // Any thrown errors will be caught and passed to next()
 * }));
 */

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
