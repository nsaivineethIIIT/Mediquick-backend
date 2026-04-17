import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Footer from '../common/Footer';
import '../../assets/css/PatientForm.css';

// --- Yup Validation Schemas ---
const loginSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
  securityCode: yup.string().required('Security code is required')
});

const signupSchema = yup.object({
  name: yup.string().required('Name is required'),
  signupEmail: yup.string().email('Invalid email').required('Email is required'),
  mobile: yup.string().matches(/^[0-9]{10}$/, 'Mobile must be 10 digits').required('Mobile is required'),
  address: yup.string().required('Address is required'),
  signupPassword: yup.string().min(6, 'Password must be 6+ characters').matches(/^(?=.*[A-Za-z])(?=.*\d)/, 'Must contain letter and number').required('Password is required'),
  signupSecurityCode: yup.string().required('Security code is required'),
  profilePhoto: yup.mixed().required('Profile photo is required'),
  document: yup.mixed().required('Document is required')
});

const EmployeeForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');

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

  const loginForm = useForm({
    resolver: yupResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '', securityCode: '' }
  });

  const signupForm = useForm({
    resolver: yupResolver(signupSchema),
    mode: 'onChange',
    defaultValues: { name: '', signupEmail: '', mobile: '', address: '', signupPassword: '', signupSecurityCode: '', profilePhoto: null, document: null }
  });

  const currentForm = isLogin ? loginForm : signupForm;
  const { register, handleSubmit, formState: { errors }, watch, reset } = currentForm;
  const profilePhotoFile = watch('profilePhoto');

  // Handle photo preview
  useEffect(() => {
    if (!isLogin && profilePhotoFile && profilePhotoFile[0]) {
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target.result);
      reader.readAsDataURL(profilePhotoFile[0]);
    } else {
      setPhotoPreview('');
    }
  }, [profilePhotoFile, isLogin]);

  const handleLogin = async (data) => {
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/employee/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password, securityCode: data.securityCode })
      });

      const result = await response.json();
      if (response.ok) {
        localStorage.setItem('mediquick_employee_token', result.token);
        localStorage.setItem('mediquick_employee_role', 'employee');
        setSuccessMessage('Login successful! Redirecting...');
        setTimeout(() => { window.location.href = result.redirect || '/employee/dashboard'; }, 1000);
      } else {
        setErrorMessage(result.error + (result.details ? `: ${result.details}` : ''));
      }
    } catch (error) {
      setErrorMessage('Network error. Please check your connection and try again.');
      console.error('Login error:', error);
    }
  };

  const handleSignup = async (data) => {
    setErrorMessage('');
    setSuccessMessage('');

    const signupData = new FormData();
    signupData.append('name', data.name);
    signupData.append('email', data.signupEmail);
    signupData.append('mobile', data.mobile);
    signupData.append('address', data.address);
    signupData.append('password', data.signupPassword);
    signupData.append('securityCode', data.signupSecurityCode);
    if (data.profilePhoto && data.profilePhoto[0]) signupData.append('profilePhoto', data.profilePhoto[0]);
    if (data.document && data.document[0]) signupData.append('document', data.document[0]);

    try {
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/employee/signup`, {
        method: 'POST',
        body: signupData
      });

      const result = await response.json();
      if (response.ok) {
        setSuccessMessage('Signup successful! Please login.');
        setIsLogin(true);
        signupForm.reset();
        setPhotoPreview('');
      } else {
        setErrorMessage(result.error + (result.details ? `: ${result.details}` : ''));
      }
    } catch (error) {
      setErrorMessage('Network error. Please check your connection and try again.');
      console.error('Signup error:', error);
    }
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setErrorMessage('');
    setSuccessMessage('');
    loginForm.reset();
    signupForm.reset();
    setPhotoPreview('');
  };

  return (
    <div className="pf-page">
      <header className="fixed top-0 w-full z-50 bg-slate-50/80 backdrop-blur-xl shadow-sm">
        <div className="flex justify-between items-center px-6 md:px-10 py-4 max-w-[1440px] mx-auto w-full">
          <div className="text-2xl md:text-3xl font-bold tracking-tighter text-blue-700">MediQuick</div>
          <div className="hidden md:flex gap-8 items-center">
            <Link to="/employee/dashboard" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">Dashboard</Link>
            <Link to="/about-us" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">Services</Link>
            <Link to="/faqs" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">FAQs</Link>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/faqs" className="px-6 py-2 bg-primary-container text-on-primary-container rounded-xl font-manrope font-bold text-base md:text-lg tracking-tight scale-95 duration-200 active:opacity-80 transition-all hover:brightness-110">Help</Link>
          </div>
        </div>
      </header>

      <main className="pf-main">
        <div className="pf-bg-orb pf-bg-orb-right"></div>
        <div className="pf-bg-orb pf-bg-orb-left"></div>

        <div className="pf-layout">
          <aside className="pf-content-side">
            <h1>Employee Portal</h1>
            <p>Manage platform operations and coordinate supply chain activities with our comprehensive system.</p>
          </aside>

          <section className="pf-form-side">
            <div className="pf-card">
              <div className="pf-toggle-wrap">
                <button type="button" className={`pf-toggle-btn ${!isLogin ? 'active' : ''}`} onClick={() => !isLogin || toggleForm()}>Sign Up</button>
                <button type="button" className={`pf-toggle-btn ${isLogin ? 'active' : ''}`} onClick={() => isLogin || toggleForm()}>Login</button>
              </div>

              <h2 className="pf-form-title">{isLogin ? 'Employee Login' : 'Employee Registration'}</h2>

              {errorMessage && <div className="pf-message error">{errorMessage}</div>}
              {successMessage && <div className="pf-message success">{successMessage}</div>}

              {isLogin ? (
                <form onSubmit={handleSubmit(handleLogin)} className="pf-form-stack">
                  <div className="pf-field">
                    <label className="pf-label">Email Address</label>
                    <div className="pf-input-wrap">
                      <span className="material-symbols-outlined pf-input-icon">mail</span>
                      <input type="email" className={`pf-input ${errors.email ? 'is-error' : ''}`} placeholder="employee@example.com" {...register('email')} autoComplete="email" />
                    </div>
                    {errors.email && <span className="pf-error-message">{errors.email.message}</span>}
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Password</label>
                    <div className="pf-input-wrap">
                      <span className="material-symbols-outlined pf-input-icon">lock</span>
                      <input type="password" className={`pf-input ${errors.password ? 'is-error' : ''}`} placeholder="••••••••" {...register('password')} />
                    </div>
                    {errors.password && <span className="pf-error-message">{errors.password.message}</span>}
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Security Code</label>
                    <div className="pf-input-wrap">
                      <span className="material-symbols-outlined pf-input-icon">vpn_key</span>
                      <input type="password" className={`pf-input ${errors.securityCode ? 'is-error' : ''}`} placeholder="Enter security code" {...register('securityCode')} autoComplete="off" />
                    </div>
                    {errors.securityCode && <span className="pf-error-message">{errors.securityCode.message}</span>}
                  </div>
                  <button type="submit" className="pf-submit-btn">Login to Portal</button>
                  <p className="pf-terms-text">New here? <span className="pf-link" onClick={toggleForm}>Create your employee account</span></p>
                </form>
              ) : (
                <form onSubmit={handleSubmit(handleSignup)} className="pf-form-stack">
                  <div className="pf-grid-2">
                    <div className="pf-field">
                      <label className="pf-label">Full Name</label>
                      <div className="pf-input-wrap">
                        <span className="material-symbols-outlined pf-input-icon">person</span>
                        <input type="text" className={`pf-input ${errors.name ? 'is-error' : ''}`} placeholder="John Doe" {...register('name')} />
                      </div>
                      {errors.name && <span className="pf-error-message">{errors.name.message}</span>}
                    </div>
                    <div className="pf-field">
                      <label className="pf-label">Email Address</label>
                      <div className="pf-input-wrap">
                        <span className="material-symbols-outlined pf-input-icon">mail</span>
                        <input type="email" className={`pf-input ${errors.signupEmail ? 'is-error' : ''}`} placeholder="employee@example.com" {...register('signupEmail')} />
                      </div>
                      {errors.signupEmail && <span className="pf-error-message">{errors.signupEmail.message}</span>}
                    </div>
                  </div>
                  <div className="pf-grid-2">
                    <div className="pf-field">
                      <label className="pf-label">Mobile Number</label>
                      <div className="pf-input-wrap">
                        <span className="material-symbols-outlined pf-input-icon">call</span>
                        <input type="tel" className={`pf-input ${errors.mobile ? 'is-error' : ''}`} placeholder="+1 (555) 000-0000" {...register('mobile')} />
                      </div>
                      {errors.mobile && <span className="pf-error-message">{errors.mobile.message}</span>}
                    </div>
                    <div className="pf-field">
                      <label className="pf-label">Password</label>
                      <div className="pf-input-wrap">
                        <span className="material-symbols-outlined pf-input-icon">lock</span>
                        <input type="password" className={`pf-input ${errors.signupPassword ? 'is-error' : ''}`} placeholder="••••••••" {...register('signupPassword')} />
                      </div>
                      {errors.signupPassword && <span className="pf-error-message">{errors.signupPassword.message}</span>}
                    </div>
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Address</label>
                    <div className="pf-input-wrap pf-textarea-wrap">
                      <span className="material-symbols-outlined pf-input-icon pf-textarea-icon">location_on</span>
                      <textarea rows={2} className={`pf-input pf-textarea ${errors.address ? 'is-error' : ''}`} placeholder="Street, City, State, ZIP" {...register('address')} />
                    </div>
                    {errors.address && <span className="pf-error-message">{errors.address.message}</span>}
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Profile Photo</label>
                    <div className="pf-input-wrap">
                      <span className="material-symbols-outlined pf-input-icon">image</span>
                      <input type="file" className={`pf-input ${errors.profilePhoto ? 'is-error' : ''}`} accept="image/*" {...register('profilePhoto')} />
                    </div>
                    {photoPreview && <img src={photoPreview} alt="Preview" style={{ maxWidth: '100px', marginTop: '10px', borderRadius: '8px' }} />}
                    {errors.profilePhoto && <span className="pf-error-message">{errors.profilePhoto.message}</span>}
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Security Code</label>
                    <div className="pf-input-wrap">
                      <span className="material-symbols-outlined pf-input-icon">vpn_key</span>
                      <input type="password" className={`pf-input ${errors.signupSecurityCode ? 'is-error' : ''}`} placeholder="Enter security code" {...register('signupSecurityCode')} autoComplete="off" />
                    </div>
                    {errors.signupSecurityCode && <span className="pf-error-message">{errors.signupSecurityCode.message}</span>}
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Verification Document</label>
                    <div className="pf-input-wrap">
                      <span className="material-symbols-outlined pf-input-icon">upload_file</span>
                      <input type="file" className={`pf-input ${errors.document ? 'is-error' : ''}`} {...register('document')} />
                    </div>
                    {errors.document && <span className="pf-error-message">{errors.document.message}</span>}
                  </div>
                  <button type="submit" className="pf-submit-btn">Create Employee Account</button>
                  <p className="pf-terms-text">Already have an account? <span className="pf-link" onClick={toggleForm}>Sign in</span></p>
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

export default EmployeeForm;