import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../assets/css/AdminDoctorAnalytics.css';
import '../../assets/css/AdminDashboard.css';
import { getToken, removeToken } from '../../utils/authUtils';
import { useAdmin } from '../../context/AdminContext';

const AdminPatientAnalytics = () => {
  const { logout } = useAdmin();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [appointments, setAppointments] = useState([]);
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchPatientAnalytics();
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientAppointments();
    } else {
      setAppointments([]);
    }
  }, [selectedPatientId, selectedDoctorId]);

  const fetchPatientAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = getToken('admin');
      if (!token) {
        navigate('/admin/form');
        return;
      }

      const response = await fetch(`${BASE_URL}/admin/api/patient-analytics`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          removeToken('admin');
          navigate('/admin/form');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPatients(data);
    } catch (error) {
      console.error('Error fetching patient analytics:', error);
      setError(`Failed to load patient analytics: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const token = getToken('admin');
      if (!token) {
        return;
      }

      const response = await fetch(`${BASE_URL}/admin/api/doctor-analytics`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDoctors(data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchPatientAppointments = async () => {
    try {
      const token = getToken('admin');
      let url = `${BASE_URL}/admin/api/patient-appointments?patientId=${selectedPatientId}`;
      
      // Add doctorId to query if a specific doctor is selected
      if (selectedDoctorId) {
        url += `&doctorId=${selectedDoctorId}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching patient appointments:', error);
      setError(`Failed to load appointments: ${error.message}`);
    }
  };

  const getStatusClass = (status) => {
    const statusMap = {
      completed: 'status-completed',
      confirmed: 'status-confirmed',
      pending: 'status-pending',
      cancelled: 'status-cancelled'
    };
    return statusMap[status] || 'status-default';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handlePatientChange = (e) => {
    setSelectedPatientId(e.target.value);
    setSelectedDoctorId(''); // Reset doctor filter when patient changes
  };

  const selectedPatient = patients.find(p => p._id === selectedPatientId);

  const renderSidebar = () => (
    <nav className="dashboard-nav">
      <div className="dashboard-brand">
        <h2>MediQuick</h2>
        <p>Clinical Admin</p>
      </div>
      <ul>
        <li><Link to="/" className="nav-link home-link"><span className="nav-label">Home</span></Link></li>
        <li><Link to="/admin/dashboard" className="nav-link"><span className="nav-label">Dashboard</span></Link></li>
        <li><Link to="/admin/doctor-analytics" className="nav-link"><span className="nav-label">Doctor Analytics</span></Link></li>
        <li><Link to="/admin/patient-analytics" className="nav-link active"><span className="nav-label">Patient Analytics</span></Link></li>
        <li><Link to="/admin/search-data" className="nav-link"><span className="nav-label">Search Data</span></Link></li>
        <li><Link to="/admin/profile" className="nav-link"><span className="nav-label">Profile</span></Link></li>
        <li>
          <button onClick={logout} className="nav-link logout" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <span className="nav-label">Logout</span>
          </button>
        </li>
      </ul>
    </nav>
  );

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-container">
          {renderSidebar()}
          <main className="dashboard-content">
            <section className="section">
              <div className="analytics-container">
                <div className="loading">Loading patient analytics...</div>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-container">
        {renderSidebar()}
        <main className="dashboard-content">
          <section className="section">
            <div className="admin-patient-analytics">
              <div className="analytics-container">
        {/* Header */}
        <div className="analytics-header">
          <div className="header-left">
            <span style={{ fontSize: '2rem' }}>📊</span>
            <h1>Patient Analytics</h1>
          </div>
          <div className="header-right">
            <Link to="/admin/dashboard" className="back-btn">
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

        {/* Patient Subscriptions Overview Section */}
        <div className="analytics-section">
          <h2>Patient Subscriptions Overview</h2>
          <p className="section-description">
            Total appointments made by each patient across all doctors
          </p>

          {patients.length === 0 ? (
            <div className="no-data">No patient data available</div>
          ) : (
            <div className="table-container">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>S.NO</th>
                    <th>PATIENT NAME</th>
                    <th>EMAIL</th>
                    <th>MOBILE</th>
                    <th>TOTAL APPOINTMENTS</th>
                    <th>COMPLETED</th>
                    <th>PENDING/CONFIRMED</th>
                    <th>CANCELLED</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient, index) => (
                    <tr key={patient._id}>
                      <td>{index + 1}</td>
                      <td className="patient-name">{patient.name}</td>
                      <td>{patient.email}</td>
                      <td>{patient.mobile}</td>
                      <td>
                        <span className="total-appointments">
                          {patient.totalAppointments}
                        </span>
                      </td>
                      <td className="count-completed">{patient.completed}</td>
                      <td className="count-pending">
                        {patient.pending + patient.confirmed}
                      </td>
                      <td className="count-cancelled">{patient.cancelled}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Patient Appointment History Section */}
        <div className="analytics-section">
          <h2>Patient Appointment History</h2>
          
          <div className="dropdown-container">
            <label htmlFor="patient-select">Select Patient:</label>
            <select
              id="patient-select"
              className="patient-dropdown"
              value={selectedPatientId}
              onChange={handlePatientChange}
            >
              <option value="">-- Select a patient --</option>
              {patients.map((patient) => (
                <option key={patient._id} value={patient._id}>
                  {patient.name} - {patient.email}
                </option>
              ))}
            </select>
          </div>

          {selectedPatientId && (
            <div className="dropdown-container">
              <label htmlFor="doctor-select">Filter by Doctor:</label>
              <select
                id="doctor-select"
                className="patient-dropdown"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
              >
                <option value="">-- All Doctors --</option>
                {doctors.map((doctor) => (
                  <option key={doctor._id} value={doctor._id}>
                    {doctor.name} - {doctor.specialization}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!selectedPatientId ? (
            <div className="empty-state">
              <p>Select a patient to view their appointment history.</p>
            </div>
          ) : (
            <>
              {selectedPatient && (
                <div className="patient-info-card">
                  <h3>{selectedPatient.name}</h3>
                  <div className="patient-stats">
                    <div className="stat-item">
                      <span className="stat-label">Total Appointments</span>
                      <span className="stat-value highlight">
                        {selectedPatient.totalAppointments}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Completed</span>
                      <span className="stat-value">{selectedPatient.completed}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Confirmed</span>
                      <span className="stat-value">{selectedPatient.confirmed}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Pending</span>
                      <span className="stat-value">{selectedPatient.pending}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Cancelled</span>
                      <span className="stat-value">{selectedPatient.cancelled}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedDoctorId && (
                <div style={{
                  padding: '10px 15px',
                  marginBottom: '15px',
                  backgroundColor: '#e8f5e9',
                  border: '1px solid #4caf50',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  <strong>Filtered by Doctor:</strong> {doctors.find(d => d._id === selectedDoctorId)?.name} 
                  ({doctors.find(d => d._id === selectedDoctorId)?.specialization})
                </div>
              )}

              {appointments.length === 0 ? (
                <div className="no-data">No appointments found for this patient</div>
              ) : (
                <div className="appointments-grid">
                  {appointments.map((appointment, index) => (
                    <div key={appointment._id} className="appointment-card">
                      <div className="card-header">
                        <span className="appointment-number">
                          Appointment #{index + 1}
                        </span>
                        <span className={`appointment-status ${getStatusClass(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </div>
                      <div className="card-body">
                        <div className="appointment-detail">
                          <span className="detail-icon">👨‍⚕️</span>
                          <div className="detail-content">
                            <span className="detail-label">Doctor</span>
                            <span className="detail-value">
                              {appointment.doctorId?.name || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div className="appointment-detail">
                          <span className="detail-icon">🏥</span>
                          <div className="detail-content">
                            <span className="detail-label">Specialization</span>
                            <span className="detail-value">
                              {appointment.doctorId?.specialization || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div className="appointment-detail">
                          <span className="detail-icon">📅</span>
                          <div className="detail-content">
                            <span className="detail-label">Date</span>
                            <span className="detail-value">
                              {formatDate(appointment.date)}
                            </span>
                          </div>
                        </div>
                        <div className="appointment-detail">
                          <span className="detail-icon">🕒</span>
                          <div className="detail-content">
                            <span className="detail-label">Time</span>
                            <span className="detail-value">{appointment.time}</span>
                          </div>
                        </div>
                        <div className="appointment-detail">
                          <span className="detail-icon">💰</span>
                          <div className="detail-content">
                            <span className="detail-label">Consultation Fee</span>
                            <span className="detail-value">₹{appointment.consultationFee}</span>
                          </div>
                        </div>
                        <div className="appointment-detail">
                          <span className="detail-icon">📱</span>
                          <div className="detail-content">
                            <span className="detail-label">Type</span>
                            <span className="type-badge">
                              {appointment.type === 'online' ? '🌐 Online' : '🏥 Offline'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminPatientAnalytics;
