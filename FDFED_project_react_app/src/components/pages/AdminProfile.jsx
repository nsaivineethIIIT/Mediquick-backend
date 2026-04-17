import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext'; // NEW IMPORT
import '../../assets/css/AdminProfile.css';
import '../../assets/css/ProfilePagesUnified.css';

const AdminProfile = () => {
  // Use the context hook to get admin data and functions
  const { admin, loading, error, completedConsultations, pendingConsultations, refetch, logout } = useAdmin(); // MODIFIED
  
  const [isNavOpen, setIsNavOpen] = useState(false);
  const navigate = useNavigate();

  // useEffect for header scroll is retained
  useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector('header');
      if (window.scrollY > 30) {
        header.classList.add('header-active');
      } else {
        header.classList.remove('header-active');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []); //

  // Removed loadProfileData function, as it is now handled by the context

  const toggleMobileNav = () => {
    setIsNavOpen(!isNavOpen);
  }; //

  const closeProfile = () => {
    navigate('/admin/dashboard');
  }; //

  const populateConsultations = (consultations) => {
    if (!consultations || consultations.length === 0) {
      return <p>No consultations found.</p>;
    }
    
    return (
      <table>
        <thead>
          <tr>
            <th>Doctor Name</th>
            <th>Consultation Date</th>
            <th>Slot</th>
            <th>Online/Offline</th>
          </tr>
        </thead>
        <tbody>
          {consultations.map((consultation, index) => (
            <tr key={index}>
              <td>{consultation.doctorName}</td>
              <td>{consultation.consultationDate}</td>
              <td>{consultation.slot}</td>
              <td>{consultation.onlineStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ); //
  };

  return (
    <div className="admin-profile mq-unified-profile">
      {/* Header */}
      <header>
        <Link to="/" className="logo"><span>M</span>edi<span>Q</span>uick</Link>
        <nav className={`navbar ${isNavOpen ? 'nav-toggle' : ''}`}>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/faqs">FAQs</Link></li>
            <li><Link to="/blogs">Blog</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
            <li><Link to="/admin/dashboard">Dashboard</Link></li>
          </ul>
        </nav>
        <div 
          className={`fas ${isNavOpen ? 'fa-times' : 'fa-bars'}`} 
          onClick={toggleMobileNav}
        ></div>
      </header>

      {/* Main Content */}
      <div className="container">
        <div className="close-btn" onClick={closeProfile}>
          <i className="fas fa-times"></i>
        </div>
        
        <h1 className="main-heading">Admin Profile</h1>

        {/* Use loading and error from context */}
        {loading && (
          <div className="loading">
            <i className="fas fa-spinner fa-spin fa-2x"></i><br />
            <p>Loading profile data...</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <br />
            <button className="button" onClick={refetch}> {/* Use refetch from context */}
              Retry
            </button>
          </div>
        )}

        {!loading && !error && admin && (
          <div className="profile-content">
            <div className="profile-info">
              <div className="profile-details">
                <h2>Personal Details</h2>
                <p><strong>Name:</strong> <span id="admin-name">{admin.name}</span></p>
                <p><strong>Email:</strong> <span id="admin-email">{admin.email}</span></p>
                <p><strong>Mobile:</strong> <span id="admin-mobile">{admin.mobile}</span></p>
                <p><strong>Address:</strong> <span id="admin-address">{admin.address}</span></p>
                <p><strong>Company Security Number:</strong> CS123456789</p>
              </div>
            </div>

            <div className="registrations">
              <h2>Completed Consultations</h2>
              <br />
              <div id="completed-consultations">
                {populateConsultations(completedConsultations)}
              </div>
            </div>

            <div className="registrations">
              <h2>Pending Consultations</h2>
              <br />
              <div id="pending-consultations">
                {populateConsultations(pendingConsultations)}
              </div>
            </div>

            <div className="action-buttons">
              <Link to="/admin/edit-profile" className="button">Edit Profile</Link>
              <Link to="/admin/dashboard" className="button">Back to Dashboard</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProfile;