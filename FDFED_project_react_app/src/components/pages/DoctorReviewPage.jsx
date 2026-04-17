import React from 'react';
import { useDoctor } from '../../context/DoctorContext';
import ReviewForm from '../common/ReviewForm';

const DoctorReviewPage = () => {
  const { doctor } = useDoctor();

  console.log('Doctor data:', doctor);

  if (!doctor) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <p>Please log in to submit a review.</p>
      </div>
    );
  }

  const doctorId = doctor._id || doctor.id;
  console.log('Doctor ID:', doctorId);

  return (
    <ReviewForm
      userType="Doctor"
      userId={doctorId}
      userName={doctor.name}
    />
  );
};

export default DoctorReviewPage;
