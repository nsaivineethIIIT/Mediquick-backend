/**
 * CSRF Token Utilities
 * Handles CSRF token management for protected API requests
 */

/**
 * Get CSRF token from cookie (XSRF-TOKEN)
 * The backend automatically sets this cookie on each request
 * @returns {string|null} CSRF token or null if not found
 */
export function getCsrfTokenFromCookie() {
    const name = 'XSRF-TOKEN=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    
    for (let cookie of cookieArray) {
        cookie = cookie.trim();
        if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length);
        }
    }
    return null;
}

/**
 * Add CSRF token to request headers
 * Use this for fetch API calls
 * @param {Object} headers - Existing headers object
 * @returns {Object} Headers with CSRF token added
 */
export function addCsrfHeader(headers = {}) {
    const token = getCsrfTokenFromCookie();
    if (token) {
        headers['x-csrf-token'] = token;
    }
    return headers;
}

let cachedToken = null;

/**
 * Fetch CSRF token from backend endpoint
 * Alternative method if cookie reading is not preferred
 * @returns {Promise<string|null>} CSRF token or null
 */
export async function fetchCsrfToken() {
    if (cachedToken) return cachedToken;
    
    try {
        const API = import.meta.env.VITE_API_URL;
        const response = await fetch(`${API}/api/csrf-token`, {
            credentials: 'include' // Important: enables cookies
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch CSRF token');
        }
        
        const data = await response.json();
        cachedToken = data.csrfToken;
        return cachedToken;
    } catch (error) {
        console.error('Error fetching CSRF token:', error);
        return null;
    }
}

/**
 * Clear cached CSRF token
 * Call this on logout or when token becomes invalid
 */
export function clearCsrfToken() {
    cachedToken = null;
}

/**
 * Setup axios instance with CSRF token interceptor
 * @param {Object} axiosInstance - Axios instance to configure
 * @returns {Object} Configured axios instance
 */
export function setupCsrfForAxios(axiosInstance) {
    // Request interceptor: Add CSRF token to mutation requests
    axiosInstance.interceptors.request.use(
        (config) => {
            // Only add token to state-changing methods
            const mutationMethods = ['post', 'put', 'patch', 'delete'];
            if (mutationMethods.includes(config.method?.toLowerCase())) {
                const csrfToken = getCsrfTokenFromCookie();
                if (csrfToken) {
                    config.headers['x-csrf-token'] = csrfToken;
                }
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // Response interceptor: Handle CSRF errors
    axiosInstance.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 403 && 
                error.response?.data?.type === 'csrf_error') {
                console.error('CSRF token validation failed. Please refresh the page.');
                // Optionally dispatch a global error event or notification
                clearCsrfToken();
            }
            return Promise.reject(error);
        }
    );

    return axiosInstance;
}
