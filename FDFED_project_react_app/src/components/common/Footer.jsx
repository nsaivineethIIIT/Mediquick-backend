import { Link } from 'react-router-dom';
import '../../assets/css/Footer.css';

function Footer() {
  return (
    <footer className="mq-footer">
      <div className="mq-footer__inner">
        <div className="mq-footer__column">
          <h2 className="mq-footer__brand">
            Medi<span>Quick</span>
          </h2>
          <p className="mq-footer__intro">
            A secure healthcare platform for appointments, consultations, records, and coordinated care.
          </p>
        </div>

        <div className="mq-footer__column">
          <h3 className="mq-footer__title">Share</h3>
          <div className="mq-footer__links">
            <a className="mq-footer__link" href="mailto:mediquick2025@gmail.com">Email</a>
            <a className="mq-footer__link" href="https://www.facebook.com/share/1568c6qDuW/">Facebook</a>
            <a className="mq-footer__link" href="https://www.instagram.com/mediquick2025?igsh=MXVqaDRkY2xvNGJsZg==">Instagram</a>
            <a className="mq-footer__link" href="https://www.linkedin.com/in/medi-quick-437318355?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app">LinkedIn</a>
          </div>
        </div>

        <div className="mq-footer__column">
          <h3 className="mq-footer__title">Links</h3>
          <div className="mq-footer__links">
            <Link className="mq-footer__link" to="/">Home</Link>
            <Link className="mq-footer__link" to="/about-us">About Us</Link>
            <Link className="mq-footer__link" to="/faqs">FAQ's</Link>
            <Link className="mq-footer__link" to="/contact-us">Contact Us</Link>
            <Link className="mq-footer__link" to="/blog">Blog</Link>
            
          </div>
        </div>
      </div>

      <div className="mq-footer__bottom">
        <div className="mq-footer__copyright">
          Created by <span>Team MediQuick</span>. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;