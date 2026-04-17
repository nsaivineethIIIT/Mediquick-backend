import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../assets/css/DoctorSchedule.css';
import { getToken, removeToken } from '../../utils/authUtils';
import { useDoctor } from '../../context/DoctorContext';
import DoctorLayoutShell from '../common/DoctorLayoutShell';

const DoctorPatientAppointments = () => {
  const { doctor } = useDoctor();
  const navigate = useNavigate();
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (doctor?._id) {
      fetchPatientAppointments();
    }
  }, [doctor?._id]);

  const fetchPatientAppointments = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = getToken('doctor');
      if (!token) {
        navigate('/doctor/form');
        return;
      }

      const response = await fetch(
        `${BASE_URL}/doctor/appointments/previous`,
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
      
      // Group appointments by patient
      const grouped = groupAppointmentsByPatient(data);
      setPatientAppointments(grouped);
    } catch (error) {
      console.error('Error fetching patient appointments:', error);
      setError(`Failed to load patient appointments: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const groupAppointmentsByPatient = (appointments) => {
    const grouped = {};
    
    appointments.forEach(appt => {
      const patientId = appt.patientId?._id;
      if (!patientId) return;
      
      if (!grouped[patientId]) {
        grouped[patientId] = {
          patientId: patientId,
          patientName: appt.patientId?.name || 'Unknown Patient',
          patientEmail: appt.patientId?.email || 'N/A',
          patientMobile: appt.patientId?.mobile || 'N/A',
          appointments: []
        };
      }
      
      grouped[patientId].appointments.push(appt);
    });
    
    // Convert to array and sort by patient name
    return Object.values(grouped).sort((a, b) => 
      a.patientName.localeCompare(b.patientName)
    );
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

  return (
    <DoctorLayoutShell activeItem="appointments">
      <div className="doctor-page-content doctor-page-content-compact doctor-page-content-fill doctor-shared-centered doctor-page-shrink">
        <div className="schedule-container doctor-shared-card">
        {/* Header */}
        <div className="schedule-header">
          <div className="header-left">
            <span style={{ fontSize: '2rem' }}>👥</span>
            <h1>Patient Appointments</h1>
          </div>
          <div className="header-right">
            <Link to="/doctor/dashboard" className="back-btn">
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message" style={{ 
            padding: '15px', 
            margin: '20px 0', 
            backgroundColor: '#fee', 
            border: '1px solid #fcc',
            borderRadius: '5px',
            color: '#c33'
          }}>
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="schedule-summary">
          <div className="summary-item">
            <span className="summary-label">Total Patients</span>
            <span className="summary-value">{patientAppointments.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Appointments</span>
            <span className="summary-value">
              {patientAppointments.reduce((sum, p) => sum + p.appointments.length, 0)}
            </span>
          </div>
        </div>

        {/* Patient Appointments */}
        <div className="schedule-content">
          {loading ? (
            <div className="loading" style={{ textAlign: 'center', padding: '40px', fontSize: '1.6rem' }}>
              Loading patient appointments...
            </div>
          ) : patientAppointments.length === 0 ? (
            <div className="no-appointments" style={{ textAlign: 'center', padding: '40px', fontSize: '1.6rem', color: '#666' }}>
              No patient appointments found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {patientAppointments.map((patient, index) => (
                <div key={patient.patientId} style={{
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  {/* Patient Info Header */}
                  <div style={{
                    marginBottom: '15px',
                    paddingBottom: '15px',
                    borderBottom: '2px solid #e0e0e0'
                  }}>
                    <h2 style={{ 
                      margin: '0 0 10px 0',
                      fontSize: '1.5rem',
                      color: '#2c3e50'
                    }}>
                      {index + 1}. {patient.patientName}
                    </h2>
                    <div style={{ 
                      display: 'flex', 
                      gap: '20px',
                      fontSize: '0.95rem',
                      color: '#555'
                    }}>
                      <span>📧 {patient.patientEmail}</span>
                      <span>📱 {patient.patientMobile}</span>
                      <span style={{ 
                        marginLeft: 'auto',
                        fontWeight: 'bold',
                        color: '#3498db'
                      }}>
                        Total Appointments: {patient.appointments.length}
                      </span>
                    </div>
                  </div>

                  {/* Appointments Table */}
                  <div className="appointments-table-wrapper">
                    <table className="appointments-table">
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
                        {patient.appointments.map((appt, apptIndex) => (
                          <tr key={appt._id}>
                            <td>{apptIndex + 1}</td>
                            <td>{formatDate(appt.date)}</td>
                            <td>{appt.time}</td>
                            <td>
                              <span className={`status-badge ${getStatusClass(appt.status)}`}>
                                {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                              </span>
                            </td>
                            <td style={{ textTransform: 'capitalize' }}>
                              {appt.type || 'Regular'}
                            </td>
                            <td>{appt.reason || 'N/A'}</td>
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
    </DoctorLayoutShell>
  );
};

export default DoctorPatientAppointments;
