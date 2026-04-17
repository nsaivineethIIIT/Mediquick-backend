import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../../assets/css/home_page.css';

function Header({ userType, employee, onLogout, showEmployeeProfileIcon = true }) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState({ medicines: [], doctors: [] });
  const searchRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(userType !== 'employee' && window.scrollY > 30);
      setIsNavOpen(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [userType]);

  const toggleNav = () => setIsNavOpen(!isNavOpen);
  const logoStyle = { fontSize: '1.6rem', lineHeight: 1.1 };
  const navLinkStyle = { fontSize: '1.02rem', lineHeight: 1.2 };
  const employeeNavLinkStyle = { fontSize: '1.02rem', lineHeight: 1.2 };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const query = searchText.trim();
    if (query.length < 2) {
      setSearchResults({ medicines: [], doctors: [] });
      setSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const API = import.meta.env.VITE_API_URL;
        const encoded = encodeURIComponent(query);

        const [medicineRes, doctorRes] = await Promise.all([
          fetch(`${API}/medicine/search?query=${encoded}`),
          fetch(`${API}/doctor/search?query=${encoded}`)
        ]);

        const [medicineData, doctorData] = await Promise.all([
          medicineRes.json().catch(() => ({ medicines: [] })),
          doctorRes.json().catch(() => ({ doctors: [] }))
        ]);

        setSearchResults({
          medicines: (medicineData?.medicines || []).slice(0, 4),
          doctors: (doctorData?.doctors || []).slice(0, 4)
        });
        setSearchOpen(true);
      } catch (error) {
        console.error('Global search failed:', error);
        setSearchResults({ medicines: [], doctors: [] });
        setSearchOpen(true);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  const headerClassName = userType === 'employee'
    ? 'mq-employee-header'
    : (isScrolled ? 'header-active' : '');

  return (
    <header className={headerClassName}>
      <Link to="/" className="logo" style={logoStyle}>
        <span>M</span>edi<span>Q</span>uick
      </Link>
      
      {/* Show different nav based on user type */}
      {userType === 'employee' && employee ? (
        <div className="employee-header-section">
          <nav className={`navbar ${isNavOpen ? 'nav-toggle' : ''}`}>
            <ul>
              <li><Link to="/employee/dashboard" style={employeeNavLinkStyle}>Dashboard</Link></li>
              <li><Link to="/employee/monitor-reviews" style={employeeNavLinkStyle}>Monitor Reviews</Link></li>
              <li><Link to="/employee/profile" style={employeeNavLinkStyle}>My Profile</Link></li>
            </ul>
          </nav>
          
          {showEmployeeProfileIcon && (
            <div className="header-profile-section">
              <div className="header-profile-dropdown">
                <Link to="/employee/profile" aria-label="Employee profile">
                  <img 
                    src={employee.profilePhoto || '/images/default-employee.svg'} 
                    alt={employee.name}
                    className="header-profile-photo"
                    onError={(e) => {
                      e.target.src = '/images/default-employee.svg';
                    }}
                  />
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="global-search" ref={searchRef}>
            <div className="global-search__input-wrap">
              <i className="fas fa-search global-search__icon"></i>
              <input
                type="text"
                className="global-search__input"
                placeholder="Search medicines or doctors..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onFocus={() => {
                  if (searchText.trim().length >= 2) setSearchOpen(true);
                }}
              />
            </div>

            {searchOpen && (
              <div className="global-search__dropdown">
                {searchLoading && <div className="global-search__status">Searching...</div>}

                {!searchLoading && searchResults.medicines.length === 0 && searchResults.doctors.length === 0 && (
                  <div className="global-search__status">No matches found</div>
                )}

                {!searchLoading && searchResults.medicines.length > 0 && (
                  <div className="global-search__group">
                    <div className="global-search__title">Medicines</div>
                    {searchResults.medicines.map((medicine) => (
                      <Link
                        key={medicine._id}
                        to="/patient/order-medicines"
                        className="global-search__item"
                        onClick={() => setSearchOpen(false)}
                      >
                        <span className="global-search__item-main">{medicine.name}</span>
                        <span className="global-search__item-sub">{medicine.manufacturer || medicine.medicineID}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {!searchLoading && searchResults.doctors.length > 0 && (
                  <div className="global-search__group">
                    <div className="global-search__title">Doctors</div>
                    {searchResults.doctors.map((doctor) => (
                      (() => {
                        const doctorId = doctor._id || doctor.id || doctor.doctorID;
                        if (!doctorId) return null;

                        return (
                      <Link
                        key={doctorId}
                        to={`/patient/doctor-profile-patient/${doctorId}`}
                        className="global-search__item"
                        onClick={() => setSearchOpen(false)}
                      >
                        <span className="global-search__item-main">Dr. {doctor.name}</span>
                        <span className="global-search__item-sub">{doctor.specialization || doctor.location || 'General'}</span>
                      </Link>
                        );
                      })()
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <nav className={`navbar ${isNavOpen ? 'nav-toggle' : ''}`}>
            <ul>
              <li><Link to="/" style={navLinkStyle}>Home</Link></li>
              <li><Link to="/about-us" style={navLinkStyle}>About Us</Link></li>
              <li><Link to="/faqs" style={navLinkStyle}>FAQs</Link></li>
              <li><Link to="/blog" style={navLinkStyle}>Blog</Link></li>
              <li><Link to="/contact-us" style={navLinkStyle}>Contact Us</Link></li>
            </ul>
          </nav>
        </>
      )}
      
      <i className={`fas ${isNavOpen ? 'fa-times' : 'fa-bars'}`} onClick={toggleNav}></i>
    </header>
  );
}

export default Header;