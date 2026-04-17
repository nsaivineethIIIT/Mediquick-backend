import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { getToken, removeToken, authenticatedFetch } from '../utils/authUtils';

const AdminContext = createContext(null);

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};

export const AdminProvider = ({ children }) => {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profileData, setProfileData] = useState({
        completedConsultations: [],
        pendingConsultations: []
    });

    const fetchAdminProfile = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getToken('admin');
            if (!token) {
                throw new Error('No authentication token found');
            }
            
            const API = import.meta.env.VITE_API_URL;
            const data = await authenticatedFetch(`${API}/admin/profile-data`, 'admin');

            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch admin profile. Please log in.');
            }

            setAdmin(data.admin);
            setProfileData({
                completedConsultations: data.completedConsultations || [],
                pendingConsultations: data.pendingConsultations || []
            });
        } catch (err) {
            setError(err.message);
            setAdmin(null);
            setProfileData({
                completedConsultations: [],
                pendingConsultations: []
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdminProfile();
    }, [fetchAdminProfile]);
    
    // Function for optimistic updates after editing profile
    const updateAdmin = (updatedData) => {
        setAdmin(prevAdmin => ({ ...prevAdmin, ...updatedData }));
    };

    const logout = () => {
        removeToken('admin');
        setAdmin(null);
        setProfileData({
            completedConsultations: [],
            pendingConsultations: []
        });
        window.location.href = '/admin/form';
    };

    const value = {
        admin,
        loading,
        error,
        completedConsultations: profileData.completedConsultations,
        pendingConsultations: profileData.pendingConsultations,
        refetch: fetchAdminProfile,
        updateAdmin,
        logout,
    };

    return (
        <AdminContext.Provider value={value}>
            {children}
        </AdminContext.Provider>
    );
};