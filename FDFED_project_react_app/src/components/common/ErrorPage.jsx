import React from 'react';
import { useLocation, useNavigate, Link, useSearchParams } from 'react-router-dom';
import '../../assets/css/ErrorPage.css';

const ErrorPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Extract error details from location state or URL params
  const errorMessage = location.state?.message || searchParams.get('message') || 'An unexpected error occurred';
  const errorType = location.state?.type || searchParams.get('type') || 'error';
  const errorStatus = location.state?.status || searchParams.get('status') || '';

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="error-page-container">
      <div className="error-page-content">
        <div className="error-icon">
          {errorType === 'network' ? '🌐' : errorType === 'unauthorized' ? '🔒' : '⚠️'}
        </div>
        
        <h1 className="error-title">Oops! Something went wrong</h1>
        
        {errorStatus && (
          <div className="error-status">Error Code: {errorStatus}</div>
        )}
        
        <p className="error-message">{errorMessage}</p>
        
        <div className="error-actions">
          <button 
            className="btn-primary" 
            onClick={handleGoBack}
          >
            ← Go Back
          </button>
          
          <Link to="/" className="btn-secondary">
            🏠 Go to Home
          </Link>
        </div>
        
        <div className="error-help">
          <p>If this problem persists, please contact support.</p>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
