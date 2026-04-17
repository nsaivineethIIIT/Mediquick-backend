import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchAdminAppointments,
  selectAdminAppointments,
  selectUniqueDoctors,
  selectUniqueSpecializations,
  selectDoctorEarnings,
  selectSpecializationEarnings,
  selectAppointmentsByDateRange,
  selectAdminLoading
} from '../../store/slices/adminSlice';
import { authenticatedFetch } from '../../utils/authUtils';
import Header from '../common/Header';
import '../../assets/css/AdminSearchData.css';

const AdminSearchData = () => {
  const dispatch = useDispatch();
  const BASE_URL = import.meta.env.VITE_API_URL;
  
  // Redux state
  const appointments = useSelector(selectAdminAppointments);
  const doctors = useSelector(selectUniqueDoctors);
  const specializations = useSelector(selectUniqueSpecializations);
  const adminLoading = useSelector(selectAdminLoading);
  
  // Local state for selections and filters
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRangeDoctor, setDateRangeDoctor] = useState('');
  const [dateRangeSpecialization, setDateRangeSpecialization] = useState('');
  const [error, setError] = useState('');
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalEntity, setGlobalEntity] = useState('all');
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState({
    medicines: [],
    doctors: [],
    patients: [],
    suppliers: [],
    employees: [],
    admins: []
  });
  const [globalSearchMeta, setGlobalSearchMeta] = useState({ total: 0, counts: {} });
  const [isNavOpen, setIsNavOpen] = useState(false);
  
  // Compute derived data using Redux selectors
  const doctorEarnings = useSelector(state => selectDoctorEarnings(state, selectedDoctor));
  const specializationEarnings = useSelector(state => selectSpecializationEarnings(state, selectedSpecialization));
  const dateRangeAppointments = useSelector(state => selectAppointmentsByDateRange(state, startDate, endDate, dateRangeDoctor, dateRangeSpecialization));

  // Calculate totals
  const doctorTotals = doctorEarnings.reduce((acc, day) => ({
    totalFees: acc.totalFees + (day.totalFees || 0),
    totalRevenue: acc.totalRevenue + (day.totalRevenue || 0)
  }), { totalFees: 0, totalRevenue: 0 });

  const specializationTotals = specializationEarnings.reduce((acc, day) => ({
    totalFees: acc.totalFees + (day.totalFees || 0),
    totalRevenue: acc.totalRevenue + (day.totalRevenue || 0)
  }), { totalFees: 0, totalRevenue: 0 });

  const dateRangeTotals = dateRangeAppointments.reduce((acc, appt) => ({
    totalFees: acc.totalFees + (appt.fee || 0),
    totalRevenue: acc.totalRevenue + (appt.revenue || 0)
  }), { totalFees: 0, totalRevenue: 0 });

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Load appointments on component mount (doctors and specializations are derived from appointments)
  useEffect(() => {
    dispatch(fetchAdminAppointments());
  }, [dispatch]);

  // Load available doctors
  // Validation functions (data now comes from Redux selectors)
  const validateDoctorSearch = () => {
    if (!selectedDoctor) {
      alert('Please select a doctor');
      return false;
    }
    return true;
  };

  const validateSpecializationSearch = () => {
    if (!selectedSpecialization) {
      alert('Please select a specialization');
      return false;
    }
    return true;
  };

  const validateDateRange = () => {
    if (!startDate || !endDate) {
      alert('Please select both start date and end date');
      return false;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert('Start date cannot be after end date');
      return false;
    }
    
    return true;
  };

  const handleGlobalSearch = async () => {
    if (!globalQuery.trim()) {
      setError('Please enter a keyword to search.');
      return;
    }

    setGlobalSearchLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        query: globalQuery.trim(),
        entity: globalEntity,
        limit: '20'
      });

      const data = await authenticatedFetch(`${BASE_URL}/admin/api/global-search?${params.toString()}`, 'admin');
      setGlobalSearchResults(data.results || {
        medicines: [],
        doctors: [],
        patients: [],
        suppliers: [],
        employees: [],
        admins: []
      });
      setGlobalSearchMeta({ total: data.total || 0, counts: data.counts || {} });
    } catch (err) {
      setError(err.message || 'Failed to fetch global search data.');
      setGlobalSearchResults({
        medicines: [],
        doctors: [],
        patients: [],
        suppliers: [],
        employees: [],
        admins: []
      });
      setGlobalSearchMeta({ total: 0, counts: {} });
    } finally {
      setGlobalSearchLoading(false);
    }
  };

  const hasAnyGlobalResults = Object.values(globalSearchResults).some((items) => items.length > 0);

  // Toggle mobile navigation
  const toggleMobileNav = () => {
    setIsNavOpen(!isNavOpen);
  };

  return (
    <div className="admin-search-data">
      <Header />

      <div className="search-data-container">
        <div className="search-data-header">
          <Link to="/admin/dashboard" className="search-data-back">← Back to Dashboard</Link>
          <h1>Admin Search Data</h1>
          <p>Search and analyze appointment data by different criteria</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => setError('')} className="btn btn-secondary">
              Dismiss
            </button>
          </div>
        )}

        <section className="search-section">
          <h2 className="section-title">Admin Global Search</h2>
          <div className="filter-container">
            <div className="global-search-form">
              <div className="filter-group">
                <label htmlFor="globalSearchInput">Keyword:</label>
                <input
                  id="globalSearchInput"
                  type="text"
                  value={globalQuery}
                  onChange={(e) => setGlobalQuery(e.target.value)}
                  placeholder="Search medicines, doctors, patients, suppliers..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleGlobalSearch();
                    }
                  }}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="globalEntity">Entity:</label>
                <select
                  id="globalEntity"
                  value={globalEntity}
                  onChange={(e) => setGlobalEntity(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="medicines">Medicines</option>
                  <option value="doctors">Doctors</option>
                  <option value="patients">Patients</option>
                  <option value="suppliers">Suppliers</option>
                  <option value="employees">Employees</option>
                  <option value="admins">Admins</option>
                </select>
              </div>

              <div className="filter-group">
                <button
                  className="search-btn"
                  onClick={handleGlobalSearch}
                  disabled={globalSearchLoading}
                >
                  <i className="fas fa-search"></i>
                  {globalSearchLoading ? ' Searching...' : ' Search'}
                </button>
              </div>
            </div>
          </div>

          {globalSearchMeta.total > 0 && (
            <div className="global-search-counts">
              <strong>Total matches:</strong> {globalSearchMeta.total}
              <span> Medicines: {globalSearchMeta.counts.medicines || 0}</span>
              <span> Doctors: {globalSearchMeta.counts.doctors || 0}</span>
              <span> Patients: {globalSearchMeta.counts.patients || 0}</span>
              <span> Suppliers: {globalSearchMeta.counts.suppliers || 0}</span>
              <span> Employees: {globalSearchMeta.counts.employees || 0}</span>
              <span> Admins: {globalSearchMeta.counts.admins || 0}</span>
            </div>
          )}

          {globalSearchLoading && (
            <div className="global-empty-state">Searching admin data...</div>
          )}

          {!globalSearchLoading && !hasAnyGlobalResults && globalSearchMeta.total === 0 && (
            <div className="global-empty-state">Use the search box above to find data across all entities.</div>
          )}

          {!globalSearchLoading && hasAnyGlobalResults && (
            <div className="global-results-grid">
              {globalSearchResults.medicines.length > 0 && (
                <div className="global-result-card">
                  <h3>Medicines</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Medicine ID</th>
                        <th>Manufacturer</th>
                        <th>Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalSearchResults.medicines.map((item) => (
                        <tr key={`med-${item._id}`}>
                          <td>{item.name}</td>
                          <td>{item.medicineID}</td>
                          <td>{item.manufacturer}</td>
                          <td>{formatCurrency(item.cost || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {globalSearchResults.doctors.length > 0 && (
                <div className="global-result-card">
                  <h3>Doctors</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Specialization</th>
                        <th>Location</th>
                        <th>Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalSearchResults.doctors.map((item) => (
                        <tr key={`doc-${item._id}`}>
                          <td>{item.name}</td>
                          <td>{item.specialization}</td>
                          <td>{item.location || 'N/A'}</td>
                          <td>{formatCurrency(item.consultationFee || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {globalSearchResults.patients.length > 0 && (
                <div className="global-result-card">
                  <h3>Patients</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Patient ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalSearchResults.patients.map((item) => (
                        <tr key={`pat-${item._id}`}>
                          <td>{item.name}</td>
                          <td>{item.email}</td>
                          <td>{item.patientID || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {globalSearchResults.suppliers.length > 0 && (
                <div className="global-result-card">
                  <h3>Suppliers</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Supplier ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalSearchResults.suppliers.map((item) => (
                        <tr key={`sup-${item._id}`}>
                          <td>{item.name}</td>
                          <td>{item.email}</td>
                          <td>{item.supplierID || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {globalSearchResults.employees.length > 0 && (
                <div className="global-result-card">
                  <h3>Employees</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Employee ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalSearchResults.employees.map((item) => (
                        <tr key={`emp-${item._id}`}>
                          <td>{item.name}</td>
                          <td>{item.email}</td>
                          <td>{item.employeeID || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {globalSearchResults.admins.length > 0 && (
                <div className="global-result-card">
                  <h3>Admins</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Mobile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalSearchResults.admins.map((item) => (
                        <tr key={`adm-${item._id}`}>
                          <td>{item.name}</td>
                          <td>{item.email}</td>
                          <td>{item.mobile || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Doctor Earnings Section */}
        <section className="search-section">
          <h2 className="section-title">Doctor Earnings</h2>
          
          {/* Doctor Filter */}
          <div className="filter-container">
            <div className="filter-group">
              <label htmlFor="doctorSelect">Select Doctor:</label>
              <select 
                id="doctorSelect"
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                disabled={adminLoading.appointments}
              >
                <option value="">Select a Doctor</option>
                {doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.specialization}
                  </option>
                ))}
              </select>
              <button 
                className="search-btn" 
                onClick={validateDoctorSearch}
                disabled={adminLoading.appointments}
              >
                <i className="fas fa-search"></i>
                {adminLoading.appointments ? ' Loading...' : ' Search'}
              </button>
            </div>
          </div>
          
          {doctorEarnings.length > 0 && (
            <div className="summary-card">
              <h3>Total Earnings</h3>
              <p>{formatCurrency(doctorTotals.totalFees)}</p>
              <p style={{fontSize: '1rem', marginTop: '5px'}}>
                MediQuick Revenue: {formatCurrency(doctorTotals.totalRevenue)}
              </p>
            </div>
          )}

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Appointments Count</th>
                  <th>Total Fees</th>
                  <th>MediQuick Revenue (10%)</th>
                </tr>
              </thead>
              <tbody>
                {adminLoading.appointments ? (
                  <tr>
                    <td colSpan="4" className="loading">Loading doctor earnings...</td>
                  </tr>
                ) : doctorEarnings.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty">Select a doctor to view earnings</td>
                  </tr>
                ) : (
                  doctorEarnings.map((day, index) => (
                    <tr key={index}>
                      <td>{day.date}</td>
                      <td>{day.count}</td>
                      <td>{formatCurrency(day.totalFees)}</td>
                      <td>{formatCurrency(day.totalRevenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Specialization Earnings Section */}
        <section className="search-section">
          <h2 className="section-title">Specialization Earnings</h2>
          
          {/* Specialization Filter */}
          <div className="filter-container">
            <div className="filter-group">
              <label htmlFor="specializationSelect">Select Specialization:</label>
              <select 
                id="specializationSelect"
                value={selectedSpecialization}
                onChange={(e) => setSelectedSpecialization(e.target.value)}
                disabled={adminLoading.appointments}
              >
                <option value="">Select a Specialization</option>
                {specializations.map(specialization => (
                  <option key={specialization} value={specialization}>
                    {specialization}
                  </option>
                ))}
              </select>
              <button 
                className="search-btn" 
                onClick={validateSpecializationSearch}
                disabled={adminLoading.appointments}
              >
                <i className="fas fa-search"></i>
                {adminLoading.appointments ? ' Loading...' : ' Search'}
              </button>
            </div>
          </div>

          {specializationEarnings.length > 0 && (
            <div className="summary-card">
              <h3>Total Earnings</h3>
              <p>{formatCurrency(specializationTotals.totalFees)}</p>
              <p style={{fontSize: '1rem', marginTop: '5px'}}>
                MediQuick Revenue: {formatCurrency(specializationTotals.totalRevenue)}
              </p>
            </div>
          )}

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Appointments Count</th>
                  <th>Total Fees</th>
                  <th>MediQuick Revenue (10%)</th>
                </tr>
              </thead>
              <tbody>
                {adminLoading.appointments ? (
                  <tr>
                    <td colSpan="4" className="loading">Loading specialization earnings...</td>
                  </tr>
                ) : specializationEarnings.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty">Select a specialization to view earnings</td>
                  </tr>
                ) : (
                  specializationEarnings.map((day, index) => (
                    <tr key={index}>
                      <td>{day.date}</td>
                      <td>{day.count}</td>
                      <td>{formatCurrency(day.totalFees)}</td>
                      <td>{formatCurrency(day.totalRevenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Date Range Appointments Section */}
        <section className="search-section">
          <h2 className="section-title">Appointments by Date Range</h2>
          
          {/* Date Range Filter */}
          <div className="filter-container">
            <div className="date-range-form">
              <div className="filter-group">
                <label htmlFor="startDate">Start Date:</label>
                <input 
                  id="startDate"
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={adminLoading.appointments}
                />
              </div>
              <div className="filter-group">
                <label htmlFor="endDate">End Date:</label>
                <input 
                  id="endDate"
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={adminLoading.appointments}
                />
              </div>
              <div className="filter-group">
                <label htmlFor="dateRangeDoctor">Doctor:</label>
                <select
                  id="dateRangeDoctor"
                  value={dateRangeDoctor}
                  onChange={(e) => setDateRangeDoctor(e.target.value)}
                  disabled={adminLoading.appointments}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">-- All Doctors --</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="dateRangeSpecialization">Specialization:</label>
                <select
                  id="dateRangeSpecialization"
                  value={dateRangeSpecialization}
                  onChange={(e) => setDateRangeSpecialization(e.target.value)}
                  disabled={adminLoading.appointments}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">-- All Specializations --</option>
                  {specializations.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <button 
                  className="search-btn" 
                  onClick={validateDateRange}
                  disabled={adminLoading.appointments}
                >
                  <i className="fas fa-search"></i>
                  {adminLoading.appointments ? ' Loading...' : ' Search'}
                </button>
              </div>
            </div>
          </div>

          {(dateRangeDoctor || dateRangeSpecialization) && dateRangeAppointments.length > 0 && (
            <div style={{
              padding: '10px 15px',
              marginTop: '15px',
              backgroundColor: '#e3f2fd',
              border: '1px solid #2196f3',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              <strong>Active Filters:</strong>
              {dateRangeDoctor && <span> Doctor: {doctors.find(d => d.id === dateRangeDoctor)?.name}</span>}
              {dateRangeDoctor && dateRangeSpecialization && <span> | </span>}
              {dateRangeSpecialization && <span> Specialization: {dateRangeSpecialization}</span>}
            </div>
          )}

          {dateRangeAppointments.length > 0 && (
            <div className="summary-card">
              <h3>Total Earnings for Selected Period</h3>
              <p>{formatCurrency(dateRangeTotals.totalFees)}</p>
              <p style={{fontSize: '1rem', marginTop: '5px'}}>
                MediQuick Revenue: {formatCurrency(dateRangeTotals.totalRevenue)}
              </p>
            </div>
          )}

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Specialization</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Fee</th>
                  <th>MediQuick Revenue (10%)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {adminLoading.appointments ? (
                  <tr>
                    <td colSpan="8" className="loading">Loading appointments...</td>
                  </tr>
                ) : dateRangeAppointments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty">Select date range to view appointments</td>
                  </tr>
                ) : (
                  dateRangeAppointments.map(appt => (
                    <tr key={appt._id}>
                      <td>{appt.patientName}</td>
                      <td>{appt.doctorName}</td>
                      <td>{appt.specialization}</td>
                      <td>{appt.date}</td>
                      <td>{appt.time}</td>
                      <td>{formatCurrency(appt.fee)}</td>
                      <td>{formatCurrency(appt.revenue)}</td>
                      <td>
                        <span className={`status ${appt.status}`}>
                          {appt.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {dateRangeAppointments.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan="5"><strong>Total</strong></td>
                    <td><strong>{formatCurrency(dateRangeTotals.totalFees)}</strong></td>
                    <td><strong>{formatCurrency(dateRangeTotals.totalRevenue)}</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminSearchData;