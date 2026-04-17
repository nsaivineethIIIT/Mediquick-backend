// Frontend alerts utility
// This is a browser-specific implementation that shows visual notifications

/**
 * Displays a toast notification message using Bootstrap classes.
 * @param {string} message - The message to display
 * @param {'success' | 'warning' | 'danger' | 'info'} type - The type of alert
 */
export const showMessage = (message, type = 'info') => {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            left: 50%;
            bottom: 24px;
            transform: translateX(-50%);
            z-index: 9999;
        `;
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${getToastClass(type)} show`;
    toast.style.cssText = `
        min-width: 250px;
        margin-bottom: 10px;
        padding: 15px;
        border-radius: 4px;
        opacity: 1;
        transition: opacity 0.3s ease-in-out;
    `;

    // Add message
    toast.textContent = message;

    // Add to container
    toastContainer.appendChild(toast);

    // Auto-remove after delay
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toastContainer.removeChild(toast);
            if (toastContainer.children.length === 0) {
                document.body.removeChild(toastContainer);
            }
        }, 300);
    }, 3000);
};

/**
 * Helper to get Bootstrap-compatible toast classes.
 * @param {string} type - The type of alert
 * @returns {string} Bootstrap classes for the specified alert type
 */
export const getToastClass = (type) => {
    switch (type) {
        case 'success': return 'bg-success text-white';
        case 'warning': return 'bg-warning text-dark';
        case 'danger': return 'bg-danger text-white';
        case 'info': return 'bg-info text-white';
        default: return 'bg-primary text-white';
    }
};