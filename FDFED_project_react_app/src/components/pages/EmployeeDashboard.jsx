import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../assets/css/EmployeeDashboard.css';
import { useEmployee } from '../../context/EmployeeContext';
import { getToken, removeToken } from '../../utils/authUtils';
import Header from '../common/Header';
import Footer from '../common/Footer';
import DashboardGlobalSearch from '../common/DashboardGlobalSearch';

const BASE_URL = import.meta.env.VITE_API_URL;
const EmployeeDashboard = () => {
  const { employee, logout } = useEmployee();
  const [doctorRequests, setDoctorRequests] = useState([]);
  const [supplierRequests, setSupplierRequests] = useState([]);
  const [approvedDoctors, setApprovedDoctors] = useState([]);
  const [rejectedDoctors, setRejectedDoctors] = useState([]);
  const [approvedSuppliers, setApprovedSuppliers] = useState([]);
  const [rejectedSuppliers, setRejectedSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchDoctor, setSearchDoctor] = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');
  const [searchApproved, setSearchApproved] = useState('');
  const [searchRejectedDoc, setSearchRejectedDoc] = useState('');
  const [searchApprovedSup, setSearchApprovedSup] = useState('');
  const [searchRejectedSup, setSearchRejectedSup] = useState('');
  const [activeSection, setActiveSection] = useState('pendingDoctors');
  const navigate = useNavigate();

  // Function to view document
  const viewDocument = async (documentPath) => {
    if (!documentPath) {
      alert('No document available');
      return;
    }
    
    // Construct the full URL
    const documentUrl = `${BASE_URL}${documentPath}`;
    console.log('=== VIEW DOCUMENT DEBUG ===');
    console.log('Document path received:', documentPath);
    console.log('Full URL constructed:', documentUrl);
    console.log('BASE_URL:', BASE_URL);
    console.log('========================');
    
    try {
      // First, check if the document exists by making a HEAD request
      const response = await fetch(documentUrl, { method: 'HEAD' });
      
      console.log('HEAD request response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (response.ok) {
        // Document exists, open it in a new tab
        window.open(documentUrl, '_blank', 'noopener,noreferrer');
      } else {
        console.error('Document not accessible:', response.status);
        alert(`Document not found or not accessible (Status: ${response.status}). Please contact support.`);
      }
    } catch (error) {
      console.error('Error accessing document:', error);
      // If HEAD request fails, try opening anyway (might be CORS issue with HEAD)
      window.open(documentUrl, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    fetchDoctorRequests();
    fetchSupplierRequests();
    fetchApprovedDoctors();
    fetchRejectedDoctors();
    fetchApprovedSuppliers();
    fetchRejectedSuppliers();
  }, []);

  const fetchDoctorRequests = async () => {
    try {
      setLoading(true);
      const token = getToken('employee');
      const response = await fetch(`${BASE_URL}/employee/api/doctor-requests`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDoctorRequests(data.doctors);
        } else {
          setError('Failed to load doctor requests');
        }
      } else if (response.status === 401) {
        removeToken('employee');
        navigate('/employee/form');
      } else {
        setError('Failed to fetch doctor requests');
      }
    } catch (error) {
      console.error('Error fetching doctor requests:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedDoctors = async () => {
    try {
      const token = getToken('employee');
      const response = await fetch(`${BASE_URL}/employee/api/approved-doctors`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setApprovedDoctors(data.doctors);
        }
      } else if (response.status === 401) {
        removeToken('employee');
        navigate('/employee/form');
      }
    } catch (error) {
      console.error('Error fetching approved doctors:', error);
    }
  };

  const fetchRejectedDoctors = async () => {
    try {
      const token = getToken('employee');
      const response = await fetch(`${BASE_URL}/employee/api/rejected-doctors`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRejectedDoctors(data.doctors);
        }
      } else if (response.status === 401) {
        removeToken('employee');
        navigate('/employee/form');
      }
    } catch (error) {
      console.error('Error fetching rejected doctors:', error);
    }
  };

  const fetchApprovedSuppliers = async () => {
    try {
      const token = getToken('employee');
      const response = await fetch(`${BASE_URL}/employee/api/approved-suppliers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setApprovedSuppliers(data.suppliers);
        }
      } else if (response.status === 401) {
        removeToken('employee');
        navigate('/employee/form');
      }
    } catch (error) {
      console.error('Error fetching approved suppliers:', error);
    }
  };

  const fetchRejectedSuppliers = async () => {
    try {
      const token = getToken('employee');
      const response = await fetch(`${BASE_URL}/employee/api/rejected-suppliers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRejectedSuppliers(data.suppliers);
        }
      } else if (response.status === 401) {
        removeToken('employee');
        navigate('/employee/form');
      }
    } catch (error) {
      console.error('Error fetching rejected suppliers:', error);
    }
  };

  const fetchSupplierRequests = async () => {
    try {
      setLoading(true);
      const token = getToken('employee');
      const response = await fetch(`${BASE_URL}/employee/api/supplier-requests`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSupplierRequests(data.suppliers);
        } else {
          setError('Failed to load supplier requests');
        }
      } else if (response.status === 401) {
        removeToken('employee');
        navigate('/employee/form');
      } else {
        setError('Failed to fetch supplier requests');
      }
    } catch (error) {
      console.error('Error fetching supplier requests:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDoctor = async (doctorId, doctorName) => {
    if (!window.confirm(`Are you sure you want to approve ${doctorName}?`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const token = getToken('employee');
      const response = await fetch(`${BASE_URL}/employee/approve_doctor/${doctorId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (response.status === 401) {
        removeToken('employee');
        navigate('/employee/form');
        return;
      }

      // Check if response is JSON or HTML
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // If it's HTML, we got an error page
        const text = await response.text();
        console.error('HTML response received:', text.substring(0, 200));
        throw new Error('Server returned an error page. Please check the server logs.');
      }

      if (response.ok) {
        // Remove the approved doctor from the list
        setDoctorRequests(prev => prev.filter(doctor => doctor._id !== doctorId));
        
        // Show success message
        setError('');
        alert(`Doctor ${doctorName} approved successfully!`);
        
        // Refresh all lists
        fetchDoctorRequests();
        fetchApprovedDoctors();
      } else {
        // Handle specific error cases
        if (response.status === 401) {
          setError('Session expired. Please login again.');
          navigate('/employee/form');
        } else if (response.status === 404) {
          setError('Doctor not found.');
        } else {
          setError(data.error || data.message || `Failed to approve doctor. Status: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Error approving doctor:', error);
      
      // Check if the doctor was actually approved despite the error
      // Refresh the list to see current status
      fetchDoctorRequests();
      
      if (error.message.includes('Server returned an error page')) {
        setError('Server error occurred, but the action might have completed. Refreshing list...');
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSupplier = async (supplierId, supplierName) => {
    if (!window.confirm(`Are you sure you want to approve ${supplierName}?`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const token = getToken('employee');
      const response = await fetch(`${BASE_URL}/employee/approve_supplier/${supplierId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (response.status === 401) {
        removeToken('employee');
        navigate('/employee/form');
        return;
      }

      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('HTML response received:', text.substring(0, 200));
        throw new Error('Server returned an error page. Please check the server logs.');
      }

      if (response.ok) {
        setSupplierRequests(prev => prev.filter(supplier => supplier._id !== supplierId));
        setError('');
        alert(`Supplier ${supplierName} approved successfully!`);
        fetchSupplierRequests();
        fetchApprovedSuppliers();
      } else {
        if (response.status === 401) {
          setError('Session expired. Please login again.');
          navigate('/employee/form');
        } else if (response.status === 404) {
          setError('Supplier not found.');
        } else {
          setError(data.error || data.message || `Failed to approve supplier. Status: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Error approving supplier:', error);
      fetchSupplierRequests();
      
      if (error.message.includes('Server returned an error page')) {
        setError('Server error occurred, but the action might have completed. Refreshing list...');
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRejectDoctor = async (doctorId, doctorName) => {
    const reason = prompt(`Enter reason for rejecting ${doctorName}:`);
    if (!reason) return;

    if (!window.confirm(`Are you sure you want to reject ${doctorName}?\nReason: ${reason}`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const token = getToken('employee');
      const response = await fetch(`${BASE_URL}/employee/reject_doctor/${doctorId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        setDoctorRequests(prev => prev.filter(doctor => doctor._id !== doctorId));
        alert(`Doctor ${doctorName} rejected successfully!`);
        fetchDoctorRequests();
        fetchRejectedDoctors();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to reject doctor');
      }
    } catch (error) {
      console.error('Error rejecting doctor:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectSupplier = async (supplierId, supplierName) => {
    const reason = prompt(`Enter reason for rejecting ${supplierName}:`);
    if (!reason) return;

    if (!window.confirm(`Are you sure you want to reject ${supplierName}?\nReason: ${reason}`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const token = getToken('employee');
      const response = await fetch(`${BASE_URL}/employee/reject_supplier/${supplierId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        setSupplierRequests(prev => prev.filter(supplier => supplier._id !== supplierId));
        alert(`Supplier ${supplierName} rejected successfully!`);
        fetchSupplierRequests();
        fetchRejectedSuppliers();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to reject supplier');
      }
    } catch (error) {
      console.error('Error rejecting supplier:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisapproveDoctor = async (doctorId, doctorName) => {
    if (!window.confirm(`Are you sure you want to disapprove Dr. ${doctorName}? This will remove their approval status.`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const token = getToken('employee');
      const response = await fetch(`${BASE_URL}/employee/disapprove_doctor/${doctorId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (response.status === 401) {
        removeToken('employee');
        navigate('/employee/form');
        return;
      }

      if (response.ok) {
        alert(`Dr. ${doctorName} has been disapproved successfully!`);
        
        // Refresh the lists
        fetchApprovedDoctors();
        fetchDoctorRequests();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to disapprove doctor');
      }
    } catch (error) {
      console.error('Error disapproving doctor:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisapproveSupplier = async (supplierId, supplierName) => {
    if (!window.confirm(`Are you sure you want to disapprove ${supplierName}? This will remove their approval status.`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const token = getToken('employee');
      const response = await fetch(`${BASE_URL}/employee/disapprove_supplier/${supplierId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (response.status === 401) {
        removeToken('employee');
        navigate('/employee/form');
        return;
      }

      if (response.ok) {
        alert(`${supplierName} has been disapproved successfully!`);
        
        // Refresh the lists
        fetchApprovedSuppliers();
        fetchSupplierRequests();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to disapprove supplier');
      }
    } catch (error) {
      console.error('Error disapproving supplier:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnrejectDoctor = async (doctorId, doctorName) => {
    if (!window.confirm(`Are you sure you want to un-reject Dr. ${doctorName}? This will remove the rejection status.`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const token = getToken('employee');
      const response = await fetch(`${BASE_URL}/employee/unreject_doctor/${doctorId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (response.status === 401) {
        removeToken('employee');
        navigate('/employee/form');
        return;
      }

      if (response.ok) {
        alert(`Dr. ${doctorName} has been un-rejected successfully!`);
        
        // Refresh the lists
        fetchRejectedDoctors();
        fetchDoctorRequests();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to un-reject doctor');
      }
    } catch (error) {
      console.error('Error un-rejecting doctor:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnrejectSupplier = async (supplierId, supplierName) => {
    if (!window.confirm(`Are you sure you want to un-reject ${supplierName}? This will remove the rejection status.`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const token = getToken('employee');
      const response = await fetch(`${BASE_URL}/employee/unreject_supplier/${supplierId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (response.status === 401) {
        removeToken('employee');
        navigate('/employee/form');
        return;
      }

      if (response.ok) {
        alert(`${supplierName} has been un-rejected successfully!`);
        
        // Refresh the lists
        fetchRejectedSuppliers();
        fetchSupplierRequests();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to un-reject supplier');
      }
    } catch (error) {
      console.error('Error un-rejecting supplier:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDoctors = doctorRequests.filter(doctor =>
    doctor.name.toLowerCase().includes(searchDoctor.toLowerCase()) ||
    doctor.registrationNumber?.toLowerCase().includes(searchDoctor.toLowerCase())
  );

  const filteredSuppliers = supplierRequests.filter(supplier =>
    supplier.name.toLowerCase().includes(searchSupplier.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchSupplier.toLowerCase()) ||
    supplier.supplierID?.toLowerCase().includes(searchSupplier.toLowerCase())
  );
  const filteredApprovedDoctors = approvedDoctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchApproved.toLowerCase()) ||
    doctor.registrationNumber.toLowerCase().includes(searchApproved.toLowerCase())
  );

  const filteredRejectedDoctors = rejectedDoctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchRejectedDoc.toLowerCase()) ||
    doctor.registrationNumber.toLowerCase().includes(searchRejectedDoc.toLowerCase())
  );

  const filteredApprovedSuppliers = approvedSuppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchApprovedSup.toLowerCase()) ||
    supplier.supplierID.toLowerCase().includes(searchApprovedSup.toLowerCase()) ||
    supplier.email.toLowerCase().includes(searchApprovedSup.toLowerCase())
  );

  const filteredRejectedSuppliers = rejectedSuppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchRejectedSup.toLowerCase()) ||
    supplier.supplierID.toLowerCase().includes(searchRejectedSup.toLowerCase()) ||
    supplier.email.toLowerCase().includes(searchRejectedSup.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  const handleLogout = () => {
    logout();
  };

  const todayLabel = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (loading && doctorRequests.length === 0) {
    return (
      <div className="employee-dashboard">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="employee-dashboard">
      <div className="employee-header-shell">
        <Header 
          userType="employee" 
          employee={employee} 
          onLogout={handleLogout}
        />
      </div>
      
      <div className="employee-content employee-content-zoom-14">
        {employee && employee.name && (
          <>
            <div className="employee-welcome">
              <div className="welcome-main">
                <div>
                  <h1 className="welcome-message">Welcome back, {employee.name}!</h1>
                  <p className="welcome-subtitle">Clinical Administration Portal</p>
                </div>
                <div className="schedule-chip">
                  <span className="material-symbols-outlined">calendar_today</span>
                  <div>
                    <p className="schedule-chip-label">Today's Schedule</p>
                    <p className="schedule-chip-date">{todayLabel}</p>
                  </div>
                </div>
              </div>
              <div className="employee-dashboard-search-wrap">
                <DashboardGlobalSearch role="employee" />
              </div>
            </div>

            {/* Tab Navigation Buttons */}
            <div className="tab-navigation">
              <button 
                className={`tab-button ${activeSection === 'pendingDoctors' ? 'active' : ''}`}
                onClick={() => setActiveSection('pendingDoctors')}
              >
                <i className="fas fa-user-md"></i>
                <div className="tab-content">
                  <span className="tab-count">{doctorRequests.length}</span>
                  <span className="tab-label">Pending Doctors</span>
                </div>
              </button>

              <button 
                className={`tab-button ${activeSection === 'pendingSuppliers' ? 'active' : ''}`}
                onClick={() => setActiveSection('pendingSuppliers')}
              >
                <i className="fas fa-building"></i>
                <div className="tab-content">
                  <span className="tab-count">{supplierRequests.length}</span>
                  <span className="tab-label">Pending Suppliers</span>
                </div>
              </button>

              <button 
                className={`tab-button ${activeSection === 'approvedDoctors' ? 'active' : ''}`}
                onClick={() => setActiveSection('approvedDoctors')}
              >
                <i className="fas fa-check-circle"></i>
                <div className="tab-content">
                  <span className="tab-count">{approvedDoctors.length}</span>
                  <span className="tab-label">Approved Doctors</span>
                </div>
              </button>

              <button 
                className={`tab-button ${activeSection === 'rejectedDoctors' ? 'active' : ''}`}
                onClick={() => setActiveSection('rejectedDoctors')}
              >
                <i className="fas fa-times-circle"></i>
                <div className="tab-content">
                  <span className="tab-count">{rejectedDoctors.length}</span>
                  <span className="tab-label">Rejected Doctors</span>
                </div>
              </button>

              <button 
                className={`tab-button ${activeSection === 'approvedSuppliers' ? 'active' : ''}`}
                onClick={() => setActiveSection('approvedSuppliers')}
              >
                <i className="fas fa-check-circle"></i>
                <div className="tab-content">
                  <span className="tab-count">{approvedSuppliers.length}</span>
                  <span className="tab-label">Approved Suppliers</span>
                </div>
              </button>

              <button 
                className={`tab-button ${activeSection === 'rejectedSuppliers' ? 'active' : ''}`}
                onClick={() => setActiveSection('rejectedSuppliers')}
              >
                <i className="fas fa-times-circle"></i>
                <div className="tab-content">
                  <span className="tab-count">{rejectedSuppliers.length}</span>
                  <span className="tab-label">Rejected Suppliers</span>
                </div>
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="error-message">
            {error}
            <button 
              onClick={() => {
                fetchDoctorRequests();
                fetchSupplierRequests();
              }} 
              style={{marginLeft: '10px', padding: '5px 10px'}}
            >
              Refresh
            </button>
          </div>
        )}

        {activeSection === 'pendingDoctors' && (
        <section id="doc_req" className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Doctor Verification Queue</h2>
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search by name or registration number..."
              value={searchDoctor}
              onChange={(e) => setSearchDoctor(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
            <button 
              onClick={fetchDoctorRequests} 
              style={{marginLeft: '10px', padding: '5px 10px'}}
            >
              Refresh
            </button>
          </div>
        )}
        
        {loading && (
          <div className="loading-message">
            Processing...
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th>Doctor Name</th>
              <th>Registration Number</th>
              <th>Documents</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredDoctors.length > 0 ? (
              filteredDoctors.map((doctor, index) => (
                <tr key={doctor._id || index}>
                  <td><strong>{doctor.name}</strong></td>
                  <td><span className="reg-number">{doctor.registrationNumber}</span></td>
                  <td>
                    {doctor.documentPath ? (
                      <button
                        className="view-doc-link"
                        onClick={() => viewDocument(doctor.documentPath)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          font: 'inherit'
                        }}
                      >
                        <i className="fas fa-file-pdf"></i> View Document
                      </button>
                    ) : (
                      <span className="no-document">No document</span>
                    )}
                  </td>
                  <td>
                    <span className="status-badge status-pending">
                      Pending
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-approve"
                        onClick={() => handleApproveDoctor(doctor._id, doctor.name)}
                        disabled={loading}
                        title="Approve doctor"
                      >
                        Approve
                      </button>
                      <button 
                        className="btn-reject"
                        onClick={() => handleRejectDoctor(doctor._id, doctor.name)}
                        disabled={loading}
                        title="Reject doctor"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="no-data">
                  {searchDoctor ? 'No doctors found matching your search' : 'No pending doctor requests'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </section>
        )}

        {activeSection === 'pendingSuppliers' && (
        <section id="supplier_req" className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Supplier Verification Queue</h2>
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search by name, email, or supplier ID..."
              value={searchSupplier}
              onChange={(e) => setSearchSupplier(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
            <button 
              onClick={fetchSupplierRequests} 
              style={{marginLeft: '10px', padding: '5px 10px'}}
            >
              Refresh
            </button>
          </div>
        )}
        
        {loading && (
          <div className="loading-message">
            Processing...
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th>Supplier Name</th>
              <th>Supplier ID</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Profile Photo</th>
              <th>Document</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map((supplier, index) => (
                <tr key={supplier._id || index}>
                  <td><strong>{supplier.name}</strong></td>
                  <td><span className="supplier-id">{supplier.supplierID}</span></td>
                  <td>{supplier.email}</td>
                  <td>{supplier.mobile}</td>
                  <td>
                    {supplier.profilePhoto ? (
                      <button
                        className="view-doc-link"
                        onClick={() => viewDocument(supplier.profilePhoto)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          font: 'inherit'
                        }}
                      >
                        <i className="fas fa-image"></i> View Photo
                      </button>
                    ) : (
                      <span className="no-document">No photo</span>
                    )}
                  </td>
                  <td>
                    {supplier.documentPath ? (
                      <button
                        className="view-doc-link"
                        onClick={() => viewDocument(supplier.documentPath)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          font: 'inherit'
                        }}
                      >
                        <i className="fas fa-file-pdf"></i> View Document
                      </button>
                    ) : (
                      <span className="no-document">No document</span>
                    )}
                  </td>
                  <td>
                    <span className="status-badge status-pending">
                      Pending
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-approve"
                        onClick={() => handleApproveSupplier(supplier._id, supplier.name)}
                        disabled={loading}
                        title="Approve supplier"
                      >
                        Approve
                      </button>
                      <button 
                        className="btn-reject"
                        onClick={() => handleRejectSupplier(supplier._id, supplier.name)}
                        disabled={loading}
                        title="Reject supplier"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="no-data">
                  {searchSupplier ? 'No suppliers found matching your search' : 'No pending supplier requests'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </section>
        )}

        {activeSection === 'approvedDoctors' && (
        <section id="approved_doctors" className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Previously Approved Doctors</h2>
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search by name or registration number..."
              value={searchApproved}
              onChange={(e) => setSearchApproved(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Doctor Name</th>
              <th>Registration Number</th>
              <th>Email</th>
              <th>Specialization</th>
              <th>Approved Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredApprovedDoctors.length > 0 ? (
              filteredApprovedDoctors.map((doctor, index) => (
                <tr key={doctor._id || index}>
                  <td><strong>Dr. {doctor.name}</strong></td>
                  <td><span className="reg-number">{doctor.registrationNumber}</span></td>
                  <td>{doctor.email}</td>
                  <td>{doctor.specialization || 'N/A'}</td>
                  <td>{formatDate(doctor.updatedAt)}</td>
                  <td>
                    <span className="status-badge status-approved">
                      <i className="fas fa-check-circle"></i> Approved
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-reject"
                        onClick={() => handleDisapproveDoctor(doctor._id, doctor.name)}
                        disabled={loading}
                        title="Disapprove doctor"
                      >
                        Disapprove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">
                  {searchApproved ? 'No doctors found matching your search' : 'No approved doctors yet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </section>
        )}

        {activeSection === 'rejectedDoctors' && (
        <section id="rejected_doctors" className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Previously Rejected Doctors</h2>
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search by name or registration number..."
              value={searchRejectedDoc}
              onChange={(e) => setSearchRejectedDoc(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Doctor Name</th>
              <th>Registration Number</th>
              <th>Email</th>
              <th>Specialization</th>
              <th>Rejected Date</th>
              <th>Rejection Reason</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRejectedDoctors.length > 0 ? (
              filteredRejectedDoctors.map((doctor, index) => (
                <tr key={doctor._id || index}>
                  <td><strong>Dr. {doctor.name}</strong></td>
                  <td><span className="reg-number">{doctor.registrationNumber}</span></td>
                  <td>{doctor.email}</td>
                  <td>{doctor.specialization || 'N/A'}</td>
                  <td>{formatDate(doctor.updatedAt)}</td>
                  <td>
                    <span className="rejection-reason">{doctor.rejectionReason || 'No reason provided'}</span>
                  </td>
                  <td>
                    <span className="status-badge status-rejected">
                      <i className="fas fa-times-circle"></i> Rejected
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-approve"
                        onClick={() => handleUnrejectDoctor(doctor._id, doctor.name)}
                        disabled={loading}
                        title="Un-reject doctor"
                      >
                        Un-reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="no-data">
                  {searchRejectedDoc ? 'No doctors found matching your search' : 'No rejected doctors'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </section>
        )}

        {activeSection === 'approvedSuppliers' && (
        <section id="approved_suppliers" className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Previously Approved Suppliers</h2>
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search by name, email, or supplier ID..."
              value={searchApprovedSup}
              onChange={(e) => setSearchApprovedSup(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Supplier Name</th>
              <th>Supplier ID</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Approved Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredApprovedSuppliers.length > 0 ? (
              filteredApprovedSuppliers.map((supplier, index) => (
                <tr key={supplier._id || index}>
                  <td><strong>{supplier.name}</strong></td>
                  <td><span className="supplier-id">{supplier.supplierID}</span></td>
                  <td>{supplier.email}</td>
                  <td>{supplier.mobile}</td>
                  <td>{formatDate(supplier.updatedAt)}</td>
                  <td>
                    <span className="status-badge status-approved">
                      <i className="fas fa-check-circle"></i> Approved
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-reject"
                        onClick={() => handleDisapproveSupplier(supplier._id, supplier.name)}
                        disabled={loading}
                        title="Disapprove supplier"
                      >
                        Disapprove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">
                  {searchApprovedSup ? 'No suppliers found matching your search' : 'No approved suppliers yet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </section>
        )}

        {activeSection === 'rejectedSuppliers' && (
        <section id="rejected_suppliers" className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Previously Rejected Suppliers</h2>
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search by name, email, or supplier ID..."
              value={searchRejectedSup}
              onChange={(e) => setSearchRejectedSup(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Supplier Name</th>
              <th>Supplier ID</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Rejected Date</th>
              <th>Rejection Reason</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRejectedSuppliers.length > 0 ? (
              filteredRejectedSuppliers.map((supplier, index) => (
                <tr key={supplier._id || index}>
                  <td><strong>{supplier.name}</strong></td>
                  <td><span className="supplier-id">{supplier.supplierID}</span></td>
                  <td>{supplier.email}</td>
                  <td>{supplier.mobile}</td>
                  <td>{formatDate(supplier.updatedAt)}</td>
                  <td>
                    <span className="rejection-reason">{supplier.rejectionReason || 'No reason provided'}</span>
                  </td>
                  <td>
                    <span className="status-badge status-rejected">
                      <i className="fas fa-times-circle"></i> Rejected
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-approve"
                        onClick={() => handleUnrejectSupplier(supplier._id, supplier.name)}
                        disabled={loading}
                        title="Un-reject supplier"
                      >
                        Un-reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="no-data">
                  {searchRejectedSup ? 'No suppliers found matching your search' : 'No rejected suppliers'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </section>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default EmployeeDashboard;