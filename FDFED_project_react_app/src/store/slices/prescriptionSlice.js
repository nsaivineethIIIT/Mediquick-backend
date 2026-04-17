import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getToken, authenticatedFetch } from '../../utils/authUtils';

const BASE_URL = import.meta.env.VITE_API_URL;

// Thunks for Doctor
export const fetchDoctorPrescriptions = createAsyncThunk(
  'prescription/fetchDoctorPrescriptions',
  async (_, { rejectWithValue }) => {
    try {
      const result = await authenticatedFetch(`${BASE_URL}/prescription/doctor/prescriptions`, 'doctor');
      
      if (result.success && result.prescriptions) {
        return result.prescriptions;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchDoctorAppointmentsForPrescription = createAsyncThunk(
  'prescription/fetchDoctorAppointmentsForPrescription',
  async (_, { rejectWithValue }) => {
    try {
      const appointmentsData = await authenticatedFetch(`${BASE_URL}/doctor/api/appointments`, 'doctor');

      // Filter completed appointments from both upcoming and previous
      const completedAppointments = [
        ...(appointmentsData.upcoming || []).filter(appt => appt.status === 'completed'),
        ...(appointmentsData.previous || []).filter(appt => appt.status === 'completed')
      ];

      return completedAppointments;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createPrescription = createAsyncThunk(
  'prescription/createPrescription',
  async (prescriptionData, { rejectWithValue }) => {
    try {
      const result = await authenticatedFetch(
        `${BASE_URL}/prescription/doctor/prescriptions`,
        'doctor',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(prescriptionData)
        }
      );
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Thunks for Patient
export const fetchPatientPrescriptions = createAsyncThunk(
  'prescription/fetchPatientPrescriptions',
  async (_, { rejectWithValue }) => {
    try {
      const result = await authenticatedFetch(`${BASE_URL}/prescription/patient/prescriptions`, 'patient');
      
      if (result.success && result.prescriptions) {
        return result.prescriptions;
      } else if (result.prescriptions) {
        return result.prescriptions;
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Download prescription thunk (returns blob URL for download)
export const downloadPrescription = createAsyncThunk(
  'prescription/downloadPrescription',
  async ({ prescriptionId, userType }, { rejectWithValue }) => {
    try {
      const token = getToken();
      const endpoint = userType === 'doctor' 
        ? `${BASE_URL}/doctor/prescriptions/download/${prescriptionId}`
        : `${BASE_URL}/patient/prescriptions/download/${prescriptionId}`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download prescription');
      }

      const blob = await response.blob();

      // Check if it's actually a PDF
      if (blob.type !== 'application/pdf') {
        const text = await blob.text();
        if (text.includes('<!doctype') || text.includes('<!DOCTYPE')) {
          throw new Error('Server returned HTML instead of PDF');
        }
      }

      // Create download URL
      const url = window.URL.createObjectURL(blob);
      
      // Trigger download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `prescription-${prescriptionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { success: true, prescriptionId };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Initial state
const initialState = {
  doctorPrescriptions: [],
  patientPrescriptions: [],
  completedAppointments: [],
  loading: {
    doctorPrescriptions: false,
    patientPrescriptions: false,
    completedAppointments: false,
    creating: false,
    downloading: false
  },
  errors: {
    doctorPrescriptions: null,
    patientPrescriptions: null,
    completedAppointments: null,
    creating: null,
    downloading: null
  },
  createSuccess: false
};

// Slice
const prescriptionSlice = createSlice({
  name: 'prescription',
  initialState,
  reducers: {
    clearError: (state, action) => {
      const errorKey = action.payload;
      if (errorKey && state.errors[errorKey]) {
        state.errors[errorKey] = null;
      }
    },
    clearCreateSuccess: (state) => {
      state.createSuccess = false;
    }
  },
  extraReducers: (builder) => {
    // Fetch doctor prescriptions
    builder
      .addCase(fetchDoctorPrescriptions.pending, (state) => {
        state.loading.doctorPrescriptions = true;
        state.errors.doctorPrescriptions = null;
      })
      .addCase(fetchDoctorPrescriptions.fulfilled, (state, action) => {
        state.loading.doctorPrescriptions = false;
        state.doctorPrescriptions = action.payload;
      })
      .addCase(fetchDoctorPrescriptions.rejected, (state, action) => {
        state.loading.doctorPrescriptions = false;
        state.errors.doctorPrescriptions = action.payload;
      });

    // Fetch doctor appointments for prescription
    builder
      .addCase(fetchDoctorAppointmentsForPrescription.pending, (state) => {
        state.loading.completedAppointments = true;
        state.errors.completedAppointments = null;
      })
      .addCase(fetchDoctorAppointmentsForPrescription.fulfilled, (state, action) => {
        state.loading.completedAppointments = false;
        state.completedAppointments = action.payload;
      })
      .addCase(fetchDoctorAppointmentsForPrescription.rejected, (state, action) => {
        state.loading.completedAppointments = false;
        state.errors.completedAppointments = action.payload;
      });

    // Create prescription
    builder
      .addCase(createPrescription.pending, (state) => {
        state.loading.creating = true;
        state.errors.creating = null;
        state.createSuccess = false;
      })
      .addCase(createPrescription.fulfilled, (state) => {
        state.loading.creating = false;
        state.createSuccess = true;
      })
      .addCase(createPrescription.rejected, (state, action) => {
        state.loading.creating = false;
        state.errors.creating = action.payload;
      });

    // Fetch patient prescriptions
    builder
      .addCase(fetchPatientPrescriptions.pending, (state) => {
        state.loading.patientPrescriptions = true;
        state.errors.patientPrescriptions = null;
      })
      .addCase(fetchPatientPrescriptions.fulfilled, (state, action) => {
        state.loading.patientPrescriptions = false;
        state.patientPrescriptions = action.payload;
      })
      .addCase(fetchPatientPrescriptions.rejected, (state, action) => {
        state.loading.patientPrescriptions = false;
        state.errors.patientPrescriptions = action.payload;
      });

    // Download prescription
    builder
      .addCase(downloadPrescription.pending, (state) => {
        state.loading.downloading = true;
        state.errors.downloading = null;
      })
      .addCase(downloadPrescription.fulfilled, (state) => {
        state.loading.downloading = false;
      })
      .addCase(downloadPrescription.rejected, (state, action) => {
        state.loading.downloading = false;
        state.errors.downloading = action.payload;
      });
  }
});

export const { clearError, clearCreateSuccess } = prescriptionSlice.actions;
export default prescriptionSlice.reducer;

// Selectors
export const selectDoctorPrescriptions = (state) => state.prescription.doctorPrescriptions;
export const selectPatientPrescriptions = (state) => state.prescription.patientPrescriptions;
export const selectCompletedAppointments = (state) => state.prescription.completedAppointments;
export const selectPrescriptionLoading = (state) => state.prescription.loading;
export const selectPrescriptionErrors = (state) => state.prescription.errors;
export const selectCreateSuccess = (state) => state.prescription.createSuccess;

// Derived selector: Get appointments without prescriptions
export const selectAppointmentsWithoutPrescriptions = (state) => {
  const appointments = state.prescription.completedAppointments;
  const prescriptions = state.prescription.doctorPrescriptions;
  
  // Create a Set of appointment IDs that already have prescriptions
  const appointmentIdsWithPrescriptions = new Set(
    prescriptions.map(prescription => prescription.appointmentId?._id || prescription.appointmentId)
  );
  
  // Filter out appointments that already have prescriptions
  return appointments.filter(
    appt => !appointmentIdsWithPrescriptions.has(appt._id)
  );
};
