import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useEmployee } from '../../context/EmployeeContext';
import { getToken, removeToken } from '../../utils/authUtils';
import Header from '../common/Header';
import Footer from '../common/Footer';
import '../../assets/css/EmployeeProfileModern.css';

const employeeEditSchema = yup.object().shape({
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
    .trim()
});

const resolveEmployeePhoto = (employee) => {
  if (!employee?.profilePhoto) return '/images/default-employee.svg';
  const photo = employee.profilePhoto;
  if (/^(https?:|data:|blob:)/i.test(photo)) return photo;

  const apiUrl = import.meta.env.VITE_API_URL;
  if (photo.startsWith('/')) return `${apiUrl}${photo}`;
  return `${apiUrl}/${photo}`;
};

const EmployeeEditProfile = () => {
  const { employee, loading: employeeLoading, error: employeeError, refetch, logout, updateEmployee } = useEmployee();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('/images/default-employee.svg');

  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm({
    resolver: yupResolver(employeeEditSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      mobile: '',
      address: ''
    }
  });

  useEffect(() => {
    if (!employee) return;

    setValue('name', employee.name || '');
    setValue('email', employee.email || '');
    setValue('mobile', employee.mobile || '');
    setValue('address', employee.address || '');
    setProfilePhoto(resolveEmployeePhoto(employee));
  }, [employee, setValue]);

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
      setProfilePhoto(loadEvent.target?.result || '/images/default-employee.svg');
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data) => {
    setSaving(true);
    setSuccess('');
    setSubmitError('');

    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('email', data.email);
      formData.append('mobile', data.mobile);
      formData.append('address', data.address);

      if (fileInputRef.current?.files?.[0]) {
        formData.append('profilePhoto', fileInputRef.current.files[0]);
      }

      const token = getToken('employee');
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/employee/update-profile`, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401) {
        removeToken('employee');
        navigate('/employee/form');
        return;
      }

      const result = await response.json();
      if (response.ok && result.success) {
        setSuccess(result.message || 'Profile updated successfully.');

        if (result.employee) {
          updateEmployee({
            name: result.employee.name,
            email: result.employee.email,
            mobile: result.employee.mobile,
            address: result.employee.address,
            profilePhoto: result.employee.profilePhoto
          });
        }

        refetch();
        setTimeout(() => {
          navigate('/employee/profile');
        }, 1200);
      } else {
        setSubmitError(result.error || result.message || 'Error updating profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setSubmitError('An error occurred while updating the profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (employeeLoading) {
    return (
      <div className="employee-profile-modern employee-edit-profile-modern min-h-screen bg-slate-50 text-slate-900">
        <div className="employee-header-shell">
          <Header userType="employee" employee={employee} onLogout={handleLogout} />
        </div>
        <div className="flex min-h-[60vh] items-center justify-center text-slate-600 text-lg">Loading profile...</div>
        <Footer />
      </div>
    );
  }

  if (employeeError) {
    return (
      <div className="employee-profile-modern employee-edit-profile-modern min-h-screen bg-slate-50 text-slate-900">
        <div className="employee-header-shell">
          <Header userType="employee" employee={employee} onLogout={handleLogout} />
        </div>
        <div className="flex min-h-[60vh] items-center justify-center px-6">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-rose-700 font-semibold">
            Error: {employeeError}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="employee-profile-modern employee-edit-profile-modern employee-edit-like-patient min-h-screen bg-slate-50 text-slate-900">
      <div className="employee-header-shell">
        <Header userType="employee" employee={employee} onLogout={handleLogout} />
      </div>

      <main className="mx-auto w-full max-w-[1320px] px-6 py-10 md:px-10 md:py-12">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Edit Employee Profile</h1>
            <p className="mt-2 text-sm md:text-base text-slate-600">Update your personal details and profile photo.</p>
            <button
              type="button"
              onClick={() => navigate('/employee/profile')}
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

          {submitError && (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <img
                  src={profilePhoto}
                  alt="Employee Profile"
                  className="h-28 w-28 rounded-full object-cover border-4 border-white shadow"
                  onError={(event) => {
                    event.currentTarget.src = '/images/default-employee.svg';
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
                onClick={() => navigate('/employee/profile')}
                className="rounded-xl border-2 border-slate-300 bg-slate-50 px-7 py-3 text-sm md:text-base font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default EmployeeEditProfile;
