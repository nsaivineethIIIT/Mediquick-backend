import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { usePatient } from '../../context/PatientContext';
import {
  fetchPatientPrescriptions,
  downloadPrescription,
  selectPatientPrescriptions,
  selectPrescriptionLoading,
  selectPrescriptionErrors
} from '../../store/slices/prescriptionSlice';
import '../../assets/css/PatientPrescriptions.css';
import '../../assets/css/PatientDashboard.css';

const PatientPrescriptions = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { patient, logout } = usePatient();
    const [isScrolled, setIsScrolled] = useState(false);
    
    // Redux state
    const prescriptions = useSelector(selectPatientPrescriptions);
    const loading = useSelector(selectPrescriptionLoading);
    const errors = useSelector(selectPrescriptionErrors);

    useEffect(() => {
        dispatch(fetchPatientPrescriptions());
    }, [dispatch]);

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

    // Handle login redirect
    useEffect(() => {
        if (errors.patientPrescriptions && errors.patientPrescriptions.includes('log in')) {
            setTimeout(() => {
                navigate('/patient/form');
            }, 2000);
        }
    }, [errors.patientPrescriptions, navigate]);

    const handleDownload = async (prescriptionId) => {
        const result = await dispatch(downloadPrescription({ prescriptionId, userType: 'patient' }));
        
        if (result.type === 'prescription/downloadPrescription/rejected') {
            alert('Failed to download prescription. Please try again.');
        }
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
        } catch (error) {
            console.error('Error logging out:', error);
            navigate('/patient/form');
        }
    };

    const renderMainContent = () => {
        if (loading.patientPrescriptions) {
            return (
                <div className="loading">
                    <div className="loading-spinner"></div>
                    <p>Loading your prescriptions...</p>
                </div>
            );
        }

        if (errors.patientPrescriptions) {
            return (
                <div className="error-message">
                    <i className="fas fa-exclamation-triangle"></i>
                    <h3>Error Loading Prescriptions</h3>
                    <p>{errors.patientPrescriptions}</p>
                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button className="retry-btn" onClick={() => dispatch(fetchPatientPrescriptions())}>
                            <i className="fas fa-redo"></i> Try Again
                        </button>
                        <button
                            className="retry-btn"
                            onClick={() => navigate('/patient/form')}
                            style={{ backgroundColor: '#3498db' }}
                        >
                            <i className="fas fa-sign-in-alt"></i> Go to Login
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <>
                <h1 className="heading">My Prescriptions</h1>
                <h3 className="title">Your medical prescriptions and treatment plans</h3>

                <div id="prescriptionsList">
                    {prescriptions.length === 0 ? (
                        <div className="no-prescriptions">
                            <i className="fas fa-file-medical"></i>
                            <h3>No Prescriptions Found</h3>
                            <p>You don't have any prescriptions yet. Your prescriptions will appear here after consultations with doctors.</p>
                            <p style={{ marginTop: '15px', fontSize: '0.9em' }}>
                                <Link to="/patient/book-doc-online" style={{ color: '#16a085', textDecoration: 'none', fontWeight: '600' }}>
                                    <i className="fas fa-video"></i> Book an online consultation to get your first prescription
                                </Link>
                            </p>
                        </div>
                    ) : (
                        <div className="prescriptions-list">
                            {prescriptions.map(prescription => {
                                const appointmentDate = new Date(prescription.appointmentDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                });

                                return (
                                    <div key={prescription._id} className="prescription-card">
                                        <div className="prescription-header">
                                            <div className="doctor-info">
                                                <div className="doctor-name">
                                                    Dr. {prescription.doctorId?.name || 'Unknown Doctor'}
                                                </div>
                                                <div className="specialization">
                                                    {prescription.doctorId?.specialization || 'General Physician'}
                                                </div>
                                                {prescription.doctorId?.registrationNumber && (
                                                    <div style={{ fontSize: '0.85em', color: '#7f8c8d', marginTop: '5px' }}>
                                                        Reg. No: {prescription.doctorId.registrationNumber}
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
                                            </div>
                                            <button
                                                className="download-btn"
                                                onClick={() => handleDownload(prescription._id)}
                                            >
                                                <i className="fas fa-download"></i> Download PDF
                                            </button>
                                        </div>

                                        <div className="patient-info">
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

                                        {prescription.symptoms && (
                                            <div className="diagnosis">
                                                <strong><i className="fas fa-stethoscope"></i> Symptoms & Diagnosis:</strong><br />
                                                <div style={{ marginTop: '8px', lineHeight: '1.6' }}>
                                                    {prescription.symptoms}
                                                </div>
                                            </div>
                                        )}

                                        <div className="medicines-section">
                                            <h4><i className="fas fa-pills"></i> Prescribed Medicines</h4>
                                            {prescription.medicines && prescription.medicines.length > 0 ? (
                                                prescription.medicines.map((medicine, index) => (
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

                                        {prescription.additionalNotes && (
                                            <div className="instructions">
                                                <strong><i className="fas fa-info-circle"></i> Additional Notes & Instructions:</strong><br />
                                                <div style={{ marginTop: '8px', lineHeight: '1.6' }}>
                                                    {prescription.additionalNotes}
                                                </div>
                                            </div>
                                        )}

                                        <div className="prescription-id">
                                            <i className="fas fa-fingerprint"></i> Prescription ID: {prescription._id}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </>
        );
    };
    return (
        <div className="patient-dashboard patient-dashboard--zoomed min-h-screen bg-slate-50 text-slate-900">
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

            <section className="prescriptions-container">
                {renderMainContent()}
            </section>
        </div>
    );
};

export default PatientPrescriptions;