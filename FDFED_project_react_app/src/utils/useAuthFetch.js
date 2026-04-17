// Custom hook for authenticated API calls with comprehensive error handling
import { useNavigate } from 'react-router-dom';
import { getToken, removeToken, getUserRole } from './authUtils';

export const useAuthFetch = () => {
    const navigate = useNavigate();

    const authFetch = async (url, options = {}) => {
        const token = getToken();
        
        if (!token) {
            const role = getUserRole();
            navigate(role === 'doctor' ? '/doctor/form' : '/patient/form');
            throw new Error('No authentication token');
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };

        // Remove credentials: 'include' as we're using JWT now
        const { credentials, ...restOptions } = options;

        try {
            const response = await fetch(url, {
                ...restOptions,
                headers
            });

            // Handle unauthorized (401)
            if (response.status === 401) {
                removeToken();
                const role = getUserRole();
                navigate(role === 'doctor' ? '/doctor/form' : '/patient/form');
                throw new Error('Authentication failed');
            }

            // Handle server errors (5xx)
            if (response.status >= 500) {
                const errorData = await response.json().catch(() => ({}));
                navigate('/error', {
                    state: {
                        message: errorData.message || 'Server error. Please try again later.',
                        type: 'server',
                        status: response.status
                    }
                });
                throw new Error(errorData.message || 'Server error');
            }

            // Handle other client errors (4xx except 401)
            if (response.status >= 400 && response.status < 500) {
                const errorData = await response.json().catch(() => ({}));
                // Don't navigate to error page for validation errors, just throw
                throw new Error(errorData.message || `Request failed with status ${response.status}`);
            }

            return response;
        } catch (error) {
            // Handle network errors
            if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                navigate('/error', {
                    state: {
                        message: 'Network error. Please check your internet connection and try again.',
                        type: 'network',
                        status: ''
                    }
                });
                throw new Error('Network error');
            }
            
            // Re-throw other errors (already handled or application errors)
            throw error;
        }
    };

    return authFetch;
};
