import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getToken, removeToken } from '../../utils/authUtils';
import '../../assets/css/DoctorDashboardModern.css';
import DoctorLayoutShell from '../common/DoctorLayoutShell';

const PatientHistory = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientHistory, setPatientHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    // Check if patient ID is passed via URL params
    const patientIdFromUrl = searchParams.get('patientId');
    if (patientIdFromUrl && patients.length > 0) {
      setSelectedPatientId(patientIdFromUrl);
      fetchPatientHistory(patientIdFromUrl);
    }
  }, [searchParams, patients]);

  const fetchPatients = async () => {
    try {
      const token = getToken('doctor');
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/appointment/doctor/patients`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        removeToken('doctor');
        navigate('/doctor/form');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients);
      } else {
        throw new Error('Failed to fetch patients');
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      setError('Failed to load patients list');
    }
  };

  const fetchPatientHistory = async (patientId) => {
    if (!patientId) return;

    setLoading(true);
    setError('');
    setPatientHistory(null);

    try {
      const token = getToken('doctor');
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/appointment/doctor/patient-history/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        removeToken('doctor');
        navigate('/doctor/form');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setPatientHistory(data);
      } else {
        throw new Error('Failed to fetch patient history');
      }
    } catch (error) {
      console.error('Error fetching patient history:', error);
      setError('Failed to load patient history');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = (e) => {
    const patientId = e.target.value;
    setSelectedPatientId(patientId);
    if (patientId) {
      fetchPatientHistory(patientId);
    } else {
      setPatientHistory(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <DoctorLayoutShell activeItem="history">
      <div className="doctor-page-content doctor-page-content-compact doctor-page-content-fill doctor-shared-centered doctor-page-shrink">
        <section className="doctor-section doctor-shared-card" style={{ minHeight: '80vh' }}>
        <h1 className="heading">Patient History</h1>
        <br />

        <div style={{ width: '100%', margin: '0 auto', padding: '20px' }}>
          {/* Patient Selection Dropdown */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '1.6rem', 
              fontWeight: 'bold', 
              marginBottom: '10px',
              color: '#444d53'
            }}>
              Select Patient:
            </label>
            <select
              value={selectedPatientId}
              onChange={handlePatientSelect}
              style={{
                width: '100%',
                maxWidth: '500px',
                padding: '12px',
                fontSize: '1.5rem',
                borderRadius: '5px',
                border: '2px solid #0188df',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Choose a patient --</option>
              {patients.map((patient) => (
                <option key={patient._id} value={patient._id}>
                  {patient.name} ({patient.email})
                </option>
              ))}
            </select>
          </div>

          {/* Loading State */}
          {loading && (
            <div style={{ textAlign: 'center', fontSize: '1.6rem', color: '#0188df', padding: '40px' }}>
              Loading patient history...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div style={{ 
              textAlign: 'center', 
              fontSize: '1.6rem', 
              color: '#dc2626', 
              padding: '40px',
              background: '#fee',
              borderRadius: '10px'
            }}>
              {error}
            </div>
          )}

          {/* Patient History Display */}
          {patientHistory && !loading && (
            <div>
              <div style={{ 
                background: '#f0f9ff', 
                padding: '20px', 
                borderRadius: '10px', 
                marginBottom: '30px',
                border: '2px solid #0188df'
              }}>
                <h2 style={{ fontSize: '2rem', color: '#0188df', marginBottom: '10px' }}>
                  {patientHistory.patient.name}
                </h2>
                <p style={{ fontSize: '1.4rem', color: '#444d53' }}>
                  <strong>Email:</strong> {patientHistory.patient.email} | 
                  <strong> Mobile:</strong> {patientHistory.patient.mobile || 'N/A'}
                </p>
                <p style={{ fontSize: '1.4rem', color: '#444d53', marginTop: '10px' }}>
                  <strong>Total Completed Appointments:</strong> {patientHistory.appointments.length}
                </p>
              </div>

              {/* Appointments List */}
              {patientHistory.appointments.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  fontSize: '1.6rem', 
                  color: '#666', 
                  padding: '40px',
                  background: '#f9f9f9',
                  borderRadius: '10px'
                }}>
                  No completed appointments found for this patient.
                </div>
              ) : (
                <div>
                  {patientHistory.appointments.map((appointment, index) => (
                    <div 
                      key={appointment._id}
                      style={{
                        background: 'white',
                        border: '2px solid #ddd',
                        borderRadius: '10px',
                        padding: '25px',
                        marginBottom: '25px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      {/* Appointment Header */}
                      <div style={{ 
                        borderBottom: '2px solid #0188df', 
                        paddingBottom: '15px', 
                        marginBottom: '20px' 
                      }}>
                        <h3 style={{ fontSize: '1.8rem', color: '#0188df', marginBottom: '10px' }}>
                          Appointment #{patientHistory.appointments.length - index}
                        </h3>
                        <div style={{ fontSize: '1.4rem', color: '#444d53' }}>
                          <p><strong>Date:</strong> {formatDate(appointment.date)}</p>
                          <p><strong>Time:</strong> {appointment.time}</p>
                          <p><strong>Type:</strong> {appointment.type}</p>
                          <p><strong>Consultation Fee:</strong> ₹{appointment.consultationFee}</p>
                          {appointment.notes && (
                            <p><strong>Patient Notes:</strong> {appointment.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* Doctor Notes */}
                      {(appointment.doctorNotes?.text || appointment.doctorNotes?.files?.length > 0) && (
                        <div style={{ 
                          background: '#f0fdf4', 
                          padding: '15px', 
                          borderRadius: '8px', 
                          marginBottom: '20px',
                          border: '1px solid #10b981'
                        }}>
                          <h4 style={{ fontSize: '1.6rem', color: '#10b981', marginBottom: '10px' }}>
                            📝 My Notes
                          </h4>
                          {appointment.doctorNotes.text && (
                            <p style={{ fontSize: '1.4rem', color: '#444d53', whiteSpace: 'pre-wrap' }}>
                              {appointment.doctorNotes.text}
                            </p>
                          )}
                          {appointment.doctorNotes.files && appointment.doctorNotes.files.length > 0 && (
                            <div style={{ marginTop: '10px' }}>
                              <p style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '5px' }}>
                                Attached Files:
                              </p>
                              {appointment.doctorNotes.files.map((file, idx) => (
                                <div key={idx} style={{ marginBottom: '5px' }}>
                                  <a 
                                    href={`${import.meta.env.VITE_API_URL}/uploads/doctorNotes/${file.filename}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '1.3rem', color: '#0188df' }}
                                  >
                                    📎 {file.originalName}
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Prescription */}
                      {appointment.prescription && (
                        <div style={{ 
                          background: '#fef3c7', 
                          padding: '15px', 
                          borderRadius: '8px', 
                          marginBottom: '20px',
                          border: '1px solid #f59e0b'
                        }}>
                          <h4 style={{ fontSize: '1.6rem', color: '#f59e0b', marginBottom: '10px' }}>
                            💊 Prescription
                          </h4>
                          <div style={{ fontSize: '1.4rem', color: '#444d53' }}>
                            <p><strong>Age:</strong> {appointment.prescription.age} | 
                               <strong> Gender:</strong> {appointment.prescription.gender} | 
                               <strong> Weight:</strong> {appointment.prescription.weight} kg</p>
                            <p style={{ marginTop: '10px' }}><strong>Symptoms:</strong> {appointment.prescription.symptoms}</p>
                            
                            <div style={{ marginTop: '15px' }}>
                              <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Medicines:</p>
                              {appointment.prescription.medicines.map((medicine, idx) => (
                                <div key={idx} style={{ 
                                  background: 'white', 
                                  padding: '10px', 
                                  borderRadius: '5px', 
                                  marginBottom: '8px' 
                                }}>
                                  <p><strong>{idx + 1}. {medicine.medicineName}</strong></p>
                                  <p style={{ fontSize: '1.3rem' }}>
                                    Dosage: {medicine.dosage} | 
                                    Frequency: {medicine.frequency} | 
                                    Duration: {medicine.duration}
                                  </p>
                                  {medicine.instructions && (
                                    <p style={{ fontSize: '1.2rem', color: '#666' }}>
                                      Instructions: {medicine.instructions}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>

                            {appointment.prescription.additionalNotes && (
                              <p style={{ marginTop: '10px' }}>
                                <strong>Additional Notes:</strong> {appointment.prescription.additionalNotes}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Chat History */}
                      {appointment.chatMessages && appointment.chatMessages.length > 0 && (
                        <div style={{ 
                          background: '#eff6ff', 
                          padding: '15px', 
                          borderRadius: '8px',
                          border: '1px solid #3b82f6'
                        }}>
                          <h4 style={{ fontSize: '1.6rem', color: '#3b82f6', marginBottom: '10px' }}>
                            💬 Chat History ({appointment.chatMessages.length} messages)
                          </h4>
                          <div style={{ 
                            maxHeight: '400px', 
                            overflowY: 'auto',
                            padding: '10px',
                            background: 'white',
                            borderRadius: '5px'
                          }}>
                            {appointment.chatMessages.map((msg, idx) => (
                              <div 
                                key={idx}
                                style={{
                                  marginBottom: '12px',
                                  padding: '10px',
                                  borderRadius: '8px',
                                  background: msg.senderType === 'doctor' ? '#e0f2fe' : '#f0fdf4',
                                  borderLeft: `4px solid ${msg.senderType === 'doctor' ? '#3b82f6' : '#10b981'}`
                                }}
                              >
                                <div style={{ 
                                  fontSize: '1.2rem', 
                                  color: '#666', 
                                  marginBottom: '5px',
                                  display: 'flex',
                                  justifyContent: 'space-between'
                                }}>
                                  <span style={{ fontWeight: 'bold', color: msg.senderType === 'doctor' ? '#3b82f6' : '#10b981' }}>
                                    {msg.senderType === 'doctor' ? 'You (Doctor)' : 'Patient'}
                                  </span>
                                  <span>{formatTimestamp(msg.timestamp)}</span>
                                </div>
                                {msg.isFile ? (
                                  <a
                                    href={`${import.meta.env.VITE_API_URL}/chat/download/${msg.fileName}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '1.4rem', color: '#0188df' }}
                                  >
                                    📎 {msg.originalFileName || msg.fileName} (Download)
                                  </a>
                                ) : (
                                  <p style={{ fontSize: '1.4rem', color: '#444d53', margin: 0 }}>
                                    {msg.message}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No Additional Data Message */}
                      {!appointment.prescription && 
                       (!appointment.doctorNotes?.text && !appointment.doctorNotes?.files?.length) &&
                       (!appointment.chatMessages || appointment.chatMessages.length === 0) && (
                        <div style={{ 
                          textAlign: 'center', 
                          fontSize: '1.4rem', 
                          color: '#999', 
                          padding: '20px',
                          background: '#f9f9f9',
                          borderRadius: '5px'
                        }}>
                          No additional information (prescription, notes, or chat) available for this appointment.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No Patient Selected */}
          {!selectedPatientId && !loading && (
            <div style={{ 
              textAlign: 'center', 
              fontSize: '1.6rem', 
              color: '#666', 
              padding: '60px',
              background: '#f9f9f9',
              borderRadius: '10px'
            }}>
              Please select a patient from the dropdown to view their history.
            </div>
          )}
        </div>
        </section>
      </div>
    </DoctorLayoutShell>
  );
};

export default PatientHistory;
