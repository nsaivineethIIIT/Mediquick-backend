import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { getToken, removeToken } from '../utils/authUtils';
import { useNavigate } from 'react-router-dom';
import { resetAppointmentState } from '../store/slices/appointmentSlice';

const DoctorContext = createContext(null);

export const DoctorProvider = ({ children }) => {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const fetchDoctorProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken('doctor');
      if (!token) {
        navigate('/doctor/form');
        return;
      }

      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/doctor/api/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        removeToken('doctor');
        navigate('/doctor/form');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch doctor profile' }));
        throw new Error(errorData.message || 'Failed to fetch doctor profile');
      }

      const data = await response.json();
      if (data.success) {
        setDoctor(data.doctor);
      } else {
        throw new Error(data.message || 'Failed to get doctor data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDoctorProfile();
  }, [fetchDoctorProfile]);

  const refetch = () => {
    fetchDoctorProfile();
  };

  const logout = () => {
    removeToken('doctor');
    setDoctor(null);
    dispatch(resetAppointmentState()); // Clear Redux appointment state
    navigate('/doctor/form');
  };

  return (
    <DoctorContext.Provider value={{ doctor, loading, error, refetch, logout }}>
      {children}
    </DoctorContext.Provider>
  );
};

export const useDoctor = () => {
  const context = useContext(DoctorContext);
  if (!context) {
    throw new Error('useDoctor must be used within a DoctorProvider');
  }
  return context;
};
