import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import Header from '../common/Header';
import Footer from '../common/Footer';
import '../../assets/css/EmployeeProfileModern.css';

const formatLongDate = (dateValue) => {
  if (!dateValue) return 'N/A';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const AdminProfile = () => {
  const {
    admin,
    loading,
    error,
    completedConsultations,
    pendingConsultations,
    refetch,
    logout
  } = useAdmin();

  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  const consultationTable = (items, emptyMessage) => {
    if (!items || items.length === 0) {
      return <p className="text-sm text-slate-600">{emptyMessage}</p>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Doctor Name</th>
              <th className="border border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Consultation Date</th>
              <th className="border border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Slot</th>
              <th className="border border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Online/Offline</th>
            </tr>
          </thead>
          <tbody>
            {items.map((consultation, index) => (
              <tr key={`${consultation.doctorName}-${consultation.consultationDate}-${index}`} className="hover:bg-slate-50">
                <td className="border border-slate-200 px-4 py-3 text-sm text-slate-800">{consultation.doctorName || 'N/A'}</td>
                <td className="border border-slate-200 px-4 py-3 text-sm text-slate-800">{consultation.consultationDate || 'N/A'}</td>
                <td className="border border-slate-200 px-4 py-3 text-sm text-slate-800">{consultation.slot || 'N/A'}</td>
                <td className="border border-slate-200 px-4 py-3 text-sm text-slate-800">{consultation.onlineStatus || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="employee-profile-modern admin-profile-modern min-h-screen bg-slate-50 text-slate-900">
      <div className="employee-header-shell">
        <Header userType="admin" employee={admin} onLogout={handleLogout} showEmployeeProfileIcon={false} />
      </div>

      <main className="mx-auto w-full max-w-[1440px] px-6 py-10 md:px-10 md:py-12">
        <section className="mb-12 flex flex-col items-center gap-8 rounded-3xl border border-slate-200 bg-white p-9 shadow-sm md:flex-row md:items-end md:justify-between md:p-11">
          <div className="space-y-2 text-center md:text-left">
            {loading ? (
              <>
                <div className="h-10 w-52 animate-pulse rounded-xl bg-slate-200" />
                <div className="h-6 w-40 animate-pulse rounded-xl bg-slate-200" />
              </>
            ) : error ? (
              <div>
                <p className="text-sm font-semibold text-rose-700">Error loading profile</p>
                <button
                  onClick={refetch}
                  className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  Retry
                </button>
              </div>
            ) : admin ? (
              <>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{admin.name || 'Admin Profile'}</h1>
                <div className="flex flex-wrap items-center justify-center gap-3 text-base md:justify-start">
                  <span className="font-medium text-slate-500">Role: Administrator</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  <span className="font-semibold text-emerald-700">Admin Account</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">No profile data available.</p>
            )}
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              to="/admin/dashboard"
              className="rounded-2xl bg-blue-700 px-6 py-3 text-center text-base font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Admin Dashboard
            </Link>
            <Link
              to="/admin/edit-profile"
              className="rounded-2xl border border-slate-200 bg-slate-100 px-6 py-3 text-center text-base font-semibold text-blue-700 transition hover:bg-slate-200"
            >
              Edit Profile
            </Link>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-center text-base font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Back
            </button>
          </div>
        </section>

        {!loading && !error && admin && (
          <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Email</p>
              <p className="text-base font-semibold text-slate-900 break-all">{admin.email || 'N/A'}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Mobile</p>
              <p className="text-base font-semibold text-slate-900">{admin.mobile || 'N/A'}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Joined</p>
              <p className="text-base font-semibold text-slate-900">{formatLongDate(admin.createdAt)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Security Number</p>
              <p className="text-base font-semibold text-slate-900">CS123456789</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-7 shadow-sm md:col-span-2 xl:col-span-4">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Address</p>
              <p className="text-base font-semibold text-slate-900">{admin.address || 'N/A'}</p>
            </div>
          </section>
        )}

        {!loading && error && (
          <section className="mb-10 rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <p className="text-sm font-semibold text-rose-700">{error}</p>
            <button
              onClick={refetch}
              className="mt-3 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
            >
              Retry
            </button>
          </section>
        )}

        {!loading && !error && (
          <>
            <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="mb-4 text-xl font-bold text-slate-900">Completed Consultations</h2>
              {consultationTable(completedConsultations, 'No completed consultations found.')}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="mb-4 text-xl font-bold text-slate-900">Pending Consultations</h2>
              {consultationTable(pendingConsultations, 'No pending consultations found.')}
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AdminProfile;
