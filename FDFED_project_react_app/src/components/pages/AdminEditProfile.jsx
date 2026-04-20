import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAdmin } from '../../context/AdminContext';
import { getToken, removeToken } from '../../utils/authUtils';
import Header from '../common/Header';
import Footer from '../common/Footer';
import '../../assets/css/EmployeeProfileModern.css';

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

const AdminEditProfile = () => {
  const { admin, loading: contextLoading, error: contextError, updateAdmin, logout } = useAdmin();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm({
    resolver: yupResolver(adminEditSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      mobile: '',
      address: ''
    }
  });

  useEffect(() => {
    if (admin) {
      setValue('name', admin.name || '');
      setValue('email', admin.email || '');
      setValue('mobile', admin.mobile || '');
      setValue('address', admin.address || '');
    }

    if (!contextLoading && contextError) {
      setMessage({
        text: `Error loading profile: ${contextError}`,
        type: 'error'
      });
    }
  }, [admin, contextLoading, contextError, setValue]);

  const handleLogout = () => {
    logout();
  };

  const parseResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    const text = await response.text();
    if (text.includes('redirect') || response.status === 302) {
      return { redirect: '/admin/profile' };
    }

    throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
  };

  const onFormSubmit = async (data) => {
    setMessage({ text: '', type: '' });

    try {
      setSubmitting(true);

      const token = getToken('admin');
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/admin/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (response.status === 401) {
        removeToken('admin');
        navigate('/admin/form');
        return;
      }

      const result = await parseResponse(response);

      if (response.ok && result.success) {
        setMessage({
          text: result.message || 'Profile updated successfully!',
          type: 'success'
        });

        updateAdmin(result.admin);

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

  if (contextLoading) {
    return (
      <div className="employee-profile-modern employee-edit-profile-modern min-h-screen bg-slate-50 text-slate-900">
        <div className="employee-header-shell">
          <Header userType="admin" employee={admin} onLogout={handleLogout} showEmployeeProfileIcon={false} />
        </div>
        <div className="flex min-h-[60vh] items-center justify-center text-slate-600 text-lg">Loading profile...</div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="employee-profile-modern employee-edit-profile-modern employee-edit-like-patient min-h-screen bg-slate-50 text-slate-900">
      <div className="employee-header-shell">
        <Header userType="admin" employee={admin} onLogout={handleLogout} showEmployeeProfileIcon={false} />
      </div>

      <main className="mx-auto w-full max-w-[1320px] px-6 py-10 md:px-10 md:py-12">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Edit Admin Profile</h1>
            <p className="mt-2 text-sm md:text-base text-slate-600">Update your personal details.</p>
            <button
              type="button"
              onClick={() => navigate('/admin/profile')}
              className="mt-4 rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Back to Profile
            </button>
          </div>

          {message.type === 'success' && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {message.text}
            </div>
          )}

          {message.type === 'error' && (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-7">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                disabled={submitting}
                className="rounded-xl bg-blue-700 px-7 py-3 text-sm md:text-base font-semibold text-white shadow-md hover:bg-blue-800 transition disabled:opacity-60"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/profile')}
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

export default AdminEditProfile;
