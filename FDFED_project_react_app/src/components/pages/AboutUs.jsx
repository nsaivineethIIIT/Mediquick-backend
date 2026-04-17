import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './AboutUs.css';

const AboutUs = () => {
  useEffect(() => {
    const previousRootFontSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '14px';

    return () => {
      document.documentElement.style.fontSize = previousRootFontSize;
    };
  }, []);

  return (
    <div className="about-us-page">
      <nav className="fixed top-0 w-full z-50 bg-slate-50/80 backdrop-blur-xl shadow-sm">
        <div className="flex justify-between items-center px-6 md:px-10 py-4 max-w-[1440px] mx-auto w-full">
          <div className="text-2xl md:text-3xl font-bold tracking-tighter text-blue-700">MediQuick</div>
          <div className="hidden md:flex gap-8 items-center">
            <Link to="/patient/book-doc-online" className="font-manrope font-bold text-sm md:text-base tracking-tight text-blue-700 border-b-2 border-blue-600 pb-1 hover:text-blue-600 transition-colors">Find Doctors</Link>
            <Link to="/about-us" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">Services</Link>
            <Link to="/patient/dashboard" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">Health Records</Link>
            <Link to="/patient/book-appointment" className="font-manrope font-bold text-sm md:text-base tracking-tight text-slate-500 hover:text-blue-600 transition-colors">Appointments</Link>
          </div>
          <div className="flex items-center gap-6">
            <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">search</button>
            <Link to="/patient/form" className="px-6 py-2 bg-primary-container text-on-primary-container rounded-xl font-manrope font-bold text-base md:text-lg tracking-tight scale-95 duration-200 active:opacity-80 transition-all hover:brightness-110">Sign In</Link>
          </div>
        </div>
      </nav>

      <main className="about-us-main">
        <section className="about-us-hero">
          <div className="about-us-hero-inner">
            <span className="about-us-eyebrow">About MediQuick</span>
            <h1>Built to simplify care for every role.</h1>
            <p>
              MediQuick brings patients, doctors, employees, and suppliers into one secure healthcare platform for appointments, records, and day-to-day coordination.
            </p>

            <div className="about-us-stats">
              <div>
                <strong>4</strong>
                <span>Role-based portals</span>
              </div>
              <div>
                <strong>1</strong>
                <span>Shared care workflow</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>Platform availability</span>
              </div>
            </div>
          </div>
        </section>

        <section className="about-us-section about-us-intro-grid">
          <div className="about-us-panel">
            <h2>Our mission</h2>
            <p>
              Make it easy to book visits, manage records, and keep care teams aligned without unnecessary steps.
            </p>
          </div>
          <div className="about-us-panel about-us-panel-accent">
            <h2>What users can do</h2>
            <p>
              Book appointments, manage prescriptions, review health records, and access the right portal for your role.
            </p>
          </div>
        </section>

        <section className="about-us-section">
          <div className="about-us-section-header">
            <h2>What We Offer</h2>
            <p>Core features designed around the workflows used across the site.</p>
          </div>

          <div className="services-grid">
            <div className="service-card">
              <h3>Doctor Access</h3>
              <p>Find doctors and connect with care from one secure platform.</p>
            </div>
            <div className="service-card">
              <h3>Appointment Booking</h3>
              <p>Schedule clinic and online appointments in a few clear steps.</p>
            </div>
            <div className="service-card">
              <h3>Medicine Ordering</h3>
              <p>Order prescribed medicines and track the request through the patient portal.</p>
            </div>
            <div className="service-card">
              <h3>Health Records</h3>
              <p>Keep prescriptions, visit history, and care updates in one secure location.</p>
            </div>
            <div className="service-card">
              <h3>Helpful Updates</h3>
              <p>Read practical healthcare content shared through the platform.</p>
            </div>
            <div className="service-card">
              <h3>Support</h3>
              <p>Get help with login, bookings, and portal navigation when needed.</p>
            </div>
          </div>
        </section>

        <section className="about-us-section about-us-values">
          <div className="about-us-section-header">
            <h2>Our values</h2>
            <p>The platform is shaped around clarity, security, and usability.</p>
          </div>

          <div className="values-grid">
            <div className="value-item">
              <h4>Patient-Centered Care</h4>
              <p>Every feature is built to keep the patient journey simple.</p>
            </div>
            <div className="value-item">
              <h4>Trust & Security</h4>
              <p>Access is handled through secure and role-based protection.</p>
            </div>
            <div className="value-item">
              <h4>Efficiency</h4>
              <p>Workflows stay short so users can move from one task to the next quickly.</p>
            </div>
            <div className="value-item">
              <h4>Accessibility</h4>
              <p>MediQuick is designed to work smoothly across devices and roles.</p>
            </div>
          </div>
        </section>

        <section className="contact-cta">
          <h2>Start using MediQuick</h2>
          <p>
            Use MediQuick to book visits, manage records, and coordinate care through a single platform.
          </p>
        </section>
      </main>
    </div>
  );
};

export default AboutUs;