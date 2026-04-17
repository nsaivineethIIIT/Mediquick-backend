import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getToken, removeToken } from '../../utils/authUtils';
import { usePatient } from '../../context/PatientContext';
import '../../assets/css/PatientAppointments.css';
import '../../assets/css/PatientDashboard.css';

const PatientAppointments = () => {
  const { patient, logout } = usePatient();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [groupedAppointments, setGroupedAppointments] = useState([]);
  const [error, setError] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (patient) {
      fetchAppointments();
    }
  }, [patient]);

  useEffect(() => {
    const previousRootFontSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '14px';
    document.body.classList.add('patient-profile-zoom');

    return () => {
      document.documentElement.style.fontSize = previousRootFontSize;
      document.body.classList.remove('patient-profile-zoom');
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchAppointments = async () => {
    setLoadingAppointments(true);
    setError('');
    try {
      const token = getToken('patient');
      if (!token) {
        navigate('/patient/form');
        return;
      }

      const [upcomingRes, previousRes] = await Promise.all([
        fetch(`${BASE_URL}/patient/api/patient/appointments/upcoming`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${BASE_URL}/patient/api/patient/appointments/previous`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (!upcomingRes.ok || !previousRes.ok) {
        throw new Error('Failed to fetch appointments');
      }

      const [upcomingData, previousData] = await Promise.all([
        upcomingRes.json(),
        previousRes.json()
      ]);

      // Combine and sort all appointments by date (newest first)
      const allAppointments = [...upcomingData, ...previousData].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });

      setAppointments(allAppointments);
      
      // Group appointments by doctor
      const grouped = groupAppointmentsByDoctor(allAppointments);
      setGroupedAppointments(grouped);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError(`Failed to load appointments: ${error.message}`);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const groupAppointmentsByDoctor = (appointments) => {
    const grouped = {};
    
    appointments.forEach(appt => {
      const doctorName = appt.doctorName || 'Unknown Doctor';
      if (!grouped[doctorName]) {
        grouped[doctorName] = {
          doctorName: doctorName,
          specialization: appt.specialization || 'N/A',
          appointments: []
        };
      }
      grouped[doctorName].appointments.push(appt);
    });
    
    // Convert to array and sort by doctor name
    return Object.values(grouped).sort((a, b) => 
      a.doctorName.localeCompare(b.doctorName)
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusClass = (status) => {
    const statusMap = {
      completed: 'pa-badge-completed',
      confirmed: 'pa-badge-confirmed',
      pending:   'pa-badge-pending',
      cancelled: 'pa-badge-cancelled',
      blocked:   'pa-badge-blocked'
    };
    return statusMap[status] || 'pa-badge-default';
  };

  const getDoctorInitials = (name) => {
    if (!name) return 'D';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const getProfileImageUrl = () => {
    if (!patient?.profilePhoto) return '/images/default-patient.svg';
    const photo = patient.profilePhoto;
    if (/^(https?:|data:|blob:)/i.test(photo)) return photo;
    const API = import.meta.env.VITE_API_URL;
    if (photo.startsWith('/')) return `${API}${photo}`;
    return `${API}/${photo}`;
  };

  const handleLogout = async () => {
    try {
      logout();
    } catch (err) {
      console.error('Error logging out:', err);
      removeToken('patient');
      navigate('/patient/form');
    }
  };

  return (
    <div className="patient-dashboard patient-dashboard--zoomed pa-page">
      <div className={`pd-header ${isScrolled ? 'pd-header--scrolled' : ''}`} role="banner">
        <div className="pd-header__inner">
          <div className="pd-header__left">
            <Link to="/patient/dashboard" className="pd-header__brand">MediQuick</Link>

            <nav className="pd-header__nav">
              <Link to="/patient/dashboard" className="pd-header__nav-link">Home</Link>
              <Link to="/about-us" className="pd-header__nav-link">About</Link>
              <Link to="/faqs" className="pd-header__nav-link">FAQs</Link>
              <Link to="/blog" className="pd-header__nav-link">Blog</Link>
              <Link to="/contact-us" className="pd-header__nav-link">Contact</Link>
            </nav>
          </div>

          <div className="pd-header__right">
            <div className="pd-header__divider" aria-hidden="true" />

            <Link to="/patient/profile" className="pd-header__avatar-wrap">
              <img
                src={getProfileImageUrl()}
                alt="Patient Profile"
                className="pd-header__avatar"
                onError={(event) => {
                  event.currentTarget.src = '/images/default-patient.svg';
                }}
              />
            </Link>
            <button type="button" className="pd-header__logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>

      <div className="pa-container">
        <div className="pa-header-card">
          <div className="pa-header-left">
            <div className="pa-header-icon">
              <i className="fas fa-calendar-check"></i>
            </div>
            <h1>My Appointments</h1>
          </div>
          <div>
            <button
              onClick={() => navigate('/patient/dashboard')}
              className="pa-back-btn"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="pa-error">
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        {/* Stats Row */}
        <div className="pa-stats-row">
          <div className="pa-stat-box">
            <h3>{groupedAppointments.length}</h3>
            <p>Total Doctors</p>
          </div>
          <div className="pa-stat-box">
            <h3>{groupedAppointments.reduce((sum, d) => sum + d.appointments.length, 0)}</h3>
            <p>Total Appointments</p>
          </div>
        </div>

        {/* Doctor Appointments */}
        <div className="pa-schedule-content">
          {loadingAppointments ? (
            <div className="pa-loading">
              <div className="pa-loading-spinner"></div>
              Loading your appointments...
            </div>
          ) : groupedAppointments.length === 0 ? (
            <div className="pa-empty">
              <i className="fas fa-calendar-times"></i>
              No appointments found
            </div>
          ) : (
            <div>
              {groupedAppointments.map((doctorGroup, index) => (
                <div key={index} className="pa-doctor-card">
                  {/* Doctor Meta */}
                  <div className="pa-doctor-meta">
                    <div className="pa-doctor-identity">
                      <div className="pa-doctor-avatar">
                        {getDoctorInitials(doctorGroup.doctorName)}
                      </div>
                      <div>
                        <p className="pa-doctor-name">{index + 1}. Dr. {doctorGroup.doctorName}</p>
                        <span className="pa-doctor-spec">
                          <i className="fas fa-hospital-symbol"></i>
                          {doctorGroup.specialization}
                        </span>
                      </div>
                    </div>
                    <span className="pa-appt-count">
                      {doctorGroup.appointments.length} Appointment{doctorGroup.appointments.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Appointments Table */}
                  <div className="pa-table-wrapper">
                    <table className="pa-table">
                      <thead>
                        <tr>
                          <th>S.No</th>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Status</th>
                          <th>Type</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doctorGroup.appointments.map((appointment, apptIndex) => (
                          <tr key={appointment.id}>
                            <td>{apptIndex + 1}</td>
                            <td>{formatDate(appointment.date)}</td>
                            <td>{appointment.time}</td>
                            <td>
                              <span className={`pa-badge ${getStatusClass(appointment.status)}`}>
                                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                              </span>
                            </td>
                            <td style={{ textTransform: 'capitalize' }}>
                              {appointment.type || 'Regular'}
                            </td>
                            <td>{appointment.notes || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientAppointments;
