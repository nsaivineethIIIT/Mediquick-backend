// Mock data for admin analytics tests
const mongoose = require('mongoose');

const mockAnalyticsData = {
  appointments: {
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    filters: {
      status: ['confirmed', 'completed'],
      doctorSpecialization: 'Cardiology'
    }
  },
  earnings: {
    dateRange: {
      startDate: '2026-01-01',
      endDate: '2026-04-30'
    }
  },
  signins: {
    timeframe: 'last_30_days'
  },
  medicineOrders: {
    status: 'confirmed',
    dateRange: {
      startDate: '2026-01-01',
      endDate: '2026-04-30'
    }
  },
  medicineFinance: {
    filters: {
      status: 'confirmed',
      supplierFilter: null
    }
  },
  supplierAnalytics: {
    includeMedicines: true,
    includeRevenue: true
  },
  revenueAnalysis: {
    bySpecialization: true,
    byDate: true
  },
  appointmentsWithReviews: {
    minRating: 3,
    includeNegativeFeedback: true
  }
};

const mockDashboardStats = {
  totalAppointments: 150,
  totalRevenue: 45000,
  totalPatients: 85,
  totalDoctors: 12,
  totalOrders: 200,
  totalMfRevenue: 15000,
  avgConsultationFee: 500,
  topSpecialization: 'Cardiology'
};

const mockDetailedAnalytics = {
  appointments: [
    {
      _id: new mongoose.Types.ObjectId(),
      patientName: 'John Doe',
      doctorName: 'Dr. Smith',
      specialization: 'Cardiology',
      date: '2026-04-15',
      time: '10:00 AM',
      fee: 500,
      revenue: 50,
      status: 'completed'
    }
  ],
  earnings: {
    daily: [
      { date: '2026-04-01', count: 5, totalFees: 2500, totalRevenue: 250 }
    ],
    monthly: [
      { month: '2026-04', count: 100, totalFees: 50000, totalRevenue: 5000 }
    ],
    yearly: [
      { year: '2026', count: 300, totalFees: 150000, totalRevenue: 15000 }
    ]
  },
  signins: [
    {
      name: 'Patient 1',
      email: 'patient1@test.com',
      type: 'Patient',
      date: '04/15/2026',
      time: '10:30 AM'
    }
  ],
  medicineOrders: [
    {
      orderId: 'ORD-12345678',
      patientName: 'Jane Doe',
      medicineName: 'Aspirin',
      medicineCompany: 'Bayer',
      supplierName: 'Med Supplies Inc',
      quantity: 5,
      unitPrice: 150,
      totalAmount: 750,
      paymentMethod: 'CARD',
      status: 'confirmed',
      date: '2026-04-15'
    }
  ]
};

const mockSearchFilters = {
  appointmentFilters: {
    patientName: '',
    doctorName: '',
    startDate: '',
    endDate: '',
    status: '',
    specialization: ''
  },
  orderFilters: {
    patientName: '',
    medicineName: '',
    status: '',
    paymentMethod: ''
  },
  financeFilters: {
    supplierId: '',
    startDate: '',
    endDate: ''
  }
};

module.exports = {
  mockAnalyticsData,
  mockDashboardStats,
  mockDetailedAnalytics,
  mockSearchFilters
};
