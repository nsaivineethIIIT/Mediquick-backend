import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { usePatient } from '../../context/PatientContext';
import { getToken } from '../../utils/authUtils';
import '../../assets/css/PatientDashboard.css';

const DoctorProfilePatient = () => {
    const { patient } = usePatient();
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [doctor, setDoctor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [bookedSlots, setBookedSlots] = useState({});
    const [booking, setBooking] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingError, setBookingError] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [isScrolled, setIsScrolled] = useState(false);

    const searchParams = new URLSearchParams(location.search);
    const type = searchParams.get('type') || 'offline';
    const isOnlineConsultation = type === 'online';

    const dates = useMemo(() => {
        const list = [];
        const today = new Date();

        for (let index = 0; index < 14; index += 1) {
            const date = new Date(today);
            date.setDate(today.getDate() + index);
            list.push({
                display: `${date.toLocaleString('en-US', { weekday: 'short' })} ${date.getDate()}`,
                value: date.toISOString().split('T')[0]
            });
        }

        return list;
    }, []);

    const allSlots = useMemo(() => ({
        morning: ['09:00 AM', '09:15 AM', '09:30 AM', '09:45 AM', '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM', '11:00 AM', '11:15 AM', '11:30 AM'],
        afternoon: ['02:00 PM', '02:15 PM', '02:30 PM', '02:45 PM', '03:00 PM', '03:15 PM', '03:30 PM', '03:45 PM'],
        evening: ['06:00 PM', '06:15 PM', '06:30 PM', '06:45 PM', '07:00 PM', '07:15 PM', '07:30 PM', '07:45 PM']
    }), []);

    const availableSlots = useMemo(() => {
        if (!selectedDate) {
            return { morning: [], afternoon: [], evening: [] };
        }

        const selectedDateObj = new Date(selectedDate);
        const now = new Date();
        const isToday = selectedDateObj.toDateString() === now.toDateString();
        const key = `${id}-${selectedDate}`;
        const bookedSlotsForDate = bookedSlots[key] || [];

        const filterSlots = (slots) => slots.map((slot) => {
            const isBooked = bookedSlotsForDate.includes(slot);
            let isPast = false;

            if (isToday) {
                const [time, period] = slot.split(' ');
                let [hours, minutes] = time.split(':').map(Number);

                if (period === 'PM' && hours !== 12) hours += 12;
                if (period === 'AM' && hours === 12) hours = 0;

                const slotTime = new Date(selectedDateObj);
                slotTime.setHours(hours, minutes, 0, 0);
                isPast = slotTime <= now;
            }

            return {
                time: slot,
                booked: isBooked,
                past: isPast,
                disabled: isBooked || isPast
            };
        });

        return {
            morning: filterSlots(allSlots.morning),
            afternoon: filterSlots(allSlots.afternoon),
            evening: filterSlots(allSlots.evening)
        };
    }, [selectedDate, bookedSlots, allSlots, id]);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 12);
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll();

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        fetchDoctorProfile();

        return () => {
            setDoctor(null);
            setBookingSuccess(false);
            setBookingError(null);
        };
    }, [id]);

    useEffect(() => {
        if (selectedDate) {
            fetchBookedSlotsForDate(selectedDate);
        }
    }, [selectedDate, id, isOnlineConsultation]);

    useEffect(() => {
        if (doctor && dates.length > 0 && !selectedDate) {
            setSelectedDate(dates[0].value);
        }
    }, [doctor, dates, selectedDate]);

    useEffect(() => {
        if (bookingSuccess) {
            setShowPaymentModal(false);
            alert(`Appointment booked successfully! ${isOnlineConsultation ? 'Online Consultation' : 'Clinic Visit'}\nPayment Method: ${paymentMethod}`);
            setTimeout(() => {
                navigate('/patient/dashboard');
            }, 2000);
        }
    }, [bookingSuccess, isOnlineConsultation, paymentMethod, navigate]);

    useEffect(() => {
        if (bookingError) {
            alert(bookingError);

            if (selectedDate) {
                fetchBookedSlotsForDate(selectedDate);
            }
        }
    }, [bookingError, selectedDate]);

    const fetchDoctorProfile = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = getToken('patient');
            const API = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API}/patient/api/doctor/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch doctor profile');
            }

            const data = await response.json();
            setDoctor(data);
        } catch (err) {
            console.error('Error fetching doctor:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchBookedSlotsForDate = async (date) => {
        try {
            const token = getToken('patient');
            const consultationType = isOnlineConsultation ? 'online' : 'offline';
            const API = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API}/appointment/api/booked-slots?doctorId=${id}&date=${date}&type=${consultationType}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch booked slots');
            }

            const slots = await response.json();
            const key = `${id}-${date}`;
            setBookedSlots((previous) => ({ ...previous, [key]: slots }));
        } catch (err) {
            console.error('Error fetching booked slots:', err);
        }
    };

    const handleDateSelect = (dateValue) => {
        setSelectedDate(dateValue);
        setSelectedTime('');
    };

    const handleTimeSelect = (slot) => {
        if (!slot.disabled) {
            setSelectedTime(slot.time);
        }
    };

    const handleBookAppointment = () => {
        if (!selectedDate || !selectedTime) {
            alert('Please select a valid date and time slot.');
            return;
        }

        setShowPaymentModal(true);
    };

    const handleConfirmPayment = async () => {
        if (!paymentMethod) {
            alert('Please select a payment method.');
            return;
        }

        setBooking(true);
        setBookingError(null);

        try {
            const token = getToken('patient');
            const API = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API}/appointment/appointments`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    doctorId: id,
                    date: selectedDate,
                    time: selectedTime,
                    type: isOnlineConsultation ? 'online' : 'offline',
                    notes: '',
                    modeOfPayment: paymentMethod
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || errorData.message || 'Failed to book appointment');
            }

            setBookingSuccess(true);
        } catch (err) {
            console.error('Error booking appointment:', err);
            setBookingError(err.message);
        } finally {
            setBooking(false);
        }
    };

    const handleCancelPayment = () => {
        setShowPaymentModal(false);
        setPaymentMethod('');
    };

    const getProfileImageUrl = () => {
        if (!patient?.profilePhoto) {
            return '/images/default-patient.svg';
        }

        const photo = patient.profilePhoto;
        if (/^(https?:|data:|blob:)/i.test(photo)) {
            return photo;
        }

        const API = import.meta.env.VITE_API_URL;
        if (photo.startsWith('/')) {
            return `${API}${photo}`;
        }

        return `${API}/${photo}`;
    };

    const getDoctorImageUrl = () => {
        const image = doctor?.image || doctor?.profilePhoto;

        if (!image) {
            return 'https://icons.veryicon.com/png/o/healthcate-medical/orange-particle/doctor-20.png';
        }

        if (/^(https?:|data:|blob:)/i.test(image)) {
            return image;
        }

        const API = import.meta.env.VITE_API_URL;
        if (image.startsWith('/')) {
            return `${API}${image}`;
        }

        return `${API}/${image}`;
    };

    const renderHeader = () => (
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
                    <Link to="/patient/profile" className="pd-header__avatar-wrap" aria-label="Patient profile">
                        <img className="pd-header__avatar" src={getProfileImageUrl()} alt="Patient Profile" onError={(event) => { event.currentTarget.src = '/images/default-patient.svg'; }} />
                    </Link>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="patient-dashboard patient-dashboard--zoomed min-h-screen bg-[var(--surface)] text-[var(--on-surface)]">
                {renderHeader()}
                <main className="mx-auto max-w-screen-2xl px-6 pb-24 pt-32 md:px-8">
                    <div className="rounded-2xl bg-surface-container-lowest p-10 text-center shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
                        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-outline-variant border-t-primary" />
                        <p className="font-medium text-on-surface-variant">Loading doctor profile...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!doctor) {
        return (
            <div className="patient-dashboard patient-dashboard--zoomed min-h-screen bg-[var(--surface)] text-[var(--on-surface)]">
                {renderHeader()}
                <main className="mx-auto max-w-screen-2xl px-6 pb-24 pt-32 md:px-8">
                    <div className="rounded-2xl bg-surface-container-lowest p-10 text-center shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
                        <p className="font-medium text-on-surface-variant">Doctor data is unavailable.</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="patient-dashboard patient-dashboard--zoomed min-h-screen bg-[var(--surface)] text-[var(--on-surface)]">
            {renderHeader()}

            <main className="mx-auto max-w-screen-2xl px-6 pb-24 pt-32 md:px-8">
                {error && (
                    <div className="mb-6 rounded-2xl border border-error/20 bg-error-container px-4 py-3 text-sm font-medium text-error">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
                    <section className="space-y-8 lg:col-span-8">
                        <div className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
                            <div className="grid gap-8 p-8 md:grid-cols-[16rem_1fr]">
                                <div className="h-[22rem] overflow-hidden rounded-2xl bg-surface-container shadow-lg">
                                    <img
                                        alt={`Dr. ${doctor.name}`}
                                        className="h-full w-full object-cover"
                                        src={getDoctorImageUrl()}
                                        onError={(event) => {
                                            event.currentTarget.src = 'https://icons.veryicon.com/png/o/healthcate-medical/orange-particle/doctor-20.png';
                                        }}
                                    />
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <div className="mb-3 flex flex-wrap items-center gap-3">
                                            <span className="rounded-full bg-tertiary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-tertiary">Verified Specialist</span>
                                            {doctor.averageRating > 0 && (
                                                <span className="rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold text-primary">
                                                    ⭐ {doctor.averageRating}/10
                                                </span>
                                            )}
                                        </div>
                                        <h1 className="font-headline text-3xl font-extrabold leading-tight text-on-surface">Dr. {doctor.name}</h1>
                                        <p className="mt-1 text-lg font-medium text-primary">{doctor.specialization}</p>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-high text-primary">
                                                <span className="material-symbols-outlined">workspace_premium</span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-on-surface-variant">Experience</p>
                                                <p className="font-bold text-on-surface">{doctor.experience || 'N/A'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-high text-primary">
                                                <span className="material-symbols-outlined">school</span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-on-surface-variant">Qualification</p>
                                                <p className="font-bold text-on-surface">{doctor.qualifications || 'N/A'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-high text-primary">
                                                <span className="material-symbols-outlined">translate</span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-on-surface-variant">Languages</p>
                                                <p className="font-bold text-on-surface">{doctor.languages || 'N/A'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-high text-primary">
                                                <span className="material-symbols-outlined">payments</span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-on-surface-variant">Consultation Fee</p>
                                                <p className="font-bold text-tertiary">₹{doctor.consultationFee || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 text-on-surface-variant">
                                        <span className="material-symbols-outlined mt-0.5 text-primary">location_on</span>
                                        <p className="text-sm">{doctor.location || 'Location not available'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
                                <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-wide text-on-surface">Quick Profile</h2>
                                <div className="space-y-3 text-base text-on-surface-variant">
                                    <p><span className="font-semibold text-on-surface">Specialization:</span> {doctor.specialization || 'N/A'}</p>
                                    <p><span className="font-semibold text-on-surface">Hospital:</span> {doctor.location || 'N/A'}</p>
                                    <p><span className="font-semibold text-on-surface">Consultation Mode:</span> {isOnlineConsultation ? 'Online Consultation' : 'Clinic Visit'}</p>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
                                <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-wide text-on-surface">Highlights</h2>
                                <ul className="space-y-3 text-base text-on-surface-variant">
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-tertiary">check_circle</span> Personalized consultation timing</li>
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-tertiary">check_circle</span> Secure patient booking flow</li>
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-tertiary">check_circle</span> Payment before appointment confirmation</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <aside className="space-y-6 lg:sticky lg:top-28 lg:col-span-4">
                        <div className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
                            <div className="bg-primary p-6 text-white">
                                <h2 className="font-headline text-lg font-bold text-white">Book Appointment</h2>
                                <p className="text-sm text-white/90">Select your preferred slot</p>
                            </div>

                            <div className="space-y-8 p-6">
                                <div className="flex rounded-lg bg-surface-container-low p-1">
                                    <div className="flex-1 rounded-md bg-white py-2 text-center text-sm font-bold text-primary shadow-sm">
                                        {isOnlineConsultation ? 'Online Consult' : 'Clinic Visit'}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-sm font-bold text-on-surface-variant">Select Date</h3>
                                        <span className="text-xs font-normal text-primary">Next 14 days</span>
                                    </div>
                                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                        {dates.map((date) => (
                                            <button
                                                key={date.value}
                                                type="button"
                                                onClick={() => handleDateSelect(date.value)}
                                                className={`flex h-20 w-16 flex-shrink-0 flex-col items-center justify-center rounded-xl transition-all ${selectedDate === date.value ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface-container-low text-on-surface hover:bg-primary-fixed'}`}
                                            >
                                                <span className={`text-[10px] uppercase font-bold ${selectedDate === date.value ? 'opacity-80' : 'text-on-surface-variant'}`}>{date.display.split(' ')[0]}</span>
                                                <span className="text-xl font-bold">{date.display.split(' ')[1]}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {[
                                        { title: 'Morning', icon: 'light_mode', slots: availableSlots.morning },
                                        { title: 'Afternoon', icon: 'wb_sunny', slots: availableSlots.afternoon },
                                        { title: 'Evening', icon: 'bedtime', slots: availableSlots.evening }
                                    ].map((group) => (
                                        <div key={group.title} className="space-y-3">
                                            <h4 className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                                                <span className="material-symbols-outlined text-sm">{group.icon}</span>
                                                {group.title}
                                            </h4>

                                            <div className="grid grid-cols-3 gap-2">
                                                {group.slots.map((slot) => (
                                                    <button
                                                        key={slot.time}
                                                        type="button"
                                                        disabled={slot.disabled}
                                                        onClick={() => handleTimeSelect(slot)}
                                                        className={`rounded-lg border px-2 py-2 text-xs font-medium transition-all ${selectedTime === slot.time ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant bg-white text-on-surface hover:border-primary hover:text-primary'} ${slot.disabled ? 'cursor-not-allowed opacity-50 line-through' : ''}`}
                                                    >
                                                        {slot.time}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={handleBookAppointment}
                                    disabled={booking || !selectedDate || !selectedTime}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {booking ? 'Booking...' : isOnlineConsultation ? 'Start Online Consultation' : 'Book Appointment'}
                                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                </button>

                                <p className="px-4 text-center text-[10px] font-normal text-on-surface-variant">
                                    By booking, you agree to our <a className="text-primary underline" href="#">Cancellation Policy</a>. A secure payment of ₹{doctor.consultationFee || 'N/A'} will be processed in the next step.
                                </p>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            {showPaymentModal && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            handleCancelPayment();
                        }
                    }}
                >
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-[0_1rem_3rem_rgba(0,0,0,0.3)]">
                        <div className="flex items-center justify-between border-b border-outline-variant/20 px-6 py-5">
                            <h2 className="text-2xl font-bold text-on-surface">Payment</h2>
                            <button className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low" type="button" onClick={handleCancelPayment}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="grid gap-6 p-6 md:grid-cols-2">
                            <div className="space-y-4 rounded-2xl bg-surface-container-low p-5">
                                <h3 className="text-lg font-bold text-on-surface">Appointment Summary</h3>
                                <p className="text-sm text-on-surface-variant"><span className="font-semibold text-on-surface">Doctor:</span> Dr. {doctor.name}</p>
                                <p className="text-sm text-on-surface-variant"><span className="font-semibold text-on-surface">Date:</span> {new Date(selectedDate).toLocaleDateString()}</p>
                                <p className="text-sm text-on-surface-variant"><span className="font-semibold text-on-surface">Time:</span> {selectedTime}</p>
                                <p className="text-sm text-on-surface-variant"><span className="font-semibold text-on-surface">Type:</span> {isOnlineConsultation ? 'Online Consultation' : 'Clinic Visit'}</p>
                                <p className="text-sm font-bold text-tertiary"><span className="text-on-surface">Amount:</span> ₹{doctor.consultationFee || 'N/A'}</p>
                            </div>

                            <div className="space-y-4 rounded-2xl bg-surface-container-low p-5">
                                <h3 className="text-lg font-bold text-on-surface">Select Payment Method</h3>

                                <div className="space-y-3">
                                    {[
                                        { value: 'credit-card', label: 'Credit/Debit Card' },
                                        { value: 'upi', label: 'UPI' },
                                        { value: 'net-banking', label: 'Net Banking' },
                                        { value: 'wallet', label: 'Wallet' },
                                        { value: 'cash', label: 'Cash (Pay at Clinic)' }
                                    ].map((method) => (
                                        <label
                                            key={method.value}
                                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all ${paymentMethod === method.value ? 'border-primary bg-primary/5' : 'border-outline-variant/30 bg-white hover:border-primary/50'}`}
                                        >
                                            <input
                                                type="radio"
                                                name="payment"
                                                value={method.value}
                                                checked={paymentMethod === method.value}
                                                onChange={(event) => setPaymentMethod(event.target.value)}
                                            />
                                            <span className="material-symbols-outlined text-primary">payments</span>
                                            <span className="text-sm font-medium text-on-surface">{method.label}</span>
                                        </label>
                                    ))}
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        className="flex-1 rounded-xl border border-outline-variant/30 bg-white py-3 font-bold text-on-surface transition-all hover:bg-surface-container-low"
                                        onClick={handleCancelPayment}
                                        disabled={booking}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="flex-1 rounded-xl bg-primary py-3 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                                        onClick={handleConfirmPayment}
                                        disabled={!paymentMethod || booking}
                                    >
                                        {booking ? 'Processing...' : 'Confirm Payment'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorProfilePatient;