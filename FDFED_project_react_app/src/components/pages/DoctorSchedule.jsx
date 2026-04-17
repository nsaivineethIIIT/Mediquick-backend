import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../assets/css/DoctorSchedule.css';
import { getToken, removeToken } from '../../utils/authUtils';
import { useDoctor } from '../../context/DoctorContext';
import DoctorLayoutShell from '../common/DoctorLayoutShell';

const DoctorSchedule = () => {
  const { doctor } = useDoctor();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const BASE_URL = import.meta.env.VITE_API_URL;

  function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getMinDate() {
    return getTodayDate();
  }

  useEffect(() => {
    if (selectedDate && doctor?._id) {
      fetchSchedule();
    }
  }, [selectedDate, doctor?._id]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = getToken('doctor');
      if (!token) {
        navigate('/doctor/form');
        return;
      }

      const response = await fetch(
        `${BASE_URL}/doctor/api/schedule?date=${selectedDate}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          removeToken('doctor');
          navigate('/doctor/form');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setError(`Failed to load schedule: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    const statusMap = {
      completed: 'status-completed',
      confirmed: 'status-confirmed',
      pending: 'status-pending',
      cancelled: 'status-cancelled',
      blocked: 'status-blocked'
    };
    return statusMap[status] || 'status-default';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const calculateDuration = () => {
    if (appointments.length === 0) return 'No appointments';
    
    const times = appointments
      .filter(appt => !appt.isBlockedSlot)
      .map(appt => appt.time);
    
    if (times.length === 0) return 'No active appointments';
    
    return `${times.length} appointment${times.length > 1 ? 's' : ''} scheduled`;
  };

  return (
    <DoctorLayoutShell activeItem="schedule">
      <div className="doctor-page-content doctor-page-content-compact doctor-page-content-fill doctor-shared-centered doctor-page-shrink">
        <div className="schedule-container doctor-shared-card">
        {/* Header */}
        <div className="schedule-header">
          <div className="header-left">
            <span style={{ fontSize: '2rem' }}>📅</span>
            <h1>My Schedule</h1>
          </div>
          <div className="header-right">
            <Link to="/doctor/dashboard" className="back-btn">
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Date Selection Section */}
        <div className="schedule-section">
          <div className="date-selector-container">
            <label htmlFor="schedule-date">Select Date:</label>
            <div className="date-input-wrapper">
              <input
                type="date"
                id="schedule-date"
                value={selectedDate}
                min={getMinDate()}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="date-input"
              />
              <button 
                onClick={() => setSelectedDate(getTodayDate())}
                className="today-btn"
              >
                Today
              </button>
            </div>
          </div>

          <div className="schedule-info">
            <h2>{formatDate(selectedDate)}</h2>
            <p className="schedule-summary">{calculateDuration()}</p>
          </div>
        </div>

        {/* Appointments List */}
        <div className="schedule-section">
          <h2>Appointments</h2>
          
          {loading ? (
            <div className="loading">Loading schedule...</div>
          ) : appointments.length === 0 ? (
            <div className="no-appointments">
              <span style={{ fontSize: '3rem' }}>📭</span>
              <p>No appointments scheduled for this date</p>
            </div>
          ) : (
            <div className="appointments-grid">
              {appointments.map((appointment, index) => (
                <div key={appointment._id} className="appointment-card">
                  <div className="card-header">
                    <div className="appointment-time">
                      <span className="time-icon">🕐</span>
                      <span className="time-text">{appointment.time}</span>
                    </div>
                    <span className={`appointment-status ${getStatusClass(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </div>
                  <div className="card-body">
                    <div className="appointment-detail">
                      <span className="detail-icon">👤</span>
                      <div className="detail-content">
                        <span className="detail-label">Patient</span>
                        <span className="detail-value">
                          {appointment.patientId?.name || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="appointment-detail">
                      <span className="detail-icon">📧</span>
                      <div className="detail-content">
                        <span className="detail-label">Email</span>
                        <span className="detail-value">
                          {appointment.patientId?.email || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="appointment-detail">
                      <span className="detail-icon">📱</span>
                      <div className="detail-content">
                        <span className="detail-label">Mobile</span>
                        <span className="detail-value">
                          {appointment.patientId?.mobile || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="appointment-detail">
                      <span className="detail-icon">🏥</span>
                      <div className="detail-content">
                        <span className="detail-label">Type</span>
                        <span className="type-badge">
                          {appointment.type === 'online' ? '🌐 Online' : '🏥 Offline'}
                        </span>
                      </div>
                    </div>
                    <div className="appointment-detail">
                      <span className="detail-icon">💰</span>
                      <div className="detail-content">
                        <span className="detail-label">Fee</span>
                        <span className="detail-value">₹{appointment.consultationFee}</span>
                      </div>
                    </div>
                    {appointment.notes && (
                      <div className="appointment-detail">
                        <span className="detail-icon">📝</span>
                        <div className="detail-content">
                          <span className="detail-label">Notes</span>
                          <span className="detail-value notes-text">{appointment.notes}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </DoctorLayoutShell>
  );
};

export default DoctorSchedule;
