import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import Footer from './Footer';
import '../../assets/css/home_page.css';

function Home() {
  useEffect(() => {
    const previousRootFontSize = document.documentElement.style.fontSize;
    document.documentElement.classList.add('light');
    document.documentElement.style.fontSize = '14px';

    return () => {
      document.documentElement.classList.remove('light');
      document.documentElement.style.fontSize = previousRootFontSize;
    };
  }, []);

  return (
    <div className="mq-homepage bg-surface text-on-surface antialiased">
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
      <main className="pt-20 md:pt-24">
        <section className="max-w-[1440px] mx-auto w-full px-6 md:px-10 py-10 md:py-14 lg:py-16 min-h-[calc(100vh-92px)] flex flex-col md:flex-row items-center justify-center gap-10 md:gap-12 text-center">
          <div className="flex-1 space-y-8 flex flex-col items-center">
            <span className="inline-block px-3.5 py-1.5 bg-secondary-container text-on-secondary-container rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.24em]">Trusted Healthcare Platform</span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tighter leading-tight">
              Healthcare <br />
              <span className="text-primary italic">made simple.</span>
            </h1>
            <p className="text-sm md:text-base lg:text-lg text-on-surface-variant max-w-lg leading-relaxed font-body mx-auto">
              Book consultations, manage records, and connect with care teams through a secure platform designed for patients, doctors, and healthcare staff.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/patient/book-appointment" className="px-6 md:px-8 py-3.5 md:py-4 bg-primary text-white rounded-2xl font-bold text-sm md:text-base lg:text-lg shadow-[0_20px_40px_rgba(0,88,190,0.15)] hover:brightness-110 transition-all">
                Book Appointment
              </Link>
              <Link to="/about-us" className="px-6 md:px-8 py-3.5 md:py-4 text-primary font-bold text-sm md:text-base lg:text-lg hover:bg-primary-fixed/30 rounded-2xl transition-all">
                Learn More
              </Link>
            </div>
          </div>
          <div className="flex-1 relative flex justify-center">
            <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <img
                alt="Medical Professional"
                className="w-full h-[420px] md:h-[520px] lg:h-[560px] object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAOzfUroCnW2UuppsQAU6VBSrqpllWPQn_AbZC3GVh2zG5TPa4fyHgGumQt9frUpBTGkg7xpE7WX122aL-Horz1ChA6PNY4nvPJcRXQpEEuMr6wiEhJDvh6rhJAJWenWiboWsr2dOMsstNwg6lpQovhb2zpYF20BhJiPQXj0lXcb0IPw_AAKLgv-jflZcEZxpIfvdJeuVhZ6gKfsnjX4cB9VaAn28hwIziLv3VZT-G4LTaUdHkO1apG0AW2IGmcVz8dglI7taNjDh17"
              />
            </div>
          </div>
        </section>

        <section className="bg-surface-container-low py-20 md:py-24">
          <div className="max-w-[1440px] mx-auto px-6 md:px-10">
            <div className="mb-16 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight">Choose Your Portal</h2>
              <p className="text-sm md:text-base text-on-surface-variant mt-2">Tailored access for every role in the care journey.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Link to="/patient/form" className="group bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/15 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 cursor-pointer flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-primary-fixed rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">patient_list</span>
                </div>
                <h3 className="text-base md:text-lg font-bold mb-3 text-on-surface">Patients</h3>
                <p className="text-xs md:text-sm text-on-surface-variant mb-6 leading-relaxed max-w-[18rem]">View records, book visits, and message your care team from one secure dashboard.</p>
                <div className="flex items-center text-sm md:text-base text-primary font-bold gap-2 justify-center">
                  Enter Patient Portal <span className="material-symbols-outlined">arrow_forward</span>
                </div>
              </Link>

              <Link to="/doctor/form" className="group bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/15 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 cursor-pointer flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-tertiary-fixed rounded-2xl flex items-center justify-center text-tertiary mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">medical_services</span>
                </div>
                <h3 className="text-base md:text-lg font-bold mb-3 text-on-surface">Physicians</h3>
                <p className="text-xs md:text-sm text-on-surface-variant mb-6 leading-relaxed max-w-[18rem]">Review appointments, manage patient care, and stay on top of your schedule.</p>
                <div className="flex items-center text-sm md:text-base text-tertiary font-bold gap-2 justify-center">
                  Enter Doctor Portal <span className="material-symbols-outlined">arrow_forward</span>
                </div>
              </Link>

              <Link to="/admin/form" className="group bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/15 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 cursor-pointer flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-secondary-fixed rounded-2xl flex items-center justify-center text-secondary mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">settings_account_box</span>
                </div>
                <h3 className="text-base md:text-lg font-bold mb-3 text-on-surface">Administrators</h3>
                <p className="text-xs md:text-sm text-on-surface-variant mb-6 leading-relaxed max-w-[18rem]">Oversee operations, reports, and healthcare system performance from one place.</p>
                <div className="flex items-center text-sm md:text-base text-secondary font-bold gap-2 justify-center">
                  Enter Admin Portal <span className="material-symbols-outlined">arrow_forward</span>
                </div>
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <Link to="/employee/form" className="group bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/15 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 cursor-pointer flex items-center justify-center gap-5 text-center">
                <div className="w-14 h-14 bg-secondary-fixed rounded-2xl flex items-center justify-center text-secondary flex-shrink-0 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">badge</span>
                </div>
                <div className="text-center">
                  <h3 className="text-base md:text-lg font-bold mb-1.5 text-on-surface">Employees</h3>
                  <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed">Staff tools for HR, schedules, and internal workflows.</p>
                </div>
              </Link>

              <Link to="/supplier/form" className="group bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/15 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 cursor-pointer flex items-center justify-center gap-5 text-center">
                <div className="w-14 h-14 bg-tertiary-fixed rounded-2xl flex items-center justify-center text-tertiary flex-shrink-0 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">inventory_2</span>
                </div>
                <div className="text-center">
                  <h3 className="text-base md:text-lg font-bold mb-1.5 text-on-surface">Suppliers</h3>
                  <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed">Procurement access for inventory and supply tracking.</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-24 bg-surface">
          <div className="max-w-[1440px] mx-auto px-6 md:px-10">
            <div className="flex flex-col items-center text-center gap-6 mb-12">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight">Patient Reviews</h2>
                <p className="text-sm md:text-base text-on-surface-variant mt-2 max-w-2xl">Recent feedback from patients and care teams after using MediQuick.</p>
              </div>
              <Link to="/patient/submit-review" className="inline-flex items-center gap-2 text-primary font-bold text-sm md:text-base justify-center">
                Leave a Review <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-8 items-stretch">
              <div className="bg-surface-container-lowest p-8 md:p-10 rounded-[2rem] border border-outline-variant/10 shadow-sm flex flex-col justify-between items-center text-center">
                <div className="mb-8 text-primary text-5xl leading-none">“</div>
                <p className="text-lg md:text-xl lg:text-[1.45rem] leading-relaxed text-on-surface font-medium max-w-3xl mx-auto">
                  MediQuick has made it easier to manage appointments and records without switching between multiple systems.
                </p>
                <div className="mt-10 flex items-center justify-center gap-4">
                  <img
                    alt="Testimonial User"
                    className="w-14 h-14 rounded-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD6nxAijnIfl6YeKZMshbObQksVjG2Lzttv5bY2CUz5GMbzacsLhpo-idv3OxctkDql7pqSp4HRZGaJfg-nu21JVwm42GdJdQCY0OnwUoLKpjRcR8Vt36eRATlljjWy2BIan4xC2kUAwRf-hlicIV6xP9AqTkzvwsucAkMt4xFQkVqUleG2B2N4rL3ZUMo0t60IpMDPvDnccv_q0ab4sM1YSiEfHJR9A_Luv7H6-xFsbMWocd1LpAW2sxrXMHjODYcM8avtJE2Z8aSJ"
                  />
                  <div className="text-left">
                    <cite className="not-italic font-bold text-on-surface text-base md:text-lg">Elena Rodriguez</cite>
                    <p className="text-sm text-on-surface-variant">Using MediQuick for care management</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-6">
                {[
                  {
                    name: 'Dr. Sarah Chen',
                    role: 'Clinic Director',
                    rating: '5.0',
                    text: 'The portal keeps follow-ups, records, and schedules organized in one place.'
                  },
                  {
                    name: 'Mark Thompson',
                    role: 'Patient',
                    rating: '4.9',
                    text: 'Booking visits and checking prescriptions feels much faster on mobile.'
                  }
                ].map((review) => (
                  <div key={review.name} className="bg-surface-container-lowest p-7 rounded-[1.75rem] border border-outline-variant/10 shadow-sm text-center">
                    <div className="flex items-center justify-between gap-4 mb-5">
                      <div>
                        <h3 className="text-base md:text-lg font-bold text-on-surface">{review.name}</h3>
                        <p className="text-xs md:text-sm text-on-surface-variant">{review.role}</p>
                      </div>
                      <div className="px-3 py-1 rounded-full bg-primary-fixed text-primary text-xs font-bold">{review.rating}/5</div>
                    </div>
                    <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface-container-low/50 py-20 md:py-28">
          <div className="max-w-3xl mx-auto px-6 md:px-8">
            <div className="text-center mb-16">
              <h2 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight mb-4">Common Questions</h2>
              <p className="text-sm md:text-base text-on-surface-variant">Clear answers about using MediQuick day to day.</p>
            </div>
            <div className="space-y-4">
              <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 cursor-pointer group hover:bg-white transition-all">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs md:text-sm text-on-surface">How do I get started with MediQuick?</h4>
                  <span className="material-symbols-outlined text-primary">add</span>
                </div>
                <div className="mt-4 text-on-surface-variant leading-relaxed text-sm md:text-base">
                  Create your account, choose your role, and begin using your portal to book visits, review records, or manage your dashboard.
                </div>
              </div>
              <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 cursor-pointer group hover:bg-white transition-all">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs md:text-sm text-on-surface">Is my data protected?</h4>
                  <span className="material-symbols-outlined text-primary">add</span>
                </div>
                <div className="mt-4 text-on-surface-variant leading-relaxed text-sm md:text-base">
                  Yes. MediQuick is built around secure access, role-based permissions, and protected health information handling.
                </div>
              </div>
              <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 cursor-pointer group hover:bg-white transition-all">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs md:text-sm text-on-surface">Can I access my portal on mobile?</h4>
                  <span className="material-symbols-outlined text-primary">add</span>
                </div>
                <div className="mt-4 text-on-surface-variant leading-relaxed text-sm md:text-base">
                  Yes. The platform is responsive, so you can use your portal from a phone, tablet, or desktop browser.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Home;
