import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getToken, removeToken } from '../../utils/authUtils';
import Header from '../common/Header';
import Footer from '../common/Footer';
import '../../assets/css/AdminMonitorReviews.css';

const AdminMonitorReviews = () => {
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const isEmployeeRoute = location.pathname.includes('/employee/');

  useEffect(() => {
    fetchAppointmentsWithReviews();
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [searchTerm, filterRating, appointments]);

  const fetchAppointmentsWithReviews = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = isEmployeeRoute ? getToken('employee') : getToken('admin');
      const API = import.meta.env.VITE_API_URL;
      const apiEndpoint = isEmployeeRoute ? `${API}/employee/api/reviews` : `${API}/admin/api/reviews`;
      
      const response = await fetch(apiEndpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterAppointments = () => {
    let filtered = [...appointments];

    // Filter by search term (patient name, doctor name, or feedback text)
    if (searchTerm) {
      filtered = filtered.filter(appt =>
        appt.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (appt.feedback && appt.feedback.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by rating range
    if (filterRating) {
      const [min, max] = filterRating.split('-').map(Number);
      filtered = filtered.filter(appt => {
        if (!appt.rating) return false;
        if (max) {
          return appt.rating >= min && appt.rating <= max;
        }
        return appt.rating >= min;
      });
    }

    setFilteredAppointments(filtered);
  };

  const handleDeleteReview = async (appointmentId, patientName, doctorName) => {
    if (!confirm(`Are you sure you want to delete the review by ${patientName} for Dr. ${doctorName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = isEmployeeRoute ? getToken('employee') : getToken('admin');
      const API = import.meta.env.VITE_API_URL;
      const apiEndpoint = isEmployeeRoute ? `${API}/employee/api/reviews/${appointmentId}` : `${API}/admin/api/reviews/${appointmentId}`;
      
      const response = await fetch(apiEndpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete review');
      }

      alert('Review deleted successfully');
      fetchAppointmentsWithReviews(); // Refresh the list
    } catch (err) {
      console.error('Error deleting review:', err);
      alert('Failed to delete review. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleMobileNav = () => {
    setIsNavOpen(!isNavOpen);
  };

  const handleEmployeeLogout = () => {
    removeToken('employee');
    window.location.href = '/employee/form';
  };

  return (
    <div className={`admin-monitor-reviews ${isEmployeeRoute ? 'employee-mode' : ''}`}>
      {isEmployeeRoute ? (
        <div className="employee-header-shell">
          <Header
            userType="employee"
            employee={{ name: 'Employee', profilePhoto: '/images/default-employee.svg' }}
            onLogout={handleEmployeeLogout}
            showEmployeeProfileIcon={false}
          />
        </div>
      ) : (
        <Header role="admin" isNavOpen={isNavOpen} toggleMobileNav={toggleMobileNav} />
      )}

      <div className="container">
        <div className="page-header">
          <h1>Monitor Patient Reviews</h1>
          <p className="subtitle">Track and manage patient feedback for appointments</p>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <div className="search-filter">
            <input
              type="text"
              placeholder="Search by patient name, doctor name, or feedback..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="rating-filter">
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="filter-select"
            >
              <option value="">All Ratings</option>
              <option value="8-10">Excellent (8-10)</option>
              <option value="6-7">Good (6-7)</option>
              <option value="4-5">Average (4-5)</option>
              <option value="0-3">Poor (0-3)</option>
            </select>
          </div>

          <div className="stats">
            <span className="stat-badge">
              Total Reviews: <strong>{filteredAppointments.length}</strong>
            </span>
          </div>
        </div>

        {/* Reviews List */}
        {loading && (
          <div className="loading">
            <i className="fas fa-spinner fa-spin"></i> Loading reviews...
          </div>
        )}

        {error && (
          <div className="error-message">{error}</div>
        )}

        {!loading && !error && filteredAppointments.length === 0 && (
          <div className="no-data">
            <i className="fas fa-comments"></i>
            <p>{searchTerm || filterRating ? 'No reviews match your filters' : 'No reviews available yet'}</p>
          </div>
        )}

        {!loading && !error && filteredAppointments.length > 0 && (
          <div className="reviews-list">
            {filteredAppointments.map((appointment) => (
              <div key={appointment.id} className="review-card">
                <div className="review-header">
                  <div className="appointment-info">
                    <span className="appointment-date">
                      <i className="fas fa-calendar"></i> {formatDate(appointment.appointmentDate)}
                    </span>
                    <span className="appointment-time">
                      <i className="fas fa-clock"></i> {appointment.appointmentTime}
                    </span>
                    <span className={`appointment-type ${appointment.type}`}>
                      {appointment.type === 'online' ? '💻 Online' : '🏥 Clinic'}
                    </span>
                  </div>
                  {appointment.rating && (
                    <div className="rating-badge">
                      ⭐ {appointment.rating}/10
                    </div>
                  )}
                </div>

                <div className="review-body">
                  <div className="participants">
                    <div className="participant">
                      <strong>Patient:</strong>
                      <div className="details">
                        <p>{appointment.patient.name}</p>
                        <p className="contact">{appointment.patient.email}</p>
                        <p className="contact">{appointment.patient.mobile}</p>
                      </div>
                    </div>
                    
                    <div className="participant">
                      <strong>Doctor:</strong>
                      <div className="details">
                        <p>Dr. {appointment.doctor.name}</p>
                        <p className="specialization">{appointment.doctor.specialization}</p>
                        <p className="contact">{appointment.doctor.email}</p>
                      </div>
                    </div>
                  </div>

                  {appointment.feedback && (
                    <div className="feedback-section">
                      <strong>Patient Feedback:</strong>
                      <p className="feedback-text">{appointment.feedback}</p>
                      {appointment.reviewedAt && (
                        <p className="reviewed-date">
                          Submitted on {formatDate(appointment.reviewedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="review-actions">
                  <button
                    onClick={() => handleDeleteReview(appointment.id, appointment.patient.name, appointment.doctor.name)}
                    className="delete-btn"
                  >
                    <i className="fas fa-trash"></i> Delete Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isEmployeeRoute && <Footer />}
    </div>
  );
};

export default AdminMonitorReviews;