import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Footer from '../common/Footer';
import '../../assets/css/PatientForm.css';

// --- Yup Validation Schemas ---

const passwordRule = yup
  .string()
  .required('Password is required')
  .min(6, 'Password must be at least 6 characters')
  .matches(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least one letter and one number');

const emailRule = yup
  .string()
  .required('Email is required')
  .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address');

const loginSchema = yup.object().shape({
  email: emailRule,
  password: passwordRule,
  securityCode: yup
    .string()
    .required('Security code is required')
});

const signupSchema = yup.object().shape({
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be between 2 and 500 characters')
    .max(500, 'Name must be between 2 and 500 characters')
    .matches(/^(?=.*[A-Za-z])[A-Za-z0-9\s\-'.]+$/, 'Name must contain at least one letter and can include letters, numbers, spaces, hyphens, apostrophes, and periods'),
  signupEmail: emailRule,
  mobile: yup
    .string()
    .required('Mobile number is required')
    .matches(/^\d{10}$/, 'Mobile number must be 10 digits'),
  address: yup
    .string()
    .required('Address is required')
    .min(5, 'Address must be at least 5 characters'),
  signupPassword: passwordRule,
  signupSecurityCode: yup
    .string()
    .required('Security code is required')
});

// --- React Component ---

const AdminForm = () => {
  const [isLogin, setIsLogin] = useState(true);
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

  const loginForm = useForm({
    resolver: yupResolver(loginSchema),
    mode: 'onChange', 
    defaultValues: {
      email: '',
      password: '',
      securityCode: ''
    }
  });

  const signupForm = useForm({
    resolver: yupResolver(signupSchema),
    mode: 'onChange', 
    defaultValues: {
      name: '',
      signupEmail: '',
      mobile: '',
      address: '',
      signupPassword: '',
      signupSecurityCode: ''
    }
  });

  const { register, handleSubmit, formState: { errors }, reset } = isLogin ? loginForm : signupForm;

  const handleLogin = async (data) => {
    setMessage({ type: '', text: '' });
    
    try {
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          securityCode: data.securityCode
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        localStorage.setItem('mediquick_admin_token', result.token);
        localStorage.setItem('mediquick_admin_role', 'admin');
        
        setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
        setTimeout(() => {
          window.location.href = result.redirect || '/admin/dashboard';
        }, 1000);
      } else {
        setMessage({ type: 'error', text: result.error + (result.details ? `: ${result.details}` : '') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please check your connection and try again.' });
      console.error('Login error:', error);
    }
  };

  const handleSignup = async (data) => {
    setMessage({ type: '', text: '' });
    
    try {
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/admin/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.signupEmail,
          mobile: data.mobile,
          address: data.address,
          password: data.signupPassword,
          securityCode: data.signupSecurityCode
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Signup successful! Please login.' });
        setIsLogin(true);
        signupForm.reset();
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
    loginForm.reset();
    signupForm.reset();
  };

  return (
    <div className="pf-page">
      <header className="fixed top-0 w-full z-50 bg-slate-50/80 backdrop-blur-xl shadow-sm">
        <div className="flex justify-between items-center px-6 md:px-10 py-4 max-w-[1440px] mx-auto w-full">
          <div className="text-2xl md:text-3xl font-bold tracking-tighter text-blue-700">MediQuick</div>
          <div className="hidden md:flex gap-8 items-center">
            <Link to="/admin/dashboard" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">Dashboard</Link>
            <Link to="/about-us" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">Services</Link>
            <Link to="/faqs" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">FAQs</Link>
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
            <h1>Admin Portal</h1>
            <p>Manage platform operations, monitor users, and oversee system performance with comprehensive admin tools.</p>
          </aside>

          <section className="pf-form-side">
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

              <h2 className="pf-form-title">{isLogin ? 'Admin Login' : 'Admin Registration'}</h2>

              {message.text && (
                <div className={`pf-message ${message.type}`}>{message.text}</div>
              )}

              {isLogin ? (
                <form onSubmit={handleSubmit(handleLogin)} className="pf-form-stack">
                  <div className="pf-field">
                    <label className="pf-label">Email Address</label>
                    <div className="pf-input-wrap">
                      <span className="material-symbols-outlined pf-input-icon">mail</span>
                      <input
                        type="email"
                        className={`pf-input ${errors.email ? 'is-error' : ''}`}
                        placeholder="admin@example.com"
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

                  <div className="pf-field">
                    <label className="pf-label">Security Code</label>
                    <div className="pf-input-wrap">
                      <span className="material-symbols-outlined pf-input-icon">vpn_key</span>
                      <input
                        type="password"
                        className={`pf-input ${errors.securityCode ? 'is-error' : ''}`}
                        placeholder="Enter security code"
                        {...register('securityCode')}
                        autoComplete="off"
                      />
                    </div>
                    {errors.securityCode && <span className="pf-error-message">{errors.securityCode.message}</span>}
                  </div>

                  <button type="submit" className="pf-submit-btn">Login to Portal</button>
                  <p className="pf-terms-text">
                    New here? <span className="pf-link" onClick={toggleForm}>Create your admin account</span>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleSubmit(handleSignup)} className="pf-form-stack">
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
                          className={`pf-input ${errors.signupEmail ? 'is-error' : ''}`}
                          placeholder="admin@example.com"
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

                  <div className="pf-field">
                    <label className="pf-label">Security Code</label>
                    <div className="pf-input-wrap">
                      <span className="material-symbols-outlined pf-input-icon">vpn_key</span>
                      <input
                        type="password"
                        className={`pf-input ${errors.signupSecurityCode ? 'is-error' : ''}`}
                        placeholder="Enter security code"
                        {...register('signupSecurityCode')}
                        autoComplete="off"
                      />
                    </div>
                    {errors.signupSecurityCode && <span className="pf-error-message">{errors.signupSecurityCode.message}</span>}
                  </div>

                  <button type="submit" className="pf-submit-btn">Create Admin Account</button>
                  <p className="pf-terms-text">
                    Already have an account? <span className="pf-link" onClick={toggleForm}>Sign in</span>
                  </p>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminForm;