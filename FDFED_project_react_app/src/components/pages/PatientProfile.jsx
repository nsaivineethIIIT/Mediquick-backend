import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { usePatient } from '../../context/PatientContext';
import { getToken, removeToken } from '../../utils/authUtils';
import { fetchPatientAppointments, cancelAppointment } from '../../store/slices/appointmentSlice';
import ChatFileDisplay from '../common/ChatFileDisplay';
import '../../assets/css/PatientDashboard.css';

const statusBadgeClass = (status = '') => {
  const normalized = status.toLowerCase();

  if (normalized === 'completed') {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (normalized === 'cancelled') {
    return 'bg-rose-100 text-rose-800';
  }
  if (normalized === 'confirmed') {
    return 'bg-sky-100 text-sky-800';
  }
  if (normalized === 'pending') {
    return 'bg-amber-100 text-amber-800';
  }
  return 'bg-slate-100 text-slate-700';
};

const formatLongDate = (dateValue) => {
  if (!dateValue) return 'N/A';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatPatientId = (patient) => {
  return patient?.patientID || patient?.id || patient?._id || 'Not assigned';
};

const PatientProfile = () => {
  const { patient, loading: profileLoading, error: profileError, refetch: refetchPatient, logout } = usePatient();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { patientAppointments, patientAppointmentsLoading: appointmentsLoading, patientAppointmentsError: appointmentsError } =
    useSelector((state) => state.appointments);

  const previousAppointments = patientAppointments?.previous || [];
  const upcomingAppointments = patientAppointments?.upcoming || [];

  const [chatModal, setChatModal] = useState({
    isOpen: false,
    appointmentId: null,
    messages: []
  });

  const [feedbackModal, setFeedbackModal] = useState({
    isOpen: false,
    appointmentId: null,
    feedback: '',
    rating: 0
  });
  const [isScrolled, setIsScrolled] = useState(false);

  const messageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatMessagesRef = useRef(null);

  const getProfileImageUrl = () => {
    if (!patient?.profilePhoto) return '/images/default-patient.svg';
    const photo = patient.profilePhoto;
    if (/^(https?:|data:|blob:)/i.test(photo)) return photo;
    const API = import.meta.env.VITE_API_URL;
    if (photo.startsWith('/')) return `${API}${photo}`;
    return `${API}/${photo}`;
  };

  const closeProfile = () => {
    navigate('/patient/dashboard');
  };

  const handleLogout = async () => {
    try {
      logout();
    } catch (error) {
      console.error('Error logging out:', error);
      navigate('/patient/form');
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    const appointment = upcomingAppointments.find((appt) => appt.id === appointmentId);

    if (appointment) {
      const status = (appointment.status || '').toLowerCase();
      if (status === 'completed') {
        alert('Cannot cancel a completed appointment');
        return;
      }
      if (status === 'cancelled') {
        alert('This appointment is already cancelled');
        return;
      }
    }

    if (confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await dispatch(cancelAppointment(appointmentId)).unwrap();
        alert('Appointment cancelled successfully');
        dispatch(fetchPatientAppointments('upcoming'));
        dispatch(fetchPatientAppointments('previous'));
      } catch (error) {
        alert(error || 'An error occurred while cancelling the appointment');
      }
    }
  };

  const openChat = (appointmentId) => {
    setChatModal({
      isOpen: true,
      appointmentId,
      messages: []
    });
    loadMessages(appointmentId);
  };

  const closeChat = () => {
    setChatModal({
      isOpen: false,
      appointmentId: null,
      messages: []
    });
  };

  const loadMessages = async (appointmentId) => {
    try {
      const token = getToken('patient');
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/chat/${appointmentId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        removeToken('patient');
        navigate('/patient/form');
        return;
      }

      const data = await response.json();
      if (data.messages) {
        setChatModal((prev) => ({ ...prev, messages: data.messages }));
        setTimeout(() => {
          if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageInputRef.current?.value.trim() || !chatModal.appointmentId) return;

    try {
      const token = getToken('patient');
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          appointmentId: chatModal.appointmentId,
          message: messageInputRef.current.value.trim(),
          senderType: 'patient'
        })
      });

      if (response.status === 401) {
        removeToken('patient');
        navigate('/patient/form');
        return;
      }

      if (response.ok) {
        messageInputRef.current.value = '';
        loadMessages(chatModal.appointmentId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const sendFile = async () => {
    const file = fileInputRef.current?.files[0];
    if (!file || !chatModal.appointmentId) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('appointmentId', chatModal.appointmentId);
    formData.append('senderType', 'patient');

    try {
      const token = getToken('patient');
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/chat/send-file`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        removeToken('patient');
        navigate('/patient/form');
        return;
      }

      if (response.ok) {
        fileInputRef.current.value = '';
        loadMessages(chatModal.appointmentId);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send file');
      }
    } catch (error) {
      alert('Failed to send file');
      console.error('Error sending file:', error);
    }
  };

  const handleMessageKeyPress = (event) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  };

  const openFeedbackModal = (appointment) => {
    setFeedbackModal({
      isOpen: true,
      appointmentId: appointment.id,
      feedback: appointment.feedback || '',
      rating: appointment.rating || 0
    });
  };

  const closeFeedbackModal = () => {
    setFeedbackModal({
      isOpen: false,
      appointmentId: null,
      feedback: '',
      rating: 0
    });
  };

  const submitFeedback = async () => {
    if (!feedbackModal.appointmentId) return;

    if (!feedbackModal.feedback.trim() && feedbackModal.rating === 0) {
      alert('Please provide feedback or rating');
      return;
    }

    try {
      const token = getToken('patient');
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/appointment/${feedbackModal.appointmentId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          feedback: feedbackModal.feedback.trim() || null,
          rating: feedbackModal.rating || null
        })
      });

      if (response.status === 401) {
        removeToken('patient');
        navigate('/patient/form');
        return;
      }

      if (response.ok) {
        alert('Feedback submitted successfully!');
        closeFeedbackModal();
        dispatch(fetchPatientAppointments('previous'));
      } else {
        const error = await response.json();
        alert(error.details || error.error || 'Failed to submit feedback');
      }
    } catch (error) {
      alert('An error occurred while submitting feedback');
      console.error('Error submitting feedback:', error);
    }
  };

  useEffect(() => {
    const previousRootFontSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '14px';
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.body.classList.add('patient-profile-zoom');
    dispatch(fetchPatientAppointments('previous'));
    dispatch(fetchPatientAppointments('upcoming'));

    return () => {
      document.documentElement.style.fontSize = previousRootFontSize;
      document.body.classList.remove('patient-profile-zoom');
    };
  }, [dispatch]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let interval;
    if (chatModal.isOpen && chatModal.appointmentId) {
      interval = setInterval(() => {
        loadMessages(chatModal.appointmentId);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [chatModal.isOpen, chatModal.appointmentId]);

  const pendingCount = upcomingAppointments.filter((appointment) => {
    const status = (appointment.status || '').toLowerCase();
    return status !== 'completed' && status !== 'cancelled';
  }).length;

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

      <main className="mx-auto w-full max-w-[1440px] px-6 py-12 md:px-10 md:py-14">
        <section className="mb-12 flex flex-col items-center gap-9 rounded-3xl border border-slate-200 bg-white p-9 shadow-sm md:flex-row md:items-end md:justify-between md:p-11">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-center">
            <div className="relative">
              <div className="h-40 w-40 overflow-hidden rounded-full border-4 border-white shadow-lg md:h-48 md:w-48">
                <img
                  src={getProfileImageUrl()}
                  alt="Patient"
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.target.src = '/images/default-patient.svg';
                  }}
                />
              </div>
              <div className="absolute bottom-1 right-1 rounded-full bg-emerald-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                Active
              </div>
            </div>

            <div className="space-y-2 text-center md:text-left">
              {profileLoading ? (
                <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-200" />
              ) : profileError ? (
                <div>
                  <p className="text-sm font-semibold text-rose-700">Error loading profile</p>
                  <button
                    onClick={refetchPatient}
                    className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Retry
                  </button>
                </div>
              ) : patient ? (
                <>
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">{patient.name}</h1>
                  <div className="flex flex-wrap items-center justify-center gap-3 text-lg md:justify-start">
                    <span className="font-medium text-slate-500">ID: {formatPatientId(patient)}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    <span className="font-semibold text-emerald-700">Patient Account</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-600">No profile data available.</p>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              to="/patient/book-appointment"
              className="rounded-2xl bg-blue-700 px-7 py-3.5 text-center text-lg font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Schedule Visit
            </Link>
            <Link
              to="/patient/edit-profile"
              className="rounded-2xl border border-slate-200 bg-slate-100 px-7 py-3.5 text-center text-lg font-semibold text-blue-700 transition hover:bg-slate-200"
            >
              Edit Profile
            </Link>
            <button
              onClick={closeProfile}
              className="rounded-2xl border border-slate-200 bg-white px-7 py-3.5 text-center text-lg font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Back to Dashboard
            </button>
          </div>
        </section>

        {!profileLoading && !profileError && patient && (
          <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Email</p>
              <p className="text-lg font-semibold text-slate-900 break-all">{patient.email || 'N/A'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Mobile</p>
              <p className="text-lg font-semibold text-slate-900">{patient.mobile || 'N/A'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Date of Birth</p>
              <p className="text-lg font-semibold text-slate-900">{formatLongDate(patient.dateOfBirth)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Gender</p>
              <p className="text-lg font-semibold text-slate-900">
                {patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : 'N/A'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-7 shadow-sm md:col-span-2 xl:col-span-4">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Address</p>
              <p className="text-lg font-semibold text-slate-900">{patient.address || 'N/A'}</p>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Upcoming Appointments</h2>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                {pendingCount} Pending
              </span>
            </div>

            {appointmentsLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading upcoming appointments...</div>
            ) : appointmentsError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
                <p className="text-sm font-semibold text-rose-700">{appointmentsError}</p>
                <button
                  onClick={() => dispatch(fetchPatientAppointments('upcoming'))}
                  className="mt-3 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Retry
                </button>
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No upcoming appointments found.</div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => {
                  const normalizedStatus = (appointment.status || '').toLowerCase();
                  const canCancel = normalizedStatus !== 'completed' && normalizedStatus !== 'cancelled';
                  const canChat = normalizedStatus === 'confirmed';

                  return (
                    <article key={appointment.id} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">Dr. {appointment.doctorName}</h3>
                          <p className="text-base font-medium text-slate-500">{appointment.specialization || 'General'}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${statusBadgeClass(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </div>

                      <p className="text-lg text-slate-700">{appointment.date} at {appointment.time}</p>
                      <p className="mt-1 text-lg text-slate-500">Type: <span className="font-semibold text-slate-700">{appointment.type}</span></p>
                      {appointment.notes && <p className="mt-2 text-lg text-slate-500">Notes: {appointment.notes}</p>}

                      {(canChat || canCancel) && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {canChat && (
                            <button
                              onClick={() => openChat(appointment.id)}
                              className="rounded-xl bg-blue-700 px-5 py-3 text-base font-semibold text-white transition hover:brightness-110"
                            >
                              Chat with Doctor
                            </button>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => handleCancelAppointment(appointment.id)}
                              className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-base font-semibold text-rose-700 transition hover:bg-rose-100"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4 lg:col-span-3">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Appointment History</h2>

            {appointmentsLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading appointment history...</div>
            ) : appointmentsError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
                <p className="text-sm font-semibold text-rose-700">{appointmentsError}</p>
                <button
                  onClick={() => dispatch(fetchPatientAppointments('previous'))}
                  className="mt-3 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Retry
                </button>
              </div>
            ) : previousAppointments.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No previous appointments found.</div>
            ) : (
              <div className="space-y-4">
                {previousAppointments.map((appointment) => (
                  <article key={appointment.id} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Dr. {appointment.doctorName}</h3>
                        <p className="text-base font-medium text-slate-500">{appointment.specialization || 'General'} • {appointment.date}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${statusBadgeClass(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </div>

                    <p className="text-lg text-slate-600">Time: {appointment.time}</p>
                    <p className="mt-1 text-lg text-slate-500">Type: <span className="font-semibold text-slate-700">{appointment.type}</span></p>
                    {appointment.notes && <p className="mt-2 text-lg text-slate-500">Notes: {appointment.notes}</p>}
                    {appointment.feedback && <p className="mt-2 text-lg italic text-slate-600">"{appointment.feedback}"</p>}
                    {(appointment.rating !== null && appointment.rating !== undefined) && (
                      <p className="mt-1 text-lg font-semibold text-emerald-700">Rating: {appointment.rating}/10</p>
                    )}

                    {(appointment.status || '').toLowerCase() === 'completed' && (
                      <button
                        onClick={() => openFeedbackModal(appointment)}
                        className="mt-4 rounded-xl bg-slate-900 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-700"
                      >
                        {appointment.feedback || appointment.rating ? 'Edit Feedback' : 'Give Feedback'}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {chatModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Chat with Doctor</h3>
              <button onClick={closeChat} className="text-2xl leading-none text-slate-500 hover:text-slate-800">&times;</button>
            </div>

            <div ref={chatMessagesRef} className="mb-3 h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {chatModal.messages.length === 0 && (
                <p className="text-sm text-slate-500">No messages yet.</p>
              )}

              {chatModal.messages.map((message, index) => (
                <div key={`${message.createdAt || index}-${index}`} className={`mb-2 max-w-[80%] rounded-xl px-3 py-2 text-sm ${message.senderType === 'patient' ? 'ml-auto bg-blue-700 text-white' : 'bg-white text-slate-800 border border-slate-200'}`}>
                  {message.isFile ? (
                    <ChatFileDisplay fileUrl={message.filePath || (import.meta.env.VITE_API_URL + '/chat/download/' + message.fileName)} fileName={message.originalFileName || message.fileName} isWhiteText={message.senderType === 'patient'} />
                  ) : (
                    message.message
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={messageInputRef}
                type="text"
                placeholder="Type your message..."
                onKeyPress={handleMessageKeyPress}
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                className="hidden"
                onChange={() => {
                  if (fileInputRef.current?.files.length > 0) {
                    sendFile();
                  }
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                File
              </button>
              <button
                onClick={sendMessage}
                className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {feedbackModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Appointment Feedback</h3>
              <button onClick={closeFeedbackModal} className="text-2xl leading-none text-slate-500 hover:text-slate-800">&times;</button>
            </div>

            <label className="mb-2 block text-sm font-semibold text-slate-700">Rating (0-10)</label>
            <div className="mb-4 flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="10"
                value={feedbackModal.rating}
                onChange={(event) =>
                  setFeedbackModal((prev) => ({
                    ...prev,
                    rating: parseInt(event.target.value, 10)
                  }))
                }
                className="w-full"
              />
              <span className="min-w-[3.5rem] text-sm font-bold text-slate-800">{feedbackModal.rating}/10</span>
            </div>

            <label className="mb-2 block text-sm font-semibold text-slate-700">Feedback (Optional)</label>
            <textarea
              value={feedbackModal.feedback}
              onChange={(event) => setFeedbackModal((prev) => ({ ...prev, feedback: event.target.value }))}
              rows={5}
              placeholder="Share your experience..."
              className="mb-4 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-600"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={closeFeedbackModal}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={submitFeedback}
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientProfile;
