import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { setToken } from '../../utils/authUtils';
import Footer from '../common/Footer';
import '../../assets/css/PatientForm.css';

// Temporarily suppress unused Header warnings since we're using inline header
// import Header from '../common/Header';

// ── OTP Verify Step ──────────────────────────────────────────────────────────
const RESEND_COOLDOWN = 60;

function OtpStep({ email, pendingId, onBack }) {
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    setResendCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp.trim()) { setMessage({ type: 'error', text: 'Please enter the OTP.' }); return; }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/doctor/signup/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingId, otp: otp.trim() }),
      });
      const result = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: result.message || 'Account created! Await approval. Redirecting to login...' });
        setTimeout(() => { window.location.href = '/doctor/form'; }, 2500);
      } else {
        setMessage({ type: 'error', text: `${result.error}${result.details ? ': ' + result.details : ''}` });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/doctor/signup/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingId, email }),
      });
      const result = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'A new OTP has been sent to your email.' });
        resetTimer();
      } else {
        setMessage({ type: 'error', text: `${result.error}${result.details ? ': ' + result.details : ''}` });
        if (result.error === 'Session expired') setTimeout(onBack, 2000);
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pf-card">
      <h2 className="pf-form-title">Verify Your Email</h2>
      <p className="pf-help-text pf-center">
        A 6-digit OTP has been sent to <strong>{email}</strong>. Enter it below to complete your registration.
      </p>

      {message.text && (
        <div className={`pf-message ${message.type}`}>{message.text}</div>
      )}

      <form onSubmit={handleVerify} className="pf-form-stack">
        <div className="pf-field">
          <label className="pf-label">One-Time Password</label>
          <div className="pf-input-wrap">
            <span className="material-symbols-outlined pf-input-icon">key</span>
            <input
              type="text"
              className="pf-input pf-otp-input"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              autoFocus
            />
          </div>
        </div>

        <button type="submit" className="pf-submit-btn" disabled={loading}>
          {loading ? 'Verifying…' : 'Verify & Create Account'}
        </button>
      </form>

      <p className="pf-help-text pf-center">
        Didn't receive the OTP?{' '}
        {resendCooldown > 0
          ? <span className="pf-muted">Resend in {resendCooldown}s</span>
          : <span className="pf-link" onClick={handleResend}>Resend OTP</span>
        }
      </p>

      <p className="pf-center pf-back-text">
        <span className="pf-link" onClick={onBack}>← Back to Sign Up</span>
      </p>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// Yup validation schemas
const loginSchema = yup.object().shape({
  email: yup
    .string()
    .required('Email is required')
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least one letter and one number')
});

const signupSchema = yup.object().shape({
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(500, 'Name must not exceed 500 characters')
    .matches(/^(?=.*[A-Za-z])[A-Za-z0-9\s\-'.]+$/, 'Name must contain at least one letter and can include letters, numbers, spaces, hyphens, apostrophes, and periods'),
  signupEmail: yup
    .string()
    .required('Email is required')
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'),
  mobile: yup
    .string()
    .required('Mobile number is required')
    .matches(/^\d{10}$/, 'Mobile number must be exactly 10 digits'),
  dateOfBirth: yup
    .date()
    .required('Date of birth is required')
    .max(new Date(), 'Date of birth cannot be in the future')
    .test('age', 'Doctor must be at least 21 years old', function(value) {
      if (!value) return false;
      const today = new Date();
      const birthDate = new Date(value);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= 21;
    })
    .typeError('Please enter a valid date'),
  gender: yup
    .string()
    .nullable()
    .oneOf(['male', 'female', 'other', null, ''], 'Please select a valid gender'),
  address: yup
    .string()
    .required('Address is required')
    .min(5, 'Address must be at least 5 characters'),
  registrationNumber: yup
    .string()
    .required('Registration number is required')
    .matches(/^[a-zA-Z0-9]{6,20}$/, 'Registration number must be 6-20 alphanumeric characters'),
  specialization: yup
    .string()
    .required('Specialization is required'),
  college: yup
    .string()
    .required('College is required'),
  yearOfPassing: yup
    .number()
    .required('Year of passing is required')
    .min(1970, 'Year must be 1970 or later')
    .max(2025, 'Year cannot exceed 2025')
    .typeError('Year of passing must be a number'),
  location: yup
    .string()
    .required('Location is required'),
  onlineStatus: yup
    .string()
    .required('Online status is required'),
  consultationFee: yup
    .number()
    .required('Consultation fee is required')
    .min(0, 'Consultation fee must be a positive number')
    .typeError('Consultation fee must be a number'),

  signupPassword: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least one letter and one number'),
  document: yup
    .mixed()
    .required('Document is required')
    .test('fileType', 'Only PDF, DOC, and DOCX files are allowed', (value) => {
      if (!value || !value[0]) return false;
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      return validTypes.includes(value[0].type);
    })
});

const DoctorForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [otpStep, setOtpStep] = useState(false);
  const [pendingId, setPendingId] = useState('');
  const [signupEmail, setSignupEmail] = useState('');

  useEffect(() => {
    const previousRootFontSize = document.documentElement.style.fontSize;
    document.documentElement.classList.add('light');
    document.documentElement.style.fontSize = '14px';
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    return () => {
      document.documentElement.classList.remove('light');
      document.documentElement.style.fontSize = previousRootFontSize;
    };
  }, []);

  // Initialize react-hook-form with yup resolver
  const loginForm = useForm({
    resolver: yupResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const signupForm = useForm({
    resolver: yupResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      signupEmail: '',
      mobile: '',
      dateOfBirth: '',
      gender: '',
      address: '',
      registrationNumber: '',
      specialization: '',
      college: '',
      yearOfPassing: '',
      location: '',
      onlineStatus: 'Online',
      consultationFee: '',
      signupPassword: '',
      document: null
    }
  });

  // Use the appropriate form based on isLogin state
  const { register, handleSubmit, formState: { errors } } = isLogin ? loginForm : signupForm;

  const onLoginSubmit = async (data) => {
    setMessage({ type: '', text: '' });
    
    try {
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/doctor/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        if (result.token) {
          setToken(result.token, 'doctor');
        }
        setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
        setTimeout(() => {
          window.location.href = '/doctor/dashboard';
        }, 1000);
      } else {
        setMessage({ type: 'error', text: result.error + (result.details ? `: ${result.details}` : '') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please check your connection and try again.' });
      console.error('Login error:', error);
    }
  };

  const onSignupSubmit = async (data) => {
    setMessage({ type: '', text: '' });
    
    const signupData = new FormData();
    signupData.append('name', data.name);
    signupData.append('email', data.signupEmail);
    signupData.append('mobile', data.mobile);
    signupData.append('address', data.address);
    signupData.append('registrationNumber', data.registrationNumber);
    signupData.append('specialization', data.specialization);
    signupData.append('college', data.college);
    signupData.append('yearOfPassing', data.yearOfPassing);
    signupData.append('location', data.location);
    signupData.append('onlineStatus', data.onlineStatus);
    signupData.append('consultationFee', data.consultationFee);
    signupData.append('password', data.signupPassword);
    if (data.dateOfBirth) signupData.append('dateOfBirth', data.dateOfBirth);
    if (data.gender) signupData.append('gender', data.gender);
    if (data.document && data.document[0]) {
      signupData.append('document', data.document[0]);
    }
    
    try {
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/doctor/signup`, {
        method: 'POST',
        body: signupData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setPendingId(result.pendingId);
        setSignupEmail(data.signupEmail.trim().toLowerCase());
        setOtpStep(true);
        setMessage({ type: '', text: '' });
      } else {
        setMessage({ type: 'error', text: result.error + (result.details ? `: ${result.details}` : '') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please check your connection and try again.' });
      console.error('Signup error:', error);
    }
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setMessage({ type: '', text: '' });
    setOtpStep(false);
    setPendingId('');
    setSignupEmail('');
    loginForm.reset();
    signupForm.reset();
  };

  return (
    <div className="pf-page">
      <header className="fixed top-0 w-full z-50 bg-slate-50/80 backdrop-blur-xl shadow-sm">
        <div className="flex justify-between items-center px-6 md:px-10 py-4 max-w-[1440px] mx-auto w-full">
          <div className="text-2xl md:text-3xl font-bold tracking-tighter text-blue-700">MediQuick</div>
          <div className="hidden md:flex gap-8 items-center">
            <Link to="/doctor/dashboard" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">Dashboard</Link>
            <Link to="/about-us" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">Services</Link>
            <Link to="/faqs" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">FAQs</Link>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/faqs" className="px-6 py-2 bg-primary-container text-on-primary-container rounded-xl font-manrope font-bold text-base md:text-lg tracking-tight scale-95 duration-200 active:opacity-80 transition-all hover:brightness-110">Help</Link>
          </div>
        </div>
      </header>

      <main className="pf-main">
        <div className="pf-bg-orb pf-bg-orb-right" />
        <div className="pf-bg-orb pf-bg-orb-left" />

        <div className="pf-layout">
          <aside className="pf-content-side">
            <h1>Doctor Portal</h1>
            <p>Connect with patients, manage consultations, and build your medical practice with our comprehensive platform.</p>
          </aside>

          <section className="pf-form-side">
            {otpStep ? (
              <OtpStep
                email={signupEmail}
                pendingId={pendingId}
                onBack={() => {
                  setOtpStep(false);
                  setPendingId('');
                  setSignupEmail('');
                  setMessage({ type: '', text: '' });
                }}
              />
            ) : (
              <div className="pf-card">
                <div className="pf-toggle-wrap">
                  <button
                    type="button"
                    className={`pf-toggle-btn ${!isLogin ? 'active' : ''}`}
                    onClick={() => !isLogin || toggleForm()}
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    className={`pf-toggle-btn ${isLogin ? 'active' : ''}`}
                    onClick={() => isLogin || toggleForm()}
                  >
                    Login
                  </button>
                </div>

                <h2 className="pf-form-title">{isLogin ? 'Doctor Login' : 'Doctor Registration'}</h2>

                {message.text && (
                  <div className={`pf-message ${message.type}`}>{message.text}</div>
                )}

                {isLogin ? (
                  <form onSubmit={handleSubmit(onLoginSubmit)} className="pf-form-stack">
                    <div className="pf-field">
                      <label className="pf-label">Email Address</label>
                      <div className="pf-input-wrap">
                        <span className="material-symbols-outlined pf-input-icon">mail</span>
                        <input
                          type="email"
                          className={`pf-input ${errors.email ? 'is-error' : ''}`}
                          placeholder="doctor@example.com"
                          {...register('email')}
                          autoComplete="email"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                        />
                      </div>
                      {errors.email && <span className="pf-error-message">{errors.email.message}</span>}
                    </div>

                    <div className="pf-field">
                      <label className="pf-label">Password</label>
                      <div className="pf-input-wrap">
                        <span className="material-symbols-outlined pf-input-icon">lock</span>
                        <input
                          type="password"
                          className={`pf-input ${errors.password ? 'is-error' : ''}`}
                          placeholder="••••••••"
                          {...register('password')}
                        />
                      </div>
                      {errors.password && <span className="pf-error-message">{errors.password.message}</span>}
                    </div>

                    <button type="submit" className="pf-submit-btn">Login to Portal</button>
                    <p className="pf-terms-text">
                      New here? <span className="pf-link" onClick={toggleForm}>Create your doctor account</span>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleSubmit(onSignupSubmit)} className="pf-form-stack">
                    <div className="pf-grid-2">
                      <div className="pf-field">
                        <label className="pf-label">Full Name</label>
                        <div className="pf-input-wrap">
                          <span className="material-symbols-outlined pf-input-icon">person</span>
                          <input
                            type="text"
                            className={`pf-input ${errors.name ? 'is-error' : ''}`}
                            placeholder="Dr. John Doe"
                            {...register('name')}
                          />
                        </div>
                        {errors.name && <span className="pf-error-message">{errors.name.message}</span>}
                      </div>

                      <div className="pf-field">
                        <label className="pf-label">Email Address</label>
                        <div className="pf-input-wrap">
                          <span className="material-symbols-outlined pf-input-icon">mail</span>
                          <input
                            type="email"
                            className={`pf-input ${errors.signupEmail ? 'is-error' : ''}`}
                            placeholder="doctor@example.com"
                            {...register('signupEmail')}
                            autoComplete="email"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                          />
                        </div>
                        {errors.signupEmail && <span className="pf-error-message">{errors.signupEmail.message}</span>}
                      </div>
                    </div>

                    <div className="pf-grid-2">
                      <div className="pf-field">
                        <label className="pf-label">Mobile Number</label>
                        <div className="pf-input-wrap">
                          <span className="material-symbols-outlined pf-input-icon">call</span>
                          <input
                            type="tel"
                            className={`pf-input ${errors.mobile ? 'is-error' : ''}`}
                            placeholder="+1 (555) 000-0000"
                            {...register('mobile')}
                          />
                        </div>
                        {errors.mobile && <span className="pf-error-message">{errors.mobile.message}</span>}
                      </div>

                      <div className="pf-field">
                        <label className="pf-label">Date of Birth</label>
                        <div className="pf-input-wrap">
                          <span className="material-symbols-outlined pf-input-icon">calendar_today</span>
                          <input
                            type="date"
                            className={`pf-input ${errors.dateOfBirth ? 'is-error' : ''}`}
                            {...register('dateOfBirth')}
                            max={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        {errors.dateOfBirth && <span className="pf-error-message">{errors.dateOfBirth.message}</span>}
                      </div>
                    </div>

                    <div className="pf-grid-2">
                      <div className="pf-field">
                        <label className="pf-label">Gender</label>
                        <div className="pf-input-wrap">
                          <span className="material-symbols-outlined pf-input-icon">diversity_3</span>
                          <select
                            className={`pf-input pf-select ${errors.gender ? 'is-error' : ''}`}
                            {...register('gender')}
                          >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        {errors.gender && <span className="pf-error-message">{errors.gender.message}</span>}
                      </div>

                      <div className="pf-field">
                        <label className="pf-label">Registration Number</label>
                        <div className="pf-input-wrap">
                          <span className="material-symbols-outlined pf-input-icon">badge</span>
                          <input
                            type="text"
                            className={`pf-input ${errors.registrationNumber ? 'is-error' : ''}`}
                            placeholder="e.g., MCI12345"
                            {...register('registrationNumber')}
                          />
                        </div>
                        {errors.registrationNumber && <span className="pf-error-message">{errors.registrationNumber.message}</span>}
                      </div>
                    </div>

                    <div className="pf-field">
                      <label className="pf-label">Residential Address</label>
                      <div className="pf-input-wrap pf-textarea-wrap">
                        <span className="material-symbols-outlined pf-input-icon pf-textarea-icon">location_on</span>
                        <textarea
                          rows={2}
                          className={`pf-input pf-textarea ${errors.address ? 'is-error' : ''}`}
                          placeholder="Street, City, State, ZIP"
                          {...register('address')}
                        />
                      </div>
                      {errors.address && <span className="pf-error-message">{errors.address.message}</span>}
                    </div>

                    <div className="pf-grid-2">
                      <div className="pf-field">
                        <label className="pf-label">Specialization</label>
                        <div className="pf-input-wrap">
                          <span className="material-symbols-outlined pf-input-icon">medical_information</span>
                          <select
                            className={`pf-input pf-select ${errors.specialization ? 'is-error' : ''}`}
                            {...register('specialization')}
                          >
                            <option value="">Select Specialization</option>
                            <option value="Cardiology">Cardiology</option>
                            <option value="Neurology">Neurology</option>
                            <option value="Orthopedics">Orthopedics</option>
                            <option value="Pediatrics">Pediatrics</option>
                            <option value="Dermatology">Dermatology</option>
                            <option value="Psychiatry">Psychiatry</option>
                            <option value="Oncology">Oncology</option>
                            <option value="Radiology">Radiology</option>
                            <option value="Emergency Medicine">Emergency Medicine</option>
                            <option value="Internal Medicine">Internal Medicine</option>
                            <option value="Gastroenterology">Gastroenterology</option>
                            <option value="Endocrinology">Endocrinology</option>
                            <option value="Ophthalmology">Ophthalmology</option>
                            <option value="ENT (Otolaryngology)">ENT (Otolaryngology)</option>
                            <option value="Anesthesiology">Anesthesiology</option>
                          </select>
                        </div>
                        {errors.specialization && <span className="pf-error-message">{errors.specialization.message}</span>}
                      </div>

                      <div className="pf-field">
                        <label className="pf-label">College/Institution</label>
                        <div className="pf-input-wrap">
                          <span className="material-symbols-outlined pf-input-icon">school</span>
                          <input
                            type="text"
                            className={`pf-input ${errors.college ? 'is-error' : ''}`}
                            placeholder="Medical College Name"
                            {...register('college')}
                          />
                        </div>
                        {errors.college && <span className="pf-error-message">{errors.college.message}</span>}
                      </div>
                    </div>

                    <div className="pf-grid-2">
                      <div className="pf-field">
                        <label className="pf-label">Year of Passing</label>
                        <div className="pf-input-wrap">
                          <span className="material-symbols-outlined pf-input-icon">calendar_month</span>
                          <input
                            type="number"
                            className={`pf-input ${errors.yearOfPassing ? 'is-error' : ''}`}
                            placeholder="2020"
                            {...register('yearOfPassing')}
                          />
                        </div>
                        {errors.yearOfPassing && <span className="pf-error-message">{errors.yearOfPassing.message}</span>}
                      </div>

                      <div className="pf-field">
                        <label className="pf-label">Location</label>
                        <div className="pf-input-wrap">
                          <span className="material-symbols-outlined pf-input-icon">location_on</span>
                          <input
                            type="text"
                            className={`pf-input ${errors.location ? 'is-error' : ''}`}
                            placeholder="City/Region"
                            {...register('location')}
                          />
                        </div>
                        {errors.location && <span className="pf-error-message">{errors.location.message}</span>}
                      </div>
                    </div>

                    <div className="pf-grid-2">
                      <div className="pf-field">
                        <label className="pf-label">Consultation Fee</label>
                        <div className="pf-input-wrap">
                          <span className="material-symbols-outlined pf-input-icon">currency_rupee</span>
                          <input
                            type="number"
                            className={`pf-input ${errors.consultationFee ? 'is-error' : ''}`}
                            placeholder="500"
                            {...register('consultationFee')}
                          />
                        </div>
                        {errors.consultationFee && <span className="pf-error-message">{errors.consultationFee.message}</span>}
                      </div>

                      <div className="pf-field">
                        <label className="pf-label">Availability Status</label>
                        <div className="pf-input-wrap">
                          <span className="material-symbols-outlined pf-input-icon">check_circle</span>
                          <select
                            className={`pf-input pf-select ${errors.onlineStatus ? 'is-error' : ''}`}
                            {...register('onlineStatus')}
                          >
                            <option value="Online">Online</option>
                            <option value="Offline">Offline</option>
                          </select>
                        </div>
                        {errors.onlineStatus && <span className="pf-error-message">{errors.onlineStatus.message}</span>}
                      </div>
                    </div>

                    <div className="pf-field">
                      <label className="pf-label">Password</label>
                      <div className="pf-input-wrap">
                        <span className="material-symbols-outlined pf-input-icon">lock</span>
                        <input
                          type="password"
                          className={`pf-input ${errors.signupPassword ? 'is-error' : ''}`}
                          placeholder="••••••••"
                          {...register('signupPassword')}
                        />
                      </div>
                      {errors.signupPassword && <span className="pf-error-message">{errors.signupPassword.message}</span>}
                    </div>

                    <div className="pf-field">
                      <label className="pf-label">Medical Document</label>
                      <div className="pf-input-wrap">
                        <span className="material-symbols-outlined pf-input-icon">description</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className={`pf-input ${errors.document ? 'is-error' : ''}`}
                          placeholder="Upload PDF, DOC, or DOCX"
                          {...register('document')}
                        />
                      </div>
                      {errors.document && <span className="pf-error-message">{errors.document.message}</span>}
                    </div>

                    <button type="submit" className="pf-submit-btn">Create Doctor Account</button>
                    <p className="pf-terms-text">
                      Already have an account? <span className="pf-link" onClick={toggleForm}>Sign in</span>
                    </p>
                  </form>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DoctorForm;