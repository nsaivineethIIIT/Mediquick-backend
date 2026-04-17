import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../assets/css/DashboardGlobalSearch.css';

const roleActions = {
  patient: [
    { label: 'My Appointments', to: '/patient/appointments', keywords: ['appointment', 'appointments', 'booking', 'book'] },
    { label: 'My Prescriptions', to: '/patient/prescriptions', keywords: ['prescription', 'prescriptions', 'rx', 'medicine list'] },
    { label: 'Order Medicines', to: '/patient/order-medicines', keywords: ['medicine', 'medicines', 'order', 'pharmacy'] },
    { label: 'Consult Doctors', to: '/patient/book-doc-online', keywords: ['doctor', 'consult', 'online'] },
    { label: 'My Cart', to: '/patient/cart', keywords: ['cart', 'checkout', 'bag'] },
    { label: 'My Orders', to: '/patient/orders', keywords: ['order', 'orders', 'purchase', 'medicine order'] },
    { label: 'Blogs', to: '/blog', keywords: ['blog', 'blogs', 'article', 'post'] },
    { label: 'Profile', to: '/patient/profile', keywords: ['profile', 'account', 'details'] }
  ],
  doctor: [
    { label: 'Patient Appointments', to: '/doctor/patient-appointments', keywords: ['appointment', 'appointments', 'booking', 'patient'] },
    { label: 'My Schedule', to: '/doctor/schedule', keywords: ['schedule', 'slot', 'slots'] },
    { label: 'Generate Prescriptions', to: '/doctor/generate-prescriptions', keywords: ['generate prescription', 'prescribe', 'prescription'] },
    { label: 'My Prescriptions', to: '/doctor/prescriptions', keywords: ['prescription', 'prescriptions', 'rx'] },
    { label: 'Patient History', to: '/doctor/patient-history', keywords: ['history', 'patient history'] },
    { label: 'Doctor Analytics', to: '/doctor/dashboard', keywords: ['analytics', 'finance'] },
    { label: 'Blogs', to: '/blog', keywords: ['blog', 'blogs', 'article', 'post'] },
    { label: 'Profile', to: '/doctor/profile', keywords: ['profile', 'account', 'details'] }
  ],
  admin: [
    { label: 'Search Data', to: '/admin/search-data', keywords: ['search', 'data', 'global search', 'analytics'] },
    { label: 'Manage Users', to: '/admin/dashboard', keywords: ['user', 'users', 'manage'] },
    { label: 'Appointments', to: '/admin/search-data', keywords: ['appointment', 'appointments', 'booking'] },
    { label: 'Appointment Finance', to: '/admin/dashboard', keywords: ['finance', 'earnings', 'revenue'] },
    { label: 'Medicine Finance', to: '/admin/dashboard', keywords: ['medicine finance', 'medicine', 'orders'] },
    { label: 'Doctor Analytics', to: '/admin/doctor-analytics', keywords: ['doctor', 'analytics'] },
    { label: 'Patient Analytics', to: '/admin/patient-analytics', keywords: ['patient', 'analytics'] },
    { label: 'Blogs', to: '/blog', keywords: ['blog', 'blogs', 'article', 'post'] },
    { label: 'Profile', to: '/admin/profile', keywords: ['profile', 'account', 'details'] }
  ],
  employee: [
    { label: 'Pending Doctors', to: '/employee/dashboard', keywords: ['doctor', 'pending doctor', 'doctor request'] },
    { label: 'Pending Suppliers', to: '/employee/dashboard', keywords: ['supplier', 'pending supplier', 'supplier request'] },
    { label: 'Approved Doctors', to: '/employee/dashboard', keywords: ['approved doctor', 'approved doctors'] },
    { label: 'Rejected Doctors', to: '/employee/dashboard', keywords: ['rejected doctor', 'rejected doctors'] },
    { label: 'Approved Suppliers', to: '/employee/dashboard', keywords: ['approved supplier', 'approved suppliers'] },
    { label: 'Rejected Suppliers', to: '/employee/dashboard', keywords: ['rejected supplier', 'rejected suppliers'] },
    { label: 'Appointment Reviews', to: '/employee/monitor-reviews', keywords: ['appointment', 'appointments', 'review', 'reviews'] },
    { label: 'Profile', to: '/employee/profile', keywords: ['profile', 'account', 'details'] },
    { label: 'Blogs', to: '/blog', keywords: ['blog', 'blogs', 'article', 'post'] }
  ],
  supplier: [
    { label: 'Overview', to: '/supplier/dashboard', keywords: ['overview', 'dashboard'] },
    { label: 'Orders', to: '/supplier/dashboard', keywords: ['order', 'orders', 'delivery', 'payment'] },
    { label: 'Medicines', to: '/supplier/dashboard', keywords: ['medicine', 'medicines', 'inventory', 'stock'] },
    { label: 'Revenue', to: '/supplier/dashboard', keywords: ['revenue', 'earnings', 'income'] },
    { label: 'Profile', to: '/supplier/profile', keywords: ['profile', 'account', 'details'] },
    { label: 'Blogs', to: '/blog', keywords: ['blog', 'blogs', 'article', 'post'] }
  ]
};

const defaultResultTarget = {
  patient: {
    medicine: '/patient/order-medicines',
    doctor: (id) => `/patient/doctor-profile-patient/${id}`
  },
  doctor: {
    medicine: '/doctor/dashboard',
    doctor: '/doctor/dashboard'
  },
  admin: {
    medicine: '/admin/search-data',
    doctor: '/admin/search-data'
  },
  employee: {
    medicine: '/employee/dashboard',
    doctor: '/employee/dashboard'
  },
  supplier: {
    medicine: '/supplier/dashboard',
    doctor: '/supplier/dashboard'
  }
};

const DashboardGlobalSearch = ({ role = 'patient' }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState({ medicines: [], doctors: [], blogs: [] });
  const searchRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const quickActions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const actions = roleActions[role] || [];
    return actions
      .map((action) => {
        const exactLabelHit = normalized === action.label.toLowerCase() ? 3 : 0;
        const labelHit = action.label.toLowerCase().includes(normalized) ? 2 : 0;
        const keywordHit = action.keywords.some((keyword) => normalized.includes(keyword)) ? 1 : 0;
        const score = exactLabelHit + labelHit + keywordHit;
        return { ...action, score };
      })
      .filter((action) => action.score > 0)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  }, [query, role]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults({ medicines: [], doctors: [], blogs: [] });
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const API = import.meta.env.VITE_API_URL;
        const encoded = encodeURIComponent(trimmed);

        const [medicineRes, doctorRes, blogRes] = await Promise.all([
          fetch(`${API}/medicine/search?query=${encoded}`),
          fetch(`${API}/doctor/search?query=${encoded}`),
          fetch(`${API}/blog/search?query=${encoded}`)
        ]);

        const [medicineData, doctorData, blogData] = await Promise.all([
          medicineRes.json().catch(() => ({ medicines: [] })),
          doctorRes.json().catch(() => ({ doctors: [] })),
          blogRes.json().catch(() => ({ blogs: [] }))
        ]);

        setResults({
          medicines: (medicineData?.medicines || []).slice(0, 4),
          doctors: (doctorData?.doctors || []).slice(0, 4),
          blogs: (blogData?.blogs || []).slice(0, 4)
        });
        setOpen(true);
      } catch (err) {
        setResults({ medicines: [], doctors: [], blogs: [] });
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  const targets = defaultResultTarget[role] || defaultResultTarget.patient;
  const hasResults = results.medicines.length > 0 || results.doctors.length > 0 || results.blogs.length > 0;

  return (
    <div className="dashboard-global-search" ref={searchRef}>
      <div className="dashboard-global-search__input-wrap">
        <i className="fas fa-search dashboard-global-search__icon"></i>
        <input
          type="text"
          className="dashboard-global-search__input"
          placeholder="Search doctors, medicines, blogs, appointments..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setOpen(true);
          }}
        />
      </div>

      {open && (
        <div className="dashboard-global-search__dropdown">
          {loading && <div className="dashboard-global-search__status">Searching...</div>}

          {!loading && quickActions.length > 0 && (
            <div className="dashboard-global-search__group">
              <div className="dashboard-global-search__title">Quick Actions</div>
              {quickActions.map((action) => (
                <Link key={`${action.label}-${action.to}`} to={action.to} className="dashboard-global-search__item" onClick={() => setOpen(false)}>
                  <span className="dashboard-global-search__item-main">{action.label}</span>
                  <span className="dashboard-global-search__item-sub">Go to page</span>
                </Link>
              ))}
            </div>
          )}

          {!loading && results.medicines.length > 0 && (
            <div className="dashboard-global-search__group">
              <div className="dashboard-global-search__title">Medicines</div>
              {results.medicines.map((medicine) => (
                <Link key={medicine._id} to={targets.medicine} className="dashboard-global-search__item" onClick={() => setOpen(false)}>
                  <span className="dashboard-global-search__item-main">{medicine.name}</span>
                  <span className="dashboard-global-search__item-sub">{medicine.manufacturer || medicine.medicineID}</span>
                </Link>
              ))}
            </div>
          )}

          {!loading && results.doctors.length > 0 && (
            <div className="dashboard-global-search__group">
              <div className="dashboard-global-search__title">Doctors</div>
              {results.doctors.map((doctor) => (
                (() => {
                  const doctorId = doctor._id || doctor.id || doctor.doctorID;
                  if (!doctorId) return null;

                  return (
                <Link
                  key={doctorId}
                  to={typeof targets.doctor === 'function' ? targets.doctor(doctorId) : targets.doctor}
                  className="dashboard-global-search__item"
                  onClick={() => setOpen(false)}
                >
                  <span className="dashboard-global-search__item-main">Dr. {doctor.name}</span>
                  <span className="dashboard-global-search__item-sub">{doctor.specialization || doctor.location || 'General'}</span>
                </Link>
                  );
                })()
              ))}
            </div>
          )}

          {!loading && results.blogs.length > 0 && (
            <div className="dashboard-global-search__group">
              <div className="dashboard-global-search__title">Blogs</div>
              {results.blogs.map((blog) => (
                <Link key={blog._id} to={`/blog/${blog._id}`} className="dashboard-global-search__item" onClick={() => setOpen(false)}>
                  <span className="dashboard-global-search__item-main">{blog.title}</span>
                  <span className="dashboard-global-search__item-sub">{blog.theme || 'Blog Post'}</span>
                </Link>
              ))}
            </div>
          )}

          {!loading && quickActions.length === 0 && !hasResults && (
            <div className="dashboard-global-search__status">No matches found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardGlobalSearch;
