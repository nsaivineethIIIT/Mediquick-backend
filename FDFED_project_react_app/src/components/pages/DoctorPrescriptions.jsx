import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDoctorPrescriptions,
  downloadPrescription,
  selectDoctorPrescriptions,
  selectPrescriptionLoading,
  selectPrescriptionErrors
} from '../../store/slices/prescriptionSlice';
import '../../assets/css/DoctorDashboardModern.css';
import '../../assets/css/DoctorPrescriptions.css';
import DoctorLayoutShell from '../common/DoctorLayoutShell';

const DoctorPrescriptions = () => {
  const dispatch = useDispatch();
  const prescriptions = useSelector(selectDoctorPrescriptions);
  const loading = useSelector(selectPrescriptionLoading);
  const errors = useSelector(selectPrescriptionErrors);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  useEffect(() => {
    dispatch(fetchDoctorPrescriptions());
  }, [dispatch]);

  const handleDownload = async (prescriptionId) => {
    const result = await dispatch(downloadPrescription({ prescriptionId, userType: 'doctor' }));
    if (result.type === 'prescription/downloadPrescription/rejected') {
      alert('Failed to download prescription. Please try again.');
    }
  };

  if (loading.doctorPrescriptions) {
    return (
      <DoctorLayoutShell activeItem="prescriptions">
        <div className="doctor-page-content doctor-page-content-compact doctor-page-content-fill doctor-shared-centered doctor-page-shrink">
          <section className="doctor-section doctor-shared-card prescriptions-container">
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Loading your prescriptions...</p>
            </div>
          </section>
        </div>
      </DoctorLayoutShell>
    );
  }

  if (errors.doctorPrescriptions) {
    return (
      <DoctorLayoutShell activeItem="prescriptions">
        <div className="doctor-page-content doctor-page-content-compact doctor-page-content-fill doctor-shared-centered doctor-page-shrink">
          <section className="doctor-section doctor-shared-card prescriptions-container">
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              <h3>Error Loading Prescriptions</h3>
              <p>{errors.doctorPrescriptions}</p>
              <button className="retry-btn" onClick={() => dispatch(fetchDoctorPrescriptions())}>
                <i className="fas fa-redo"></i> Try Again
              </button>
            </div>
          </section>
        </div>
      </DoctorLayoutShell>
    );
  }

  return (
    <DoctorLayoutShell activeItem="prescriptions">
      <div className="doctor-page-content doctor-page-content-compact doctor-page-content-fill doctor-shared-centered doctor-page-shrink">
        <section className="doctor-section doctor-shared-card prescriptions-container">
          <h1 className="heading">My Prescriptions</h1>
          <h3 className="title">Prescriptions created for your patients</h3>

          <div id="prescriptionsList">
            {prescriptions.length === 0 ? (
              <div className="no-prescriptions">
                <i className="fas fa-file-medical"></i>
                <h3>No Prescriptions Found</h3>
                <p>You haven't created any prescriptions yet. Create your first prescription after a patient consultation.</p>
                <p style={{ marginTop: '15px', fontSize: '0.9em' }}>
                  <Link
                    to="/doctor/generate-prescriptions"
                    style={{ color: '#3498db', textDecoration: 'none', fontWeight: '600' }}
                  >
                    <i className="fas fa-plus"></i> Create New Prescription
                  </Link>
                </p>
              </div>
            ) : (
              <div className="prescriptions-list">
                {prescriptions.map((prescription) => (
                  <PrescriptionCard
                    key={prescription._id}
                    prescription={prescription}
                    onDownload={handleDownload}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </DoctorLayoutShell>
  );
};

const PrescriptionCard = ({ prescription, onDownload, formatDate }) => {
  const appointmentDate = formatDate(prescription.appointmentDate);
  const createdDate = new Date(prescription.createdAt).toLocaleDateString();

  return (
    <div className="prescription-card" id={`prescription-${prescription._id}`}>
      <div className="prescription-header">
        <div className="doctor-info"></div>
        <div className="patient-info">
          <div className="patient-name">{prescription.patientName}</div>
          <div className="patient-email">{prescription.patientEmail}</div>
          {prescription.patientId?.mobile && (
            <div style={{ fontSize: '0.85em', color: '#7f8c8d', marginTop: '5px' }}>
              Mobile: {prescription.patientId.mobile}
            </div>
          )}
        </div>
        <div className="prescription-date">
          <div className="date-time">
            <i className="far fa-calendar"></i> {appointmentDate}
          </div>
          <div style={{ marginTop: '5px' }}>
            <i className="far fa-clock"></i> {prescription.appointmentTime}
          </div>
          <div style={{ marginTop: '5px', fontSize: '0.9em' }}>
            Created: {createdDate}
          </div>
        </div>
      </div>

      {prescription.symptoms && <Diagnosis symptoms={prescription.symptoms} />}
      <PatientDetails prescription={prescription} />
      <MedicinesSection medicines={prescription.medicines} />
      {prescription.additionalNotes && <AdditionalNotes notes={prescription.additionalNotes} />}

      <div className="action-buttons">
        <button className="download-btn" onClick={() => onDownload(prescription._id)}>
          <i className="fas fa-download"></i> Download PDF
        </button>
      </div>

      <div className="prescription-id">
        <i className="fas fa-fingerprint"></i> Prescription ID: {prescription._id}
      </div>
    </div>
  );
};

const PatientDetails = ({ prescription }) => (
  <div className="patient-details">
    <strong><i className="fas fa-user"></i> Patient Details:</strong>
    <div className="patient-details-grid">
      <div className="patient-detail-item">
        <div className="patient-detail-label">Name</div>
        <div className="patient-detail-value">{prescription.patientName}</div>
      </div>
      <div className="patient-detail-item">
        <div className="patient-detail-label">Age</div>
        <div className="patient-detail-value">{prescription.age} years</div>
      </div>
      <div className="patient-detail-item">
        <div className="patient-detail-label">Gender</div>
        <div className="patient-detail-value" style={{ textTransform: 'capitalize' }}>
          {prescription.gender}
        </div>
      </div>
      {prescription.weight && (
        <div className="patient-detail-item">
          <div className="patient-detail-label">Weight</div>
          <div className="patient-detail-value">{prescription.weight} kg</div>
        </div>
      )}
    </div>
  </div>
);

const Diagnosis = ({ symptoms }) => (
  <div className="diagnosis">
    <strong><i className="fas fa-stethoscope"></i> Symptoms and Diagnosis:</strong>
    <br />
    <div style={{ marginTop: '8px', lineHeight: '1.6' }}>
      {symptoms}
    </div>
  </div>
);

const MedicinesSection = ({ medicines }) => (
  <div className="medicines-section">
    <h4><i className="fas fa-pills"></i> Prescribed Medicines</h4>
    {medicines && medicines.length > 0 ? (
      medicines.map((medicine, index) => (
        <div key={index} className="medicine-item">
          <div style={{ flex: 1 }}>
            <div className="medicine-name">
              {index + 1}. {medicine.medicineName}
            </div>
            <div className="medicine-details">
              <span className="dosage">{medicine.dosage}</span>
              <span className="medicine-detail-item">
                <strong>Frequency:</strong> {medicine.frequency}
              </span>
              <span className="medicine-detail-item">
                <strong>Duration:</strong> {medicine.duration}
              </span>
              {medicine.instructions && (
                <span className="medicine-detail-item">
                  <strong>Instructions:</strong> {medicine.instructions}
                </span>
              )}
            </div>
          </div>
        </div>
      ))
    ) : (
      <div style={{ textAlign: 'center', padding: '20px', color: '#7f8c8d' }}>
        <i className="fas fa-info-circle"></i> No medicines prescribed
      </div>
    )}
  </div>
);

const AdditionalNotes = ({ notes }) => (
  <div className="instructions">
    <strong><i className="fas fa-info-circle"></i> Additional Notes and Instructions:</strong>
    <br />
    <div style={{ marginTop: '8px', lineHeight: '1.6' }}>
      {notes}
    </div>
  </div>
);

export default DoctorPrescriptions;
