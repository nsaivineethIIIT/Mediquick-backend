import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDoctor } from '../../context/DoctorContext';
import Footer from './Footer';

const DoctorLayoutShell = ({ children, activeItem = 'dashboard' }) => {
  const { doctor, logout } = useDoctor();
  const navigate = useNavigate();

  const getProfileImageUrl = () => {
    if (!doctor?.profilePhoto) return '/images/default-doctor.svg';
    const photo = doctor.profilePhoto;
    if (/^(https?:|data:|blob:)/i.test(photo)) return photo;

    const API = import.meta.env.VITE_API_URL;
    if (photo.startsWith('/')) return `${API}${photo}`;
    return `${API}/${photo}`;
  };

  const isActive = (name) => (activeItem === name ? 'active' : '');

  return (
    <div className="doctor-modern-dashboard">
      <aside className="doctor-sidebar">
        <div className="doctor-brand">MediQuick</div>

        <div className="doctor-profile-mini">
          <Link to="/doctor/profile" className="doctor-avatar-link">
            <img
              src={getProfileImageUrl()}
              alt={doctor?.name || 'Doctor'}
              onError={(e) => {
                e.target.src = '/images/default-doctor.svg';
              }}
            />
          </Link>
          <div>
            <p className="doctor-name-mini">{doctor?.name || 'Doctor'}</p>
            <p className="doctor-spec-mini">{doctor?.specialization || 'Specialist'}</p>
          </div>
        </div>

        <nav className="doctor-side-nav">
          <Link to="/doctor/dashboard#finance" className={isActive('finance')}>Finance</Link>
          <Link to="/doctor/schedule" className={isActive('schedule')}>My Schedule</Link>
          <Link to="/doctor/patient-appointments" className={isActive('appointments')}>Patient Appointments</Link>
          <Link to="/doctor/patient-history" className={isActive('history')}>Patient History</Link>
          <Link to="/doctor/generate-prescriptions" className={isActive('generate-prescriptions')}>Generate Prescription</Link>
          <Link to="/doctor/prescriptions" className={isActive('prescriptions')}>Prescriptions</Link>
        </nav>

        <div className="doctor-side-footer">
          <button className="primary-action" onClick={() => navigate('/doctor/schedule')}>
            Start Consultation
          </button>
          <button className="logout-link" onClick={logout}>Logout</button>
        </div>
      </aside>

      <main className="doctor-main-canvas">
        <div className="fixed left-1/2 top-3 z-30 w-[calc(100vw-1rem)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-[#f7f9fb]/95 px-2 py-3 shadow-sm backdrop-blur-xl sm:w-[calc(100vw-1.5rem)] sm:px-3 lg:left-[calc(50%+125px)] lg:w-[min(96rem,calc(100vw-16.5rem))] lg:px-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-0 flex-1 items-center rounded-full border border-slate-200 bg-white px-4 py-2">
                <span className="material-symbols-outlined text-slate-400">search</span>
                <input
                  type="text"
                  placeholder="Search patients, appointments, prescriptions..."
                  className="ml-2 w-full border-none bg-transparent text-sm font-medium text-slate-700 outline-none"
                />
              </div>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <Link
                to="/doctor/schedule"
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 transition-colors hover:text-[#0058be]"
              >
                My Schedule
              </Link>
              <Link
                to="/doctor/generate-prescriptions"
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 transition-colors hover:text-[#0058be]"
              >
                Generate Prescription
              </Link>
              <button
                onClick={logout}
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-rose-600 transition-colors hover:bg-rose-100"
              >
                Logout
              </button>
              <Link to="/doctor/profile" className="flex items-center gap-2 rounded-xl px-1 py-1">
                <div className="text-right">
                  <p className="text-sm font-bold leading-tight text-slate-900">{doctor?.name || 'Doctor'}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Doctor Account</p>
                </div>
                <img
                  src={getProfileImageUrl()}
                  alt={doctor?.name || 'Doctor'}
                  className="h-10 w-10 rounded-xl border border-slate-200 object-cover"
                  onError={(e) => {
                    e.target.src = '/images/default-doctor.svg';
                  }}
                />
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-[110px] sm:pt-[114px]">
        {children}
        </div>

        <div className="doctor-common-footer-wrap">
          <Footer />
        </div>
      </main>
    </div>
  );
};

export default DoctorLayoutShell;
