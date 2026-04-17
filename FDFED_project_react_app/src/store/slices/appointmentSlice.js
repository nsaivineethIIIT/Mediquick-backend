import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getToken, authenticatedFetch } from '../../utils/authUtils';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Thunks for fetching doctors
export const fetchOfflineDoctors = createAsyncThunk(
  'appointments/fetchOfflineDoctors',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/patient/api/doctors/offline`, 'patient');
      return response;
    } catch (error) {
      // authenticatedFetch already handles navigation to error page
      return rejectWithValue(error.message);
    }
  }
);

export const fetchOnlineDoctors = createAsyncThunk(
  'appointments/fetchOnlineDoctors',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/patient/api/doctors/online`, 'patient');
      return response;
    } catch (error) {
      // authenticatedFetch already handles navigation to error page
      return rejectWithValue(error.message);
    }
  }
);

// Thunk for fetching doctor profile
export const fetchDoctorProfile = createAsyncThunk(
  'appointments/fetchDoctorProfile',
  async (doctorId, { rejectWithValue }) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/patient/api/doctor/${doctorId}`, 'patient');
      return response;
    } catch (error) {
      // authenticatedFetch already handles navigation to error page
      return rejectWithValue(error.message);
    }
  }
);

// Thunk for fetching booked slots
export const fetchBookedSlots = createAsyncThunk(
  'appointments/fetchBookedSlots',
  async ({ doctorId, date, type = 'offline', userType = 'patient' }, { rejectWithValue }) => {
    try {
      const bookedSlots = await authenticatedFetch(
        `${API_BASE_URL}/appointment/api/booked-slots?doctorId=${doctorId}&date=${date}&type=${type}`,
        userType
      );
      return { date, doctorId, bookedSlots };
    } catch (error) {
      // authenticatedFetch already handles navigation to error page
      return rejectWithValue(error.message);
    }
  }
);

// Thunk for booking an appointment
export const bookAppointment = createAsyncThunk(
  'appointments/bookAppointment',
  async (appointmentData, { rejectWithValue }) => {
    try {
      const result = await authenticatedFetch(
        `${API_BASE_URL}/appointment/appointments`,
        'patient',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(appointmentData)
        }
      );
      return result;
    } catch (error) {
      // authenticatedFetch already handles navigation to error page for network/5xx
      return rejectWithValue(error.message);
    }
  }
);

// Thunk for fetching patient appointments
export const fetchPatientAppointments = createAsyncThunk(
  'appointments/fetchPatientAppointments',
  async (type, { rejectWithValue }) => {
    try {
      const appointments = await authenticatedFetch(
        `${API_BASE_URL}/patient/api/patient/appointments/${type}`,
        'patient'
      );
      return { type, appointments };
    } catch (error) {
      // authenticatedFetch already handles navigation to error page
      return rejectWithValue(error.message);
    }
  }
);

// Thunk for canceling appointment (patient)
export const cancelAppointment = createAsyncThunk(
  'appointments/cancelAppointment',
  async (appointmentId, { rejectWithValue }) => {
    try {
      await authenticatedFetch(
        `${API_BASE_URL}/appointment/patient/${appointmentId}/cancel`,
        'patient',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      return appointmentId;
    } catch (error) {
      // authenticatedFetch already handles navigation to error page for network/5xx
      return rejectWithValue(error.message);
    }
  }
);

// Thunk for fetching doctor appointments
export const fetchDoctorAppointments = createAsyncThunk(
  'appointments/fetchDoctorAppointments',
  async (_, { rejectWithValue }) => {
    try {
      const data = await authenticatedFetch(
        `${API_BASE_URL}/appointment/doctor/appointments`,
        'doctor'
      );
      return {
        upcoming: data.upcoming || [],
        previous: data.previous || []
      };
    } catch (error) {
      // authenticatedFetch already handles navigation to error page
      return rejectWithValue(error.message);
    }
  }
);

// Thunk for updating appointment status (doctor)
export const updateAppointmentStatus = createAsyncThunk(
  'appointments/updateAppointmentStatus',
  async ({ appointmentId, status }, { rejectWithValue }) => {
    try {
      await authenticatedFetch(
        `${API_BASE_URL}/appointment/${appointmentId}`,
        'doctor',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status })
        }
      );
      return { appointmentId, status };
    } catch (error) {
      // authenticatedFetch already handles navigation to error page for network/5xx
      return rejectWithValue(error.message);
    }
  }
);

// Thunk for blocking a slot
export const blockSlot = createAsyncThunk(
  'appointments/blockSlot',
  async ({ date, time, doctorId }, { rejectWithValue }) => {
    try {
      await authenticatedFetch(
        `${API_BASE_URL}/appointment/api/block-slot`,
        'doctor',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ date, time, doctorId })
        }
      );
      return { date, time };
    } catch (error) {
      // authenticatedFetch already handles navigation to error page for network/5xx
      return rejectWithValue(error.message);
    }
  }
);

const appointmentSlice = createSlice({
  name: 'appointments',
  initialState: {
    // Doctor lists
    offlineDoctors: [],
    onlineDoctors: [],
    doctorsLoading: false,
    doctorsError: null,
    
    // Selected doctor profile
    selectedDoctor: null,
    doctorLoading: false,
    doctorError: null,
    
    // Booked slots
    bookedSlots: {}, // { doctorId-date: [slots] }
    slotsLoading: false,
    slotsError: null,
    
    // Booking
    bookingLoading: false,
    bookingError: null,
    bookingSuccess: false,
    
    // Patient appointments
    patientAppointments: {
      upcoming: [],
      previous: []
    },
    patientAppointmentsLoading: false,
    patientAppointmentsError: null,
    
    // Doctor appointments
    doctorAppointments: {
      upcoming: [],
      previous: []
    },
    doctorAppointmentsLoading: false,
    doctorAppointmentsError: null,
    
    // Filters
    filters: {
      searchQuery: '',
      specialization: '',
      location: '',
      availability: '',
      consultationCost: ''
    }
  },
  reducers: {
    // Filter actions
    setSearchQuery: (state, action) => {
      state.filters.searchQuery = action.payload;
    },
    setSpecializationFilter: (state, action) => {
      state.filters.specialization = action.payload;
    },
    setLocationFilter: (state, action) => {
      state.filters.location = action.payload;
    },
    setAvailabilityFilter: (state, action) => {
      state.filters.availability = action.payload;
    },
    setConsultationCostFilter: (state, action) => {
      state.filters.consultationCost = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {
        searchQuery: '',
        specialization: '',
        location: '',
        availability: '',
        consultationCost: ''
      };
    },
    clearBookingStatus: (state) => {
      state.bookingSuccess = false;
      state.bookingError = null;
    },
    clearDoctorProfile: (state) => {
      state.selectedDoctor = null;
      state.doctorError = null;
    },
    resetAppointmentState: (state) => {
      // Reset all state to initial values
      state.offlineDoctors = [];
      state.onlineDoctors = [];
      state.doctorsLoading = false;
      state.doctorsError = null;
      state.selectedDoctor = null;
      state.doctorLoading = false;
      state.doctorError = null;
      state.bookedSlots = {};
      state.slotsLoading = false;
      state.slotsError = null;
      state.bookingLoading = false;
      state.bookingError = null;
      state.bookingSuccess = false;
      state.patientAppointments = { upcoming: [], previous: [] };
      state.patientAppointmentsLoading = false;
      state.patientAppointmentsError = null;
      state.doctorAppointments = { upcoming: [], previous: [] };
      state.doctorAppointmentsLoading = false;
      state.doctorAppointmentsError = null;
      state.filters = {
        searchQuery: '',
        specialization: '',
        location: '',
        availability: '',
        consultationCost: ''
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch offline doctors
      .addCase(fetchOfflineDoctors.pending, (state) => {
        state.doctorsLoading = true;
        state.doctorsError = null;
      })
      .addCase(fetchOfflineDoctors.fulfilled, (state, action) => {
        state.doctorsLoading = false;
        state.offlineDoctors = action.payload;
      })
      .addCase(fetchOfflineDoctors.rejected, (state, action) => {
        state.doctorsLoading = false;
        state.doctorsError = action.payload;
      })
      
      // Fetch online doctors
      .addCase(fetchOnlineDoctors.pending, (state) => {
        state.doctorsLoading = true;
        state.doctorsError = null;
      })
      .addCase(fetchOnlineDoctors.fulfilled, (state, action) => {
        state.doctorsLoading = false;
        state.onlineDoctors = action.payload;
      })
      .addCase(fetchOnlineDoctors.rejected, (state, action) => {
        state.doctorsLoading = false;
        state.doctorsError = action.payload;
      })
      
      // Fetch doctor profile
      .addCase(fetchDoctorProfile.pending, (state) => {
        state.doctorLoading = true;
        state.doctorError = null;
      })
      .addCase(fetchDoctorProfile.fulfilled, (state, action) => {
        state.doctorLoading = false;
        state.selectedDoctor = action.payload;
      })
      .addCase(fetchDoctorProfile.rejected, (state, action) => {
        state.doctorLoading = false;
        state.doctorError = action.payload;
      })
      
      // Fetch booked slots
      .addCase(fetchBookedSlots.pending, (state) => {
        state.slotsLoading = true;
        state.slotsError = null;
      })
      .addCase(fetchBookedSlots.fulfilled, (state, action) => {
        state.slotsLoading = false;
        const { date, doctorId, bookedSlots } = action.payload;
        const key = `${doctorId}-${date}`;
        state.bookedSlots[key] = bookedSlots;
      })
      .addCase(fetchBookedSlots.rejected, (state, action) => {
        state.slotsLoading = false;
        state.slotsError = action.payload;
      })
      
      // Book appointment
      .addCase(bookAppointment.pending, (state) => {
        state.bookingLoading = true;
        state.bookingError = null;
        state.bookingSuccess = false;
      })
      .addCase(bookAppointment.fulfilled, (state) => {
        state.bookingLoading = false;
        state.bookingSuccess = true;
      })
      .addCase(bookAppointment.rejected, (state, action) => {
        state.bookingLoading = false;
        state.bookingError = action.payload;
      })
      
      // Fetch patient appointments
      .addCase(fetchPatientAppointments.pending, (state) => {
        state.patientAppointmentsLoading = true;
        state.patientAppointmentsError = null;
      })
      .addCase(fetchPatientAppointments.fulfilled, (state, action) => {
        state.patientAppointmentsLoading = false;
        const { type, appointments } = action.payload;
        state.patientAppointments[type] = appointments;
      })
      .addCase(fetchPatientAppointments.rejected, (state, action) => {
        state.patientAppointmentsLoading = false;
        state.patientAppointmentsError = action.payload;
      })
      
      // Cancel appointment
      .addCase(cancelAppointment.fulfilled, (state, action) => {
        const appointmentId = action.payload;
        // Remove from upcoming and add to previous with cancelled status
        state.patientAppointments.upcoming = state.patientAppointments.upcoming.filter(
          appt => appt.id !== appointmentId
        );
      })
      
      // Fetch doctor appointments
      .addCase(fetchDoctorAppointments.pending, (state) => {
        state.doctorAppointmentsLoading = true;
        state.doctorAppointmentsError = null;
      })
      .addCase(fetchDoctorAppointments.fulfilled, (state, action) => {
        state.doctorAppointmentsLoading = false;
        state.doctorAppointments = action.payload;
      })
      .addCase(fetchDoctorAppointments.rejected, (state, action) => {
        state.doctorAppointmentsLoading = false;
        state.doctorAppointmentsError = action.payload;
      })
      
      // Update appointment status
      .addCase(updateAppointmentStatus.fulfilled, (state, action) => {
        const { appointmentId, status } = action.payload;
        
        // Update in upcoming appointments
        const upcomingIndex = state.doctorAppointments.upcoming.findIndex(
          appt => appt._id === appointmentId
        );
        if (upcomingIndex !== -1) {
          state.doctorAppointments.upcoming[upcomingIndex].status = status;
        }
        
        // Update in previous appointments
        const previousIndex = state.doctorAppointments.previous.findIndex(
          appt => appt._id === appointmentId
        );
        if (previousIndex !== -1) {
          state.doctorAppointments.previous[previousIndex].status = status;
        }
      })
      
      // Block slot
      .addCase(blockSlot.fulfilled, (state, action) => {
        // Slot blocking success - will be reflected when fetching slots again
        state.slotsError = null;
      });
  }
});

export const {
  setSearchQuery,
  setSpecializationFilter,
  setLocationFilter,
  setAvailabilityFilter,
  setConsultationCostFilter,
  clearFilters,
  clearBookingStatus,
  clearDoctorProfile,
  resetAppointmentState
} = appointmentSlice.actions;

export default appointmentSlice.reducer;
