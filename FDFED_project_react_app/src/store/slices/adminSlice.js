import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getToken, authenticatedFetch } from '../../utils/authUtils';

const BASE_URL = import.meta.env.VITE_API_URL;

// Thunks
export const fetchAdminAppointments = createAsyncThunk(
  'admin/fetchAppointments',
  async (_, { rejectWithValue }) => {
    try {
      const data = await authenticatedFetch(`${BASE_URL}/admin/api/appointments`, 'admin');
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAdminFinance = createAsyncThunk(
  'admin/fetchFinance',
  async (_, { rejectWithValue }) => {
    try {
      const data = await authenticatedFetch(`${BASE_URL}/admin/api/finance`, 'admin');
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAdminEarnings = createAsyncThunk(
  'admin/fetchEarnings',
  async (_, { rejectWithValue }) => {
    try {
      const data = await authenticatedFetch(`${BASE_URL}/admin/api/earnings`, 'admin');
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAdminRevenueSummary = createAsyncThunk(
  'admin/fetchRevenueSummary',
  async (_, { rejectWithValue }) => {
    try {
      const data = await authenticatedFetch(`${BASE_URL}/admin/api/revenue-summary`, 'admin');
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Initial state
const initialState = {
  appointments: [],
  finance: [],
  earnings: {
    daily: [],
    monthly: [],
    yearly: []
  },
  revenueSummary: {
    summary: {
      totalAppointments: 0,
      totalRevenue: 0,
      totalDoctorFees: 0,
      averageAppointmentFee: 0
    },
    bySpecialization: []
  },
  loading: {
    appointments: false,
    finance: false,
    earnings: false,
    revenueSummary: false
  },
  errors: {
    appointments: null,
    finance: null,
    earnings: null,
    revenueSummary: null
  }
};

// Slice
const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearError: (state, action) => {
      const errorKey = action.payload;
      if (errorKey && state.errors[errorKey]) {
        state.errors[errorKey] = null;
      }
    }
  },
  extraReducers: (builder) => {
    // Fetch appointments
    builder
      .addCase(fetchAdminAppointments.pending, (state) => {
        state.loading.appointments = true;
        state.errors.appointments = null;
      })
      .addCase(fetchAdminAppointments.fulfilled, (state, action) => {
        state.loading.appointments = false;
        state.appointments = action.payload;
      })
      .addCase(fetchAdminAppointments.rejected, (state, action) => {
        state.loading.appointments = false;
        state.errors.appointments = action.payload;
      });

    // Fetch finance
    builder
      .addCase(fetchAdminFinance.pending, (state) => {
        state.loading.finance = true;
        state.errors.finance = null;
      })
      .addCase(fetchAdminFinance.fulfilled, (state, action) => {
        state.loading.finance = false;
        state.finance = action.payload;
      })
      .addCase(fetchAdminFinance.rejected, (state, action) => {
        state.loading.finance = false;
        state.errors.finance = action.payload;
      });

    // Fetch earnings
    builder
      .addCase(fetchAdminEarnings.pending, (state) => {
        state.loading.earnings = true;
        state.errors.earnings = null;
      })
      .addCase(fetchAdminEarnings.fulfilled, (state, action) => {
        state.loading.earnings = false;
        state.earnings = action.payload;
      })
      .addCase(fetchAdminEarnings.rejected, (state, action) => {
        state.loading.earnings = false;
        state.errors.earnings = action.payload;
      });

    // Fetch revenue summary
    builder
      .addCase(fetchAdminRevenueSummary.pending, (state) => {
        state.loading.revenueSummary = true;
        state.errors.revenueSummary = null;
      })
      .addCase(fetchAdminRevenueSummary.fulfilled, (state, action) => {
        state.loading.revenueSummary = false;
        state.revenueSummary = action.payload;
      })
      .addCase(fetchAdminRevenueSummary.rejected, (state, action) => {
        state.loading.revenueSummary = false;
        state.errors.revenueSummary = action.payload;
      });
  }
});

export const { clearError } = adminSlice.actions;
export default adminSlice.reducer;

// Selectors
export const selectAdminAppointments = (state) => state.admin.appointments;
export const selectAdminFinance = (state) => state.admin.finance;
export const selectAdminEarnings = (state) => state.admin.earnings;
export const selectAdminRevenueSummary = (state) => state.admin.revenueSummary;
export const selectAdminLoading = (state) => state.admin.loading;
export const selectAdminErrors = (state) => state.admin.errors;

// Derived selectors for AdminSearchData
export const selectUniqueDoctors = (state) => {
  const doctorMap = new Map();
  state.admin.appointments.forEach(appt => {
    if (appt.doctorId && appt.doctorName) {
      if (!doctorMap.has(appt.doctorId)) {
        doctorMap.set(appt.doctorId, {
          id: appt.doctorId,
          name: appt.doctorName,
          specialization: appt.specialization || 'General Physician'
        });
      }
    }
  });
  return Array.from(doctorMap.values());
};

export const selectUniqueSpecializations = (state) => {
  const specSet = new Set();
  state.admin.appointments.forEach(appt => {
    const spec = appt.specialization || 'General Physician';
    specSet.add(spec);
  });
  return Array.from(specSet).sort();
};

export const selectDoctorEarnings = (state, doctorId) => {
  if (!doctorId) return [];
  
  const doctorAppointments = state.admin.appointments.filter(appt => 
    appt.doctorId === doctorId
  );

  // Group by date
  const earningsByDate = {};
  doctorAppointments.forEach(appt => {
    const date = appt.date;
    if (!earningsByDate[date]) {
      earningsByDate[date] = {
        date: date,
        count: 0,
        totalFees: 0,
        totalRevenue: 0
      };
    }
    
    earningsByDate[date].count++;
    earningsByDate[date].totalFees += appt.fee || 0;
    earningsByDate[date].totalRevenue += appt.revenue || 0;
  });

  // Convert to array and sort by date (newest first)
  return Object.values(earningsByDate).sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );
};

export const selectSpecializationEarnings = (state, specialization) => {
  if (!specialization) return [];
  
  const specAppointments = state.admin.appointments.filter(appt => 
    (appt.specialization || 'General Physician') === specialization
  );

  // Group by date
  const earningsByDate = {};
  specAppointments.forEach(appt => {
    const date = appt.date;
    if (!earningsByDate[date]) {
      earningsByDate[date] = {
        date: date,
        count: 0,
        totalFees: 0,
        totalRevenue: 0
      };
    }
    
    earningsByDate[date].count++;
    earningsByDate[date].totalFees += appt.fee || 0;
    earningsByDate[date].totalRevenue += appt.revenue || 0;
  });

  // Convert to array and sort by date (newest first)
  return Object.values(earningsByDate).sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );
};

export const selectAppointmentsByDateRange = (state, startDate, endDate, doctorId = '', specialization = '') => {
  if (!startDate || !endDate) return [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return state.admin.appointments.filter(appt => {
    const appointmentDate = new Date(appt.date);
    const dateMatch = appointmentDate >= start && appointmentDate <= end;
    
    // Apply doctor filter if specified (appointments have flattened doctorId)
    const doctorMatch = !doctorId || appt.doctorId === doctorId;
    
    // Apply specialization filter if specified (appointments have flattened specialization)
    const specializationMatch = !specialization || appt.specialization === specialization;
    
    return dateMatch && doctorMatch && specializationMatch;
  });
};
