import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { usePatient } from '../../context/PatientContext';
import '../../assets/css/PatientDashboard.css';
import {
  fetchOfflineDoctors,
  setSearchQuery,
  setSpecializationFilter,
  setLocationFilter,
  clearFilters
} from '../../store/slices/appointmentSlice';

const FALLBACK_DOCTOR_IMAGE = 'https://icons.veryicon.com/png/o/healthcate-medical/orange-particle/doctor-20.png';
const DEFAULT_MAX_FEE = 500;

const parseFee = (value) => {
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const getDoctorImage = (profilePhoto) => {
  if (!profilePhoto) return FALLBACK_DOCTOR_IMAGE;
  if (profilePhoto.startsWith('http')) return profilePhoto;
  const apiBase = import.meta.env.VITE_API_URL;
  return `${apiBase}${profilePhoto.startsWith('/') ? '' : '/'}${profilePhoto}`;
};

const normalizeDoctor = (doctor) => ({
  id: doctor._id || doctor.id || doctor.doctorID,
  name: doctor.name || 'Doctor',
  specialization: doctor.specialization || 'General Physician',
  location: doctor.location || 'N/A',
  email: doctor.email || 'N/A',
  availability: doctor.availability || 'Next Available Slot',
  averageRating: Number(doctor.averageRating || 0),
  totalReviews: Number(doctor.totalReviews || 0),
  profilePhoto: doctor.profilePhoto || '',
  consultationFee: parseFee(doctor.consultationFee)
});

const BookAppointment = () => {
  const { patient, logout } = usePatient();
  const dispatch = useDispatch();
  const displayName = patient?.name || 'Patient';

  const {
    offlineDoctors,
    doctorsLoading: loading,
    doctorsError: error,
    filters
  } = useSelector((state) => state.appointments);

  const [solrDoctors, setSolrDoctors] = useState([]);
  const [solrLoading, setSolrLoading] = useState(false);
  const [availableTodayOnly, setAvailableTodayOnly] = useState(false);
  const [next48HoursOnly, setNext48HoursOnly] = useState(true);
  const [maxFee, setMaxFee] = useState(DEFAULT_MAX_FEE);

  useEffect(() => {
    dispatch(fetchOfflineDoctors());
  }, [dispatch]);

  useEffect(() => {
    const previousRootFontSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '14px';

    return () => {
      document.documentElement.style.fontSize = previousRootFontSize;
    };
  }, []);

  useEffect(() => {
    const query = (filters.searchQuery || '').trim();
    if (query.length < 2) {
      setSolrDoctors([]);
      setSolrLoading(false);
      return;
    }

    const controller = new AbortController();
    const apiBase = import.meta.env.VITE_API_URL;

    const runSearch = async () => {
      setSolrLoading(true);
      try {
        const params = new URLSearchParams({ query, onlineStatus: 'offline' });
        if (filters.specialization) params.append('specialization', filters.specialization);
        if (filters.location) params.append('location', filters.location);

        const response = await fetch(`${apiBase}/doctor/search?${params.toString()}`, {
          signal: controller.signal
        });
        const data = await response.json();

        if (response.ok && data.success) {
          setSolrDoctors((data.doctors || []).map(normalizeDoctor));
        } else {
          setSolrDoctors([]);
        }
      } catch (searchErr) {
        if (searchErr.name !== 'AbortError') setSolrDoctors([]);
      } finally {
        setSolrLoading(false);
      }
    };

    runSearch();
    return () => controller.abort();
  }, [filters.searchQuery, filters.specialization, filters.location]);

  const {
    filteredDoctors,
    specializations,
    highestFee
  } = useMemo(() => {
    const hasActiveSearch = (filters.searchQuery || '').trim().length >= 2;
    const normalizedOffline = (offlineDoctors || []).map(normalizeDoctor);
    const normalizedSource = hasActiveSearch ? solrDoctors : normalizedOffline;

    const uniqueSpecializations = [...new Set(normalizedOffline.map((doc) => doc.specialization).filter(Boolean))];
    const maxAvailableFee = normalizedOffline.reduce((max, doc) => Math.max(max, parseFee(doc.consultationFee)), 0);

    let result = normalizedSource;

    if (filters.specialization) {
      result = result.filter((doc) => doc.specialization === filters.specialization);
    }

    if (filters.location) {
      result = result.filter((doc) => doc.location.toLowerCase().includes(filters.location.toLowerCase()));
    }

    if (filters.searchQuery && !hasActiveSearch) {
      const lowerQuery = filters.searchQuery.toLowerCase();
      result = result.filter(
        (doc) =>
          doc.name.toLowerCase().includes(lowerQuery) ||
          doc.specialization.toLowerCase().includes(lowerQuery)
      );
    }

    if (availableTodayOnly) {
      result = result.filter((doc) => doc.availability.toLowerCase().includes('today'));
    }

    if (next48HoursOnly) {
      result = result.filter((doc) => {
        const text = doc.availability.toLowerCase();
        return text.includes('today') || text.includes('tomorrow') || text.includes('48');
      });
    }

    result = result.filter((doc) => parseFee(doc.consultationFee) <= maxFee);

    return {
      filteredDoctors: result,
      specializations: uniqueSpecializations,
      highestFee: Math.max(maxAvailableFee, DEFAULT_MAX_FEE)
    };
  }, [offlineDoctors, solrDoctors, filters, availableTodayOnly, next48HoursOnly, maxFee]);

  useEffect(() => {
    setMaxFee((prev) => Math.min(Math.max(prev, 0), Math.max(highestFee, DEFAULT_MAX_FEE)));
  }, [highestFee]);

  const handleClearFilters = () => {
    dispatch(clearFilters());
    setAvailableTodayOnly(false);
    setNext48HoursOnly(true);
    setMaxFee(Math.max(highestFee, DEFAULT_MAX_FEE));
  };

  const getProfileImageUrl = () => {
    if (!patient?.profilePhoto) return '/images/default-patient.svg';
    const photo = patient.profilePhoto;
    if (/^(https?:|data:|blob:)/i.test(photo)) return photo;
    const apiBase = import.meta.env.VITE_API_URL;
    if (photo.startsWith('/')) return `${apiBase}${photo}`;
    return `${apiBase}/${photo}`;
  };

  return (
    <div className="patient-dashboard min-h-screen bg-surface font-body text-on-surface antialiased">
      <div className="pd-header" role="banner">
        <div className="pd-header__inner">
          <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
            <Link to="/patient/dashboard" className="pd-header__brand justify-self-start">MediQuick</Link>
            <nav className="pd-header__nav justify-self-start md:justify-self-center">
              <Link to="/patient/dashboard" className="pd-header__nav-link">Home</Link>
              <Link to="/patient/book-doc-online" className="pd-header__nav-link">Find Doctors</Link>
              <Link to="/patient/book-appointment" className="pd-header__nav-link pd-header__nav-link--active">Appointments</Link>
              <Link to="/blog" className="pd-header__nav-link">Blog</Link>
              <Link to="/contact-us" className="pd-header__nav-link">Contact</Link>
            </nav>
            <div className="pd-header__right justify-self-end">
              <Link to="/patient/profile" className="pd-header__avatar-wrap" title={displayName}>
                <img
                  src={getProfileImageUrl()}
                  alt="Patient Profile"
                  className="pd-header__avatar"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/images/default-patient.svg';
                  }}
                />
              </Link>
              <button type="button" className="pd-header__logout" onClick={logout}>Logout</button>
            </div>
          </div>
        </div>
      </div>

      <main className="pd-main pt-24 pb-12">
          <section className="mb-12">
            <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <h1 className="mb-4 font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
                  Book Offline Appointment
                </h1>
                <p className="max-w-lg text-base text-on-surface-variant md:text-lg">
                  Find trusted medical professionals in your area and secure a clinic consultation quickly.
                </p>
                {patient?.name && (
                  <p className="mt-3 text-sm font-semibold text-primary">
                    Welcome, {patient.name}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <span className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  Top Rated Clinics
                </span>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-2 rounded-2xl bg-surface-container-lowest p-2 shadow-2xl shadow-on-surface/5 md:flex-row md:items-center md:justify-start md:gap-3">
              <div className="flex w-full items-center gap-3 rounded-xl bg-surface-container-low px-4 md:w-[23rem] md:flex-none">
                <span className="material-symbols-outlined text-primary">search</span>
                <input
                  className="w-full border-none bg-transparent py-4 font-medium text-on-surface placeholder:text-outline focus:ring-0"
                  placeholder="Search by name or specialization"
                  type="text"
                  value={filters.searchQuery || ''}
                  onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                />
              </div>

              <div className="flex w-full items-center gap-3 rounded-xl bg-surface-container-low px-4 md:w-[21rem] md:flex-none">
                <span className="material-symbols-outlined text-primary">location_on</span>
                <input
                  className="w-full border-none bg-transparent py-4 font-medium text-on-surface placeholder:text-outline focus:ring-0"
                  placeholder="Location (City, State, or ZIP)"
                  type="text"
                  value={filters.location || ''}
                  onChange={(e) => dispatch(setLocationFilter(e.target.value))}
                />
              </div>

              <div className="flex w-full items-center gap-3 rounded-xl bg-surface-container-low px-4 md:w-[15rem] md:flex-none">
                <span className="material-symbols-outlined text-primary">filter_list</span>
                <select
                  className="w-full appearance-none border-none bg-transparent py-4 font-medium text-on-surface focus:ring-0"
                  value={filters.specialization || ''}
                  onChange={(e) => dispatch(setSpecializationFilter(e.target.value))}
                >
                  <option value="">Specialization</option>
                  {specializations.map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="rounded-xl bg-primary px-6 py-4 font-bold text-on-primary transition-all duration-300 hover:bg-primary-container md:flex-none"
                onClick={handleClearFilters}
              >
                Reset Filters
              </button>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <aside className="space-y-8 lg:col-span-3">
              <div className="rounded-2xl bg-surface-container-high/30 p-6">
                <h3 className="mb-6 font-headline text-xl font-bold">Refine Search</h3>
                <div className="space-y-6">
                  <div>
                    <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-on-surface-variant">Availability</label>
                    <div className="space-y-3">
                      <label className="group flex cursor-pointer items-center gap-3">
                        <input
                          className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                          type="checkbox"
                          checked={availableTodayOnly}
                          onChange={(e) => setAvailableTodayOnly(e.target.checked)}
                        />
                        <span className="text-on-surface-variant transition-colors group-hover:text-primary">Available Today</span>
                      </label>
                      <label className="group flex cursor-pointer items-center gap-3">
                        <input
                          className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                          type="checkbox"
                          checked={next48HoursOnly}
                          onChange={(e) => setNext48HoursOnly(e.target.checked)}
                        />
                        <span className="text-on-surface-variant transition-colors group-hover:text-primary">Next 48 Hours</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4">
                    <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-on-surface-variant">Consultation Fee</label>
                    <input
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-surface-container accent-primary"
                      type="range"
                      min="0"
                      max={Math.max(highestFee, DEFAULT_MAX_FEE)}
                      step="10"
                      value={maxFee}
                      onChange={(e) => setMaxFee(Number(e.target.value))}
                    />
                    <div className="mt-2 flex justify-between text-sm font-medium text-outline">
                      <span>$0</span>
                      <span>${maxFee}</span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:col-span-9">
              {(loading || solrLoading) && (
                <div className="col-span-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-8 text-center text-on-surface-variant">
                  Loading specialists...
                </div>
              )}

              {!loading && !solrLoading && error && (
                <div className="col-span-full rounded-2xl border border-error/30 bg-error-container p-6 text-sm font-semibold text-on-error-container">
                  {error}
                </div>
              )}

              {!loading && !solrLoading && !error && filteredDoctors.length === 0 && (
                <div className="col-span-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-8 text-center">
                  <h3 className="text-lg font-bold text-on-surface">No Doctors Found</h3>
                  <p className="mt-2 text-on-surface-variant">Try adjusting specialization, location, availability, or fee range.</p>
                </div>
              )}

              {!loading && !solrLoading && !error && filteredDoctors.map((doctor) => (
                <div key={doctor.id} className="flex flex-col overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface-container-lowest shadow-sm transition-all duration-300 hover:shadow-xl">
                  <div className="relative h-48">
                    <img
                      className="h-full w-full object-cover"
                      src={getDoctorImage(doctor.profilePhoto)}
                      alt={`Dr. ${doctor.name}`}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_DOCTOR_IMAGE;
                      }}
                    />
                    <div className="absolute right-4 top-4 flex items-center gap-1 rounded-lg bg-white/90 px-3 py-1 text-xs font-bold text-on-surface shadow-sm backdrop-blur">
                      <span className="material-symbols-outlined text-sm text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      {doctor.averageRating > 0 ? `${doctor.averageRating.toFixed(1)} (${doctor.totalReviews})` : 'New'}
                    </div>
                  </div>

                  <div className="flex flex-grow flex-col p-6">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-headline text-xl font-bold text-on-surface">Dr. {doctor.name}</h4>
                        <p className="text-sm font-medium text-primary">{doctor.specialization}</p>
                      </div>
                      <div className="rounded bg-tertiary-fixed-dim/20 px-2 py-1 text-[10px] font-black uppercase tracking-tight text-on-tertiary-fixed-variant">
                        {doctor.location}
                      </div>
                    </div>

                    <p className="mb-6 line-clamp-2 text-sm text-on-surface-variant">
                      Available at nearby clinic slots. Email: {doctor.email}
                    </p>

                    <div className="mb-6 grid grid-cols-2 gap-4 border-y border-outline-variant/10 py-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-outline">schedule</span>
                        <span className="text-xs font-semibold text-on-surface">{doctor.availability}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-outline">payments</span>
                        <span className="text-xs font-semibold text-on-surface">
                          ${doctor.consultationFee > 0 ? doctor.consultationFee : 120} Consultation
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto flex gap-3">
                      <Link
                        to={`/patient/doctor-profile-patient/${doctor.id}`}
                        className="flex-1 rounded-xl bg-primary px-4 py-3 text-center font-bold text-on-primary transition-all hover:brightness-110 active:scale-[0.98]"
                      >
                        Book Now
                      </Link>
                      <button type="button" className="flex h-12 w-12 items-center justify-center rounded-xl border border-outline-variant/30 transition-colors hover:bg-surface-container">
                        <span className="material-symbols-outlined text-on-surface-variant">favorite</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {!loading && !solrLoading && !error && (
                <div className="relative flex flex-col justify-center overflow-hidden rounded-2xl bg-primary p-8 text-white">
                  <div className="relative z-10">
                    <h4 className="mb-4 font-headline text-2xl font-extrabold leading-tight" style={{ color: '#ffffff' }}>Need urgent remote help?</h4>
                    <p className="mb-8 max-w-xs" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                      Start an immediate video consultation with available specialists from home.
                    </p>
                    <Link
                      to="/patient/book-doc-online"
                      className="inline-block rounded-xl px-6 py-3 font-bold transition-all hover:shadow-xl"
                      style={{ backgroundColor: '#ffffff', color: '#0058be' }}
                    >
                      Try Telehealth
                    </Link>
                  </div>
                  <span className="material-symbols-outlined absolute -bottom-8 -right-8 rotate-12 text-[200px] opacity-10">videocam</span>
                </div>
              )}
            </div>
          </div>
      </main>

      <nav className="pd-bottom-nav" aria-label="Mobile navigation">
        <Link to="/patient/dashboard" className="pd-bottom-nav__item">
          <span className="material-symbols-outlined">home</span>
          <span>Home</span>
        </Link>
        <Link to="/patient/prescriptions" className="pd-bottom-nav__item">
          <span className="material-symbols-outlined">medical_services</span>
          <span>Rx</span>
        </Link>
        <Link to="/patient/book-doc-online" className="pd-bottom-nav__item">
          <span className="material-symbols-outlined">video_chat</span>
          <span>Consult</span>
        </Link>
        <Link to="/patient/book-appointment" className="pd-bottom-nav__item pd-bottom-nav__item--active">
          <span className="material-symbols-outlined">calendar_month</span>
          <span>Book</span>
        </Link>
        <Link to="/patient/profile" className="pd-bottom-nav__item">
          <span className="material-symbols-outlined">person</span>
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
};

export default BookAppointment;
