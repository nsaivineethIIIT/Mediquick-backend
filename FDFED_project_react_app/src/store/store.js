import { configureStore } from '@reduxjs/toolkit';
import appointmentReducer from './slices/appointmentSlice';
import adminReducer from './slices/adminSlice';
import prescriptionReducer from './slices/prescriptionSlice';

const store = configureStore({
  reducer: {
    appointments: appointmentReducer,
    admin: adminReducer,
    prescription: prescriptionReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});

export default store;
