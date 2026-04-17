import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { getToken, removeToken, authenticatedFetch } from '../utils/authUtils';

const SupplierContext = createContext(null);

/**
 * Custom hook to use the Supplier context.
 * @returns {object} The supplier context values.
 */
export const useSupplier = () => {
    const context = useContext(SupplierContext);
    if (!context) {
        throw new Error('useSupplier must be used within a SupplierProvider');
    }
    return context;
};

/**
 * Normalize profile photo path to full URL or default image
 */
const normalizeProfilePhoto = (photoPath) => {
    const API = import.meta.env.VITE_API_URL;
    if (!photoPath) return '/images/default-supplier.png';
    if (/^(https?:|data:|blob:)/i.test(photoPath)) return photoPath;
    if (photoPath.startsWith('/')) {
        return `${API}${photoPath}`;
    }
    return `${API}/${photoPath}`;
};

/**
 * Provider component that holds the supplier state and logic.
 */
export const SupplierProvider = ({ children }) => {
    const [supplier, setSupplier] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [orderData, setOrderData] = useState({
        previousOrders: [],
        pendingOrders: []
    });

    const fetchSupplierProfile = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getToken('supplier');
            // API endpoint defined in supplierRoutes.js and handled by getProfileData
            const API = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API}/supplier/profile-data`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                if (response.status === 401) {
                    removeToken('supplier');
                }
                throw new Error(data.message || 'Failed to fetch supplier profile. Please log in.');
            }
            
            // Normalize profile photo before setting state
            const normalizedSupplier = {
                ...data.supplier,
                profilePhoto: normalizeProfilePhoto(data.supplier?.profilePhoto)
            };

            setSupplier(normalizedSupplier);
            setOrderData({
                previousOrders: data.previousOrders || [],
                pendingOrders: data.pendingOrders || []
            });
        } catch (err) {
            setError(err.message);
            setSupplier(null);
            setOrderData({ previousOrders: [], pendingOrders: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSupplierProfile();
    }, [fetchSupplierProfile]);
    
    /**
     * Function for optimistic updates to the supplier object after editing profile.
     * Normalizes profile photo if included in updated data.
     * @param {object} updatedData - Partial object containing updated supplier fields.
     */
    const updateSupplier = useCallback((updatedData) => {
        setSupplier(prevSupplier => {
            const merged = { ...prevSupplier, ...updatedData };
            if (updatedData && Object.prototype.hasOwnProperty.call(updatedData, 'profilePhoto')) {
                merged.profilePhoto = normalizeProfilePhoto(updatedData.profilePhoto);
            }
            return merged;
        });
    }, []);

    const logout = () => {
        removeToken('supplier');
        setSupplier(null);
        setOrderData({
            previousOrders: [],
            pendingOrders: []
        });
        window.location.href = '/supplier/form';
    };

    const value = {
        supplier,
        loading,
        error,
        previousOrders: orderData.previousOrders,
        pendingOrders: orderData.pendingOrders,
        refetch: fetchSupplierProfile,
        updateSupplier,
        logout,
    };

    return (
        <SupplierContext.Provider value={value}>
            {children}
        </SupplierContext.Provider>
    );
};