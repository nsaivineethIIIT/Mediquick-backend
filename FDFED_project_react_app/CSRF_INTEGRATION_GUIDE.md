# CSRF Protection - Frontend Integration Guide

## Overview
The backend now has CSRF protection enabled. All state-changing requests (POST, PUT, PATCH, DELETE) require a valid CSRF token.

## How It Works
1. Backend sets a `XSRF-TOKEN` cookie automatically on every request
2. Frontend reads this cookie and sends it as `x-csrf-token` header on mutations
3. Alternatively, fetch the token from `/api/csrf-token` endpoint

## Integration Options

### Option 1: Using Cookie (Recommended for this setup)

Create a utility file `src/utils/csrf.js`:

```javascript
// src/utils/csrf.js

/**
 * Get CSRF token from cookie
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
 */
export function addCsrfHeader(headers = {}) {
    const token = getCsrfTokenFromCookie();
    if (token) {
        headers['x-csrf-token'] = token;
    }
    return headers;
}
```

### Option 2: Fetch Token from Endpoint

```javascript
// src/utils/csrf.js

let cachedToken = null;

/**
 * Fetch CSRF token from backend
 */
export async function fetchCsrfToken() {
    if (cachedToken) return cachedToken;
    
    try {
        const response = await fetch('http://localhost:3002/api/csrf-token', {
            credentials: 'include' // Important: send cookies
        });
        const data = await response.json();
        cachedToken = data.csrfToken;
        return cachedToken;
    } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
        return null;
    }
}

/**
 * Clear cached token (call on logout or token expiry)
 */
export function clearCsrfToken() {
    cachedToken = null;
}
```

## Usage Examples

### With Axios

```javascript
// src/api/axiosInstance.js
import axios from 'axios';
import { getCsrfTokenFromCookie } from '../utils/csrf';

const axiosInstance = axios.create({
    baseURL: 'http://localhost:3002',
    withCredentials: true // Important: enables cookies
});

// Add CSRF token to all requests
axiosInstance.interceptors.request.use((config) => {
    // Only add token to mutation methods
    if (['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
        const csrfToken = getCsrfTokenFromCookie();
        if (csrfToken) {
            config.headers['x-csrf-token'] = csrfToken;
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Handle CSRF errors
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 403 && 
            error.response?.data?.type === 'csrf_error') {
            console.error('CSRF token invalid. Please refresh the page.');
            // Optionally redirect to login or show error message
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
```

### With Fetch API

```javascript
// Example: Book an appointment
import { addCsrfHeader } from './utils/csrf';

async function bookAppointment(appointmentData) {
    const headers = addCsrfHeader({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    });

    const response = await fetch('http://localhost:3002/appointment/', {
        method: 'POST',
        credentials: 'include', // Important: enables cookies
        headers: headers,
        body: JSON.stringify(appointmentData)
    });

    if (!response.ok) {
        const error = await response.json();
        if (error.type === 'csrf_error') {
            console.error('CSRF token invalid. Please refresh.');
        }
        throw new Error(error.message);
    }

    return response.json();
}
```

### In React Components

```javascript
// Example: Booking form component
import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance'; // Using the configured instance

function BookingForm() {
    const [formData, setFormData] = useState({
        doctorId: '',
        date: '',
        time: '',
        type: 'online'
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            // CSRF token is automatically added by axios interceptor
            const response = await axiosInstance.post('/appointment/', formData);
            alert('Appointment booked successfully!');
        } catch (error) {
            console.error('Booking failed:', error);
            if (error.response?.data?.type === 'csrf_error') {
                alert('Security token expired. Please refresh the page.');
            } else {
                alert(error.response?.data?.message || 'Booking failed');
            }
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* form fields */}
        </form>
    );
}
```

## Important Notes

1. **Always use `credentials: 'include'`** (fetch) or `withCredentials: true` (axios) to send/receive cookies
2. **GET requests don't need CSRF token** - only POST, PUT, PATCH, DELETE
3. **Token refresh**: Cookie is automatically refreshed on each request
4. **Handle 403 errors**: Show user-friendly message and reload/redirect if needed
5. **Production**: Set `secure: true` in backend CSRF config when using HTTPS

## Testing

1. Start backend: `npm start` in `backend/` directory
2. Start frontend: `npm run dev` in `FDFED_project_react_app/` directory
3. Open browser DevTools → Network tab
4. Make a POST request (e.g., book appointment)
5. Check request headers - should include `x-csrf-token`
6. Check response - should succeed (not 403)

## Troubleshooting

### "Invalid or missing CSRF token" error
- Ensure `credentials: 'include'` is set in fetch/axios
- Check that cookie `XSRF-TOKEN` exists in browser (DevTools → Application → Cookies)
- Verify `x-csrf-token` header is present in request
- Try refreshing the page to get a new token

### Token not appearing in cookie
- Check CORS config allows credentials
- Ensure frontend and backend are running on correct ports (5173 and 3002)
- Clear browser cookies and reload

### CORS errors
- Verify backend CORS config includes your frontend origin (http://localhost:5173)
- Check that `credentials: true` is set in backend CORS config
