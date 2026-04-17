import React, { useEffect, useState } from 'react';
import './ContactUs.css';

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    category: 'general'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    const previousRootFontSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '14px';

    return () => {
      document.documentElement.style.fontSize = previousRootFontSize;
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitMessage('Thank you for your message! We will get back to you within 24 hours.');
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        category: 'general'
      });
    }, 2000);
  };

  return (
    <div className="contact-us-container">
      <div className="contact-us-content">
        <div className="contact-main">
          <h2 className="page-heading">Contact MediQuick</h2>
          <div className="contact-info">
            <h2>Get In Touch</h2>
            <p>
              Have questions, concerns, or need assistance? Our dedicated support team is 
              ready to help you 24/7. Choose the method that works best for you.
            </p>

            <div className="contact-methods">
              <div className="contact-method">
                <div className="method-icon">📞</div>
                <div className="method-details">
                  <h4>Phone Support</h4>
                  <p>+1-800-FDFED-CARE</p>
                  <p>Available 24/7</p>
                </div>
              </div>

              <div className="contact-method">
                <div className="method-icon">📧</div>
                <div className="method-details">
                  <h4>Email Support</h4>
                  <p>support@fdfed-healthcare.com</p>
                  <p>Response within 2 hours</p>
                </div>
              </div>

              <div className="contact-method">
                <div className="method-icon">💬</div>
                <div className="method-details">
                  <h4>Live Chat</h4>
                  <p>Available on website</p>
                  <p>9:00 AM - 9:00 PM</p>
                </div>
              </div>

              <div className="contact-method">
                <div className="method-icon">📍</div>
                <div className="method-details">
                  <h4>Office Address</h4>
                  <p>123 Healthcare Ave</p>
                  <p>Medical District, City 12345</p>
                </div>
              </div>
            </div>

            <div className="emergency-notice">
              <h3>🚨 Medical Emergency?</h3>
              <p>
                For life-threatening emergencies, please call 911 or visit your nearest 
                emergency room immediately. This contact form is not monitored for 
                emergency medical situations.
              </p>
            </div>
          </div>

          <div className="contact-form-section">
            <form className="contact-form" onSubmit={handleSubmit}>
              <h3>Send Us a Message</h3>

              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  <option value="general">General Inquiry</option>
                  <option value="technical">Technical Support</option>
                  <option value="billing">Billing & Payments</option>
                  <option value="appointments">Appointments</option>
                  <option value="prescriptions">Prescriptions</option>
                  <option value="feedback">Feedback & Suggestions</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Subject *</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    placeholder="Brief subject line"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows="6"
                  placeholder="Please describe your inquiry in detail..."
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>

              {submitMessage && (
                <div className="submit-message success">
                  {submitMessage}
                </div>
              )}
            </form>
          </div>
        </div>

        <section className="office-hours">
          <h2>Office Hours</h2>
          <div className="hours-grid">
            <div className="hours-item">
              <strong>Customer Support</strong>
              <p>24/7 - Always Available</p>
            </div>
            <div className="hours-item">
              <strong>Technical Support</strong>
              <p>Monday - Sunday: 6:00 AM - 11:00 PM</p>
            </div>
            <div className="hours-item">
              <strong>Billing Department</strong>
              <p>Monday - Friday: 8:00 AM - 6:00 PM</p>
            </div>
            <div className="hours-item">
              <strong>Administration</strong>
              <p>Monday - Friday: 9:00 AM - 5:00 PM</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ContactUs;