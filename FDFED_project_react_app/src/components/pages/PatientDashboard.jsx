import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../assets/css/PatientDashboard.css';
import { usePatient } from '../../context/PatientContext';

const quickActionDefinitions = [
  { label: 'My Prescriptions', to: '/patient/prescriptions', keywords: ['prescription', 'prescriptions', 'rx'] },
  { label: 'My Appointments', to: '/patient/appointments', keywords: ['appoint', 'appointment', 'appointments', 'booking'] },
  { label: 'Consult Doctors', to: '/patient/book-doc-online', keywords: ['doctor', 'consult', 'consultation', 'online'] },
  { label: 'Order Medicines', to: '/patient/order-medicines', keywords: ['med', 'medicine', 'medicines', 'order', 'pharma'] },
  { label: 'My Cart', to: '/patient/cart', keywords: ['cart', 'checkout'] },
  { label: 'My Orders', to: '/patient/orders', keywords: ['order', 'orders', 'purchase'] },
  { label: 'Blogs', to: '/blog', keywords: ['blog', 'blogs', 'post', 'article'] },
  { label: 'Profile', to: '/patient/profile', keywords: ['profile', 'account', 'details'] },
  { label: 'Leave a Review', to: '/patient/submit-review', keywords: ['review', 'reviews', 'feedback', 'rating', 'comment'] }
];

const dashboardCards = [
  {
    title: 'My Profile',
    description: 'Manage your personal information, medical history, and emergency contacts.',
    icon: 'person',
    footer: 'Last updated: 2 days ago',
    to: '/patient/profile'
  },
  {
    title: 'My Prescriptions',
    description: 'View active medications, dosage instructions, and refill availability.',
    icon: 'medical_services',
    footer: '3 active scripts',
    to: '/patient/prescriptions'
  },
  {
    title: 'Order Medicine',
    description: 'Order health products and have your prescriptions delivered to your door.',
    icon: 'shopping_cart',
    footer: 'Free delivery on $50+',
    to: '/patient/order-medicines',
    action: 'Shop Pharmacy'
  },
  {
    title: 'My Appointments',
    description: 'Review your upcoming visits and view summary notes from past sessions.',
    icon: 'calendar_month',
    footer: 'Next visit: Cardiology, Oct 24 at 10:30 AM',
    to: '/patient/appointments'
  },
  {
    title: 'Consult Doctors',
    description: 'Start an instant video consultation or chat with available specialists.',
    icon: 'video_chat',
    footer: 'Doctors online now',
    to: '/patient/book-doc-online',
    action: 'Start Consult'
  },
  {
    title: 'Book Appointments',
    description: 'Schedule in-person clinic visits or follow-up tele-health calls.',
    icon: 'event_available',
    footer: 'Schedule new appointment',
    to: '/patient/book-appointment',
    action: 'Schedule New'
  },
  {
    title: 'Leave a Review',
    description: 'Share your experience and feedback about our services and healthcare providers.',
    icon: 'rate_review',
    footer: 'Help others make informed decisions',
    to: '/patient/submit-review',
    action: 'Write Review'
  }
];

const mobileNavItems = [
  { label: 'Home', icon: 'home', to: '/patient/dashboard', active: true },
  { label: 'Prescriptions', icon: 'medical_services', to: '/patient/prescriptions' },
  { label: 'Consult', icon: 'video_chat', to: '/patient/book-doc-online' },
  { label: 'Profile', icon: 'person', to: '/patient/profile' }
];

const getDoctorId = (doctor) => doctor?._id || doctor?.id || doctor?.doctorID || '';

const PatientDashboard = () => {
  const { patient, logout } = usePatient();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState({ medicines: [], doctors: [], blogs: [] });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [textSize, setTextSize] = useState('default');
  const [compactCards, setCompactCards] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('patientDashboardTheme') || 'light');
  const searchRef = useRef(null);
  const settingsRef = useRef(null);

  const query = searchText.trim();
  const displayName = patient?.name?.trim()
    ? patient.name.trim().split(' ')[0].replace(/^./, (char) => char.toUpperCase())
    : 'Patient';

  const quickActions = useMemo(() => {
    if (!query) return [];

    return quickActionDefinitions
      .map((action) => {
        const q = query.toLowerCase();
        const exactLabelHit = q === action.label.toLowerCase() ? 3 : 0;
        const labelHit = action.label.toLowerCase().includes(q) ? 2 : 0;
        const keywordHit = action.keywords.some((keyword) => q.includes(keyword)) ? 1 : 0;
        return { ...action, score: exactLabelHit + labelHit + keywordHit };
      })
      .filter((action) => action.score > 0)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  }, [query]);

  useEffect(() => {
    const previousRootFontSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '14px';

    return () => {
      document.documentElement.style.fontSize = previousRootFontSize;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('patientDashboardTheme', theme);
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setSearchResults({ medicines: [], doctors: [], blogs: [] });
      setSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const API = import.meta.env.VITE_API_URL;
        const encoded = encodeURIComponent(query);

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

        setSearchResults({
          medicines: (medicineData?.medicines || []).slice(0, 4),
          doctors: (doctorData?.doctors || []).slice(0, 4),
          blogs: (blogData?.blogs || []).slice(0, 4)
        });
        setSearchOpen(true);
      } catch (error) {
        console.error('Patient dashboard global search failed:', error);
        setSearchResults({ medicines: [], doctors: [], blogs: [] });
        setSearchOpen(true);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const getProfileImageUrl = () => {
    if (!patient?.profilePhoto) return '/images/default-patient.svg';
    const photo = patient.profilePhoto;
    if (/^(https?:|data:|blob:)/i.test(photo)) return photo;
    const API = import.meta.env.VITE_API_URL;
    if (photo.startsWith('/')) return `${API}${photo}`;
    return `${API}/${photo}`;
  };

  const handleLogout = async () => {
    try {
      logout();
    } catch (error) {
      console.error('Error logging out:', error);
      navigate('/patient/form');
    }
  };

  return (
    <div className={`patient-dashboard ${textSize === 'small' ? 'pd--small-text' : ''} ${compactCards ? 'pd--compact-cards' : ''} ${theme === 'dark' ? 'pd--dark-theme' : ''}`}>
      <div className={`pd-header ${isScrolled ? 'pd-header--scrolled' : ''}`} role="banner">
        <div className="pd-header__inner">
          <div className="pd-header__left">
            <Link to="/patient/dashboard" className="pd-header__brand">MediQuick</Link>

            <nav className="pd-header__nav">
              <Link to="/patient/dashboard" className="pd-header__nav-link pd-header__nav-link--active">Home</Link>
              <Link to="/about-us" className="pd-header__nav-link">About</Link>
              <Link to="/faqs" className="pd-header__nav-link">FAQs</Link>
              <Link to="/blog" className="pd-header__nav-link">Blog</Link>
              <Link to="/contact-us" className="pd-header__nav-link">Contact</Link>
            </nav>
          </div>

          <div className="pd-header__right">
            <div className="pd-global-search" ref={searchRef}>
              <div className="pd-global-search__input-wrap">
                <span className="material-symbols-outlined pd-global-search__icon">search</span>
                <input
                  type="text"
                  className="pd-global-search__input"
                  placeholder="Search medical records..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onFocus={() => {
                    if (query.length >= 2) setSearchOpen(true);
                  }}
                />
              </div>

              {searchOpen && (
                <div className="pd-global-search__dropdown">
                  {searchLoading && <div className="pd-global-search__status">Searching...</div>}

                  {!searchLoading && quickActions.length > 0 && (
                    <div className="pd-global-search__group">
                      <div className="pd-global-search__title">Quick Actions</div>
                      {quickActions.map((action) => (
                        <Link key={action.to} to={action.to} className="pd-global-search__item" onClick={() => setSearchOpen(false)}>
                          <span className="pd-global-search__item-main">{action.label}</span>
                          <span className="pd-global-search__item-sub">Go to page</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {!searchLoading && searchResults.medicines.length === 0 && searchResults.doctors.length === 0 && searchResults.blogs.length === 0 && quickActions.length === 0 && (
                    <div className="pd-global-search__status">No matches found</div>
                  )}

                  {!searchLoading && searchResults.medicines.length > 0 && (
                    <div className="pd-global-search__group">
                      <div className="pd-global-search__title">Medicines</div>
                      {searchResults.medicines.map((medicine) => (
                        <Link key={medicine._id} to="/patient/order-medicines" className="pd-global-search__item" onClick={() => setSearchOpen(false)}>
                          <span className="pd-global-search__item-main">{medicine.name}</span>
                          <span className="pd-global-search__item-sub">{medicine.manufacturer || medicine.medicineID}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {!searchLoading && searchResults.doctors.length > 0 && (
                    <div className="pd-global-search__group">
                      <div className="pd-global-search__title">Doctors</div>
                      {searchResults.doctors.map((doctor) => {
                        const doctorId = getDoctorId(doctor);
                        if (!doctorId) return null;

                        return (
                          <Link
                            key={doctorId}
                            to={`/patient/doctor-profile-patient/${doctorId}`}
                            className="pd-global-search__item"
                            onClick={() => setSearchOpen(false)}
                          >
                            <span className="pd-global-search__item-main">Dr. {doctor.name}</span>
                            <span className="pd-global-search__item-sub">{doctor.specialization || doctor.location || 'General'}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {!searchLoading && searchResults.blogs.length > 0 && (
                    <div className="pd-global-search__group">
                      <div className="pd-global-search__title">Blogs</div>
                      {searchResults.blogs.map((blog) => (
                        <Link key={blog._id} to={`/blog/${blog._id}`} className="pd-global-search__item" onClick={() => setSearchOpen(false)}>
                          <span className="pd-global-search__item-main">{blog.title}</span>
                          <span className="pd-global-search__item-sub">{blog.theme || 'Blog Post'}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pd-header__overlay-wrap" ref={settingsRef}>
            <button
              type="button"
              className="pd-header__icon-btn"
              aria-label="Settings"
              aria-expanded={settingsOpen}
              onClick={() => {
                setSettingsOpen((open) => !open);
              }}
            >
              <span className="material-symbols-outlined">settings</span>
            </button>

            {settingsOpen && (
              <div className="pd-overlay-panel pd-overlay-panel--settings" role="dialog" aria-label="Dashboard settings">
                <div className="pd-overlay-panel__header">
                  <h4>Dashboard Settings</h4>
                </div>
                <div className="pd-overlay-panel__body">
                  <div className="pd-settings-group">
                    <p>Text Size</p>
                    <div className="pd-settings-actions">
                      <button
                        type="button"
                        className={textSize === 'default' ? 'active' : ''}
                        onClick={() => setTextSize('default')}
                      >
                        Default
                      </button>
                      <button
                        type="button"
                        className={textSize === 'small' ? 'active' : ''}
                        onClick={() => setTextSize('small')}
                      >
                        Smaller
                      </button>
                    </div>
                  </div>
                  <div className="pd-settings-group">
                    <p>Card Density</p>
                    <div className="pd-settings-actions">
                      <button
                        type="button"
                        className={!compactCards ? 'active' : ''}
                        onClick={() => setCompactCards(false)}
                      >
                        Comfortable
                      </button>
                      <button
                        type="button"
                        className={compactCards ? 'active' : ''}
                        onClick={() => setCompactCards(true)}
                      >
                        Compact
                      </button>
                    </div>
                  </div>
                  <div className="pd-settings-group">
                    <p>Theme</p>
                    <div className="pd-settings-actions">
                      <button
                        type="button"
                        className={theme === 'light' ? 'active' : ''}
                        onClick={() => setTheme('light')}
                      >
                        Light
                      </button>
                      <button
                        type="button"
                        className={theme === 'dark' ? 'active' : ''}
                        onClick={() => setTheme('dark')}
                      >
                        Dark
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>

            <div className="pd-header__divider" aria-hidden="true" />

            <Link to="/patient/profile" className="pd-header__avatar-wrap">
              <img
                src={getProfileImageUrl()}
                alt="Patient Profile"
                className="pd-header__avatar"
                onError={(e) => {
                  e.currentTarget.src = '/images/default-patient.svg';
                }}
              />
            </Link>
            <button type="button" className="pd-header__logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>

      <main className="pd-main">
        <section className="pd-welcome">
          <h1 className="pd-welcome__title">Welcome back, {displayName}!</h1>
          <p className="pd-welcome__subtitle">Your health dashboard is up to date. How can we help you today?</p>
        </section>

        <section className="pd-grid" aria-label="Patient dashboard actions">
          {dashboardCards.map((card) => (
            <Link key={card.title} to={card.to} className="pd-card">
              <div className="pd-card__top">
                <div className="pd-card__icon-wrap">
                  <span className="material-symbols-outlined">{card.icon}</span>
                </div>
                <span className="material-symbols-outlined pd-card__chev">arrow_forward_ios</span>
              </div>

              <h3 className="pd-card__title">{card.title}</h3>
              <p className="pd-card__description">{card.description}</p>

              {card.action ? (
                <div className="pd-card__footer pd-card__footer--button">
                  <span className="pd-card__action-btn">{card.action}</span>
                </div>
              ) : (
                <div className="pd-card__footer">
                  <span>{card.footer}</span>
                </div>
              )}
            </Link>
          ))}
        </section>

        <section className="pd-support">
          <div className="pd-support__media" aria-hidden="true" />
          <div className="pd-support__content">
            <h2 className="pd-support__title">Need immediate assistance?</h2>
            <p className="pd-support__subtitle">Our 24/7 care team is here to help with any medical questions or technical issues you may have.</p>
            <div className="pd-support__actions">
              <Link to="/contact-us" className="pd-btn pd-btn--hover-primary">Live Chat</Link>
              <Link to="/faqs" className="pd-btn pd-btn--outline">View FAQs</Link>
            </div>
          </div>
        </section>
      </main>

      <nav className="pd-bottom-nav" aria-label="Mobile navigation">
        {mobileNavItems.map((item) => (
          <Link key={item.label} to={item.to} className={`pd-bottom-nav__item ${item.active ? 'pd-bottom-nav__item--active' : ''}`}>
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default PatientDashboard;
