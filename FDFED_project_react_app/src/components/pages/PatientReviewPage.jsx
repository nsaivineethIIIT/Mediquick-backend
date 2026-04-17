import React from 'react';
import { usePatient } from '../../context/PatientContext';
import ReviewForm from '../common/ReviewForm';

const PatientReviewPage = () => {
  const { patient } = usePatient();

  console.log('Patient data:', patient);

  if (!patient) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <p>Please log in to submit a review.</p>
      </div>
    );
  }

  const patientId = patient._id || patient.id;
  console.log('Patient ID:', patientId);

  return (
    <ReviewForm
      userType="Patient"
      userId={patientId}
      userName={patient.name}
    />
  );
};

export default PatientReviewPage;
