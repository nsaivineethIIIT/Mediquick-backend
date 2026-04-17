import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { setToken } from '../../utils/authUtils';
import Footer from '../common/Footer';
import '../../assets/css/PatientForm.css';

// ── OTP Verify Step ──────────────────────────────────────────────────────────
const RESEND_COOLDOWN = 60; // seconds

function OtpStep({ email, pendingId, onSuccess, onBack }) {
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const timerRef = useRef(null);

  // Start countdown on mount
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
    if (!otp.trim()) {
      setMessage({ type: 'error', text: 'Please enter the OTP.' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/patient/signup/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingId, otp: otp.trim() }),
      });
      const result = await response.json();
      if (response.ok) {
        if (result.token) setToken(result.token, 'patient');
        setMessage({ type: 'success', text: 'Account created! Redirecting to dashboard...' });
        setTimeout(() => {
          window.location.href = result.redirect || '/patient/dashboard';
        }, 1200);
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
    if (resendCooldown > 0) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/patient/signup/resend-otp`, {
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
        if (result.error === 'Session expired') {
          setTimeout(onBack, 2000);
        }
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
          : <span
              className="pf-link"
              onClick={handleResend}
            >Resend OTP</span>
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
    .min(6, 'Password must be at least 6 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least one letter and one number')
});

const signupSchema = yup.object().shape({
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters long')
    .max(500, 'Name must not exceed 500 characters')
    .matches(/^(?=.*[A-Za-z])[A-Za-z0-9\s\-'.]+$/, 'Name must contain at least one letter and can include letters, numbers, spaces, hyphens, apostrophes, and periods'),
  email: yup
    .string()
    .required('Email is required')
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'),
  mobile: yup
    .string()
    .required('Mobile number is required')
    .matches(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
  dateOfBirth: yup
    .date()
    .nullable()
    .max(new Date(), 'Date of birth cannot be in the future')
    .test('age', 'You must be at least 18 years old', function(value) {
      if (!value) return true;
      const today = new Date();
      const birthDate = new Date(value);
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 18;
    })
    .typeError('Please enter a valid date'),
  gender: yup
    .string()
    .nullable()
    .oneOf(['male', 'female', 'other', null, ''], 'Please select a valid gender'),
  address: yup
    .string()
    .required('Address is required')
    .min(5, 'Address must be at least 5 characters long'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least one letter and one number')
});

const PatientForm = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchText, setSearchText] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState({ medicines: [], doctors: [] });
  const searchRef = useRef(null);

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

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const query = searchText.trim();
    if (query.length < 2) {
      setSearchResults({ medicines: [], doctors: [] });
      setSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const API = import.meta.env.VITE_API_URL;
        const encoded = encodeURIComponent(query);

        const [medicineRes, doctorRes] = await Promise.all([
          fetch(`${API}/medicine/search?query=${encoded}`),
          fetch(`${API}/doctor/search?query=${encoded}`)
        ]);

        const [medicineData, doctorData] = await Promise.all([
          medicineRes.json().catch(() => ({ medicines: [] })),
          doctorRes.json().catch(() => ({ doctors: [] }))
        ]);

        setSearchResults({
          medicines: (medicineData?.medicines || []).slice(0, 4),
          doctors: (doctorData?.doctors || []).slice(0, 4)
        });
        setSearchOpen(true);
      } catch (error) {
        console.error('Global search failed:', error);
        setSearchResults({ medicines: [], doctors: [] });
        setSearchOpen(true);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  // OTP step state
  const [otpStep, setOtpStep] = useState(false);   // show OTP input screen?
  const [pendingId, setPendingId] = useState('');
  const [signupEmail, setSignupEmail] = useState('');

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
      email: '',
      mobile: '',
      dateOfBirth: '',
      gender: '',
      address: '',
      password: ''
    }
  });

  // Use the appropriate form based on isLogin state
  const { register, handleSubmit, formState: { errors }, reset } = isLogin ? loginForm : signupForm;

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setMessage({ type: '', text: '' });
    setOtpStep(false);
    setPendingId('');
    setSignupEmail('');
    loginForm.reset();
    signupForm.reset();
  };

  const onSubmit = async (data) => {
    try {
      if (isLogin) {
        // ── LOGIN: completely unchanged ──────────────────────────────────────
        const API = import.meta.env.VITE_API_URL;
        const response = await fetch(`${API}/patient/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email, password: data.password }),
        });
        const result = await response.json();
        if (response.ok) {
          if (result.token) setToken(result.token, 'patient');
          setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
          setTimeout(() => {
            window.location.href = result.redirect || '/patient/dashboard';
          }, 1000);
        } else {
          setMessage({
            type: 'error',
            text: `${result.error}${result.details ? ': ' + result.details : ''}`
          });
        }
      } else {
        // ── SIGNUP STEP 1: send OTP ──────────────────────────────────────────
        const API = import.meta.env.VITE_API_URL;
        const response = await fetch(`${API}/patient/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (response.ok) {
          // Backend validated the data and sent OTP — switch to OTP step
          setPendingId(result.pendingId);
          setSignupEmail(data.email.trim().toLowerCase());
          setOtpStep(true);
          setMessage({ type: '', text: '' });
        } else {
          setMessage({
            type: 'error',
            text: `${result.error}${result.details ? ': ' + result.details : ''}`
          });
        }
      }
    } catch (error) {
      console.error(`${isLogin ? 'Login' : 'Signup'} Error:`, error);
      setMessage({
        type: 'error',
        text: `An error occurred during ${isLogin ? 'login' : 'signup'}. Please try again.`
      });
    }
  };

  return (
    <div className="pf-page">
      <header className="fixed top-0 w-full z-50 bg-slate-50/80 backdrop-blur-xl shadow-sm">
        <div className="flex justify-between items-center px-6 md:px-10 py-4 max-w-[1440px] mx-auto w-full">
          <div className="text-2xl md:text-3xl font-bold tracking-tighter text-blue-700">MediQuick</div>
          <div className="hidden md:flex gap-8 items-center">
            <Link to="/patient/book-doc-online" className="font-manrope font-bold text-sm md:text-base tracking-tight text-blue-700 border-b-2 border-blue-600 pb-1 hover:text-blue-600 transition-colors">Find Doctors</Link>
            <Link to="/about-us" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">Services</Link>
            <Link to="/patient/dashboard" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">Health Records</Link>
            <Link to="/patient/book-appointment" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">Appointments</Link>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors pf-search-trigger"
              onClick={() => setSearchOpen((open) => !open)}
              aria-label="Open global search"
            >
              search
            </button>
            <Link to="/faqs" className="px-6 py-2 bg-primary-container text-on-primary-container rounded-xl font-manrope font-bold text-base md:text-lg tracking-tight scale-95 duration-200 active:opacity-80 transition-all hover:brightness-110">Help</Link>
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="pf-search-shell" ref={searchRef}>
          <div className="pf-search-box">
            <span className="material-symbols-outlined pf-search-icon">search</span>
            <input
              type="text"
              className="pf-search-input"
              placeholder="Search medicines or doctors..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              autoFocus
            />
          </div>

          <div className="pf-search-dropdown">
            {searchLoading && <div className="pf-search-status">Searching...</div>}

            {!searchLoading && searchResults.medicines.length === 0 && searchResults.doctors.length === 0 && (
              <div className="pf-search-status">No matches found</div>
            )}

            {!searchLoading && searchResults.medicines.length > 0 && (
              <div className="pf-search-group">
                <div className="pf-search-title">Medicines</div>
                {searchResults.medicines.map((medicine) => (
                  <Link
                    key={medicine._id}
                    to="/patient/order-medicines"
                    className="pf-search-item"
                    onClick={() => setSearchOpen(false)}
                  >
                    <span className="pf-search-item-main">{medicine.name}</span>
                    <span className="pf-search-item-sub">{medicine.manufacturer || medicine.medicineID}</span>
                  </Link>
                ))}
              </div>
            )}

            {!searchLoading && searchResults.doctors.length > 0 && (
              <div className="pf-search-group">
                <div className="pf-search-title">Doctors</div>
                {searchResults.doctors.map((doctor) => (
                  (() => {
                    const doctorId = doctor._id || doctor.id || doctor.doctorID;
                    if (!doctorId) return null;

                    return (
                  <Link
                    key={doctorId}
                    to={`/patient/doctor-profile-patient/${doctorId}`}
                    className="pf-search-item"
                    onClick={() => setSearchOpen(false)}
                  >
                    <span className="pf-search-item-main">Dr. {doctor.name}</span>
                    <span className="pf-search-item-sub">{doctor.specialization || doctor.location || 'General'}</span>
                  </Link>
                    );
                  })()
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <main className="pf-main">
        <div className="pf-bg-orb pf-bg-orb-right" />
        <div className="pf-bg-orb pf-bg-orb-left" />

        <div className="pf-layout">
          <aside className="pf-content-side">
            <h1>
              Healthcare, <br />
              <span>Simplified for You.</span>
            </h1>
            <p>
              Access secure healthcare services in one place. Book appointments, manage records, and connect with doctors through a clear patient portal.
            </p>
            <div className="pf-trust-row">
              <div className="pf-avatar-stack">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuApN4MD4dyyaxGLSVZx_hffAERLLFEod-9Relfl7iJhkN8yRSds03xd1ypw_XQE3u6NgGa4fJF12EM4IXgTgubC7Koul0T62RPWRZ6SKQPHK_h8GvzzYUNgmclTHKlugpoYLJysbWmfVlO7FWIzPDOsCRmP47gEEkMjrx6xhjYeP3RM0ZPlEtbORcmsph-rEaVG5Qe8laSnhx3WDKTA7OErPD0RnAE9cEZbtrJcGzbpPMsW3UyR3ulzxGtX4bhad9XDBwGYtkNpe3jo"
                  alt="Doctor profile"
                />
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCgYzM-5riZsO63hT_df_NHUrzHYpcGBH4DxcdJ2f8jx2cCdRH3EgSK_Vvf7CgNPnb6tK2FQmywN8LvxihpK-Tx9oN_lamHG9KVV08et98952fJZvK1UhQPY7IdZZeSnIGMSqTQf9qv5wqBICszzfN7tvL7V_VUfpNUVM_hYeggNWnlZFAJ3NtU5XXnlpd7_IyMHDWvIC91rgQu4c80HbH_IYKepfuOjwEJPzjtnHNrccLGFbSHFW8qD7DjUvRQWd9coMvr4cdbNHhn"
                  alt="Healthcare worker"
                />
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDyfvVuW-_Xr05V7Fsc5gpI2iA0AAXDTythV5NFkh3WmaYbPu6G-3Emp6uzqGuywO6mOVJDBfPi_vSeOpKogCM9jij_ALdNndF65eFY-RHy1Kxc5yIVEjZ_4ESx5GNz2dOTVaIeeHAByJOEz4scpDev7BgLVJ-_lSKc1kO6rMIWAheEsFba0odL7GPgVt8pmMo02F0dDObUcfn0AqGVUr4oW9xHu28cAoCYxbdvEhbc7BBlAQGMehLPibf0m0gg7TcVTdqMrBDRGdIQ"
                  alt="Specialist doctor"
                />
              </div>
              <span>Trusted by 25k+ patients</span>
            </div>
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
                onSuccess={() => {
                  setOtpStep(false);
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

                <h2 className="pf-form-title">{isLogin ? 'Patient Login' : 'Patient Registration'}</h2>

                {message.text && (
                  <div className={`pf-message ${message.type}`}>{message.text}</div>
                )}

                {isLogin ? (
                  <form id="loginForm" onSubmit={handleSubmit(onSubmit)} className="pf-form-stack">
                    <div className="pf-field">
                      <label className="pf-label">Email Address</label>
                      <div className="pf-input-wrap">
                        <span className="material-symbols-outlined pf-input-icon">mail</span>
                        <input
                          type="email"
                          className={`pf-input ${errors.email ? 'is-error' : ''}`}
                          placeholder="john@example.com"
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
                      New here? <span className="pf-link" onClick={toggleForm}>Create your patient account</span>
                    </p>
                  </form>
                ) : (
                  <form id="signupForm" onSubmit={handleSubmit(onSubmit)} className="pf-form-stack">
                    <div className="pf-grid-2">
                      <div className="pf-field">
                        <label className="pf-label">Full Name</label>
                        <div className="pf-input-wrap">
                          <span className="material-symbols-outlined pf-input-icon">person</span>
                          <input
                            type="text"
                            className={`pf-input ${errors.name ? 'is-error' : ''}`}
                            placeholder="John Doe"
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
                            className={`pf-input ${errors.email ? 'is-error' : ''}`}
                            placeholder="john@example.com"
                            {...register('email')}
                            autoComplete="email"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                          />
                        </div>
                        {errors.email && <span className="pf-error-message">{errors.email.message}</span>}
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
                        <label className="pf-label">Gender Identity</label>
                        <div className="pf-input-wrap">
                          <span className="material-symbols-outlined pf-input-icon">diversity_3</span>
                          <select
                            className={`pf-input pf-select ${errors.gender ? 'is-error' : ''}`}
                            {...register('gender')}
                          >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Non-binary</option>
                            <option value="">Prefer not to say</option>
                          </select>
                        </div>
                        {errors.gender && <span className="pf-error-message">{errors.gender.message}</span>}
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

                    <button type="submit" className="pf-submit-btn">Create Patient Account</button>
                    <p className="pf-terms-text">
                      By signing up, you agree to our <Link to="/contact-us">Clinical Terms of Service</Link> and <Link to="/contact-us">Privacy Policy</Link>.
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

export default PatientForm;