import React, { useEffect, useState } from 'react';
import './FAQs.css';

const FAQs = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    const previousRootFontSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '14px';

    return () => {
      document.documentElement.style.fontSize = previousRootFontSize;
    };
  }, []);

  const faqData = [
    {
      question: "How do I get started with MediQuick?",
      answer: "Open the homepage, choose your role, and sign in or register from the right portal. Once logged in, you can use the features that match your role."
    },
    {
      question: "Is my information protected?",
      answer: "Yes. MediQuick uses secure access and role-based permissions to help keep personal and health information protected."
    },
    {
      question: "Can I book both clinic and online visits?",
      answer: "Yes. The platform supports both appointment types so you can choose the option that fits your care needs."
    },
    {
      question: "How do I order medicines?",
      answer: "After a prescription is available, go to the medicine section, add the items to your cart, and continue to checkout."
    },
    {
      question: "Where can I see my records and prescriptions?",
      answer: "Your patient dashboard keeps visit history, prescriptions, and related records in one place for easy access."
    },
    {
      question: "Can I change or cancel an appointment?",
      answer: "Yes. You can manage upcoming appointments from your dashboard before the scheduled time."
    },
    {
      question: "What support is available?",
      answer: "If you need help with login, booking, or navigation, the support options below can guide you."
    },
    {
      question: "How do I register as a new patient?",
      answer: "Use the patient sign-in page to create your account, verify your details, and start using the patient portal."
    },
    {
      question: "Are consultations confidential?",
      answer: "Yes. Access is restricted to the user and the relevant care team, helping keep consultations private."
    },
    {
      question: "What if I have technical issues?",
      answer: "Refresh the page, try another device, or use the contact support options if the issue continues."
    },
    {
      question: "How do I access the portal on mobile?",
      answer: "MediQuick is responsive, so the main pages and dashboards work across phones, tablets, and desktops."
    },
    {
      question: "Can I get help from more than one doctor?",
      answer: "Yes. You can book appointments with different doctors and keep the related records in your account."
    }
  ];

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className="faqs-container">
      <div className="faqs-content">
        <div className="faqs-list">
          <h2 className="page-heading">MediQuick - Frequently Asked Questions</h2>
          {faqData.map((faq, index) => (
            <div key={index} className={`faq-item ${activeIndex === index ? 'active' : ''}`}>
              <button 
                className="faq-question"
                type="button"
                onClick={() => toggleFAQ(index)}
                aria-expanded={activeIndex === index}
              >
                <span>{faq.question}</span>
                <span className={`faq-icon ${activeIndex === index ? 'rotated' : ''}`}>+</span>
              </button>
              <div className={`faq-answer ${activeIndex === index ? 'expanded' : ''}`}>
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="contact-support">
          <h2>Still Have Questions?</h2>
          <p>
            If you need more help, our support team can guide you through booking, account access, and portal navigation.
          </p>
          <div className="support-methods">
            <div className="support-method">
              <h4>📞 Phone Support</h4>
              <p>+1-800-FDFED-CARE (24/7)</p>
            </div>
            <div className="support-method">
              <h4>📧 Email Support</h4>
              <p>support@fdfed-healthcare.com</p>
            </div>
            <div className="support-method">
              <h4>💬 Live Chat</h4>
              <p>Available on our website (9 AM - 9 PM)</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FAQs;