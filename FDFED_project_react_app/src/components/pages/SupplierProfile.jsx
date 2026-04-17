import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSupplier } from '../../context/SupplierContext';
import { removeToken } from '../../utils/authUtils';
import '../../assets/css/supplier_profile.css';
import '../../assets/css/ProfilePagesUnified.css';
import SupplierLayoutShell from '../common/SupplierLayoutShell';

const SupplierProfile = () => {
  const { supplier, loading, error, logout } = useSupplier();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = (e) => {
    e.preventDefault();
    setLoggingOut(true);
    logout();
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <SupplierLayoutShell activeItem="profile">
    <div className="sp-root mq-unified-profile">

      {/* ── Page Body ───────────────────────────────── */}
      <main className="sp-content">

        {loading && (
          <div className="sp-state">
            <div className="sp-spinner"></div>
            <p>Loading profile…</p>
          </div>
        )}

        {error && !loading && (
          <div className="sp-state sp-state--error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && !supplier && (
          <div className="sp-state">
            <p>No supplier data found.</p>
            <Link to="/supplier/form" className="sp-btn-primary">Go to Login</Link>
          </div>
        )}

        {!loading && !error && supplier && (
          <>
            {/* Section title */}
            <div className="sp-section-title">
              <h2>My Profile</h2>
              <p>View your account information.</p>
            </div>

            {/* Profile layout */}
            <div className="sp-layout">

              {/* ── Left: Avatar card ─────────────── */}
              <div className="sp-avatar-card">
                <div className="sp-avatar-circle">
                  {getInitials(supplier.name)}
                </div>
                <div className="sp-avatar-name">{supplier.name}</div>
                <div className="sp-avatar-badge">Supplier</div>
                <div className="sp-avatar-id">ID: {supplier.supplierID || 'N/A'}</div>
                <button
                  className="sp-btn-primary sp-edit-btn"
                  onClick={() => navigate('/supplier/edit-profile')}
                >
                  Edit Profile
                </button>
              </div>

              {/* ── Right: Info card ──────────────── */}
              <div className="sp-info-card">
                <div className="sp-info-card-header">
                  <div className="sp-info-card-title">Account Details</div>
                  <div className="sp-info-card-subtitle">Your registered information</div>
                </div>

                <div className="sp-info-grid">
                  <InfoRow label="Full Name"    value={supplier.name} />
                  <InfoRow label="Email"         value={supplier.email} />
                  <InfoRow label="Mobile"        value={supplier.mobile || 'Not provided'} />
                  <InfoRow label="Address"       value={supplier.address || 'Not provided'} />
                  <InfoRow label="Supplier ID"   value={supplier.supplierID || 'N/A'} mono />
                  <InfoRow label="Account Type"  value="Supplier" accent />
                </div>

                <div className="sp-info-card-footer">
                  <button
                    className="sp-btn-primary"
                    onClick={() => navigate('/supplier/edit-profile')}
                  >
                    Edit Profile
                  </button>
                  <Link to="/supplier/dashboard" className="sp-btn-ghost">
                    Back to Dashboard
                  </Link>
                </div>
              </div>

            </div>
          </>
        )}
      </main>
    </div>
    </SupplierLayoutShell>
  );
};

const InfoRow = ({ label, value, mono, accent }) => (
  <div className="sp-info-row">
    <div className="sp-info-label">{label}</div>
    <div className={`sp-info-value${mono ? ' sp-mono' : ''}${accent ? ' sp-accent' : ''}`}>
      {value}
    </div>
  </div>
);

export default SupplierProfile;
