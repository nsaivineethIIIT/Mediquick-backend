import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDoctorAppointmentsForPrescription,
  fetchDoctorPrescriptions,
  createPrescription,
  selectAppointmentsWithoutPrescriptions,
  selectPrescriptionLoading,
  selectPrescriptionErrors,
  selectCreateSuccess,
  clearCreateSuccess
} from '../../store/slices/prescriptionSlice';
import '../../assets/css/DoctorDashboardModern.css';
import DoctorLayoutShell from '../common/DoctorLayoutShell';

const DoctorGeneratePrescriptions = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Redux state
  const appointments = useSelector(selectAppointmentsWithoutPrescriptions);
  const loading = useSelector(selectPrescriptionLoading);
  const errors = useSelector(selectPrescriptionErrors);
  const createSuccess = useSelector(selectCreateSuccess);
  
  // Local state
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    appointmentId: '',
    age: '',
    gender: '',
    weight: '',
    symptoms: '',
    additionalNotes: '',
    medicines: [
      {
        medicineName: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: ''
      }
    ]
  });

  useEffect(() => {
    dispatch(fetchDoctorAppointmentsForPrescription());
    dispatch(fetchDoctorPrescriptions());
  }, [dispatch]);

  // Handle login redirect
  useEffect(() => {
    if (errors.completedAppointments === 'login_required') {
      window.location.href = '/doctor/form?error=login_required';
    }
  }, [errors.completedAppointments]);

  // Handle successful prescription creation
  useEffect(() => {
    if (createSuccess) {
      alert('Prescription created successfully!');
      dispatch(clearCreateSuccess());
      navigate('/doctor/prescriptions');
    }
  }, [createSuccess, dispatch, navigate]);

  const selectAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setFormData(prev => ({
      ...prev,
      appointmentId: appointment._id
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMedicineChange = (index, field, value) => {
    const updatedMedicines = [...formData.medicines];
    updatedMedicines[index][field] = value;
    setFormData(prev => ({
      ...prev,
      medicines: updatedMedicines
    }));
  };

  const addMedicine = () => {
    setFormData(prev => ({
      ...prev,
      medicines: [
        ...prev.medicines,
        {
          medicineName: '',
          dosage: '',
          frequency: '',
          duration: '',
          instructions: ''
        }
      ]
    }));
  };

  const removeMedicine = (index) => {
    if (formData.medicines.length > 1) {
      const updatedMedicines = formData.medicines.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        medicines: updatedMedicines
      }));
    }
  };

  // Validation functions
  const validateAge = (age) => {
    const ageNum = parseInt(age);
    return !isNaN(ageNum) && ageNum > 0 && ageNum <= 120;
  };

  const validateWeight = (weight) => {
    const weightNum = parseFloat(weight);
    return !isNaN(weightNum) && weightNum > 0 && weightNum <= 500;
  };

  const validateText = (text) => {
    // Check if text contains only valid characters and is not just symbols/dashes
    const invalidPattern = /^[\-_=+*#@!$%^&(){}\[\]|\\;:"'<>,.?/~`\s]*$/;
    const hasValidContent = /[a-zA-Z0-9]/.test(text);
    return text.trim().length > 0 && !invalidPattern.test(text) && hasValidContent;
  };

  const validateSymptomsText = (text) => {
    // Symptoms should not contain numbers, only letters and basic punctuation
    const invalidPattern = /^[\-_=+*#@!$%^&(){}\[\]|\\;:"'<>?/~`\s]*$/;
    const hasNumbers = /\d/.test(text);
    const hasValidContent = /[a-zA-Z]/.test(text);
    return text.trim().length > 0 && !invalidPattern.test(text) && hasValidContent && !hasNumbers;
  };

  const validateMedicineName = (name) => {
    // Medicine name must start with alphabet and can contain letters, numbers, hyphens, and spaces
    const validPattern = /^[a-zA-Z][a-zA-Z0-9\s\-]*$/;
    return name.trim().length >= 2 && validPattern.test(name.trim());
  };

  const validateDosage = (dosage) => {
    // Dosage should contain numbers and units like "10mg", "2 tablets", etc.
    const validPattern = /^[0-9]+[\.]?[0-9]*\s*[a-zA-Z]+.*$/;
    return validateText(dosage) && (validPattern.test(dosage.trim()) || /^[0-9]+[\.]?[0-9]*\s*(mg|g|ml|tablet|capsule|drop|unit)s?/i.test(dosage.trim()));
  };

  const validateFrequency = (frequency) => {
    // Frequency should be meaningful like "twice daily", "3 times a day", etc.
    return validateText(frequency) && frequency.trim().length >= 3;
  };

  const validateDuration = (duration) => {
    // Duration should be meaningful like "7 days", "2 weeks", etc.
    return validateText(duration) && duration.trim().length >= 3;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedAppointment) {
      alert('Please select an appointment first');
      return;
    }

    // Validate age
    if (!formData.age || !validateAge(formData.age)) {
      alert('Please enter a valid age between 1 and 120 years');
      return;
    }

    // Validate weight
    if (!formData.weight || !validateWeight(formData.weight)) {
      alert('Please enter a valid weight between 1 and 500 kg');
      return;
    }

    // Validate required fields
    if (!formData.gender || !formData.symptoms) {
      alert('Please fill all required fields');
      return;
    }

    // Validate symptoms text
    if (!validateSymptomsText(formData.symptoms)) {
      alert('Please enter valid symptoms and diagnosis (only letters and basic punctuation allowed, no numbers)');
      return;
    }

    // Validate medicines
    for (let i = 0; i < formData.medicines.length; i++) {
      const med = formData.medicines[i];
      
      if (!med.medicineName || !validateMedicineName(med.medicineName)) {
        alert(`Please enter a valid medicine name for medicine #${i + 1} (e.g., "Paracetamol", "Amoxicillin")`);
        return;
      }
      
      if (!med.dosage || !validateDosage(med.dosage)) {
        alert(`Please enter a valid dosage for medicine #${i + 1} (e.g., "500mg", "2 tablets", "10ml")`);
        return;
      }
      
      if (!med.frequency || !validateFrequency(med.frequency)) {
        alert(`Please enter a valid frequency for medicine #${i + 1} (e.g., "twice daily", "3 times a day")`);
        return;
      }
      
      if (!med.duration || !validateDuration(med.duration)) {
        alert(`Please enter a valid duration for medicine #${i + 1} (e.g., "7 days", "2 weeks")`);
        return;
      }
    }

    const prescriptionData = {
      appointmentId: formData.appointmentId,
      age: parseInt(formData.age),
      gender: formData.gender,
      weight: parseFloat(formData.weight),
      symptoms: formData.symptoms,
      medicines: formData.medicines,
      additionalNotes: formData.additionalNotes
    };

    const result = await dispatch(createPrescription(prescriptionData));
    
    if (result.type === 'prescription/createPrescription/rejected') {
      alert(result.payload || 'Failed to create prescription');
    } else {
      // Reset form on success
      setFormData({
        appointmentId: '',
        age: '',
        gender: '',
        weight: '',
        symptoms: '',
        additionalNotes: '',
        medicines: [
          {
            medicineName: '',
            dosage: '',
            frequency: '',
            duration: '',
            instructions: ''
          }
        ]
      });
      setSelectedAppointment(null);
    }
  };

  return (
    <DoctorLayoutShell activeItem="generate-prescriptions">
      <div className="doctor-page-content doctor-page-content-compact doctor-page-content-fill doctor-shared-centered doctor-page-shrink">
        <section className="doctor-section doctor-shared-card">
        <div className="prescription-container">
          <h1 className="heading">Generate Prescription</h1>
          
          <div className="appointment-list">
            <h3 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>
              Select Completed Appointment
            </h3>
            
            {loading.completedAppointments && (
              <div className="loading">
                <div className="loading-spinner"></div>
                <p>Loading appointments...</p>
              </div>
            )}

            {errors.completedAppointments && (
              <div className="error-message">
                <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
                <p>{errors.completedAppointments}</p>
                <button 
                  onClick={() => dispatch(fetchDoctorAppointmentsForPrescription())}
                  style={{ 
                    marginTop: '1rem', 
                    padding: '0.5rem 1rem', 
                    background: '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '0.3rem', 
                    cursor: 'pointer' 
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {!loading.completedAppointments && !errors.completedAppointments && appointments.length === 0 && (
              <div className="no-appointments">
                <i className="fas fa-calendar-times" style={{ fontSize: '4rem', marginBottom: '1rem' }}></i>
                <p>No completed appointments available for prescription generation.</p>
              </div>
            )}

            {!loading.completedAppointments && !errors.completedAppointments && appointments.length > 0 && (
              <div>
                {appointments.map(appointment => (
                  <div 
                    key={appointment._id}
                    className={`appointment-card ${selectedAppointment?._id === appointment._id ? 'selected' : ''}`}
                    onClick={() => selectAppointment(appointment)}
                  >
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Patient:</span>
                        <span className="info-value">{appointment.patientId?.name || 'Unknown Patient'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Date:</span>
                        <span className="info-value">
                          {new Date(appointment.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Time:</span>
                        <span className="info-value">{appointment.time}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Contact:</span>
                        <span className="info-value">{appointment.patientId?.email || 'No email'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedAppointment && (
            <div id="prescriptionForm" className="prescription-form">
              <div className="patient-info">
                <h4>Patient Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Name:</span>
                    <span className="info-value">
                      {selectedAppointment.patientId?.name || 'Unknown Patient'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value">
                      {selectedAppointment.patientId?.email || 'No email'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Appointment Date:</span>
                    <span className="info-value">
                      {new Date(selectedAppointment.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Appointment Time:</span>
                    <span className="info-value">{selectedAppointment.time}</span>
                  </div>
                </div>
              </div>

              <form id="createPrescriptionForm" onSubmit={handleSubmit}>
                <input type="hidden" id="appointmentId" name="appointmentId" value={formData.appointmentId} />
                
                <div className="form-group">
                  <label htmlFor="age">Age *</label>
                  <input 
                    type="number" 
                    id="age" 
                    name="age" 
                    value={formData.age}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || (parseInt(value) > 0 && parseInt(value) <= 120)) {
                        handleInputChange(e);
                      }
                    }}
                    onKeyPress={(e) => {
                      // Prevent negative sign and other non-numeric characters
                      if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                        e.preventDefault();
                      }
                    }}
                    required 
                    min="1" 
                    max="120"
                    placeholder="Enter age (1-120)"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="gender">Gender *</label>
                  <select 
                    id="gender" 
                    name="gender" 
                    value={formData.gender}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="weight">Weight (kg) *</label>
                  <input 
                    type="number" 
                    id="weight" 
                    name="weight" 
                    value={formData.weight}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || (parseFloat(value) > 0 && parseFloat(value) <= 500)) {
                        handleInputChange(e);
                      }
                    }}
                    onKeyPress={(e) => {
                      // Prevent negative sign and invalid characters
                      if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                        e.preventDefault();
                      }
                    }}
                    required 
                    step="0.1" 
                    min="0.1" 
                    max="500"
                    placeholder="Enter weight in kg (e.g., 70.5)"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="symptoms">Symptoms & Diagnosis *</label>
                  <textarea 
                    id="symptoms" 
                    name="symptoms" 
                    value={formData.symptoms}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only letters, spaces, and basic punctuation (no numbers)
                      if (value === '' || /^[a-zA-Z\s.,;:!?\-'"()\n\r]*$/.test(value)) {
                        handleInputChange(e);
                      }
                    }}
                    onKeyPress={(e) => {
                      // Prevent number input
                      if (/\d/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="Describe the patient's symptoms and your diagnosis (letters only, no numbers)..." 
                    required
                  ></textarea>
                </div>

                <div className="form-group">
                  <label>Medicines Prescribed *</label>
                  <div id="medicinesContainer">
                    {formData.medicines.map((medicine, index) => (
                      <div key={index} className="medicine-entry">
                        <div className="medicine-row">
                          <input 
                            type="text" 
                            value={medicine.medicineName}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Must start with alphabet, can contain letters, numbers, hyphens, spaces
                              if (value === '' || /^[a-zA-Z][a-zA-Z0-9\s\-]*$/.test(value)) {
                                handleMedicineChange(index, 'medicineName', value);
                              }
                            }}
                            placeholder="Medicine Name (e.g., Paracetamol, Co-trimoxazole)" 
                            required 
                            maxLength="100"
                          />
                          <input 
                            type="text" 
                            value={medicine.dosage}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Allow numbers, letters, spaces, and common dosage symbols
                              if (value === '' || /^[0-9a-zA-Z\s\.\-mg]+$/.test(value)) {
                                handleMedicineChange(index, 'dosage', value);
                              }
                            }}
                            placeholder="Dosage (e.g., 500mg, 2 tablets)" 
                            required 
                            maxLength="50"
                          />
                          <input 
                            type="text" 
                            value={medicine.frequency}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Prevent input that's only symbols
                              if (value === '' || /[a-zA-Z0-9]/.test(value)) {
                                handleMedicineChange(index, 'frequency', value);
                              }
                            }}
                            placeholder="Frequency (e.g., twice daily, 3 times a day)" 
                            required 
                            maxLength="50"
                          />
                          <input 
                            type="text" 
                            value={medicine.duration}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Prevent input that's only symbols
                              if (value === '' || /[a-zA-Z0-9]/.test(value)) {
                                handleMedicineChange(index, 'duration', value);
                              }
                            }}
                            placeholder="Duration (e.g., 7 days, 2 weeks)" 
                            required 
                            maxLength="30"
                          />
                          <input 
                            type="text" 
                            value={medicine.instructions}
                            onChange={(e) => handleMedicineChange(index, 'instructions', e.target.value)}
                            placeholder="Instructions" 
                          />
                          <button 
                            type="button" 
                            className="remove-medicine" 
                            onClick={() => removeMedicine(index)}
                            disabled={formData.medicines.length === 1}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="add-medicine" onClick={addMedicine}>
                    <i className="fas fa-plus"></i> Add Medicine
                  </button>
                </div>

                <div className="form-group">
                  <label htmlFor="additionalNotes">Additional Notes & Instructions</label>
                  <textarea 
                    id="additionalNotes" 
                    name="additionalNotes" 
                    value={formData.additionalNotes}
                    onChange={handleInputChange}
                    placeholder="Any additional instructions for the patient..."
                  ></textarea>
                </div>

                <button type="submit" className="submit-btn">
                  <i className="fas fa-file-medical"></i> Generate Prescription
                </button>
              </form>
            </div>
          )}
        </div>
        </section>
      </div>

      <style jsx>{`
        .prescription-container {
          max-width: 1120px;
          margin: 0 auto;
          padding: 1.25rem;
          font-size: 1.02rem;
          font-weight: 600;
        }

        .heading {
          font-size: 2.25rem !important;
          font-weight: 800;
          margin-bottom: 1rem;
          text-align: center !important;
          line-height: 1.2;
        }

        .appointment-list {
          margin-bottom: 2rem;
        }

        .appointment-card {
          background: #fff;
          border-radius: 0.5rem;
          box-shadow: 0 0.3rem 0.5rem rgba(0, 0, 0, 0.1);
          padding: 1rem;
          margin-bottom: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .appointment-card:hover {
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.2);
        }

        .appointment-card.selected {
          border-left: 4px solid #007bff;
          background: #f8f9fa;
        }

        .prescription-form {
          background: #fff;
          border-radius: 0.5rem;
          box-shadow: 0 0.3rem 0.5rem rgba(0, 0, 0, 0.1);
          padding: 1.25rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.35rem;
          font-weight: 700;
          color: #333;
          font-size: 1rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.65rem;
          border: 1px solid #ddd;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .medicine-entry {
          border: 1px solid #ddd;
          padding: 0.75rem;
          margin-bottom: 0.75rem;
          border-radius: 0.5rem;
          background: #f9f9f9;
        }

        .medicine-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr auto;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          align-items: end;
        }

        .medicine-row input {
          width: 100%;
          padding: 0.45rem;
          border: 1px solid #ccc;
          border-radius: 0.3rem;
          font-size: 0.95rem;
          font-weight: 600;
        }

        .remove-medicine {
          background: #dc3545;
          color: white;
          border: none;
          padding: 0.45rem 0.7rem;
          border-radius: 0.3rem;
          cursor: pointer;
          font-size: 0.92rem;
          font-weight: 700;
        }

        .remove-medicine:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .add-medicine {
          background: #007bff;
          color: white;
          border: none;
          padding: 0.6rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.98rem;
          font-weight: 700;
          margin-bottom: 0.8rem;
        }

        .submit-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 0.8rem 1.2rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 1.08rem;
          font-weight: 800;
          width: 100%;
          margin-top: 0.75rem;
        }

        .submit-btn:hover {
          background: #218838;
        }

        .no-appointments {
          text-align: center;
          padding: 2rem;
          color: #666;
          font-size: 1.08rem;
          font-weight: 600;
        }

        .patient-info {
          background: #e9ecef;
          padding: 0.8rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .info-item {
          display: flex;
          flex-direction: column;
        }

        .info-label {
          font-weight: 700;
          color: #333;
          font-size: 0.95rem;
        }

        .info-value {
          color: #666;
          font-size: 1rem;
          font-weight: 600;
        }

        .loading {
          text-align: center;
          padding: 2rem;
          color: #666;
        }

        .loading-spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 2s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-message {
          text-align: center;
          padding: 2rem;
          color: #dc3545;
          background: #f8d7da;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }
      `}</style>
    </DoctorLayoutShell>
  );
};

export default DoctorGeneratePrescriptions;