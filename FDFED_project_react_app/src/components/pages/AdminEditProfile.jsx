import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAdmin } from '../../context/AdminContext';
import { getToken, removeToken } from '../../utils/authUtils';
import '../../assets/css/AdminEditProfile.css';
import '../../assets/css/ProfilePagesUnified.css';

// --- Yup Validation Schema ---
const adminEditSchema = yup.object().shape({
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be between 2 and 500 characters')
    .max(500, 'Name must be between 2 and 500 characters')
    .matches(/^(?=.*[A-Za-z])[A-Za-z0-9\s\-'.]+$/, 'Name must contain at least one letter and can include letters, numbers, spaces, hyphens, apostrophes, and periods'),
  email: yup
    .string()
    .required('Email is required')
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'),
  mobile: yup
    .string()
    .required('Mobile number is required')
    .matches(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
  address: yup
    .string()
    .required('Address is required')
    .min(5, 'Address must be at least 5 characters long')
});

// --- Component ---
const AdminEditProfile = () => {
  // Context hook to get admin data and update function
  const { admin, loading: contextLoading, error: contextError, updateAdmin, logout } = useAdmin();
  
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isNavOpen, setIsNavOpen] = useState(false);
  const navigate = useNavigate();

  // Initialize react-hook-form with yup resolver
  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    resolver: yupResolver(adminEditSchema),
    mode: 'onChange', // Real-time validation
    defaultValues: {
      name: '',
      email: '',
      mobile: '',
      address: ''
    }
  });

  // useEffect to populate form data from context using RHF's setValue
  useEffect(() => {
    if (admin) {
      setValue('name', admin.name || '');
      setValue('email', admin.email || '');
      setValue('mobile', admin.mobile || '');
      setValue('address', admin.address || '');
    }
    
    // Display context loading error if any
    if (!contextLoading && contextError) {
        setMessage({ 
            text: `Error loading profile: ${contextError}`, 
            type: 'error' 
        });
    }
  }, [admin, contextLoading, contextError, setValue]);

  // useEffect for header scroll is retained
  useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector('header');
      if (window.scrollY > 30) {
        header.classList.add('header-active');
      } else {
        header.classList.remove('header-active');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileNav = () => {
    setIsNavOpen(!isNavOpen);
  };

  const closeProfile = () => {
    navigate('/admin/profile');
  };

  // Helper function to parse response
  const parseResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      const text = await response.text();
      // If it's HTML, check if it's a redirect
      if (text.includes('redirect') || response.status === 302) {
        return { redirect: '/admin/profile' };
      }
      throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
    }
  };

  // New submission handler using RHF's pattern
  const onFormSubmit = async (data) => {
    setMessage({ text: '', type: '' });
    
    try {
      setSubmitting(true);
      
      // Data object is already validated by RHF/Yup
      const token = getToken('admin');
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/admin/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data) // Use validated RHF data
      });
      
      if (response.status === 401) {
        removeToken('admin');
        navigate('/admin/form');
        return;
      }

      const result = await parseResponse(response);

      if (response.ok && result.success) { // Check for success flag in JSON response
        setMessage({ 
          text: result.message || 'Profile updated successfully!', 
          type: 'success' 
        });
        
        // Update context state with new data
        updateAdmin(result.admin);

        // Redirect after successful update
        setTimeout(() => {
          navigate('/admin/profile');
        }, 1500);
      } else if (result.redirect) {
        navigate(result.redirect);
      } else {
        throw new Error(result.error || 'An error occurred. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ 
        text: error.message || 'Failed to update profile. Please try again.', 
        type: 'error' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Use context loading state
  if (contextLoading) {
    return (
        <div className="admin-edit-profile mq-unified-profile">
            <section className="admin-edit-profile-section">
                <div className="loading">
                    <i className="fas fa-spinner fa-spin fa-2x"></i><br />
                    <p>Loading profile data...</p>
                </div>
            </section>
        </div>
    );
  }

  return (
    <div className="admin-edit-profile mq-unified-profile">
      {/* Header */}
      <header>
        <Link to="/" className="logo"><span>M</span>edi<span>Q</span>uick</Link>
        <nav className={`navbar ${isNavOpen ? 'nav-toggle' : ''}`}>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/faqs">FAQs</Link></li>
            <li><Link to="/blogs">Blog</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
          </ul>
        </nav>
        <div 
          className={`fas ${isNavOpen ? 'fa-times' : 'fa-bars'}`} 
          onClick={toggleMobileNav}
        ></div>
      </header>

      {/* Main Content */}
      <section className="admin-edit-profile-section">
        <div className="close-btn" onClick={closeProfile}>
          <i className="fas fa-times"></i>
        </div>
        
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
        
        {/* Use RHF's handleSubmit to wrap the submit function */}
        <form className="profile-form" onSubmit={handleSubmit(onFormSubmit)}>
            <div className="form-messages">
              {/* RHF errors are shown per field, but general error remains here */}
              {message.type === 'error' && (
                <div id="errorMsg" className="error-message">
                  {message.text}
                </div>
              )}
              {message.type === 'success' && (
                <div id="successMsg" className="success-message">
                  {message.text}
                </div>
              )}
            </div>

            <input
              type="text"
              id="name"
              placeholder="Full Name"
              // RHF Register
              {...register('name')}
              className={errors.name ? 'error-input' : ''}
              required
            />
            {/* RHF Error Display */}
            {errors.name && <span className="field-error">{errors.name.message}</span>}

            <input
              type="email"
              id="email"
              placeholder="Email"
              // RHF Register
              {...register('email')}
              className={errors.email ? 'error-input' : ''}
              required
            />
            {/* RHF Error Display */}
            {errors.email && <span className="field-error">{errors.email.message}</span>}

            <input
              type="text"
              id="mobile"
              placeholder="Mobile"
              // RHF Register
              {...register('mobile')}
              className={errors.mobile ? 'error-input' : ''}
              required
            />
            {/* RHF Error Display */}
            {errors.mobile && <span className="field-error">{errors.mobile.message}</span>}

            <input
              type="text"
              id="address"
              placeholder="Address"
              // RHF Register
              {...register('address')}
              className={errors.address ? 'error-input' : ''}
              required
            />
            {/* RHF Error Display */}
            {errors.address && <span className="field-error">{errors.address.message}</span>}

            <button 
              type="submit" 
              className="button"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
      </section>
    </div>
  );
};

export default AdminEditProfile;