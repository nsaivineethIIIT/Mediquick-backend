import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDoctor } from '../../context/DoctorContext';
import { getToken, removeToken } from '../../utils/authUtils';
import DoctorLayoutShell from '../common/DoctorLayoutShell';
import '../../assets/css/DoctorDashboardModern.css';
import '../../assets/css/DoctorProfileModern.css';

const DoctorProfile = () => {
  const { doctor, loading: profileLoading, error: profileError } = useDoctor();
  const navigate = useNavigate();

  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [previousAppointments, setPreviousAppointments] = useState([]);
  const [loading, setLoading] = useState({ upcoming: true, previous: true });
  const [errors, setErrors] = useState({});

  const fetchAppointments = async () => {
    const token = getToken('doctor');
    const API = import.meta.env.VITE_API_URL;

    try {
      const upcomingResponse = await fetch(`${API}/doctor/appointments/upcoming`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (upcomingResponse.status === 401) {
        removeToken('doctor');
        navigate('/doctor/form');
        return;
      }

      if (!upcomingResponse.ok) {
        throw new Error('Failed to fetch upcoming appointments');
      }

      const upcomingData = await upcomingResponse.json();
      setUpcomingAppointments(upcomingData || []);
      setLoading((prev) => ({ ...prev, upcoming: false }));
    } catch (error) {
      setErrors((prev) => ({ ...prev, upcoming: error.message }));
      setLoading((prev) => ({ ...prev, upcoming: false }));
    }

    try {
      const previousResponse = await fetch(`${API}/doctor/appointments/previous`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (previousResponse.status === 401) {
        removeToken('doctor');
        navigate('/doctor/form');
        return;
      }

      if (!previousResponse.ok) {
        throw new Error('Failed to fetch previous appointments');
      }

      const previousData = await previousResponse.json();
      setPreviousAppointments(previousData || []);
      setLoading((prev) => ({ ...prev, previous: false }));
    } catch (error) {
      setErrors((prev) => ({ ...prev, previous: error.message }));
      setLoading((prev) => ({ ...prev, previous: false }));
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const profileImage = useMemo(() => {
    if (!doctor?.profilePhoto) return '/images/default-doctor.svg';
    const photo = doctor.profilePhoto;
    if (/^(https?:|data:|blob:)/i.test(photo)) return photo;
    const API = import.meta.env.VITE_API_URL;
    return photo.startsWith('/') ? `${API}${photo}` : `${API}/${photo}`;
  }, [doctor]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatStatus = (status = '') => {
    const value = status.toLowerCase();
    return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
  };

  const Stat = ({ label, value }) => (
    <div className="doctor-profile-stat">
      <p>{label}</p>
      <h4>{value}</h4>
    </div>
  );

  return (
    <DoctorLayoutShell activeItem="history">
      <div className="doctor-page-content doctor-page-content-compact doctor-profile-modern-page">
        <section className="doctor-section doctor-profile-hero">
          <div className="doctor-profile-avatar-wrap">
            <img
              src={profileImage}
              alt={doctor?.name || 'Doctor'}
              onError={(e) => {
                e.currentTarget.src = '/images/default-doctor.svg';
              }}
            />
          </div>

          <div className="doctor-profile-main">
            <h1>{doctor?.name || 'Doctor Profile'}</h1>
            <p>{doctor?.specialization || 'Specialist'}</p>
            <div className="doctor-profile-stats">
              <Stat label="Upcoming" value={upcomingAppointments.length} />
              <Stat label="Previous" value={previousAppointments.length} />
              <Stat label="Consultation" value={`INR ${doctor?.consultationFee || 0}`} />
            </div>
          </div>

          <div className="doctor-profile-actions">
            <Link to="/doctor/edit-profile" className="doctor-profile-btn primary">Edit Profile</Link>
            <Link to="/doctor/dashboard" className="doctor-profile-btn ghost">Dashboard</Link>
          </div>
        </section>

        <section className="doctor-section doctor-profile-details">
          <h2>Personal Information</h2>

          {profileLoading ? (
            <p className="doctor-loading-text">Loading doctor profile...</p>
          ) : profileError ? (
            <p className="doctor-loading-text">Error: {profileError}</p>
          ) : (
            <div className="doctor-info-grid">
              <div><span>Name</span><strong>{doctor?.name || 'N/A'}</strong></div>
              <div><span>Email</span><strong>{doctor?.email || 'N/A'}</strong></div>
              <div><span>Mobile</span><strong>{doctor?.mobile || 'N/A'}</strong></div>
              <div><span>Address</span><strong>{doctor?.address || 'N/A'}</strong></div>
              <div><span>Gender</span><strong>{doctor?.gender || 'N/A'}</strong></div>
              <div><span>Date of Birth</span><strong>{doctor?.dateOfBirth ? formatDate(doctor.dateOfBirth) : 'N/A'}</strong></div>
              <div><span>Specialization</span><strong>{doctor?.specialization || 'N/A'}</strong></div>
              <div><span>College</span><strong>{doctor?.college || 'N/A'}</strong></div>
              <div><span>Year of Passing</span><strong>{doctor?.yearOfPassing || 'N/A'}</strong></div>
              <div><span>Location</span><strong>{doctor?.location || 'N/A'}</strong></div>
              <div><span>Online Status</span><strong>{doctor?.onlineStatus || 'N/A'}</strong></div>
              <div><span>Registration Number</span><strong>{doctor?.registrationNumber || 'N/A'}</strong></div>
            </div>
          )}
        </section>

        <section className="doctor-section doctor-profile-appointments">
          <h2>Upcoming Appointments</h2>
          {loading.upcoming ? (
            <p className="doctor-loading-text">Loading upcoming appointments...</p>
          ) : errors.upcoming ? (
            <p className="doctor-loading-text">Error loading upcoming appointments</p>
          ) : upcomingAppointments.length === 0 ? (
            <p className="doctor-loading-text">No upcoming appointments found.</p>
          ) : (
            <div className="doctor-profile-list">
              {upcomingAppointments.slice(0, 6).map((appointment) => (
                <article key={appointment._id}>
                  <h4>{appointment.patientId?.name || 'Unknown Patient'}</h4>
                  <p>{formatDate(appointment.date)} at {appointment.time}</p>
                  <span className={`doctor-status doctor-status-${(appointment.status || '').toLowerCase()}`}>
                    {formatStatus(appointment.status)}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="doctor-section doctor-profile-appointments">
          <h2>Previous Appointments</h2>
          {loading.previous ? (
            <p className="doctor-loading-text">Loading previous appointments...</p>
          ) : errors.previous ? (
            <p className="doctor-loading-text">Error loading previous appointments</p>
          ) : previousAppointments.length === 0 ? (
            <p className="doctor-loading-text">No previous appointments found.</p>
          ) : (
            <div className="doctor-profile-list">
              {previousAppointments.slice(0, 6).map((appointment) => (
                <article key={appointment._id}>
                  <h4>{appointment.patientId?.name || 'Unknown Patient'}</h4>
                  <p>{formatDate(appointment.date)} at {appointment.time}</p>
                  <span className={`doctor-status doctor-status-${(appointment.status || '').toLowerCase()}`}>
                    {formatStatus(appointment.status)}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </DoctorLayoutShell>
  );
};

export default DoctorProfile;
