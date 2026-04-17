import React, { createContext, useState, useEffect, useContext } from 'react';
import { useDispatch } from 'react-redux';
import { getToken, removeToken } from '../utils/authUtils';
import { useNavigate } from 'react-router-dom';
import { resetAppointmentState } from '../store/slices/appointmentSlice';

const PatientContext = createContext();

export const usePatient = () => useContext(PatientContext);

export const PatientProvider = ({ children }) => {
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const fetchPatientProfile = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getToken('patient');
            if (!token) {
                navigate('/patient/form');
                return;
            }

            const API = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API}/patient/profile-data`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                removeToken('patient');
                navigate('/patient/form');
                return;
            }

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to fetch patient profile. Please log in.');
            }
            
            setPatient(data.patient);
        } catch (err) {
            setError(err.message);
            setPatient(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatientProfile();
    }, []);

    const updatePatient = (updatedData) => {
        setPatient(prevPatient => ({ ...prevPatient, ...updatedData }));
    };

    const logout = () => {
        removeToken('patient');
        setPatient(null);
        dispatch(resetAppointmentState()); // Clear Redux appointment state
        navigate('/patient/form');
    };

    const value = {
        patient,
        loading,
        error,
        refetch: fetchPatientProfile,
        updatePatient, // Expose for optimistic updates
        logout,
    };

    return (
        <PatientContext.Provider value={value}>
            {children}
        </PatientContext.Provider>
    );
};
