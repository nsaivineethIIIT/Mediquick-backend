import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../assets/css/DoctorDashboardModern.css';
import { Link } from 'react-router-dom';
import { useDoctor } from '../../context/DoctorContext';
import { getToken, removeToken } from '../../utils/authUtils';
import DoctorLayoutShell from '../common/DoctorLayoutShell';
import ChatFileDisplay from '../common/ChatFileDisplay';

const DoctorDashboard = () => {
  const { doctor } = useDoctor();
  const navigate = useNavigate();
  
  // Local state instead of Redux
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [previousAppointments, setPreviousAppointments] = useState([]);
  const [bookedSlots, setBookedSlots] = useState({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [financeData, setFinanceData] = useState([]);
  const [showChatModal, setShowChatModal] = useState(false);
  const [currentAppointmentId, setCurrentAppointmentId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [fileInput, setFileInput] = useState(null);
  
  // Doctor notes state
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [currentNotesAppointment, setCurrentNotesAppointment] = useState(null);
  const [notesText, setNotesText] = useState('');
  const [notesFiles, setNotesFiles] = useState([]);

  const chatMessagesRef = useRef(null);
  const messagePollingIntervalRef = useRef(null);
  const upcomingScrollRef = useRef(null);
  const previousScrollRef = useRef(null);

  const allSlots = {
    morning: ["09:00 AM", "09:15 AM", "09:30 AM", "09:45 AM", "10:00 AM", "10:15 AM", "10:30 AM", "10:45 AM", "11:00 AM", "11:15 AM", "11:30 AM"],
    afternoon: ["02:00 PM", "02:15 PM", "02:30 PM", "02:45 PM", "03:00 PM", "03:15 PM", "03:30 PM", "03:45 PM"],
    evening: ["06:00 PM", "06:15 PM", "06:30 PM", "06:45 PM", "07:00 PM", "07:15 PM", "07:30 PM", "07:45 PM"]
  };

  useEffect(() => {
    // Component mount - fetch fresh data
    if (doctor?._id) {
      fetchAppointments();
      loadFinanceData();
      initializeSlotManagement();
    }

    return () => {
      if (messagePollingIntervalRef.current) {
        clearInterval(messagePollingIntervalRef.current);
      }
    };
  }, [doctor?._id]);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (selectedDate && doctor?._id) {
      console.log('useEffect triggered with selectedDate:', selectedDate, 'doctor._id:', doctor?._id);
      loadBookedSlots(selectedDate);
    } else {
      console.log('useEffect skipped - selectedDate:', selectedDate, 'doctor?._id:', doctor?._id);
    }
  }, [selectedDate, doctor]);

  useEffect(() => {
    console.log('BookedSlots state updated:', bookedSlots);
    console.log('Selected date:', selectedDate);
    if (doctor?._id && selectedDate) {
      const key = `${doctor._id}-${selectedDate}`;
      console.log('Slots for current date key', key, ':', bookedSlots[key]);
    }
  }, [bookedSlots, selectedDate, doctor]);

  // Fetch appointments directly from backend
  const fetchAppointments = async () => {
    if (!doctor?._id) return;
    
    setLoadingAppointments(true);
    try {
      const token = getToken('doctor');
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/doctor/api/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          removeToken('doctor');
          navigate('/doctor/form');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setUpcomingAppointments(data.upcoming || []);
      setPreviousAppointments(data.previous || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const loadFinanceData = async () => {
    try {
      const token = getToken('doctor');
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/appointment/doctor/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          removeToken('doctor');
          navigate('/doctor/form');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      const completedAppointments = [...(data.upcoming || []), ...(data.previous || [])].filter(
        appt => appt.status === 'completed'
      );

      setFinanceData(completedAppointments);
    } catch (error) {
      console.error('Error loading finance data:', error);
    }
  };

  const loadBookedSlots = async (date) => {
    if (!doctor?._id) {
      console.log('No doctor ID available, skipping loadBookedSlots');
      return;
    }
    
    setLoadingSlots(true);
    console.log('Fetching booked slots for date:', date, 'doctorId:', doctor._id);
    
    try {
      const token = getToken('doctor');
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(
        `${API}/appointment/api/booked-slots?doctorId=${doctor._id}&date=${date}&type=offline`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const slots = await response.json();
      const key = `${doctor._id}-${date}`;
      setBookedSlots(prev => {
        const newState = { ...prev, [key]: slots };
        console.log('Updated bookedSlots state:', newState);
        console.log('Slots for key', key, ':', slots);
        return newState;
      });
    } catch (error) {
      console.error('Error loading booked slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleUpdateAppointment = async (appointmentId, status) => {
    try {
      const token = getToken('doctor');
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/appointment/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update appointment');
      }
      
      alert(`Appointment ${status} successfully`);
      fetchAppointments();
      loadFinanceData();
      if (selectedDate) {
        loadBookedSlots(selectedDate);
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Failed to update appointment. Please try again.');
    }
  };

  const initializeSlotManagement = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    console.log('Initialized selectedDate:', dateStr);
  };

  const generateDateButtons = () => {
    const today = new Date();
    const dates = [];

    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      dates.push({
        value: date.toISOString().split('T')[0],
        display: `${date.toLocaleString('en-US', { weekday: 'short' })} ${date.getDate()}`,
        isToday: i === 0,
        isPast: i < 0
      });
    }

    return dates;
  };

  const getAvailableSlots = () => {
    const now = new Date();
    const isToday = selectedDate === new Date().toISOString().split('T')[0];
    const key = doctor?._id ? `${doctor._id}-${selectedDate}` : selectedDate;
    const bookedSlotsForDate = bookedSlots[key] || [];
    console.log('Checking slots for date:', selectedDate, 'Booked slots:', bookedSlotsForDate);
    console.log('Doctor ID:', doctor?._id, 'Key used:', key);

    const filterSlots = (slots) => {
      return slots.map(slot => {
        // Trim and normalize slot strings for comparison
        const normalizedSlot = slot.trim();
        const isBooked = bookedSlotsForDate.some(bookedSlot => 
          bookedSlot.trim() === normalizedSlot
        );
        console.log(`Slot: ${normalizedSlot}, IsBooked: ${isBooked}`);
        let isPast = false;
        
        if (isToday) {
          const [time, period] = slot.split(' ');
          let [hours, minutes] = time.split(':').map(Number);
          
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          
          const slotTime = new Date(selectedDate);
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
    };

    return {
      morning: filterSlots(allSlots.morning),
      afternoon: filterSlots(allSlots.afternoon),
      evening: filterSlots(allSlots.evening)
    };
  };

  const handleDateSelect = (dateValue) => {
    setSelectedDate(dateValue);
    setSelectedTime('');
    console.log('Date selected:', dateValue);
  };

  const handleTimeSelect = (time) => {
    if (!time.disabled) {
      setSelectedTime(time.time);
      console.log('Time selected:', time.time);
    }
  };

  const handleBlockSlot = async () => {
    if (!selectedDate || !selectedTime) {
      alert('Please select both a date and time slot');
      return;
    }

    const availableSlots = getAvailableSlots();
    const allSlots = [...availableSlots.morning, ...availableSlots.afternoon, ...availableSlots.evening];
    const selectedSlot = allSlots.find(slot => slot.time === selectedTime);
    
    if (selectedSlot?.disabled) {
      alert(`Cannot block this slot. It is already ${selectedSlot.booked ? 'booked' : 'in the past'}.`);
      return;
    }

    if (confirm(`Are you sure you want to block the slot on ${selectedDate} at ${selectedTime}?`)) {
      try {
        const token = getToken('doctor');
        const API = import.meta.env.VITE_API_URL;
        const response = await fetch(`${API}/appointment/api/block-slot`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            date: selectedDate,
            time: selectedTime,
            doctorId: doctor?._id
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to block slot');
        }
        
        console.log('Slot blocked successfully, refetching slots...');
        await loadBookedSlots(selectedDate); // Wait for slots to be refetched
        alert('Slot blocked successfully');
        setSelectedTime('');
      } catch (error) {
        console.error('Error blocking slot:', error);
        alert('Failed to block slot. Please try again.');
      }
    }
  };

  const openChat = (appointmentId) => {
    setCurrentAppointmentId(appointmentId);
    setShowChatModal(true);
    loadMessages(appointmentId);
    startMessagePolling(appointmentId);
  };

  const closeChat = () => {
    setShowChatModal(false);
    setCurrentAppointmentId(null);
    setChatMessages([]);
    stopMessagePolling();
  };

  const loadMessages = async (appointmentId = currentAppointmentId) => {
    if (!appointmentId) return;

    try {
      const token = getToken('doctor');
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/chat/${appointmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        removeToken('doctor');
        navigate('/doctor/form');
        return;
      }
      
      const data = await response.json();
      setChatMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !currentAppointmentId) return;

    try {
      const token = getToken('doctor');
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          appointmentId: currentAppointmentId,
          message: messageInput,
          senderType: 'doctor'
        })
      });

      if (response.status === 401) {
        removeToken('doctor');
        navigate('/doctor/form');
        return;
      }

      if (response.ok) {
        setMessageInput('');
        loadMessages();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const sendFile = async (file) => {
    if (!file || !currentAppointmentId) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('appointmentId', currentAppointmentId);
    formData.append('senderType', 'doctor');

    try {
      const token = getToken('doctor');
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/chat/send-file`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        removeToken('doctor');
        navigate('/doctor/form');
        return;
      }

      if (response.ok) {
        setFileInput(null);
        loadMessages();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send file');
      }
    } catch (error) {
      console.error('Error sending file:', error);
      alert('Failed to send file');
    }
  };

  const startMessagePolling = (appointmentId) => {
    messagePollingIntervalRef.current = setInterval(() => {
      loadMessages(appointmentId);
    }, 5000);
  };

  const stopMessagePolling = () => {
    if (messagePollingIntervalRef.current) {
      clearInterval(messagePollingIntervalRef.current);
      messagePollingIntervalRef.current = null;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      sendFile(file);
    }
  };
  // Doctor notes functions
  const openNotesModal = (appointment) => {
    setCurrentNotesAppointment(appointment);
    setNotesText(appointment.doctorNotes?.text || '');
    setNotesFiles(appointment.doctorNotes?.files || []);
    setShowNotesModal(true);
  };

  const closeNotesModal = () => {
    setShowNotesModal(false);
    setCurrentNotesAppointment(null);
    setNotesText('');
    setNotesFiles([]);
  };

  const saveDoctorNotes = async () => {
    if (!currentNotesAppointment) return;

    try {
      const token = getToken('doctor');
      const formData = new FormData();
      formData.append('notesText', notesText);

      // Add new files to upload
      const fileInputElement = document.getElementById('doctorNotesFileInput');
      if (fileInputElement && fileInputElement.files.length > 0) {
        for (let i = 0; i < fileInputElement.files.length; i++) {
          formData.append('files', fileInputElement.files[i]);
        }
      }

      const response = await fetch(
        `${(() => {
          const API = import.meta.env.VITE_API_URL;
          return `${API}/appointment/${currentNotesAppointment._id}/doctor-notes`;
        })()}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      if (response.status === 401) {
        removeToken('doctor');
        navigate('/doctor/form');
        return;
      }

      if (response.ok) {
        alert('Doctor notes saved successfully');
        closeNotesModal();
        fetchAppointments(); // Refetch appointments directly
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save doctor notes');
      }
    } catch (error) {
      console.error('Error saving doctor notes:', error);
      alert('Failed to save doctor notes');
    }
  };

  const deleteDoctorNotesFile = async (fileId) => {
    if (!currentNotesAppointment || !window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      const token = getToken('doctor');
      const response = await fetch(
        `${(() => {
          const API = import.meta.env.VITE_API_URL;
          return `${API}/appointment/${currentNotesAppointment._id}/doctor-notes/files/${fileId}`;
        })()}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.status === 401) {
        removeToken('doctor');
        navigate('/doctor/form');
        return;
      }

      if (response.ok) {
        // Update local state
        setNotesFiles(notesFiles.filter(file => file._id !== fileId));
        alert('File deleted successfully');
        fetchAppointments(); // Refetch appointments directly
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file');
    }
  };
  const financeTotals = financeData.reduce(
    (totals, appt) => {
      const fee = appt.consultationFee || 0;
      const revenue = fee * 0.9;
      return {
        totalFees: totals.totalFees + fee,
        totalRevenue: totals.totalRevenue + revenue,
        totalAppointments: totals.totalAppointments + 1
      };
    },
    { totalFees: 0, totalRevenue: 0, totalAppointments: 0 }
  );

  const availableSlots = getAvailableSlots();

  const getDoctorName = () => doctor?.name || 'Dr. Alex Smith';

  const getInitials = (name) => {
    if (!name) return 'NA';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  };

  const formatDisplayDate = (date) => new Date(date).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short'
  });

  const formatDisplayDay = (date) => new Date(date).toLocaleDateString('en-US', {
    weekday: 'short'
  });

  const scrollAppointmentList = (ref, direction) => {
    const container = ref.current;
    if (!container) return;

    const amount = Math.max(320, Math.floor(container.clientWidth * 0.82));
    container.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth'
    });
  };

  const topUpcomingAppointments = upcomingAppointments;
  const topPreviousAppointments = previousAppointments;

  return (
    <DoctorLayoutShell activeItem="schedule">
      <div className="doctor-page-content doctor-shared-centered">
          <section className="doctor-hero">
            <h1>
              Manage your clinical
              <br />
              <span>workflow</span> with precision.
            </h1>
            <p>
              Welcome back, {getDoctorName()}. You have {upcomingAppointments.length} appointments scheduled.
            </p>
          </section>

          <section id="slot" className="doctor-card doctor-slot-card">
            <div className="doctor-section-header">
              <div>
                <h2>Slot Management</h2>
                <p>Configure your availability for the next 14 days</p>
              </div>
              <button
                className="primary-action"
                onClick={handleBlockSlot}
                disabled={!selectedDate || !selectedTime}
              >
                Block Selected Slot
              </button>
            </div>

            <div className="doctor-date-scroller">
              {generateDateButtons().map((date) => (
                <button
                  key={date.value}
                  className={`doctor-date-card ${selectedDate === date.value ? 'selected' : ''}`}
                  onClick={() => handleDateSelect(date.value)}
                >
                  <span>{date.isToday ? 'Today' : formatDisplayDay(date.value)}</span>
                  <strong>{new Date(date.value).getDate()}</strong>
                  <small>{new Date(date.value).toLocaleDateString('en-US', { month: 'short' })}</small>
                </button>
              ))}
            </div>

            {loadingSlots && <p className="doctor-loading-text">Loading slots...</p>}

            <div className="doctor-time-grid">
              <div className="doctor-time-group">
                <h3>Morning</h3>
                <div className="doctor-time-buttons">
                  {availableSlots.morning.map((slot, index) => (
                    <button
                      key={`morning-${index}`}
                      className={`${selectedTime === slot.time ? 'selected' : ''} ${slot.booked ? 'booked' : ''} ${slot.past ? 'past' : ''}`}
                      disabled={slot.disabled}
                      onClick={() => handleTimeSelect(slot)}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>

              <div className="doctor-time-group">
                <h3>Afternoon</h3>
                <div className="doctor-time-buttons">
                  {availableSlots.afternoon.map((slot, index) => (
                    <button
                      key={`afternoon-${index}`}
                      className={`${selectedTime === slot.time ? 'selected' : ''} ${slot.booked ? 'booked' : ''} ${slot.past ? 'past' : ''}`}
                      disabled={slot.disabled}
                      onClick={() => handleTimeSelect(slot)}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>

              <div className="doctor-time-group">
                <h3>Evening</h3>
                <div className="doctor-time-buttons">
                  {availableSlots.evening.map((slot, index) => (
                    <button
                      key={`evening-${index}`}
                      className={`${selectedTime === slot.time ? 'selected' : ''} ${slot.booked ? 'booked' : ''} ${slot.past ? 'past' : ''}`}
                      disabled={slot.disabled}
                      onClick={() => handleTimeSelect(slot)}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="upcoming" className="doctor-section">
            <div className="doctor-section-header">
              <h2>Upcoming Appointments</h2>
              <div className="doctor-section-actions">
                <div className="doctor-scroll-controls" aria-label="Scroll upcoming appointments">
                  <button type="button" className="doctor-scroll-button" onClick={() => scrollAppointmentList(upcomingScrollRef, 'left')} aria-label="Scroll upcoming appointments left">
                    ←
                  </button>
                  <button type="button" className="doctor-scroll-button" onClick={() => scrollAppointmentList(upcomingScrollRef, 'right')} aria-label="Scroll upcoming appointments right">
                    →
                  </button>
                </div>
                <Link to="/doctor/schedule" className="doctor-view-all">View All Schedule</Link>
              </div>
            </div>

            {loadingAppointments ? (
              <p className="doctor-loading-text">Loading appointments...</p>
            ) : topUpcomingAppointments.length === 0 ? (
              <p className="doctor-loading-text">No upcoming appointments found</p>
            ) : (
              <div className="doctor-horizontal-scroll" ref={upcomingScrollRef}>
                <div className="doctor-upcoming-grid">
                  {topUpcomingAppointments.map((appt) => (
                    <div key={appt._id} className="doctor-appointment-card">
                      <div className="doctor-appointment-head">
                        <div className="doctor-patient-meta">
                          <div className="doctor-avatar-initials">{getInitials(appt.patientId?.name)}</div>
                          <div>
                            <h4>{appt.patientId?.name || 'Unknown Patient'}</h4>
                            <p>{appt.time} • {formatDisplayDate(appt.date)}</p>
                          </div>
                        </div>
                        <span className={`doctor-status doctor-status-${appt.status}`}>
                          {appt.status}
                        </span>
                      </div>

                      <div className="doctor-appointment-actions">
                        {appt.status === 'pending' && (
                          <>
                            <button onClick={() => handleUpdateAppointment(appt._id, 'confirmed')}>Confirm</button>
                            <button className="ghost" onClick={() => handleUpdateAppointment(appt._id, 'cancelled')}>Cancel</button>
                          </>
                        )}
                        {appt.status === 'confirmed' && (
                          <>
                            <button onClick={() => handleUpdateAppointment(appt._id, 'completed')}>Mark Complete</button>
                            <button className="ghost" onClick={() => openChat(appt._id)}>Chat</button>
                          </>
                        )}
                        <button className="iconish" onClick={() => openNotesModal(appt)}>Notes</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section id="previous" className="doctor-section">
            <div className="doctor-section-header doctor-section-header-compact">
              <h2>Previous Appointments</h2>
              <div className="doctor-scroll-controls" aria-label="Scroll previous appointments">
                <button type="button" className="doctor-scroll-button" onClick={() => scrollAppointmentList(previousScrollRef, 'left')} aria-label="Scroll previous appointments left">
                  ←
                </button>
                <button type="button" className="doctor-scroll-button" onClick={() => scrollAppointmentList(previousScrollRef, 'right')} aria-label="Scroll previous appointments right">
                  →
                </button>
              </div>
            </div>
            {topPreviousAppointments.length === 0 ? (
              <p className="doctor-loading-text">No previous appointments found</p>
            ) : (
              <div className="doctor-horizontal-scroll" ref={previousScrollRef}>
                <div className="doctor-history-grid">
                  {topPreviousAppointments.map((appt) => (
                    <div key={appt._id} className="doctor-history-card">
                      <div className="doctor-history-left">
                        <div className="doctor-avatar-initials compact">{getInitials(appt.patientId?.name)}</div>
                        <div>
                          <h5>{appt.patientId?.name || 'Unknown Patient'}</h5>
                          <p>{formatDisplayDate(appt.date)}, {appt.time}</p>
                        </div>
                      </div>
                      <button onClick={() => openNotesModal(appt)}>View Notes</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section id="finance" className="doctor-section">
            <div className="doctor-section-header">
              <h2>Finance Report</h2>
            </div>

            <div className="doctor-finance-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Date and Time</th>
                    <th>Fee</th>
                    <th className="right">Revenue (90%)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {financeData.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="doctor-loading-cell">No completed appointments found</td>
                    </tr>
                  ) : (
                    financeData.map((appt) => {
                      const fee = appt.consultationFee || 0;
                      const revenue = fee * 0.9;
                      return (
                        <tr key={appt._id}>
                          <td>{appt.patientId?.name || 'Unknown Patient'}</td>
                          <td>{formatDisplayDate(appt.date)}, {appt.time}</td>
                          <td>${fee.toFixed(2)}</td>
                          <td className="right strong">${revenue.toFixed(2)}</td>
                          <td><span className="doctor-status doctor-status-completed">Completed</span></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="2">Daily Totals</td>
                    <td className="strong">${financeTotals.totalFees.toFixed(2)}</td>
                    <td className="right strong">${financeTotals.totalRevenue.toFixed(2)}</td>
                    <td>{financeTotals.totalAppointments} appts</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
      </div>

      {showChatModal && (
        <div id="chatModal" className="doctor-modal-overlay">
          <div className="doctor-modal-content">
            <span className="doctor-modal-close" onClick={closeChat}>&times;</span>
            <h2>Chat with Patient</h2>
            <div id="chatMessages" className="doctor-chat-messages" ref={chatMessagesRef}>
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`doctor-message ${msg.senderType === 'doctor' ? 'sent' : 'received'}`}
                >
                  {msg.isFile ? (
                    <ChatFileDisplay fileUrl={msg.filePath || (import.meta.env.VITE_API_URL + '/chat/download/' + msg.fileName)} fileName={msg.originalFileName || msg.fileName} isWhiteText={msg.senderType === 'doctor'} />
                  ) : (
                    msg.message
                  )}
                </div>
              ))}
            </div>
            <div className="doctor-chat-input">
              <input
                type="text"
                id="messageInput"
                placeholder="Type your message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <input
                type="file"
                id="fileInput"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button onClick={() => document.getElementById('fileInput').click()} title="Upload File">
                📎
              </button>
              <button onClick={sendMessage}>Send</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Doctor Notes Modal */}
      {showNotesModal && (
        <div className="doctor-modal-overlay" onClick={closeNotesModal}>
          <div className="doctor-modal-content notes" onClick={(e) => e.stopPropagation()}>
            <h2 className="notes-title">
              Doctor Notes for {currentNotesAppointment?.patientId?.name}
            </h2>
            <p className="notes-subtitle">
              Date: {new Date(currentNotesAppointment?.date).toLocaleDateString()} at {currentNotesAppointment?.time}
            </p>
            
            <div className="notes-block">
              <label>
                Notes:
              </label>
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Enter your private notes about this patient/appointment..."
                className="notes-textarea"
              />
            </div>

            <div className="notes-block">
              <label>
                Attached Files:
              </label>
              {notesFiles.length > 0 ? (
                <div className="notes-files-list">
                  {notesFiles.map((file, index) => {
                    // Get file URL - supports both Cloudinary URLs and legacy local paths
                    const getFileUrl = () => {
                      if (file.path && file.path.startsWith('http')) return file.path; // Cloudinary URL
                      if (file.filename) {
                        const API = import.meta.env.VITE_API_URL;
                        return `${API}/uploads/doctorNotes/${file.filename}`; // Legacy local path
                      }
                      return '#';
                    };
                    
                    return (
                    <div key={file._id || index} className="notes-file-item">
                      <a 
                        href={getFileUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="notes-file-link"
                      >
                        📎 {file.originalName}
                      </a>
                      <button
                        onClick={() => deleteDoctorNotesFile(file._id)}
                        className="notes-delete-btn"
                      >
                        Delete
                      </button>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <p className="notes-empty">No files attached</p>
              )}
              
              <input
                type="file"
                id="doctorNotesFileInput"
                multiple
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                className="notes-file-input"
              />
              <p className="notes-help-text">
                You can upload up to 5 files (PDF, images, documents)
              </p>
            </div>

            <div className="notes-actions">
              <button onClick={closeNotesModal} className="notes-cancel-btn">
                Cancel
              </button>
              <button onClick={saveDoctorNotes} className="notes-save-btn">
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </DoctorLayoutShell>
  );
};

export default DoctorDashboard;