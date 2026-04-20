import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import '../../assets/css/AdminDashboard.css';
// import Footer from '../common/Footer';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { getToken, removeToken } from '../../utils/authUtils';
import { 
  fetchAdminAppointments, 
  fetchAdminFinance, 
  fetchAdminEarnings, 
  fetchAdminRevenueSummary,
  selectAdminAppointments,
  selectAdminFinance,
  selectAdminEarnings,
  selectAdminRevenueSummary,
  selectAdminLoading,
  selectAdminErrors
} from '../../store/slices/adminSlice';
import DashboardGlobalSearch from '../common/DashboardGlobalSearch';
const AdminDashboard = () => {
  const { admin, logout } = useAdmin();
  const dispatch = useDispatch();
  
  // Redux state for appointment/financial sections
  const appointments = useSelector(selectAdminAppointments);
  const financeData = useSelector(selectAdminFinance);
  const earningsData = useSelector(selectAdminEarnings);
  const revenueSummary = useSelector(selectAdminRevenueSummary);
  const adminLoading = useSelector(selectAdminLoading);
  const adminErrors = useSelector(selectAdminErrors);
  
  // Local state for other sections
  const [activeSection, setActiveSection] = useState('users');
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [filterValue, setFilterValue] = useState('');
  const [signins, setSignins] = useState([]);
  const [medicineOrders, setMedicineOrders] = useState([]);
  const [medicineFinance, setMedicineFinance] = useState({ rows: [], totals: { totalAmount: 0, totalCommission: 0 } });
  const [supplierAnalytics, setSupplierAnalytics] = useState({
    analytics: {
      mostSellingMedicine: null,
      bestSupplier: null,
      medicineSuppliers: [],
      supplierMedicines: []
    },
    totals: { totalMedicines: 0, totalSuppliers: 0, totalConfirmedOrders: 0 }
  });
  const [supplierFilters, setSupplierFilters] = useState({
    selectedSupplier: '',
    selectedMedicine: '',
    viewMode: 'medicines-suppliers' // 'medicines-suppliers' or 'suppliers-medicines'
  });
  const [reviews, setReviews] = useState([]);
  const [employeeRequests, setEmployeeRequests] = useState([]);

 
  const [loading, setLoading] = useState({
    users: true,
    signins: true,
    medicineOrders: true,
    medicineFinance: true,
    supplierAnalytics: true,
    reviews: true,
    employees: true,
  });
  const [error, setError] = useState('');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_API_URL;

  const buildDocumentUrl = (documentPath, download = false) => {
    if (!documentPath) return '';

    const query = new URLSearchParams({ documentPath });
    if (download) {
      query.set('download', '1');
    }

    return `${BASE_URL}/employee/api/serve-document?${query.toString()}`;
  };

  // Check if response is JSON before parsing
  const parseResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Expected JSON but got: ${text.substring(0, 100)}...`);
    }
  };

  // Fetch Redux data on component mount
  useEffect(() => {
    dispatch(fetchAdminAppointments());
    dispatch(fetchAdminFinance());
    dispatch(fetchAdminEarnings());
    dispatch(fetchAdminRevenueSummary());
  }, [dispatch]);

  // Fetch all data on component mount
  useEffect(() => {
    // Fetch local state data
    fetchUsers();
    fetchSignins();
    fetchMedicineFinanceData();
    fetchMedicineOrders();
    fetchSupplierAnalytics();
    fetchReviews();
    fetchEmployeeRequests();
  }, []);

  // Filter users when filters change
  useEffect(() => {
    filterUsers();
  }, [allUsers, userTypeFilter, filterValue]);

  // Header scroll handler removed since header is not present

  // API Functions with better error handling
  const fetchUsers = async () => {
    try {
      setLoading(prev => ({ ...prev, users: true }));
      setError('');
      
      const token = getToken('admin');
      const response = await fetch(`${BASE_URL}/admin/users`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          removeToken('admin');
          window.location.href = '/admin/form?error=login_required';
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await parseResponse(response);
      setAllUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(`Failed to load users: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  };

  const fetchSignins = async () => {
    try {
      setLoading(prev => ({ ...prev, signins: true }));
      setError('');
      
      const token = getToken('admin');
      const response = await fetch(`${BASE_URL}/admin/api/signins`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          removeToken('admin');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await parseResponse(response);
      setSignins(data);
    } catch (error) {
      console.error('Error fetching signins:', error);
      setError(`Failed to load signins: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, signins: false }));
    }
  };

  // Redux now handles fetching appointments, finance, earnings, and revenue summary

  // Fetch Medicine Orders
  const fetchMedicineOrders = async () => {
    try {
      setLoading(prev => ({ ...prev, medicineOrders: true }));
      setError('');
      
      const token = getToken('admin');
      const response = await fetch(`${BASE_URL}/admin/api/medicine-orders`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          removeToken('admin');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await parseResponse(response);
      // Extract the data array from the response
      const ordersData = responseData.data || [];
      setMedicineOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (error) {
      console.error('Error fetching medicine orders:', error);
      setError(`Failed to load medicine orders: ${error.message}`);
      setMedicineOrders([]); // Reset to empty array on error
    } finally {
      setLoading(prev => ({ ...prev, medicineOrders: false }));
    }
  };

  // NEW: Fetch Medicine Finance Data
  const fetchMedicineFinanceData = async () => {
    setLoading(prev => ({ ...prev, medicineFinance: true }));
    try {
      const token = getToken('admin');
      const response = await fetch(`${BASE_URL}/admin/api/medicine-finance`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await parseResponse(response);
      // Ensure proper structure for medicine finance data
      const financeData = data || { rows: [], totals: { totalAmount: 0, totalCommission: 0 } };
      setMedicineFinance(financeData);
    } catch (error) {
      console.error('Error fetching medicine finance data:', error);
      setMedicineFinance({ rows: [], totals: { totalAmount: 0, totalCommission: 0 } }); // Reset on error
    } finally {
      setLoading(prev => ({ ...prev, medicineFinance: false }));
    }
  };

  // Fetch Supplier Analytics
  const fetchSupplierAnalytics = async () => {
    setLoading(prev => ({ ...prev, supplierAnalytics: true }));
    try {
      const token = getToken('admin');
      const response = await fetch(`${BASE_URL}/admin/api/supplier-analytics`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await parseResponse(response);
      setSupplierAnalytics(data);
    } catch (error) {
      console.error('Error fetching supplier analytics:', error);
      setSupplierAnalytics({
        analytics: {
          mostSellingMedicine: null,
          bestSupplier: null,
          medicineSuppliers: [],
          supplierMedicines: []
        },
        totals: { totalMedicines: 0, totalSuppliers: 0, totalConfirmedOrders: 0 }
      });
    } finally {
      setLoading(prev => ({ ...prev, supplierAnalytics: false }));
    }
  };

  // Fetch Reviews
  const fetchReviews = async () => {
    setLoading(prev => ({ ...prev, reviews: true }));
    try {
      const response = await fetch(`${BASE_URL}/review/all`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await parseResponse(response);
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    } finally {
      setLoading(prev => ({ ...prev, reviews: false }));
    }
  };

  const handleApproveReview = async (reviewId) => {
    try {
      const token = getToken('admin');
      const response = await fetch(`${BASE_URL}/review/approve/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await parseResponse(response);
      
      if (response.ok) {
        alert(data.message);
        fetchReviews(); // Refresh reviews list
      } else {
        alert(data.message || 'Failed to approve review');
      }
    } catch (error) {
      console.error('Error approving review:', error);
      alert('Failed to approve review. Please try again.');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      const token = getToken('admin');
      const response = await fetch(`${BASE_URL}/review/delete/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await parseResponse(response);
      
      if (response.ok) {
        alert(data.message);
        fetchReviews(); // Refresh reviews list
      } else {
        alert(data.message || 'Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review. Please try again.');
    }
  };

  // Fetch Employee Requests
  const fetchEmployeeRequests = async () => {
    setLoading(prev => ({ ...prev, employees: true }));
    try {
      const token = getToken('admin');
      const response = await fetch(`${BASE_URL}/admin/api/employee-requests`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          removeToken('admin');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await parseResponse(response);
      setEmployeeRequests(data.employees || []);
    } catch (error) {
      console.error('Error fetching employee requests:', error);
      setEmployeeRequests([]);
    } finally {
      setLoading(prev => ({ ...prev, employees: false }));
    }
  };

  const handleApproveEmployee = async (employeeId, employeeName) => {
    if (!confirm(`Are you sure you want to approve ${employeeName}?`)) {
      return;
    }

    try {
      const token = getToken('admin');
      const response = await fetch(`${BASE_URL}/admin/approve_employee/${employeeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        removeToken('admin');
        navigate('/admin/form');
        return;
      }

      const data = await parseResponse(response);
      
      if (response.ok) {
        alert(`Employee ${employeeName} approved successfully!`);
        fetchEmployeeRequests(); // Refresh employee requests list
      } else {
        alert(data.message || 'Failed to approve employee');
      }
    } catch (error) {
      console.error('Error approving employee:', error);
      alert('Failed to approve employee. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      // Use context logout
      logout();
    } catch (error) {
      console.error('Error logging out:', error);
      // Even if there's an error, navigate to admin form
      window.location.href = '/admin/form';
    }
  };

  // User Management Functions
  const filterUsers = () => {
    let filtered = allUsers;

    if (userTypeFilter !== 'all') {
      filtered = filtered.filter(user => user.type.toLowerCase() === userTypeFilter);
    }

    if (filterValue) {
      filtered = filtered.filter(user => {
        const searchValue = filterValue.toLowerCase();
        switch (user.type.toLowerCase()) {
          case 'patient':
          case 'employee':
          case 'admin':
            return user.email?.toLowerCase().includes(searchValue);
          case 'doctor':
            return user.registrationNumber?.toLowerCase().includes(searchValue);
          case 'supplier':
            return user.supplierID?.toLowerCase().includes(searchValue);
          default:
            return true;
        }
      });
    }

    setFilteredUsers(filtered);
  };

  const deleteUser = async (type, id) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const token = getToken('admin');
      const response = await fetch(`${BASE_URL}/admin/users/${type}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await parseResponse(response);

      if (response.ok) {
        alert(result.message);
        await fetchUsers(); // Refresh users list
      } else {
        alert(result.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  const clearFilters = () => {
    setUserTypeFilter('all');
    setFilterValue('');
  };

  const getFilterPlaceholder = () => {
    switch (userTypeFilter) {
      case 'patient':
      case 'employee':
        return 'Filter by email...';
      case 'doctor':
        return 'Filter by registration number...';
      case 'supplier':
        return 'Filter by supplier ID...';
      default:
        return 'Enter filter value...';
    }
  };

  const getFilterDisplayValue = (user) => {
    switch (user.type.toLowerCase()) {
      case 'patient':
      case 'employee':
      case 'admin':
        return user.email;
      case 'doctor':
        return user.registrationNumber || 'N/A';
      case 'supplier':
        return user.supplierID || 'N/A';
      default:
        return 'N/A';
    }
  };

  // Calculate totals for finance data
  const calculateFinanceTotals = () => {
    const totals = financeData.reduce((acc, transaction) => ({
      totalFees: acc.totalFees + (transaction.fee || 0),
      totalRevenue: acc.totalRevenue + (transaction.revenue || 0)
    }), { totalFees: 0, totalRevenue: 0 });

    return totals;
  };

  const financeTotals = calculateFinanceTotals();

  // Retry all data fetching
  const retryFetchData = () => {
    setError('');
    fetchUsers();
    fetchSignins();
    dispatch(fetchAdminAppointments());
    dispatch(fetchAdminFinance());
    dispatch(fetchAdminEarnings());
    dispatch(fetchAdminRevenueSummary());
    fetchMedicineFinanceData();
    fetchMedicineOrders();
    fetchSupplierAnalytics();
    fetchReviews();
    fetchEmployeeRequests();
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Format currency (INR) for Medicine Finance
  const formatCurrencyINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US');
  };

  // Toggle mobile navigation
  const toggleMobileNav = () => {
    setIsNavOpen(!isNavOpen);
  };

  // Scroll to section
  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    setIsNavOpen(false);
  };

  return (
    <div className="admin-dashboard">
      {/* Header removed to avoid duplicate header */}

      <div className="dashboard-container">
        {/* Navigation Sidebar */}
        <nav className="dashboard-nav">
          <div className="dashboard-brand">
            <h2>MediQuick</h2>
          </div>

          <ul>
            <li>
              <Link to="/" className="nav-link home-link">
                <span className="nav-symbol">🏠</span>
                <span className="nav-label">Home</span>
              </Link>
            </li>
            <li>
              <button 
                className={activeSection === 'users' ? 'active' : ''}
                onClick={() => setActiveSection('users')}
              >
                <span className="nav-symbol">👥</span>
                <span className="nav-label">Users</span>
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'signins' ? 'active' : ''}
                onClick={() => setActiveSection('signins')}
              >
                <span className="nav-symbol">🔐</span>
                <span className="nav-label">Sign-Ins</span>
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'appointments' ? 'active' : ''}
                onClick={() => setActiveSection('appointments')}
              >
                <span className="nav-symbol">📅</span>
                <span className="nav-label">Appointments</span>
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'finance' ? 'active' : ''}
                onClick={() => setActiveSection('finance')}
              >
                <span className="nav-symbol">💳</span>
                <span className="nav-label">Finance</span>
              </button>
            </li>
             <li>
              <button 
                className={activeSection === 'medicine-finance' ? 'active' : ''}
                onClick={() => setActiveSection('medicine-finance')}
              >
                <span className="nav-symbol">💊</span>
                <span className="nav-label">Medicine Finance</span>
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'supplier-analytics' ? 'active' : ''}
                onClick={() => setActiveSection('supplier-analytics')}
              >
                <span className="nav-symbol">📊</span>
                <span className="nav-label">Supplier Analytics</span>
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'earnings' ? 'active' : ''}
                onClick={() => setActiveSection('earnings')}
              >
                <span className="nav-symbol">💰</span>
                <span className="nav-label">Earnings</span>
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'medicineOrders' ? 'active' : ''}
                onClick={() => setActiveSection('medicineOrders')}
              >
                <span className="nav-symbol">📦</span>
                <span className="nav-label">Medicine Orders</span>
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'reviews' ? 'active' : ''}
                onClick={() => setActiveSection('reviews')}
              >
                <span className="nav-symbol">⭐</span>
                <span className="nav-label">Reviews</span>
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'employeeApproval' ? 'active' : ''}
                onClick={() => setActiveSection('employeeApproval')}
              >
                <span className="nav-symbol">✅</span>
                <span className="nav-label">Approvals</span>
              </button>
            </li>
            <li>
              <Link to="/admin/doctor-analytics" className="nav-link">
                <span className="nav-symbol">🩺</span>
                <span className="nav-label">Doctor Analytics</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/patient-analytics" className="nav-link">
                <span className="nav-symbol">📈</span>
                <span className="nav-label">Patient Analytics</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/search-data" className="nav-link">
                <span className="nav-symbol">🔎</span>
                <span className="nav-label">Search Data</span>
              </Link>
            </li>
            <li>
              <Link to="/admin/profile" className="nav-link">
                <span className="nav-symbol">👤</span>
                <span className="nav-label">Profile</span>
              </Link>
            </li>
            <li>
              <button onClick={handleLogout} className="nav-link logout" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                <span className="nav-symbol">↩</span>
                <span className="nav-label">Logout</span>
              </button>
            </li>
          </ul>
        </nav>

        {/* Main Content */}
        <main className="dashboard-content">
          <div className="dashboard-topbar">
            <div>
              <h1>Dashboard Overview</h1>
              <p>Manage operations, approvals, finance, and analytics in one place.</p>
            </div>
            <div className="dashboard-admin-chip">
              <span>{admin?.name || 'Administrator'}</span>
            </div>
          </div>

          <div className="dashboard-search-wrap">
            <DashboardGlobalSearch role="admin" />
          </div>
          {/* Error Display */}
          {error && (
            <div className="error-banner">
              <p>{error}</p>
              <button onClick={retryFetchData} className="retry-btn">
                Retry
              </button>
              <button onClick={() => navigate('/admin/form')} className="login-btn">
                Go to Login
              </button>
            </div>
          )}

          {/* Users Section */}
          {activeSection === 'users' && (
            <section className="section users-section">
              <h1 className="heading">Manage Users</h1>
              <div className="table-container">
                <div className="filter-container">
                  <select 
                    value={userTypeFilter}
                    onChange={(e) => setUserTypeFilter(e.target.value)}
                  >
                    <option value="all">All Users</option>
                    <option value="patient">Patients</option>
                    <option value="doctor">Doctors</option>
                    <option value="supplier">Suppliers</option>
                    <option value="employee">Employees</option>
                    <option value="admin">Admins</option>
                  </select>
                  <input 
                    type="text"
                    placeholder={getFilterPlaceholder()}
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                  />
                  <button onClick={clearFilters}>Clear Filters</button>
                </div>
                
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Filter Value</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading.users ? (
                      <tr>
                        <td colSpan="4" className="loading">Loading data...</td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="4">No users found</td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => (
                        <tr key={`${user.type}-${user._id}`}>
                          <td>{user.name}</td>
                          <td>{user.type}</td>
                          <td>{getFilterDisplayValue(user)}</td>
                          <td>
                            <button 
                              className="delete-btn"
                              onClick={() => deleteUser(user.type, user._id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Signins Section */}
          {activeSection === 'signins' && (
            <section className="section signins-section">
              <h1 className="heading">Recent SignIns</h1>
              <div className="table-container">
                <table className="signins-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Email</th>
                      <th>Date</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading.signins ? (
                      <tr>
                        <td colSpan="5" className="loading">Loading data...</td>
                      </tr>
                    ) : signins.length === 0 ? (
                      <tr>
                        <td colSpan="5">No signins found</td>
                      </tr>
                    ) : (
                      signins.map((signin, index) => (
                        <tr key={index}>
                          <td>{signin.name}</td>
                          <td>{signin.type}</td>
                          <td>{signin.email}</td>
                          <td>{signin.date}</td>
                          <td>{signin.time}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Appointments Section */}
          {activeSection === 'appointments' && (
            <section className="section appointments-section">
              <h1 className="heading">Appointments</h1>
              <div className="table-container">
                <table className="appointments-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Specialization</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Fee</th>
                      <th>Revenue (10%)</th>
                      <th>Status</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminLoading.appointments ? (
                      <tr>
                        <td colSpan="9" className="loading">Loading appointments...</td>
                      </tr>
                    ) : appointments.length === 0 ? (
                      <tr>
                        <td colSpan="9">No appointments found</td>
                      </tr>
                    ) : (
                      appointments.map(appt => (
                        <tr key={appt._id}>
                          <td>{appt.patientName || 'Unknown Patient'}</td>
                          <td>{appt.doctorName || 'Unknown Doctor'}</td>
                          <td>{appt.specialization || 'General Physician'}</td>
                          <td>{formatDate(appt.date)}</td>
                          <td>{appt.time || 'N/A'}</td>
                          <td>{formatCurrency(appt.fee)}</td>
                          <td>{formatCurrency(appt.revenue)}</td>
                          <td>
                            <span className={`status ${appt.status || 'pending'}`}>
                              {appt.status || 'Pending'}
                            </span>
                          </td>
                          <td>
                            <span className={`status ${appt.paymentStatus || 'pending'}`} style={{
                              background: appt.paymentStatus === 'paid' ? '#e8f5e9' : appt.paymentStatus === 'refunded' ? '#fff3e0' : '#f5f5f5',
                              color: appt.paymentStatus === 'paid' ? '#2e7d32' : appt.paymentStatus === 'refunded' ? '#e65100' : '#757575',
                              padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600
                            }}>
                              {appt.paymentStatus || 'pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Appointment Finance Section */}
          {activeSection === 'finance' && (
            <section className="section finance-section">
              <h1 className="heading">Appointment Finance</h1>
              <div className="table-container">
                <div className="finance-summary">
                  <div className="summary-cards">
                    <div className="card">
                      <h3>Total Appointments</h3>
                      <p>{revenueSummary.summary?.totalAppointments || 0}</p>
                    </div>
                    <div className="card">
                      <h3>Total Fees</h3>
                      <p>{formatCurrency(revenueSummary.summary?.totalFees)}</p>
                    </div>
                    <div className="card">
                      <h3>Total Revenue</h3>
                      <p>{formatCurrency(revenueSummary.summary?.totalRevenue)}</p>
                    </div>
                  </div>
                </div>

                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Specialization</th>
                      <th>Date</th>
                      <th>Fee</th>
                      <th>MediQuick Revenue</th>
                      <th>Doctor Payout (90%)</th>
                      <th>Status</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminLoading.finance ? (
                      <tr>
                        <td colSpan="9" className="loading">Loading finance data...</td>
                      </tr>
                    ) : financeData.length === 0 ? (
                      <tr>
                        <td colSpan="9">No financial data found</td>
                      </tr>
                    ) : (
                      financeData.map(transaction => (
                        <tr key={transaction._id}>
                          <td>{transaction.patientName || 'Unknown Patient'}</td>
                          <td>{transaction.doctorName || 'Unknown Doctor'}</td>
                          <td>{transaction.specialization || 'General Physician'}</td>
                          <td>{formatDate(transaction.date)}</td>
                          <td>{formatCurrencyINR(transaction.fee)}</td>
                          <td>{formatCurrencyINR(transaction.revenue)}</td>
                          <td>{transaction.doctorPayout > 0 ? formatCurrencyINR(transaction.doctorPayout) : '—'}</td>
                          <td>
                            <span className={`status ${transaction.status || 'pending'}`}>
                              {transaction.status || 'Pending'}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              background: transaction.paymentStatus === 'paid' ? '#e8f5e9' : transaction.paymentStatus === 'refunded' ? '#fff3e0' : '#f5f5f5',
                              color: transaction.paymentStatus === 'paid' ? '#2e7d32' : transaction.paymentStatus === 'refunded' ? '#e65100' : '#757575',
                              padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600
                            }}>
                              {transaction.paymentStatus || 'pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="4"><strong>Total</strong></td>
                      <td><strong>{formatCurrency(financeTotals.totalFees)}</strong></td>
                      <td><strong>{formatCurrency(financeTotals.totalRevenue)}</strong></td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}
          
          {/* Medicine Orders Finance Section */}
          {activeSection === 'medicine-finance' && (
            <section className="section finance-section">
              <h1 className="heading">Medicine Orders Finance (5% Commission)</h1>
              <div className="table-container">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Medicine</th>
                      <th>Supplier</th>
                      <th>Date</th>
                      <th>Total Amount (₹)</th>
                      <th>MediQuick Commission (5%) (₹)</th>
                      <th>Supplier Payout (95%) (₹)</th>
                      <th>Status</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading.medicineFinance ? (
                      <tr>
                        <td colSpan="7" className="loading">Loading medicine finance data...</td>
                      </tr>
                    ) : medicineFinance.rows.length === 0 ? (
                      <tr>
                        <td colSpan="7">No confirmed medicine orders found</td>
                      </tr>
                    ) : (
                      medicineFinance.rows.map(row => (
                        <tr key={row._id}>
                          <td>{row.patientName}</td>
                          <td>{row.medicineName}</td>
                          <td>{row.supplierName}</td>
                          <td>{row.date}</td>
                          <td>{formatCurrencyINR(row.totalAmount)}</td>
                          <td>{formatCurrencyINR(row.mediQuickCommission)}</td>
                          <td>{formatCurrencyINR(row.supplierPayout)}</td>
                          <td>
                            <span className={`status ${row.status}`}>
                              {row.status}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              background: row.paymentStatus === 'paid' ? '#e8f5e9' : row.paymentStatus === 'refunded' ? '#fff3e0' : '#f5f5f5',
                              color: row.paymentStatus === 'paid' ? '#2e7d32' : row.paymentStatus === 'refunded' ? '#e65100' : '#757575',
                              padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600
                            }}>
                              {row.paymentStatus || 'pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="4"><strong>Totals</strong></td>
                      <td><strong>{formatCurrencyINR(medicineFinance.totals.totalAmount)}</strong></td>
                      <td><strong>{formatCurrencyINR(medicineFinance.totals.totalCommission)}</strong></td>
                      <td><strong>{formatCurrencyINR(medicineFinance.totals.totalSupplierPayout)}</strong></td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}

          {/* Supplier Analytics Section */}
          {activeSection === 'supplier-analytics' && (
            <section className="section supplier-analytics-section">
              <h1 className="heading">Supplier Analytics Dashboard</h1>
              
              {/* Filter Controls */}
              <div className="filter-container" style={{ 
                background: '#fff', 
                padding: '20px', 
                borderRadius: '8px', 
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', 
                marginBottom: '30px',
                border: '1px solid #ddd'
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
                  <div>
                    <label style={{ marginRight: '8px', fontWeight: 'bold', color: 'var(--black)' }}>View Mode:</label>
                    <select 
                      value={supplierFilters.viewMode}
                      onChange={(e) => setSupplierFilters(prev => ({ ...prev, viewMode: e.target.value }))}
                      style={{
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: '#fff'
                      }}
                    >
                      <option value="medicines-suppliers">Medicines & Their Suppliers</option>
                      <option value="suppliers-medicines">Suppliers & Their Medicines</option>
                      <option value="analytics">Key Analytics</option>
                    </select>
                  </div>

                  {supplierFilters.viewMode === 'suppliers-medicines' && (
                    <div>
                      <label style={{ marginRight: '8px', fontWeight: 'bold', color: 'var(--black)' }}>Filter by Supplier:</label>
                      <select 
                        value={supplierFilters.selectedSupplier}
                        onChange={(e) => setSupplierFilters(prev => ({ ...prev, selectedSupplier: e.target.value }))}
                        style={{
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          backgroundColor: '#fff',
                          minWidth: '200px'
                        }}
                      >
                        <option value="">All Suppliers</option>
                        {supplierAnalytics.analytics?.supplierMedicines?.map((supplier, idx) => (
                          <option key={idx} value={supplier.supplierName}>
                            {supplier.supplierName} ({supplier.supplierID})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {supplierFilters.viewMode === 'medicines-suppliers' && (
                    <div>
                      <label style={{ marginRight: '8px', fontWeight: 'bold', color: 'var(--black)' }}>Filter by Medicine:</label>
                      <select 
                        value={supplierFilters.selectedMedicine}
                        onChange={(e) => setSupplierFilters(prev => ({ ...prev, selectedMedicine: e.target.value }))}
                        style={{
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          backgroundColor: '#fff',
                          minWidth: '200px'
                        }}
                      >
                        <option value="">All Medicines</option>
                        {supplierAnalytics.analytics?.medicineSuppliers?.map((medicine, idx) => (
                          <option key={idx} value={medicine.medicineName}>
                            {medicine.medicineName} ({medicine.medicineID})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button 
                    onClick={() => setSupplierFilters({ selectedSupplier: '', selectedMedicine: '', viewMode: 'medicines-suppliers' })}
                    style={{
                      background: 'var(--blue)',
                      color: '#fff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#016bb5'}
                    onMouseOut={(e) => e.target.style.background = 'var(--blue)'}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Key Analytics Cards */}
              {supplierFilters.viewMode === 'analytics' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                  {/* Most Selling Medicine Card */}
                  {supplierAnalytics.analytics?.mostSellingMedicine && (
                    <div style={{ 
                      background: '#fff', 
                      color: 'var(--black)', 
                      padding: '25px', 
                      borderRadius: '8px', 
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                      border: '2px solid var(--blue)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                        <div style={{ fontSize: '2rem' }}>🏆</div>
                        <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--blue)' }}>Most Selling Medicine</h3>
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '15px', color: 'var(--black)' }}>{supplierAnalytics.analytics.mostSellingMedicine.name}</div>
                      <div style={{ lineHeight: '1.6', fontSize: '1.4rem' }}>
                        <p style={{ margin: '8px 0' }}><strong>ID:</strong> {supplierAnalytics.analytics.mostSellingMedicine.medicineID}</p>
                        <p style={{ margin: '8px 0' }}><strong>Total Sold:</strong> {supplierAnalytics.analytics.mostSellingMedicine.totalOrderQuantity} units</p>
                        <p style={{ margin: '8px 0' }}><strong>Current Stock:</strong> {supplierAnalytics.analytics.mostSellingMedicine.currentStock} units</p>
                        <p style={{ margin: '8px 0' }}><strong>Suppliers:</strong> {supplierAnalytics.analytics.mostSellingMedicine.suppliers.length}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Best Supplier Card */}
                  {supplierAnalytics.analytics?.bestSupplier && (
                    <div style={{ 
                      background: '#fff', 
                      color: 'var(--black)', 
                      padding: '25px', 
                      borderRadius: '8px', 
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                      border: '2px solid var(--blue)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                        <div style={{ fontSize: '2rem' }}>⭐</div>
                        <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--blue)' }}>Best Supplier</h3>
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '15px', color: 'var(--black)' }}>{supplierAnalytics.analytics.bestSupplier.name}</div>
                      <div style={{ lineHeight: '1.6', fontSize: '1.4rem' }}>
                        <p style={{ margin: '8px 0' }}><strong>ID:</strong> {supplierAnalytics.analytics.bestSupplier.supplierID}</p>
                        <p style={{ margin: '8px 0' }}><strong>Total Revenue:</strong> ₹{supplierAnalytics.analytics.bestSupplier.totalRevenue.toLocaleString()}</p>
                        <p style={{ margin: '8px 0' }}><strong>Total Orders:</strong> {supplierAnalytics.analytics.bestSupplier.totalOrders} units</p>
                        <p style={{ margin: '8px 0' }}><strong>Medicine Types:</strong> {supplierAnalytics.analytics.bestSupplier.medicineCount}</p>
                      </div>
                    </div>
                  )}

                  {/* Summary Stats Card */}
                  <div style={{ 
                    background: '#fff', 
                    color: 'var(--black)', 
                    padding: '25px', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                    border: '2px solid var(--blue)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                      <div style={{ fontSize: '2rem' }}>📊</div>
                      <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--blue)' }}>Summary Statistics</h3>
                    </div>
                    <div style={{ fontSize: '1.6rem', lineHeight: '1.8' }}>
                      <p style={{ margin: '8px 0' }}><strong>Total Medicines:</strong> {supplierAnalytics.totals.totalMedicines}</p>
                      <p style={{ margin: '8px 0' }}><strong>Active Suppliers:</strong> {supplierAnalytics.totals.totalSuppliers}</p>
                      <p style={{ margin: '8px 0' }}><strong>Confirmed Orders:</strong> {supplierAnalytics.totals.totalConfirmedOrders}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Medicines and Their Suppliers View */}
              {supplierFilters.viewMode === 'medicines-suppliers' && (
                <div className="table-container">
                  <h2 style={{ color: 'var(--blue)', marginBottom: '15px', fontSize: '2.2rem' }}>💊 Medicines & Their Suppliers</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Medicine Name</th>
                        <th>Medicine ID</th>
                        <th>Stock</th>
                        <th>Manufacturer</th>
                        <th>Suppliers</th>
                        <th>Supplier Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading.supplierAnalytics ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--black)' }}>Loading supplier analytics...</td>
                        </tr>
                      ) : !supplierAnalytics.analytics?.medicineSuppliers?.length ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--black)' }}>No medicine data found</td>
                        </tr>
                      ) : (
                        supplierAnalytics.analytics.medicineSuppliers
                          .filter(medicine => 
                            !supplierFilters.selectedMedicine || 
                            medicine.medicineName.toLowerCase().includes(supplierFilters.selectedMedicine.toLowerCase())
                          )
                          .map((medicine, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 'bold' }}>{medicine.medicineName}</td>
                              <td>{medicine.medicineID}</td>
                              <td style={{ 
                                color: medicine.stock < 10 ? '#c53030' : '#2f855a',
                                fontWeight: 'bold'
                              }}>
                                {medicine.stock}
                              </td>
                              <td>{medicine.manufacturer}</td>
                              <td>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                  {medicine.suppliers.map((supplier, sidx) => (
                                    <span key={sidx} style={{ 
                                      background: 'var(--blue)', 
                                      color: '#fff', 
                                      padding: '2px 8px', 
                                      borderRadius: '12px', 
                                      fontSize: '1.2rem'
                                    }}>
                                      {supplier.name}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--blue)' }}>
                                {medicine.suppliers.length}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Suppliers and Their Medicines View */}
              {supplierFilters.viewMode === 'suppliers-medicines' && (
                <div className="table-container">
                  <h2 style={{ color: 'var(--blue)', marginBottom: '15px', fontSize: '2.2rem' }}>🏭 Suppliers & Their Medicines</h2>
                  {supplierAnalytics.analytics?.supplierMedicines
                    ?.filter(supplier => 
                      !supplierFilters.selectedSupplier || 
                      supplier.supplierName.toLowerCase().includes(supplierFilters.selectedSupplier.toLowerCase())
                    )
                    .map((supplier, idx) => (
                      <div key={idx} style={{ 
                        background: '#fff',
                        borderRadius: '8px',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                        marginBottom: '25px',
                        border: '1px solid #ddd',
                        overflow: 'hidden'
                      }}>
                        {/* Supplier Header */}
                        <div style={{ 
                          background: 'var(--blue)', 
                          color: '#fff', 
                          padding: '20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '2rem' }}>{supplier.supplierName}</h3>
                            <p style={{ margin: '5px 0', opacity: 0.9, fontSize: '1.4rem' }}>ID: {supplier.supplierID}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>₹{supplier.totalRevenue.toLocaleString()}</div>
                            <div style={{ fontSize: '1.3rem', opacity: 0.9 }}>{supplier.totalOrders} orders</div>
                          </div>
                        </div>

                        {/* Medicines Table */}
                        <div style={{ padding: '20px' }}>
                          <table style={{ width: '100%', marginTop: 0 }}>
                            <thead>
                              <tr style={{ background: '#f8f9fa' }}>
                                <th style={{ background: '#f8f9fa', color: 'var(--black)', border: '1px solid #ddd' }}>Medicine Name</th>
                                <th style={{ background: '#f8f9fa', color: 'var(--black)', border: '1px solid #ddd' }}>Medicine ID</th>
                                <th style={{ background: '#f8f9fa', color: 'var(--black)', border: '1px solid #ddd' }}>Stock</th>
                                <th style={{ background: '#f8f9fa', color: 'var(--black)', border: '1px solid #ddd' }}>Manufacturer</th>
                                <th style={{ background: '#f8f9fa', color: 'var(--black)', border: '1px solid #ddd' }}>Orders Sold</th>
                              </tr>
                            </thead>
                            <tbody>
                              {supplier.medicines.map((medicine, midx) => (
                                <tr key={midx}>
                                  <td style={{ border: '1px solid #ddd' }}>{medicine.name}</td>
                                  <td style={{ border: '1px solid #ddd' }}>{medicine.medicineID}</td>
                                  <td style={{ 
                                    border: '1px solid #ddd',
                                    color: medicine.stock < 10 ? '#c53030' : '#2f855a',
                                    fontWeight: 'bold'
                                  }}>
                                    {medicine.stock}
                                  </td>
                                  <td style={{ border: '1px solid #ddd' }}>{medicine.manufacturer}</td>
                                  <td style={{ 
                                    border: '1px solid #ddd',
                                    textAlign: 'center',
                                    color: 'var(--blue)',
                                    fontWeight: 'bold'
                                  }}>
                                    {medicine.orderCount || 0}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>
          )}

          {/* Medicine Orders Section */}
          {activeSection === 'medicineOrders' && (
            <section className="section orders-section">
              <h1 className="heading">Medicine Orders</h1>
              <div className="table-container">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Patient</th>
                      <th>Medicine</th>
                      <th>Supplier</th>
                      <th>Date</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading.medicineOrders ? (
                      <tr>
                        <td colSpan="7" className="loading">Loading orders...</td>
                      </tr>
                    ) : (!Array.isArray(medicineOrders) || medicineOrders.length === 0) ? (
                      <tr>
                        <td colSpan="7">No medicine orders found</td>
                      </tr>
                    ) : (
                      (Array.isArray(medicineOrders) ? medicineOrders : []).map(order => (
                        <tr key={order._id}>
                          <td>{order.orderId}</td>
                          <td>{order.patientName || 'Unknown Patient'}</td>
                          <td>{order.medicineName}</td>
                          <td>{order.supplierName || 'Unknown Supplier'}</td>
                          <td>{formatDate(order.date)}</td>
                          <td>{formatCurrencyINR(order.totalAmount)}</td>
                          <td>
                            <span className={`status ${order.status || 'pending'}`}>
                              {order.status || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Earnings Section */}
          {activeSection === 'earnings' && (
            <section className="section earnings-section">
              <h1 className="heading">Earnings Reports</h1>
              <div className="table-container">
                
                {/* Daily Earnings */}
                <h2>Daily Earnings Summary (Since Jan 2025)</h2>
                <table className="earnings-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Total Appointments</th>
                      <th>Total Fees</th>
                      <th>MediQuick Revenue (10%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminLoading.earnings ? (
                      <tr>
                        <td colSpan="4" className="loading">Loading daily earnings data...</td>
                      </tr>
                    ) : !earningsData.daily || earningsData.daily.length === 0 ? (
                      <tr>
                        <td colSpan="4">No daily earnings data found</td>
                      </tr>
                    ) : (
                      earningsData.daily.map(day => (
                        <tr key={day.date}>
                          <td>{formatDate(day.date)}</td>
                          <td>{day.count || 0}</td>
                          <td>{formatCurrency(day.totalFees)}</td>
                          <td>{formatCurrency(day.totalRevenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Monthly Earnings */}
                <h2>Monthly Earnings Summary (Since Jan 2025)</h2>
                <table className="earnings-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Total Appointments</th>
                      <th>Total Fees</th>
                      <th>MediQuick Revenue (10%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminLoading.earnings ? (
                      <tr>
                        <td colSpan="4" className="loading">Loading monthly earnings data...</td>
                      </tr>
                    ) : !earningsData.monthly || earningsData.monthly.length === 0 ? (
                      <tr>
                        <td colSpan="4">No monthly earnings data found</td>
                      </tr>
                    ) : (
                      earningsData.monthly.map(month => (
                        <tr key={month.month}>
                          <td>{month.month}</td>
                          <td>{month.count || 0}</td>
                          <td>{formatCurrency(month.totalFees)}</td>
                          <td>{formatCurrency(month.totalRevenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Yearly Earnings */}
                <h2>Yearly Earnings Summary (Since Jan 2025)</h2>
                <table className="earnings-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Total Appointments</th>
                      <th>Total Fees</th>
                      <th>MediQuick Revenue (10%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminLoading.earnings ? (
                      <tr>
                        <td colSpan="4" className="loading">Loading yearly earnings data...</td>
                      </tr>
                    ) : !earningsData.yearly || earningsData.yearly.length === 0 ? (
                      <tr>
                        <td colSpan="4">No yearly earnings data found</td>
                      </tr>
                    ) : (
                      earningsData.yearly.map(year => (
                        <tr key={year.year}>
                          <td>{year.year}</td>
                          <td>{year.count || 0}</td>
                          <td>{formatCurrency(year.totalFees)}</td>
                          <td>{formatCurrency(year.totalRevenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Specialization Earnings */}
                <h2>Earnings by Doctor Specialization</h2>
                <table className="earnings-table">
                  <thead>
                    <tr>
                      <th>Specialization</th>
                      <th>Total Appointments</th>
                      <th>Total Fees</th>
                      <th>MediQuick Revenue (10%)</th>
                      <th>Average Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminLoading.earnings ? (
                      <tr>
                        <td colSpan="4" className="loading">Loading specialization data...</td>
                      </tr>
                    ) : !revenueSummary.bySpecialization || revenueSummary.bySpecialization.length === 0 ? (
                      <tr>
                        <td colSpan="5">No specialization data found</td>
                      </tr>
                    ) : (
                      revenueSummary.bySpecialization.map(spec => {
                        const avgFee = spec.count > 0 ? spec.totalFees / spec.count : 0;
                        return (
                          <tr key={spec.specialization}>
                            <td>{spec.specialization}</td>
                            <td>{spec.count}</td>
                            <td>{formatCurrency(spec.totalFees)}</td>
                            <td>{formatCurrency(spec.totalRevenue)}</td>
                            <td>{formatCurrency(avgFee)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Overall Revenue Summary */}
                <h2>Overall Revenue Summary</h2>
                <div className="revenue-overview">
                  <div className="revenue-cards">
                    <div className="revenue-card">
                      <h3>Total Appointments</h3>
                      <p className="revenue-number">{revenueSummary.summary?.totalAppointments || 0}</p>
                    </div>
                    <div className="revenue-card">
                      <h3>Total Consultation Fees</h3>
                      <p className="revenue-number">{formatCurrency(revenueSummary.summary?.totalFees)}</p>
                    </div>
                    <div className="revenue-card">
                      <h3>Platform Revenue (10%)</h3>
                      <p className="revenue-number highlight">{formatCurrency(revenueSummary.summary?.totalRevenue)}</p>
                    </div>
                  </div>
                </div>

              </div>
            </section>
          )}

          {/* MediQuick Reviews Section */}
          {activeSection === 'reviews' && (
            <section className="section reviews-section">
              <h1 className="heading">MediQuick Reviews</h1>
              <div className="table-container">
                <table className="reviews-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Type</th>
                      <th>Rating</th>
                      <th>Review</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading.reviews ? (
                      <tr>
                        <td colSpan="7" className="loading">Loading reviews...</td>
                      </tr>
                    ) : reviews.length === 0 ? (
                      <tr>
                        <td colSpan="7">No reviews found</td>
                      </tr>
                    ) : (
                      reviews.map(review => (
                        <tr key={review._id}>
                          <td>{review.userName}</td>
                          <td>{review.userType}</td>
                          <td>
                            <div className="star-rating">
                              {[1, 2, 3, 4, 5].map(star => (
                                <span
                                  key={star}
                                  className={star <= review.rating ? 'star filled' : 'star'}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="review-text">{review.reviewText}</td>
                          <td>{formatDate(review.createdAt)}</td>
                          <td>
                            <span className={`status ${review.isApproved ? 'completed' : 'pending'}`}>
                              {review.isApproved ? 'Approved' : 'Pending'}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              {!review.isApproved && (
                                <button 
                                  className="btn approve-btn"
                                  onClick={() => handleApproveReview(review._id)}
                                >
                                  Approve
                                </button>
                              )}
                              <button 
                                className="btn delete-btn"
                                onClick={() => handleDeleteReview(review._id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Employee Approval Section */}
          {activeSection === 'employeeApproval' && (
            <section className="section employee-approval-section">
              <h1 className="heading">Pending Employee Requests</h1>
              <div className="table-container">
                {error && (
                  <div className="error-message">
                    {error}
                    <button 
                      onClick={fetchEmployeeRequests} 
                      style={{marginLeft: '10px', padding: '5px 10px'}}
                    >
                      Refresh
                    </button>
                  </div>
                )}
                
                {loading.employees && (
                  <div className="loading-message">
                    Loading employee requests...
                  </div>
                )}

                <table className="employee-approval-table">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Email</th>
                      <th>Mobile</th>
                      <th>Address</th>
                      <th>Profile Photo</th>
                      <th>Document</th>
                      <th>Registration Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading.employees ? (
                      <tr>
                        <td colSpan="9" className="loading">Loading employee requests...</td>
                      </tr>
                    ) : employeeRequests.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>
                          No pending employee requests
                        </td>
                      </tr>
                    ) : (
                      employeeRequests.map((employee, index) => (
                        <tr key={employee._id || index}>
                          <td className="employee-name-cell">{employee.name}</td>
                          <td className="employee-email-cell">{employee.email}</td>
                          <td>{employee.mobile}</td>
                          <td className="employee-address-cell">{employee.address}</td>
                          <td>
                            {employee.profilePhoto ? (
                              <div className="doc-action-group">
                                <a 
                                  href={buildDocumentUrl(employee.profilePhoto)} 
                                  className="view-pdf" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  View
                                </a>
                                <a 
                                  href={buildDocumentUrl(employee.profilePhoto, true)} 
                                  className="download-pdf"
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  Download
                                </a>
                              </div>
                            ) : (
                              <span className="no-document">No photo</span>
                            )}
                          </td>
                          <td>
                            {employee.documentPath ? (
                              <div className="doc-action-group">
                                <a 
                                  href={buildDocumentUrl(employee.documentPath)} 
                                  className="view-pdf" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  View
                                </a>
                                <a 
                                  href={buildDocumentUrl(employee.documentPath, true)} 
                                  className="download-pdf"
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  Download
                                </a>
                              </div>
                            ) : (
                              <span className="no-document">No document</span>
                            )}
                          </td>
                          <td>{formatDate(employee.createdAt)}</td>
                          <td>
                            <span className="status pending">Pending</span>
                          </td>
                          <td>
                            <button 
                              className="btn approve-btn"
                              onClick={() => handleApproveEmployee(employee._id, employee.name)}
                              disabled={loading.employees}
                            >
                              {loading.employees ? 'Approving...' : 'Approve'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Footer removed to avoid duplicate footer */}
    </div>
  );
};

export default AdminDashboard;