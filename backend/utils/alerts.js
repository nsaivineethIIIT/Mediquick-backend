// utils/alerts.js

/**
 * Displays a toast notification message (server-side friendly).
 * On the backend this will log and return a structured object. In frontend
 * environment you can replace this implementation or create a browser-only
 * helper that manipulates DOM to show Bootstrap toasts.
 * @param {string} message
 * @param {'success'|'warning'|'danger'|'info'} type
 */
function showMessage(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    return { message, type };
}

/**
 * Helper to get Bootstrap-compatible toast classes (used for styling in components).
 * @param {string} type
 * @returns {string}
 */
function getToastClass(type) {
    switch (type) {
        case 'success': return 'bg-success text-white';
        case 'warning': return 'bg-warning text-dark';
        case 'danger': return 'bg-danger text-white';
        case 'info': return 'bg-info text-white';
        default: return 'bg-primary text-white';
    }
}

module.exports = { showMessage, getToastClass };