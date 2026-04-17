import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEmployee } from '../../context/EmployeeContext';
import Header from '../common/Header';
import Footer from '../common/Footer';
import '../../assets/css/EmployeeProfileModern.css';

const formatLongDate = (dateValue) => {
  if (!dateValue) return 'N/A';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatEmployeeId = (employee) => {
  return employee?.employeeID || employee?.id || employee?._id || 'Not assigned';
};

const getEmployeeImageUrl = (employee) => {
  if (!employee?.profilePhoto) return '/images/default-employee.svg';

  const photo = employee.profilePhoto;
  if (/^(https?:|data:|blob:)/i.test(photo)) return photo;

  const apiUrl = import.meta.env.VITE_API_URL;
  if (photo.startsWith('/')) return `${apiUrl}${photo}`;
  return `${apiUrl}/${photo}`;
};

const EmployeeProfile = () => {
  const { employee, loading, error, refetch, logout } = useEmployee();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  const closeProfile = () => {
    navigate('/employee/dashboard');
  };

  return (
    <div className="employee-profile-modern min-h-screen bg-slate-50 text-slate-900">
      <div className="employee-header-shell">
        <Header userType="employee" employee={employee} onLogout={handleLogout} />
      </div>

      <main className="mx-auto w-full max-w-[1440px] px-6 py-10 md:px-10 md:py-12">
        <section className="mb-12 flex flex-col items-center gap-9 rounded-3xl border border-slate-200 bg-white p-9 shadow-sm md:flex-row md:items-end md:justify-between md:p-11">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-center">
            <div className="relative">
              <div className="h-40 w-40 overflow-hidden rounded-full border-4 border-white shadow-lg md:h-48 md:w-48">
                {loading ? (
                  <div className="h-full w-full animate-pulse bg-slate-200" />
                ) : (
                  <img
                    src={getEmployeeImageUrl(employee)}
                    alt="Employee"
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = '/images/default-employee.svg';
                    }}
                  />
                )}
              </div>
              <div className="absolute bottom-1 right-1 rounded-full bg-emerald-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                Active
              </div>
            </div>

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
              ) : employee ? (
                <>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{employee.name}</h1>
                  <div className="flex flex-wrap items-center justify-center gap-3 text-base md:justify-start">
                    <span className="font-medium text-slate-500">ID: {formatEmployeeId(employee)}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    <span className="font-semibold text-emerald-700">Employee Account</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-600">No profile data available.</p>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              to="/employee/dashboard"
              className="rounded-2xl bg-blue-700 px-6 py-3 text-center text-base font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Employee Dashboard
            </Link>
            <Link
              to="/employee/edit-profile"
              className="rounded-2xl border border-slate-200 bg-slate-100 px-6 py-3 text-center text-base font-semibold text-blue-700 transition hover:bg-slate-200"
            >
              Edit Profile
            </Link>
            <button
              onClick={closeProfile}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-center text-base font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Back
            </button>
          </div>
        </section>

        {!loading && !error && employee && (
          <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Email</p>
              <p className="text-base font-semibold text-slate-900 break-all">{employee.email || 'N/A'}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Mobile</p>
              <p className="text-base font-semibold text-slate-900">{employee.mobile || 'N/A'}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Joined</p>
              <p className="text-base font-semibold text-slate-900">{formatLongDate(employee.createdAt)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Role</p>
              <p className="text-base font-semibold text-slate-900">Employee</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-7 shadow-sm md:col-span-2 xl:col-span-4">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Address</p>
              <p className="text-base font-semibold text-slate-900">{employee.address || 'N/A'}</p>
            </div>
          </section>
        )}

        {!loading && error && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <p className="text-sm font-semibold text-rose-700">{error}</p>
            <button
              onClick={refetch}
              className="mt-3 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
            >
              Retry
            </button>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default EmployeeProfile;
