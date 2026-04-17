import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { usePatient } from '../../context/PatientContext';
import { getToken, removeToken } from '../../utils/authUtils';
import '../../assets/css/PatientDashboard.css';

const patientEditSchema = yup.object().shape({
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(500, 'Name must not exceed 500 characters')
    .matches(/^(?=.*[A-Za-z])[A-Za-z0-9\s\-'.]+$/, 'Name must contain at least one letter and can include letters, numbers, spaces, hyphens, apostrophes, and periods')
    .trim(),
  email: yup
    .string()
    .required('Email is required')
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address')
    .trim(),
  mobile: yup
    .string()
    .required('Mobile number is required')
    .matches(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits')
    .trim(),
  address: yup
    .string()
    .required('Address is required')
    .min(5, 'Address must be at least 5 characters')
    .trim(),
  dateOfBirth: yup
    .date()
    .nullable()
    .transform((value, originalValue) => (originalValue === '' ? null : value))
    .max(new Date(), 'Date of birth cannot be in the future')
    .test('age', 'Patient must be at least 1 year old', function (value) {
      if (!value) return true;
      const age = Math.floor((new Date() - new Date(value)) / 31557600000);
      return age >= 1;
    }),
  gender: yup
    .string()
    .nullable()
    .oneOf(['male', 'female', 'other', null, ''], 'Please select a valid gender')
});

const PatientEditProfile = () => {
  const { patient, loading: patientLoading, error: patientError, refetch, logout } = usePatient();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('/images/default-patient.svg');
  const [isScrolled, setIsScrolled] = useState(false);

  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm({
    resolver: yupResolver(patientEditSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      mobile: '',
      address: '',
      dateOfBirth: '',
      gender: ''
    }
  });

  useEffect(() => {
    if (!patient) return;

    setValue('name', patient.name || '');
    setValue('email', patient.email || '');
    setValue('mobile', patient.mobile || '');
    setValue('address', patient.address || '');

    if (patient.dateOfBirth) {
      const date = new Date(patient.dateOfBirth);
      setValue('dateOfBirth', date.toISOString().split('T')[0]);
    } else {
      setValue('dateOfBirth', '');
    }

    setValue('gender', patient.gender || '');

    if (patient.profilePhoto) {
      const photo = patient.profilePhoto;
      if (/^(https?:|data:|blob:)/i.test(photo)) {
        setProfilePhoto(photo);
      } else {
        const API = import.meta.env.VITE_API_URL;
        setProfilePhoto(photo.startsWith('/') ? `${API}${photo}` : `${API}/${photo}`);
      }
    } else {
      setProfilePhoto('/images/default-patient.svg');
    }
  }, [patient, setValue]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setProfilePhoto(loadEvent.target?.result || '/images/default-patient.svg');
    };
    reader.readAsDataURL(file);
  };

  const removeProfilePhoto = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) return;

    try {
      const token = getToken('patient');
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/patient/profile-photo/remove`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401) {
        removeToken('patient');
        navigate('/patient/form');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setProfilePhoto('/images/default-patient.svg');
        setSuccess('Profile photo removed successfully.');
        setPhotoError('');
        refetch();
      } else {
        setPhotoError(data.error || 'Failed to remove photo');
      }
    } catch (error) {
      console.error('Error removing profile photo:', error);
      setPhotoError('Failed to remove photo');
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    setSuccess('');
    setPhotoError('');

    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('email', data.email);
      formData.append('mobile', data.mobile);
      formData.append('address', data.address);

      if (data.dateOfBirth) formData.append('dateOfBirth', data.dateOfBirth);
      if (data.gender) formData.append('gender', data.gender);

      if (fileInputRef.current?.files?.[0]) {
        formData.append('profilePhoto', fileInputRef.current.files[0]);
      }

      const token = getToken('patient');
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/patient/update-profile`, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401) {
        removeToken('patient');
        navigate('/patient/form');
        return;
      }

      const result = await response.json();
      if (response.ok) {
        setSuccess(result.message || 'Profile updated successfully.');
        refetch();
        setTimeout(() => {
          navigate('/patient/profile');
        }, 1400);
      } else {
        setPhotoError(result.error || 'Error updating profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setPhotoError('An error occurred while updating the profile');
    } finally {
      setSaving(false);
    }
  };

  const getProfileImageUrl = () => {
    if (!patient?.profilePhoto) return '/images/default-patient.svg';
    const photo = patient.profilePhoto;
    if (/^(https?:|data:|blob:)/i.test(photo)) return photo;
    const API = import.meta.env.VITE_API_URL;
    if (photo.startsWith('/')) return `${API}${photo}`;
    return `${API}/${photo}`;
  };

  const handleLogout = async () => {
    try {
      logout();
    } catch (error) {
      console.error('Error logging out:', error);
      removeToken('patient');
      navigate('/patient/form');
    }
  };

  useEffect(() => {
    const previousRootFontSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '14px';
    document.body.classList.add('patient-profile-zoom');

    return () => {
      document.documentElement.style.fontSize = previousRootFontSize;
      document.body.classList.remove('patient-profile-zoom');
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (patientLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 text-lg">
        Loading profile...
      </div>
    );
  }

  if (patientError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-rose-700 font-semibold">
          Error: {patientError}
        </div>
      </div>
    );
  }

  return (
    <div className="patient-dashboard patient-dashboard--zoomed min-h-screen bg-slate-50 text-slate-900">
      <div className={`pd-header ${isScrolled ? 'pd-header--scrolled' : ''}`} role="banner">
        <div className="pd-header__inner">
          <div className="pd-header__left">
            <Link to="/patient/dashboard" className="pd-header__brand">MediQuick</Link>

            <nav className="pd-header__nav">
              <Link to="/patient/dashboard" className="pd-header__nav-link">Home</Link>
              <Link to="/about-us" className="pd-header__nav-link">About</Link>
              <Link to="/faqs" className="pd-header__nav-link">FAQs</Link>
              <Link to="/blog" className="pd-header__nav-link">Blog</Link>
              <Link to="/contact-us" className="pd-header__nav-link">Contact</Link>
            </nav>
          </div>

          <div className="pd-header__right">
            <div className="pd-header__divider" aria-hidden="true" />

            <Link to="/patient/profile" className="pd-header__avatar-wrap">
              <img
                src={getProfileImageUrl()}
                alt="Patient Profile"
                className="pd-header__avatar"
                onError={(event) => {
                  event.currentTarget.src = '/images/default-patient.svg';
                }}
              />
            </Link>
            <button type="button" className="pd-header__logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1320px] px-6 py-10 md:px-10 md:py-12">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Edit Patient Profile</h1>
            <p className="mt-2 text-sm md:text-base text-slate-600">Update your personal details and profile photo.</p>
            <button
              type="button"
              onClick={() => navigate('/patient/profile')}
              className="mt-4 rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Back to Profile
            </button>
          </div>

          {success && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {success}
            </div>
          )}

          {photoError && (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {photoError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <img
                  src={profilePhoto}
                  alt="Patient Profile"
                  className="h-28 w-28 rounded-full object-cover border-4 border-white shadow"
                  onError={(event) => {
                    event.currentTarget.src = '/images/default-patient.svg';
                  }}
                />

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition"
                  >
                    Upload Photo
                  </button>
                  <button
                    type="button"
                    onClick={removeProfilePhoto}
                    className="rounded-xl border border-blue-300 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
                  >
                    Remove Photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  {...register('name')}
                  className={`w-full rounded-xl border px-4 py-3 text-sm md:text-base bg-white outline-none transition ${
                    errors.name ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-600'
                  }`}
                />
                {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  {...register('email')}
                  className={`w-full rounded-xl border px-4 py-3 text-sm md:text-base bg-white outline-none transition ${
                    errors.email ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-600'
                  }`}
                />
                {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Mobile</label>
                <input
                  type="tel"
                  {...register('mobile')}
                  className={`w-full rounded-xl border px-4 py-3 text-sm md:text-base bg-white outline-none transition ${
                    errors.mobile ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-600'
                  }`}
                />
                {errors.mobile && <p className="mt-1 text-xs text-rose-600">{errors.mobile.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Date of Birth</label>
                <input
                  type="date"
                  {...register('dateOfBirth')}
                  className={`w-full rounded-xl border px-4 py-3 text-sm md:text-base bg-white outline-none transition ${
                    errors.dateOfBirth ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-600'
                  }`}
                />
                {errors.dateOfBirth && <p className="mt-1 text-xs text-rose-600">{errors.dateOfBirth.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Gender</label>
                <select
                  {...register('gender')}
                  className={`w-full rounded-xl border px-4 py-3 text-sm md:text-base bg-white outline-none transition ${
                    errors.gender ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-600'
                  }`}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && <p className="mt-1 text-xs text-rose-600">{errors.gender.message}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Address</label>
                <textarea
                  rows={3}
                  {...register('address')}
                  className={`w-full rounded-xl border px-4 py-3 text-sm md:text-base bg-white outline-none transition resize-y ${
                    errors.address ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-600'
                  }`}
                />
                {errors.address && <p className="mt-1 text-xs text-rose-600">{errors.address.message}</p>}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-700 px-7 py-3 text-sm md:text-base font-semibold text-white shadow-md hover:bg-blue-800 transition disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/patient/profile')}
                className="rounded-xl border-2 border-slate-300 bg-slate-50 px-7 py-3 text-sm md:text-base font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
};

export default PatientEditProfile;
