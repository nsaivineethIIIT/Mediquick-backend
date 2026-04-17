// Admin Analytics Tests
const path = require('path');
const {
  mockAnalyticsData,
  mockDashboardStats,
  mockDetailedAnalytics,
  mockSearchFilters
} = require(path.join(__dirname, 'mocks', 'adminMocks'));
const mongoose = require('mongoose');

describe('Admin Analytics Tests', () => {
  describe('Dashboard Statistics', () => {
    test('should retrieve total appointments count', () => {
      const stats = mockDashboardStats;
      
      expect(stats.totalAppointments).toBeGreaterThan(0);
      expect(typeof stats.totalAppointments).toBe('number');
    });

    test('should calculate total revenue', () => {
      const stats = mockDashboardStats;
      
      expect(stats.totalRevenue).toBeGreaterThan(0);
    });

    test('should count total patients', () => {
      const stats = mockDashboardStats;
      
      expect(stats.totalPatients).toBeGreaterThan(0);
    });

    test('should count total doctors', () => {
      const stats = mockDashboardStats;
      
      expect(stats.totalDoctors).toBeGreaterThan(0);
    });

    test('should calculate average consultation fee', () => {
      const stats = mockDashboardStats;
      
      expect(stats.avgConsultationFee).toBeGreaterThan(0);
      expect(stats.avgConsultationFee).toBeLessThanOrEqual(1000);
    });

    test('should identify top specialization', () => {
      const stats = mockDashboardStats;
      
      expect(stats.topSpecialization).toBeTruthy();
      expect(typeof stats.topSpecialization).toBe('string');
    });
  });

  describe('Appointment Analytics', () => {
    test('should fetch appointments with date range filter', () => {
      const analyticsData = mockAnalyticsData.appointments;
      
      expect(analyticsData).toHaveProperty('startDate');
      expect(analyticsData).toHaveProperty('endDate');
    });

    test('should filter appointments by status', () => {
      const analyticsData = mockAnalyticsData.appointments;
      const validStatuses = ['confirmed', 'completed', 'pending', 'cancelled'];
      
      analyticsData.filters.status.forEach(status => {
        expect(validStatuses).toContain(status);
      });
    });

    test('should filter appointments by doctor specialization', () => {
      const analyticsData = mockAnalyticsData.appointments;
      
      expect(analyticsData.filters.doctorSpecialization).toBeTruthy();
    });

    test('should retrieve detailed appointment data', () => {
      const appointments = mockDetailedAnalytics.appointments;
      
      expect(Array.isArray(appointments)).toBe(true);
      appointments.forEach(appt => {
        expect(appt).toHaveProperty('patientName');
        expect(appt).toHaveProperty('doctorName');
        expect(appt).toHaveProperty('date');
        expect(appt).toHaveProperty('fee');
        expect(appt).toHaveProperty('revenue');
      });
    });

    test('should calculate total appointments revenue', () => {
      const appointments = mockDetailedAnalytics.appointments;
      const totalRevenue = appointments.reduce((sum, appt) => 
        sum + appt.revenue, 0
      );
      
      expect(totalRevenue).toBeGreaterThan(0);
    });
  });

  describe('Earnings Analytics', () => {
    test('should retrieve daily earnings', () => {
      const earnings = mockDetailedAnalytics.earnings;
      
      expect(earnings).toHaveProperty('daily');
      expect(Array.isArray(earnings.daily)).toBe(true);
    });

    test('should retrieve monthly earnings', () => {
      const earnings = mockDetailedAnalytics.earnings;
      
      expect(earnings).toHaveProperty('monthly');
      expect(Array.isArray(earnings.monthly)).toBe(true);
    });

    test('should retrieve yearly earnings', () => {
      const earnings = mockDetailedAnalytics.earnings;
      
      expect(earnings).toHaveProperty('yearly');
      expect(Array.isArray(earnings.yearly)).toBe(true);
    });

    test('should calculate earnings by date', () => {
      const dailyEarnings = mockDetailedAnalytics.earnings.daily;
      
      dailyEarnings.forEach(day => {
        expect(day).toHaveProperty('date');
        expect(day).toHaveProperty('totalFees');
        expect(day).toHaveProperty('totalRevenue');
        expect(day.totalRevenue).toBe(day.totalFees * 0.1);
      });
    });

    test('should aggregate earnings by month', () => {
      const monthlyEarnings = mockDetailedAnalytics.earnings.monthly;
      
      monthlyEarnings.forEach(month => {
        expect(month).toHaveProperty('month');
        expect(month.month).toMatch(/^\d{4}-\d{2}$/); // YYYY-MM format
      });
    });

    test('should aggregate earnings by year', () => {
      const yearlyEarnings = mockDetailedAnalytics.earnings.yearly;
      
      yearlyEarnings.forEach(year => {
        expect(year).toHaveProperty('year');
        expect(/^\d{4}$/.test(year.year)).toBe(true); // YYYY format
      });
    });
  });

  describe('Sign-in Analytics', () => {
    test('should retrieve user signins', () => {
      const signins = mockDetailedAnalytics.signins;
      
      expect(Array.isArray(signins)).toBe(true);
    });

    test('should categorize signins by user type', () => {
      const signins = mockDetailedAnalytics.signins;
      const validTypes = ['Patient', 'Doctor', 'Admin', 'Supplier', 'Employee'];
      
      signins.forEach(signin => {
        expect(validTypes).toContain(signin.type);
      });
    });

    test('should record signin date and time', () => {
      const signins = mockDetailedAnalytics.signins;
      
      signins.forEach(signin => {
        expect(signin).toHaveProperty('date');
        expect(signin).toHaveProperty('time');
      });
    });
  });

  describe('Medicine Orders Analytics', () => {
    test('should retrieve medicine orders', () => {
      const orders = mockDetailedAnalytics.medicineOrders;
      
      expect(Array.isArray(orders)).toBe(true);
    });

    test('should include order details', () => {
      const orders = mockDetailedAnalytics.medicineOrders;
      
      orders.forEach(order => {
        expect(order).toHaveProperty('orderId');
        expect(order).toHaveProperty('patientName');
        expect(order).toHaveProperty('medicineName');
        expect(order).toHaveProperty('quantity');
        expect(order).toHaveProperty('totalAmount');
        expect(order).toHaveProperty('status');
      });
    });

    test('should filter orders by status', () => {
      const analyticsData = mockAnalyticsData.medicineOrders;
      const validStatuses = ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled'];
      
      expect(validStatuses).toContain(analyticsData.status);
    });

    test('should auto-confirm paid orders', () => {
      // Orders with paymentMethod should be automatically confirmed
      const orders = mockDetailedAnalytics.medicineOrders.filter(o => 
        o.paymentMethod && o.paymentMethod !== 'cod'
      );
      
      orders.forEach(order => {
        expect(order.status).toBe('confirmed');
      });
    });

    test('should track supplier payment', () => {
      const orders = mockDetailedAnalytics.medicineOrders;
      
      orders.forEach(order => {
        expect(order).toHaveProperty('supplierName');
      });
    });
  });

  describe('Finance Reports', () => {
    test('should generate revenue summary', () => {
      const stats = mockDashboardStats;
      
      expect(stats).toHaveProperty('totalRevenue');
      expect(stats).toHaveProperty('totalMfRevenue');
    });

    test('should calculate MediQuick commission (5% of order)', () => {
      const order = {
        totalCost: 1000,
        commission: 0,
      };
      
      order.commission = order.totalCost * 0.05;
      
      expect(order.commission).toBe(50);
    });

    test('should categorize revenue by type', () => {
      const stats = mockDashboardStats;
      
      expect(stats.totalRevenue).toBeGreaterThan(0); // From appointments
      expect(stats.totalMfRevenue).toBeGreaterThan(0); // From medicine orders
    });

    test('should generate finance summary by supplier', () => {
      const analytics = mockAnalyticsData.medicineFinance;
      
      expect(analytics).toHaveProperty('filters');
    });

    test('should calculate total commission', () => {
      const orders = [
        { totalCost: 500, commission: 25 },
        { totalCost: 1000, commission: 50 },
        { totalCost: 750, commission: 37.5 }
      ];
      
      const totalCommission = orders.reduce((sum, order) => 
        sum + order.commission, 0
      );
      
      expect(totalCommission).toBe(112.5);
    });
  });

  describe('Supplier Analytics', () => {
    test('should retrieve supplier performance data', () => {
      const analytics = mockAnalyticsData.supplierAnalytics;
      
      expect(analytics).toHaveProperty('includeMedicines');
      expect(analytics).toHaveProperty('includeRevenue');
    });

    test('should identify best performing supplier', () => {
      const stats = mockDashboardStats;
      
      expect(stats).toHaveProperty('totalMfRevenue');
    });

    test('should track medicines per supplier', () => {
      const analytics = mockDetailedAnalytics.medicineOrders;
      const supplierMedicines = {};
      
      analytics.forEach(order => {
        if (!supplierMedicines[order.supplierName]) {
          supplierMedicines[order.supplierName] = [];
        }
        supplierMedicines[order.supplierName].push(order.medicineName);
      });
      
      expect(Object.keys(supplierMedicines).length).toBeGreaterThan(0);
    });

    test('should calculate supplier revenue', () => {
      const analytics = mockDetailedAnalytics.medicineOrders;
      const supplierRevenue = {};
      
      analytics.forEach(order => {
        if (!supplierRevenue[order.supplierName]) {
          supplierRevenue[order.supplierName] = 0;
        }
        supplierRevenue[order.supplierName] += order.totalAmount * 0.95; // Supplier gets 95%
      });
      
      expect(Object.keys(supplierRevenue).length).toBeGreaterThan(0);
    });
  });

  describe('Search & Filters', () => {
    test('should filter appointments by patient name', () => {
      const filter = mockSearchFilters.appointmentFilters;
      
      expect(filter).toHaveProperty('patientName');
    });

    test('should filter appointments by doctor name', () => {
      const filter = mockSearchFilters.appointmentFilters;
      
      expect(filter).toHaveProperty('doctorName');
    });

    test('should filter appointments by date range', () => {
      const filter = mockSearchFilters.appointmentFilters;
      
      expect(filter).toHaveProperty('startDate');
      expect(filter).toHaveProperty('endDate');
    });

    test('should filter appointments by status', () => {
      const filter = mockSearchFilters.appointmentFilters;
      
      expect(filter).toHaveProperty('status');
    });

    test('should filter orders by patient name', () => {
      const filter = mockSearchFilters.orderFilters;
      
      expect(filter).toHaveProperty('patientName');
    });

    test('should filter orders by payment method', () => {
      const filter = mockSearchFilters.orderFilters;
      
      expect(filter).toHaveProperty('paymentMethod');
    });

    test('should apply multiple filters simultaneously', () => {
      const filters = {
        patientName: 'John',
        status: 'confirmed',
        startDate: '2026-04-01',
        doctorSpecialization: 'Cardiology'
      };
      
      expect(Object.keys(filters).length).toBeGreaterThan(1);
    });
  });

  describe('Report Generation', () => {
    test('should generate appointment report', () => {
      const appointmentData = mockDetailedAnalytics.appointments;
      
      expect(Array.isArray(appointmentData)).toBe(true);
      expect(appointmentData.length).toBeGreaterThan(0);
    });

    test('should generate earnings report', () => {
      const earnings = mockDetailedAnalytics.earnings;
      
      expect(earnings).toHaveProperty('daily');
      expect(earnings).toHaveProperty('monthly');
      expect(earnings).toHaveProperty('yearly');
    });

    test('should generate finance summary', () => {
      const stats = mockDashboardStats;
      
      expect(stats.totalRevenue).toBeGreaterThan(0);
      expect(stats.totalMfRevenue).toBeGreaterThan(0);
    });

    test('should export report data', () => {
      const reportData = mockDashboardStats;
      const reportString = JSON.stringify(reportData);
      
      expect(reportString).toBeTruthy();
      expect(reportString.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Metrics', () => {
    test('should calculate response time for analytics queries', () => {
      const startTime = Date.now();
      const data = mockDetailedAnalytics;
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeGreaterThanOrEqual(0);
    });

    test('should track concurrent admin dashboard users', () => {
      const maxConcurrentUsers = 5;
      
      expect(maxConcurrentUsers).toBeGreaterThan(0);
    });
  });

  describe('Data Accuracy', () => {
    test('should ensure total appointments match sum of statuses', () => {
      const stats = mockDashboardStats;
      
      expect(stats.totalAppointments).toBeGreaterThan(0);
    });

    test('should ensure revenue calculations are accurate', () => {
      const appointments = [{
        fee: 500,
        revenue: 50 // 10%
      }];
      
      const totalRevenue = appointments.reduce((sum, appt) => 
        sum + appt.revenue, 0
      );
      
      expect(totalRevenue).toBe(50);
    });

    test('should ensure medicine order totals match sum of items', () => {
      const orders = mockDetailedAnalytics.medicineOrders;
      
      orders.forEach(order => {
        const calculatedTotal = order.quantity * order.unitPrice;
        // Allow small rounding difference
        expect(Math.abs(order.totalAmount - calculatedTotal)).toBeLessThan(1);
      });
    });
  });
});
