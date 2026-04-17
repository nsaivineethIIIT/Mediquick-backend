import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';
import { useDoctor } from '../../context/DoctorContext';
import { getToken, removeToken } from '../../utils/authUtils';
import DoctorLayoutShell from '../common/DoctorLayoutShell';
import '../../assets/css/DoctorDashboardModern.css';
import '../../assets/css/DoctorProfileModern.css';

const doctorEditSchema = yup.object().shape({
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
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
  address: yup
    .string()
    .required('Address is required')
    .min(5, 'Address must be at least 5 characters'),
  specialization: yup.string(),
  college: yup.string(),
  yearOfPassing: yup.string(),
  location: yup
    .string()
    .required('Location is required'),
  onlineStatus: yup
    .string()
    .required('Online status is required'),
  consultationFee: yup
    .number()
    .required('Consultation fee is required')
    .min(0, 'Consultation fee must be a non-negative number')
    .typeError('Consultation fee must be a number'),
  dateOfBirth: yup
    .date()
    .nullable()
    .transform((value, originalValue) => (originalValue === '' ? null : value))
    .max(new Date(), 'Date of birth cannot be in the future')
    .test('age', 'Doctor must be at least 21 years old', (value) => {
      if (!value) return true;
      const age = Math.floor((new Date() - new Date(value)) / 31557600000);
      return age >= 21;
    }),
  gender: yup
    .string()
    .nullable()
    .oneOf(['male', 'female', 'other', null, ''], 'Please select a valid gender')
});

const DoctorEditProfile = () => {
  const { doctor, loading: contextLoading, error: contextError, refetch } = useDoctor();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState('/images/default-doctor.svg');

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm({
    resolver: yupResolver(doctorEditSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      mobile: '',
      address: '',
      specialization: '',
      college: '',
      yearOfPassing: '',
      location: '',
      onlineStatus: 'Online',
      consultationFee: 0,
      dateOfBirth: '',
      gender: ''
    }
  });

  const profileImage = useMemo(() => {
    if (!doctor?.profilePhoto) return '/images/default-doctor.svg';
    const photo = doctor.profilePhoto;
    if (/^(https?:|data:|blob:)/i.test(photo)) return photo;
    const API = import.meta.env.VITE_API_URL;
    return photo.startsWith('/') ? `${API}${photo}` : `${API}/${photo}`;
  }, [doctor]);

  useEffect(() => {
    if (!doctor) return;

    setValue('name', doctor.name || '');
    setValue('email', doctor.email || '');
    setValue('mobile', doctor.mobile || '');
    setValue('address', doctor.address || '');
    setValue('specialization', doctor.specialization || '');
    setValue('college', doctor.college || '');
    setValue('yearOfPassing', doctor.yearOfPassing || '');
    setValue('location', doctor.location || '');
    setValue('onlineStatus', doctor.onlineStatus || 'Online');
    setValue('consultationFee', doctor.consultationFee || 0);
    setValue('dateOfBirth', doctor.dateOfBirth ? new Date(doctor.dateOfBirth).toISOString().split('T')[0] : '');
    setValue('gender', doctor.gender || '');
    setPreviewPhoto(profileImage);
  }, [doctor, setValue, profileImage]);

  useEffect(() => {
    const previousRootFontSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '14px';
    return () => {
      document.documentElement.style.fontSize = previousRootFontSize;
    };
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setPreviewPhoto(loadEvent.target?.result || '/images/default-doctor.svg');
    };
    reader.readAsDataURL(file);
  };

  const removeProfilePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;

    try {
      const token = getToken('doctor');
      const API = import.meta.env.VITE_API_URL;
      const { data } = await axios.post(`${API}/doctor/profile-photo/remove`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setPreviewPhoto('/images/default-doctor.svg');
        setSuccess('Profile photo removed successfully.');
        setSubmitError('');
        await refetch();
      } else {
        setSubmitError(data.message || 'Failed to remove photo');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        removeToken('doctor');
        navigate('/doctor/form');
        return;
      }
      setSubmitError(error.response?.data?.message || 'Server error while removing photo.');
    }
  };

  const onSubmit = async (values) => {
    setSaving(true);
    setSuccess('');
    setSubmitError('');

    try {
      const data = new FormData();
      data.append('name', values.name);
      data.append('email', values.email);
      data.append('mobile', values.mobile);
      data.append('address', values.address);
      data.append('specialization', values.specialization);
      data.append('college', values.college);
      data.append('yearOfPassing', values.yearOfPassing);
      data.append('location', values.location);
      data.append('onlineStatus', values.onlineStatus);
      data.append('consultationFee', values.consultationFee);
      if (values.dateOfBirth) data.append('dateOfBirth', values.dateOfBirth);
      if (values.gender) data.append('gender', values.gender);
      if (fileInputRef.current?.files?.[0]) data.append('profilePhoto', fileInputRef.current.files[0]);

      const token = getToken('doctor');
      const API = import.meta.env.VITE_API_URL;
      const response = await axios.post(`${API}/doctor/update-profile`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        await refetch();
        setSuccess('Profile updated successfully. Redirecting...');
        setTimeout(() => navigate('/doctor/profile'), 1300);
      } else {
        setSubmitError(response.data.message || 'Error updating profile');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        removeToken('doctor');
        navigate('/doctor/form');
        return;
      }
      setSubmitError(error.response?.data?.message || 'An error occurred while updating the profile');
    } finally {
      setSaving(false);
    }
  };

  if (contextLoading) {
    return (
      <DoctorLayoutShell activeItem="history">
        <div className="doctor-page-content doctor-page-content-compact doctor-shared-centered">
          <section className="doctor-section doctor-shared-card">
            <p className="doctor-loading-text">Loading profile...</p>
          </section>
        </div>
      </DoctorLayoutShell>
    );
  }

  if (contextError) {
    return (
      <DoctorLayoutShell activeItem="history">
        <div className="doctor-page-content doctor-page-content-compact doctor-shared-centered">
          <section className="doctor-section doctor-shared-card">
            <p className="doctor-loading-text">Error: {contextError}</p>
          </section>
        </div>
      </DoctorLayoutShell>
    );
  }

  return (
    <DoctorLayoutShell activeItem="history">
      <div className="doctor-page-content doctor-page-content-compact doctor-page-content-fill doctor-shared-centered">
        <section className="doctor-section doctor-shared-card mx-auto w-full max-w-[1320px] rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Edit Doctor Profile</h1>
            <p className="mt-2 text-sm md:text-base text-slate-600">Update your personal details and profile photo.</p>
            <Link
              to="/doctor/profile"
              className="mt-4 inline-block rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Back to Profile
            </Link>
          </div>

          {success && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {success}
            </div>
          )}

          {submitError && (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <img
                  src={previewPhoto}
                  alt="Doctor Profile"
                  className="h-28 w-28 rounded-full object-cover border-4 border-white shadow"
                  onError={(event) => {
                    event.currentTarget.src = '/images/default-doctor.svg';
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
                <input type="text" {...register('name')} className={`w-full rounded-xl border px-4 py-3 text-sm md:text-base bg-white outline-none transition ${errors.name ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-600'}`} />
                {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                <input type="email" {...register('email')} className={`w-full rounded-xl border px-4 py-3 text-sm md:text-base bg-white outline-none transition ${errors.email ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-600'}`} />
                {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Mobile</label>
                <input type="text" {...register('mobile')} className={`w-full rounded-xl border px-4 py-3 text-sm md:text-base bg-white outline-none transition ${errors.mobile ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-600'}`} />
                {errors.mobile && <p className="mt-1 text-xs text-rose-600">{errors.mobile.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Address</label>
                <input type="text" {...register('address')} className={`w-full rounded-xl border px-4 py-3 text-sm md:text-base bg-white outline-none transition ${errors.address ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-600'}`} />
                {errors.address && <p className="mt-1 text-xs text-rose-600">{errors.address.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Specialization</label>
                <input type="text" {...register('specialization')} readOnly className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm md:text-base text-slate-600" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">College</label>
                <input type="text" {...register('college')} readOnly className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm md:text-base text-slate-600" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Year of Passing</label>
                <input type="text" {...register('yearOfPassing')} readOnly className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm md:text-base text-slate-600" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Location</label>
                <input type="text" {...register('location')} className={`w-full rounded-xl border px-4 py-3 text-sm md:text-base bg-white outline-none transition ${errors.location ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-600'}`} />
                {errors.location && <p className="mt-1 text-xs text-rose-600">{errors.location.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Online Status</label>
                <select {...register('onlineStatus')} className={`w-full rounded-xl border px-4 py-3 text-sm md:text-base bg-white outline-none transition ${errors.onlineStatus ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-600'}`}>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </select>
                {errors.onlineStatus && <p className="mt-1 text-xs text-rose-600">{errors.onlineStatus.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Consultation Fee</label>
                <input type="number" step="0.01" {...register('consultationFee')} className={`w-full rounded-xl border px-4 py-3 text-sm md:text-base bg-white outline-none transition ${errors.consultationFee ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-600'}`} />
                {errors.consultationFee && <p className="mt-1 text-xs text-rose-600">{errors.consultationFee.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Date of Birth</label>
                <input type="date" max={new Date().toISOString().split('T')[0]} {...register('dateOfBirth')} className={`w-full rounded-xl border px-4 py-3 text-sm md:text-base bg-white outline-none transition ${errors.dateOfBirth ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-600'}`} />
                {errors.dateOfBirth && <p className="mt-1 text-xs text-rose-600">{errors.dateOfBirth.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Gender</label>
                <select {...register('gender')} className={`w-full rounded-xl border px-4 py-3 text-sm md:text-base bg-white outline-none transition ${errors.gender ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-600'}`}>
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && <p className="mt-1 text-xs text-rose-600">{errors.gender.message}</p>}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2 justify-center">
              <button type="submit" disabled={saving} className="rounded-xl bg-blue-700 px-7 py-3 text-sm md:text-base font-semibold text-white shadow-md hover:bg-blue-800 transition disabled:opacity-60">
                {saving ? 'Updating...' : 'Update Profile'}
              </button>
              <Link to="/doctor/profile" className="rounded-xl border-2 border-slate-300 bg-slate-50 px-7 py-3 text-sm md:text-base font-semibold text-slate-700 hover:bg-slate-100 transition">
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </div>
    </DoctorLayoutShell>
  );
};

export default DoctorEditProfile;
