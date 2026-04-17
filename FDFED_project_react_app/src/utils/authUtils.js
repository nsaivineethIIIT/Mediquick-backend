// Utility functions for JWT authentication

// Store token in localStorage with role-specific key
export const setToken = (token, role) => {
    if (role) {
        localStorage.setItem(`mediquick_${role}_token`, token);
        localStorage.setItem(`mediquick_${role}_role`, role);
    } else {
        // Fallback for backward compatibility
        localStorage.setItem('token', token);
    }
};

// Get token from localStorage (tries role-specific keys)
export const getToken = (role) => {
    if (role) {
        return localStorage.getItem(`mediquick_${role}_token`);
    }
    
    // Try to determine role from current path
    const path = window.location.pathname;
    if (path.includes('/patient')) {
        return localStorage.getItem('mediquick_patient_token');
    } else if (path.includes('/doctor')) {
        return localStorage.getItem('mediquick_doctor_token');
    } else if (path.includes('/admin')) {
        return localStorage.getItem('mediquick_admin_token');
    } else if (path.includes('/employee')) {
        return localStorage.getItem('mediquick_employee_token');
    } else if (path.includes('/supplier')) {
        return localStorage.getItem('mediquick_supplier_token');
    }
    
    // Fallback
    return localStorage.getItem('token');
};

// Get user role from localStorage
export const getUserRole = (role) => {
    if (role) {
        return localStorage.getItem(`mediquick_${role}_role`);
    }
    
    // Try to determine role from current path
    const path = window.location.pathname;
    if (path.includes('/patient')) {
        return localStorage.getItem('mediquick_patient_role');
    } else if (path.includes('/doctor')) {
        return localStorage.getItem('mediquick_doctor_role');
    }
    
    return localStorage.getItem('userRole');
};

// Remove token from localStorage (logout)
export const removeToken = (role) => {
    if (role) {
        localStorage.removeItem(`mediquick_${role}_token`);
        localStorage.removeItem(`mediquick_${role}_role`);
    } else {
        // Try to determine role from current path
        const path = window.location.pathname;
        if (path.includes('/patient')) {
            localStorage.removeItem('mediquick_patient_token');
            localStorage.removeItem('mediquick_patient_role');
        } else if (path.includes('/doctor')) {
            localStorage.removeItem('mediquick_doctor_token');
            localStorage.removeItem('mediquick_doctor_role');
        } else {
            // Fallback - remove all
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
        }
    }
};

// Check if user is authenticated
export const isAuthenticated = (role) => {
    return !!getToken(role);
};

// Get Authorization header for API calls
export const getAuthHeader = () => {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Make authenticated API call with comprehensive error handling
export const authenticatedFetch = async (url, role = null, options = {}) => {
    // Handle case where role is not provided (called with 2 params: url, options)
    if (typeof role === 'object' && role !== null) {
        options = role;
        role = null;
    }

    const token = getToken(role);
    
    if (!token) {
        throw new Error('No authentication token found');
    }

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        // If unauthorized, clear token and redirect to login
        if (response.status === 401) {
            removeToken(role);
            // Redirect based on user role
            const userRole = role || getUserRole();
            if (userRole === 'patient') {
                window.location.href = '/patient/form';
            } else if (userRole === 'doctor') {
                window.location.href = '/doctor/form';
            } else if (userRole === 'admin') {
                window.location.href = '/admin/form';
            } else if (userRole === 'employee') {
                window.location.href = '/employee/form';
            } else if (userRole === 'supplier') {
                window.location.href = '/supplier/form';
            } else {
                window.location.href = '/';
            }
            throw new Error('Authentication failed');
        }

        // Handle server errors (5xx)
        if (response.status >= 500) {
            const errorData = await response.json().catch(() => ({}));
            window.location.href = `/error?message=${encodeURIComponent(errorData.message || 'Server error')}&status=${response.status}&type=server`;
            throw new Error(errorData.message || 'Server error');
        }

        // Parse and return JSON for successful responses
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || 'Request failed');
        }

        return await response.json();
    } catch (error) {
        // Handle network errors
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
            window.location.href = '/error?message=Network%20error&type=network';
            throw new Error('Network error');
        }
        
        // Re-throw other errors
        throw error;
    }
};
