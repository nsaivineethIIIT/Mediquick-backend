import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchOnlineDoctors,
    setSearchQuery,
    setSpecializationFilter,
    setLocationFilter,
    setAvailabilityFilter,
    setConsultationCostFilter,
    clearFilters
} from '../../store/slices/appointmentSlice';

const COST_RANGES = [
    { value: '', label: 'Consultation Cost: All' },
    { value: '0-499', label: 'Below Rs.500' },
    { value: '500-999', label: 'Rs.500 - Rs.999' },
    { value: '1000-1499', label: 'Rs.1000 - Rs.1499' },
    { value: '1500+', label: 'Rs.1500 and above' }
];

const isWithinCostRange = (fee, range) => {
    const normalizedFee = Number(fee || 0);
    if (!range) return true;
    if (range === '1500+') return normalizedFee >= 1500;

    const [min, max] = range.split('-').map(Number);
    return normalizedFee >= min && normalizedFee <= max;
};

const BookDocOnline = () => {
    const dispatch = useDispatch();

    const {
        onlineDoctors,
        doctorsLoading: loading,
        doctorsError: error,
        filters
    } = useSelector((state) => state.appointments);

    const [solrDoctors, setSolrDoctors] = useState([]);
    const [solrLoading, setSolrLoading] = useState(false);

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
        dispatch(fetchOnlineDoctors());
    }, [dispatch]);

    useEffect(() => {
        const q = (filters.searchQuery || '').trim();
        if (q.length < 2) {
            setSolrDoctors([]);
            setSolrLoading(false);
            return;
        }

        const controller = new AbortController();
        const API = import.meta.env.VITE_API_URL;

        const runSearch = async () => {
            setSolrLoading(true);
            try {
                const params = new URLSearchParams({ query: q, onlineStatus: 'online' });
                if (filters.specialization) params.append('specialization', filters.specialization);
                if (filters.location) params.append('location', filters.location);
                if (filters.availability) params.append('availability', filters.availability);

                const response = await fetch(`${API}/doctor/search?${params.toString()}`, {
                    signal: controller.signal
                });
                const data = await response.json();

                if (response.ok && data.success) {
                    const mapped = (data.doctors || []).map((doctor) => ({
                        id: doctor._id || doctor.id,
                        name: doctor.name,
                        specialization: doctor.specialization || 'General Physician',
                        location: doctor.location || 'N/A',
                        email: doctor.email || 'N/A',
                        availability: doctor.availability || '9:00 AM - 5:00 PM',
                        consultationFee: Number(doctor.consultationFee || 0),
                        averageRating: doctor.averageRating || 0,
                        totalReviews: doctor.totalReviews || 0,
                        profilePhoto: doctor.profilePhoto || '',
                        onlineStatus: doctor.onlineStatus || 'online'
                    }));
                    setSolrDoctors(mapped);
                } else {
                    setSolrDoctors([]);
                }
            } catch (searchErr) {
                if (searchErr.name !== 'AbortError') {
                    setSolrDoctors([]);
                }
            } finally {
                setSolrLoading(false);
            }
        };

        runSearch();
        return () => controller.abort();
    }, [filters.searchQuery, filters.specialization, filters.location, filters.availability]);

    const { filteredDoctors, specializations, locations, availabilities } = useMemo(() => {
        const hasActiveSearch = (filters.searchQuery || '').trim().length >= 2;
        let filtered = hasActiveSearch ? solrDoctors : onlineDoctors;

        if (filters.specialization) {
            filtered = filtered.filter(
                (doctor) => (doctor.specialization || 'General Physician') === filters.specialization
            );
        }

        if (filters.searchQuery && !hasActiveSearch) {
            filtered = filtered.filter((doctor) =>
                (doctor.name || '').toLowerCase().includes(filters.searchQuery.toLowerCase())
            );
        }

        if (filters.location) {
            filtered = filtered.filter((doctor) => (doctor.location || 'N/A') === filters.location);
        }

        if (filters.availability) {
            filtered = filtered.filter(
                (doctor) => (doctor.availability || '9:00 AM - 5:00 PM') === filters.availability
            );
        }

        if (filters.consultationCost) {
            filtered = filtered.filter((doctor) =>
                isWithinCostRange(doctor.consultationFee, filters.consultationCost)
            );
        }

        const uniqueSpecializations = [...new Set(onlineDoctors.map((doc) => doc.specialization || 'General Physician'))];
        const uniqueLocations = [...new Set(onlineDoctors.map((doc) => doc.location || 'N/A'))];
        const uniqueAvailabilities = [...new Set(onlineDoctors.map((doc) => doc.availability || '9:00 AM - 5:00 PM'))];

        return {
            filteredDoctors: filtered,
            specializations: uniqueSpecializations,
            locations: uniqueLocations,
            availabilities: uniqueAvailabilities
        };
    }, [onlineDoctors, solrDoctors, filters]);

    const handleSearchChange = (e) => dispatch(setSearchQuery(e.target.value));
    const handleSpecializationChange = (e) => dispatch(setSpecializationFilter(e.target.value));
    const handleLocationChange = (e) => dispatch(setLocationFilter(e.target.value));
    const handleAvailabilityChange = (e) => dispatch(setAvailabilityFilter(e.target.value));
    const handleCostChange = (e) => dispatch(setConsultationCostFilter(e.target.value));
    const handleClearFilters = () => dispatch(clearFilters());

    return (
        <div className="min-h-screen bg-background font-body text-on-background flex flex-col">
            <header className="fixed top-0 w-full z-50 bg-slate-50/80 backdrop-blur-xl shadow-sm">
                <div className="flex justify-between items-center px-6 md:px-10 py-4 max-w-[1440px] mx-auto w-full">
                    <div className="text-2xl md:text-3xl font-bold tracking-tighter text-blue-700">MediQuick</div>
                    <div className="hidden md:flex gap-8 items-center">
                        <Link to="/patient/dashboard" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">Dashboard</Link>
                        <Link to="/patient/book-appointment" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">Book Appointment</Link>
                        <Link to="/patient/prescriptions" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">Prescriptions</Link>
                        <Link to="/patient/orders" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">My Orders</Link>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link to="/patient/profile" className="px-6 py-2 bg-primary-container text-on-primary-container rounded-xl font-manrope font-bold text-base md:text-lg tracking-tight scale-95 duration-200 active:opacity-80 transition-all hover:brightness-110">Profile</Link>
                    </div>
                </div>
            </header>

            <main className="flex-grow pt-32 pb-20 px-6 max-w-7xl mx-auto w-full">
                <section className="mb-16">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold text-on-surface leading-tight mb-6 tracking-tight">
                            Consult Trusted Doctors <br />
                            <span className="text-primary">From Home, Without Waiting.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-secondary leading-relaxed max-w-2xl mx-auto">
                            Search verified online doctors by specialty, location, availability, and consultation fee, then book your video consultation in a few clicks.
                        </p>
                    </div>
                </section>

                <section className="mb-12">
                    <div className="bg-surface-container-lowest p-4 rounded-3xl shadow-[0_20px_40px_rgba(15,23,42,0.04)] border border-outline-variant/10">
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="flex-grow relative group">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">search</span>
                                <input
                                    type="text"
                                    placeholder="Search by name, specialty, or condition..."
                                    value={filters.searchQuery}
                                    onChange={handleSearchChange}
                                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-outline"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative group">
                                    <select value={filters.specialization} onChange={handleSpecializationChange} className="appearance-none pl-4 pr-10 py-4 bg-surface-container-low border-none rounded-2xl text-on-surface-variant font-medium focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer">
                                        <option value="">Specialty: All</option>
                                        {specializations.map((spec) => (
                                            <option key={spec} value={spec}>{spec}</option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
                                </div>

                                <div className="relative group">
                                    <select value={filters.location} onChange={handleLocationChange} className="appearance-none pl-4 pr-10 py-4 bg-surface-container-low border-none rounded-2xl text-on-surface-variant font-medium focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer">
                                        <option value="">Location: All</option>
                                        {locations.map((loc) => (
                                            <option key={loc} value={loc}>{loc}</option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
                                </div>

                                <div className="relative group">
                                    <select value={filters.availability} onChange={handleAvailabilityChange} className="appearance-none pl-4 pr-10 py-4 bg-surface-container-low border-none rounded-2xl text-on-surface-variant font-medium focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer">
                                        <option value="">Availability: All</option>
                                        {availabilities.map((avail) => (
                                            <option key={avail} value={avail}>{avail}</option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
                                </div>

                                <div className="relative group">
                                    <select value={filters.consultationCost} onChange={handleCostChange} className="appearance-none pl-4 pr-10 py-4 bg-surface-container-low border-none rounded-2xl text-on-surface-variant font-medium focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer">
                                        {COST_RANGES.map((range) => (
                                            <option key={range.value || 'all'} value={range.value}>{range.label}</option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
                                </div>

                                <button onClick={handleClearFilters} className="aspect-square p-4 bg-primary text-on-primary rounded-2xl hover:bg-primary-container transition-colors shadow-md shadow-primary/20">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {loading || solrLoading ? (
                    <div className="text-center py-12">
                        <p className="text-lg text-secondary">Loading doctors...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <p className="text-lg text-error">{error}</p>
                    </div>
                ) : filteredDoctors.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-lg text-secondary">No online doctors match your current filters. Try changing specialty, location, availability, or fee range.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredDoctors.map((doctor) => (
                            <div key={doctor.id} className="bg-surface-container-lowest rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_32px_64px_rgba(15,23,42,0.08)] hover:-translate-y-1 flex flex-col group">
                                <div className="relative mb-6">
                                    <div className="w-24 h-24 rounded-2xl object-cover shadow-lg group-hover:scale-105 transition-transform duration-500 bg-surface-container-low flex items-center justify-center overflow-hidden">
                                        <img
                                            src={doctor.profilePhoto ? (doctor.profilePhoto.startsWith('http') ? doctor.profilePhoto : `${import.meta.env.VITE_API_URL}${doctor.profilePhoto.startsWith('/') ? '' : '/'}${doctor.profilePhoto}`) : 'https://icons.veryicon.com/png/o/healthcate-medical/orange-particle/doctor-20.png'}
                                            alt="Doctor"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://icons.veryicon.com/png/o/healthcate-medical/orange-particle/doctor-20.png';
                                            }}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-tertiary text-on-tertiary px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm border-2 border-white">
                                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                                        ONLINE
                                    </div>
                                </div>

                                <div className="flex-grow">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-tertiary font-bold text-xs uppercase tracking-widest">{doctor.specialization || 'Specialist'}</span>
                                        {doctor.averageRating > 0 && (
                                            <div className="flex items-center text-amber-500 gap-0.5">
                                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                                <span className="text-xs font-bold">{doctor.averageRating.toFixed(1)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="font-headline text-2xl font-bold text-on-surface mb-2">Dr. {doctor.name}</h3>

                                    <p className="text-secondary text-sm leading-relaxed mb-3 line-clamp-2">
                                        {doctor.location} • Available {doctor.availability}
                                    </p>

                                    <p className="text-primary font-semibold text-sm mb-6">Consultation Fee: Rs.{Number(doctor.consultationFee || 0)}</p>

                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="bg-surface-container-low p-3 rounded-xl">
                                            <span className="block text-[10px] text-outline uppercase font-bold mb-1">Next Slot</span>
                                            <span className="text-on-surface font-semibold text-sm">10:30 AM</span>
                                        </div>
                                        <div className="bg-surface-container-low p-3 rounded-xl">
                                            <span className="block text-[10px] text-outline uppercase font-bold mb-1">Experience</span>
                                            <span className="text-on-surface font-semibold text-sm">5+ years</span>
                                        </div>
                                    </div>
                                </div>

                                <Link to={`/patient/doctor-profile-patient/${doctor.id}?type=online`}>
                                    <button className="w-full py-4 rounded-2xl bg-primary text-on-primary font-bold shadow-lg shadow-primary/20 hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-xl">video_call</span>
                                        Consult Now
                                    </button>
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </main>

        </div>
    );
};

export default BookDocOnline;
