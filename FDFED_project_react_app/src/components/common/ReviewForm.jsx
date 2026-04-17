import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../assets/css/ReviewForm.css';

const ReviewForm = ({ userType, userId, userName }) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  useEffect(() => {
    checkExistingReview();
  }, [userId, userType]);

  const checkExistingReview = async () => {
    try {
      const API = import.meta.env.VITE_API_URL;
      const response = await axios.get(
        `${API}/review/check/${userType}/${userId}`
      );
      if (response.data.hasReviewed) {
        setHasReviewed(true);
        setExistingReview(response.data.review);
      }
    } catch (error) {
      console.error('Error checking review:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('Form props:', { userType, userId, userName });
    console.log('Form state:', { rating, reviewText: reviewText.trim() });

    if (rating === 0) {
      setMessage({ type: 'error', text: 'Please select a rating' });
      return;
    }

    if (reviewText.trim().length < 10) {
      setMessage({ type: 'error', text: 'Review must be at least 10 characters long' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    const requestData = {
      userId,
      userType,
      rating,
      reviewText: reviewText.trim()
    };
    console.log('Sending request:', requestData);

    try {
      const API = import.meta.env.VITE_API_URL;
      const response = await axios.post(`${API}/review/create`, requestData);

      setMessage({ type: 'success', text: response.data.message });
      setTimeout(() => {
        navigate(-1); // Go back to previous page
      }, 2000);
    } catch (error) {
      console.error('Review submission error:', error);
      console.error('Error details:', error.response?.data);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Error submitting review. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (hasReviewed) {
    return (
      <div className="review-form-container">
        <div className="review-form-card">
          <h2>Your Review</h2>
          <p className="info-message">You have already submitted a review for MediQuick.</p>
          {existingReview && (
            <div className="existing-review">
              <div className="review-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={star <= existingReview.rating ? 'star filled' : 'star'}
                  >
                    ★
                  </span>
                ))}
              </div>
              <p className="review-text">{existingReview.reviewText}</p>
              <p className="review-status">
                Status: {existingReview.isApproved ? '✓ Approved' : '⏳ Pending approval'}
              </p>
            </div>
          )}
          <button className="button back-btn" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="review-form-container">
      <div className="review-form-card">
        <h2>Share Your Experience</h2>
        <p className="subtitle">Help us improve MediQuick by sharing your feedback</p>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>How would you rate MediQuick?</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={star <= rating ? 'star filled' : 'star'}
                  onClick={() => setRating(star)}
                >
                  ★
                </span>
              ))}
            </div>
            <p className="rating-text">
              {rating === 0 && 'Select a rating'}
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="reviewText">Your Review</label>
            <textarea
              id="reviewText"
              rows="6"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience with MediQuick... (minimum 10 characters)"
              maxLength="1000"
              required
            />
            <p className="char-count">{reviewText.length}/1000 characters</p>
          </div>

          <div className="button-group">
            <button
              type="button"
              className="button cancel-btn"
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button submit-btn"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewForm;
