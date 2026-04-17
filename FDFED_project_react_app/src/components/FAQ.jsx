import { useState } from 'react';

function FAQ() {
  const [activeTab, setActiveTab] = useState('online');
  const [openFAQs, setOpenFAQs] = useState({});

  const faqData = {
    online: [
      {
        question: 'What is an online doctor consultation or online medical consultation?',
        answer: 'An online consultation allows you to connect with a doctor via video or chat for medical advice.',
      },
      {
        question: 'How do I consult a doctor online now?',
        answer: 'You can book an online consultation via the MediQuick website or app by selecting a doctor and time slot.',
      },
      {
        question: 'Do you provide online doctor consultation for emergencies?',
        answer: 'Online consultations are not for emergencies. Please visit a hospital or call an ambulance for urgent care.',
      },
    ],
    pharmacy: [
      {
        question: 'When will I receive my order?',
        answer: 'For any update on your order such as delivery date and time, you can get in touch with our customer service email us at mediquick2025@gmail.com with your order details.',
      },
    ],
  };

  const toggleFAQ = (index) => {
    setOpenFAQs((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-wrap gap-3">
        {Object.keys(faqData).map((category) => (
          <button
            key={category}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === category
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                : 'border border-slate-200 bg-white text-slate-700 hover:scale-105 hover:border-blue-200 hover:text-blue-600'
            }`}
            data-category={category}
            onClick={() => setActiveTab(category)}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)} Consultation
          </button>
        ))}
      </div>
      <div className="divide-y divide-slate-200">
        {faqData[activeTab].map((faq, index) => (
          <div key={index} className="py-2">
            <button
              className="flex w-full items-center justify-between gap-4 py-4 text-left text-base font-semibold text-slate-800 transition-colors hover:text-blue-600"
              onClick={() => toggleFAQ(index)}
            >
              <span>{faq.question}</span>
              <span className={`text-xs text-slate-500 transition-transform ${openFAQs[index] ? 'rotate-180' : ''}`}>
                <i className="fas fa-chevron-down" />
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ${openFAQs[index] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
              <div className="overflow-hidden">
                <p className="pb-4 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FAQ;