import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './components/common/Header';
import Home from './components/common/Home';
import './utils/toast.css';
import Footer from './components/common/Footer';
import FAQs from './components/FAQ';
import PatientForm from './components/pages/PatientForm';
import PatientDashboard from './components/pages/PatientDashboard';
import PatientAppointments from './components/pages/PatientAppointments';
import BookAppointment from './components/pages/BookAppointment';
import BookDocOnline from './components/pages/BookDocOnline';
import DoctorProfilePatient from './components/pages/DoctorProfilePatient';
import DoctorForm from './components/pages/DoctorForm';
import DoctorDashboard from './components/pages/DoctorDashboard';
import PatientProfile from './components/pages/PatientProfile';
import DoctorProfile from './components/pages/DoctorProfile';
import AdminForm from './components/pages/AdminForm';
import AdminDashboard from './components/pages/AdminDashboard';
import AdminSearchData from './components/pages/AdminSearchData';
import AdminMonitorReviews from './components/pages/AdminMonitorReviews';
import PatientEditProfile from './components/pages/PatientEditProfile';
import DoctorEditProfile from './components/pages/DoctorEditProfile';
import AdminProfile from './components/pages/AdminProfile';
import AdminEditProfile from './components/pages/AdminEditProfile';
import DoctorAnalytics from './components/pages/DoctorAnalytics';
import AdminPatientAnalytics from './components/pages/AdminPatientAnalytics';
import EmployeeForm from './components/pages/EmployeeForm';
import EmployeeDashboard from './components/pages/EmployeeDashboard';
import EmployeeProfile from './components/pages/EmployeeProfile';
import EmployeeEditProfile from './components/pages/EmployeeEditProfile';
import DoctorGeneratePrescriptions from './components/pages/DoctorGeneratePrescriptions';
import DoctorPatientAppointments from './components/pages/DoctorPatientAppointments';
import PatientHistory from './components/pages/PatientHistory';
import DoctorPrescriptions from './components/pages/DoctorPrescriptions';
import PatientPrescriptions from './components/pages/PatientPrescriptions';
import DoctorSchedule from './components/pages/DoctorSchedule';
import SupplierForm from './components/pages/SupplierForm';

import SupplierDashboard from './components/pages/SupplierDashboard';
// Static Pages
import AboutUs from './components/pages/AboutUs';
import ContactUs from './components/pages/ContactUs';
import FAQsPage from './components/pages/FAQs';
// NEW IMPORTS for E-commerce flow
import OrderMedicines from './components/pages/OrderMedicines';
import MedicineDetail from './components/pages/MedicineDetail';
import PatientCart from './components/pages/PatientCart';
import Checkout from './components/pages/Checkout'; 
import PatientOrders from './components/pages/PatientOrders';
import OrderDetails from './components/pages/OrderDetails';
import PaymentPage from './components/pages/PaymentPage';
import OrderSuccess from './components/pages/OrderSuccess';
import BlogPage from './components/pages/BlogPage';
import PostBlog from './components/pages/PostBlog';
import SingleBlog from './components/pages/SingleBlog';
import { PatientProvider } from './context/PatientContext';
import { DoctorProvider } from './context/DoctorContext';
import { AdminProvider } from './context/AdminContext';
import { EmployeeProvider } from './context/EmployeeContext'; // ADDED
import { SupplierProvider } from './context/SupplierContext';
import SupplierProfile from './components/pages/SupplierProfile';
import SupplierEditProfile from './components/pages/SupplierEditProfile';
import ReviewForm from './components/common/ReviewForm';
import PatientReviewPage from './components/pages/PatientReviewPage';
import DoctorReviewPage from './components/pages/DoctorReviewPage';
import ErrorPage from './components/common/ErrorPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  useEffect(() => {
    const previousRootFontSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '14px';

    return () => {
      document.documentElement.style.fontSize = previousRootFontSize;
    };
  }, []);

  const pathname = window.location.pathname;
  const isRoleRoute = /^\/(patient|doctor|admin|employee|supplier)(\/|$)/.test(pathname);
  const showGlobalHeader = !isRoleRoute && pathname !== '/';
  const showGlobalFooter = !isRoleRoute && pathname !== '/';

  return (
    <BrowserRouter>
      <ErrorBoundary>
      <ScrollToTop />
      {showGlobalHeader && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/patient/form" element={<PatientForm />} />
        <Route path="/patient/dashboard" element={<ProtectedRoute role="patient" redirectTo="/patient/form"><PatientProvider><PatientDashboard /></PatientProvider></ProtectedRoute>} />
        <Route path="/patient/appointments" element={<ProtectedRoute role="patient" redirectTo="/patient/form"><PatientProvider><PatientAppointments /></PatientProvider></ProtectedRoute>} />
        <Route path="/patient/book-appointment" element={<ProtectedRoute role="patient" redirectTo="/patient/form"><PatientProvider><BookAppointment /></PatientProvider></ProtectedRoute>} />
        <Route path="/patient/book-doc-online" element={<ProtectedRoute role="patient" redirectTo="/patient/form"><PatientProvider><BookDocOnline /></PatientProvider></ProtectedRoute>} />
        <Route path="/patient/doctor-profile-patient/:id" element={<ProtectedRoute role="patient" redirectTo="/patient/form"><PatientProvider><DoctorProfilePatient /></PatientProvider></ProtectedRoute>} />
        
        {/* DOCTOR ROUTES */}
        <Route path="/doctor/form" element={<DoctorForm />} />
        <Route path="/doctor/dashboard" element={<ProtectedRoute role="doctor" redirectTo="/doctor/form"><DoctorProvider><DoctorDashboard /></DoctorProvider></ProtectedRoute>} />
        <Route path="/doctor/profile" element={
          <ProtectedRoute role="doctor" redirectTo="/doctor/form"><DoctorProvider><DoctorProfile /></DoctorProvider></ProtectedRoute>
        } />
        <Route path="/doctor/edit-profile" element={
          <ProtectedRoute role="doctor" redirectTo="/doctor/form"><DoctorProvider><DoctorEditProfile /></DoctorProvider></ProtectedRoute>
        } />
        <Route path="/doctor/generate-prescriptions" element={<ProtectedRoute role="doctor" redirectTo="/doctor/form"><DoctorProvider><DoctorGeneratePrescriptions /></DoctorProvider></ProtectedRoute>} />
        <Route path="/doctor/prescriptions" element={<ProtectedRoute role="doctor" redirectTo="/doctor/form"><DoctorProvider><DoctorPrescriptions /></DoctorProvider></ProtectedRoute>} />
        <Route path="/doctor/schedule" element={<ProtectedRoute role="doctor" redirectTo="/doctor/form"><DoctorProvider><DoctorSchedule /></DoctorProvider></ProtectedRoute>} />
        <Route path="/doctor/patient-appointments" element={<ProtectedRoute role="doctor" redirectTo="/doctor/form"><DoctorProvider><DoctorPatientAppointments /></DoctorProvider></ProtectedRoute>} />
        <Route path="/doctor/patient-history" element={<ProtectedRoute role="doctor" redirectTo="/doctor/form"><DoctorProvider><PatientHistory /></DoctorProvider></ProtectedRoute>} />
        <Route path="/doctor/submit-review" element={<ProtectedRoute role="doctor" redirectTo="/doctor/form"><DoctorProvider><DoctorReviewPage /></DoctorProvider></ProtectedRoute>} />
        
        {/* ADMIN ROUTES */}
        <Route path="/admin/form" element={<AdminForm />} />
        <Route path="/admin/dashboard" element={<ProtectedRoute role="admin" redirectTo="/admin/form"><AdminProvider><AdminDashboard /></AdminProvider></ProtectedRoute>} />
        <Route path="/admin/search-data" element={<ProtectedRoute role="admin" redirectTo="/admin/form"><AdminProvider><AdminSearchData /></AdminProvider></ProtectedRoute>} />
        <Route path="/admin/doctor-analytics" element={<ProtectedRoute role="admin" redirectTo="/admin/form"><AdminProvider><DoctorAnalytics /></AdminProvider></ProtectedRoute>} />
        <Route path="/admin/patient-analytics" element={<ProtectedRoute role="admin" redirectTo="/admin/form"><AdminProvider><AdminPatientAnalytics /></AdminProvider></ProtectedRoute>} />
        <Route path="/admin/profile" element={<ProtectedRoute role="admin" redirectTo="/admin/form"><AdminProvider><AdminProfile /></AdminProvider></ProtectedRoute>} />
        <Route path="/admin/edit-profile" element={<ProtectedRoute role="admin" redirectTo="/admin/form"><AdminProvider><AdminEditProfile /></AdminProvider></ProtectedRoute>}/>
        
        {/* EMPLOYEE ROUTES */}
        <Route path="/employee/form" element={<EmployeeForm />} />
        <Route path="/employee/dashboard" element={<ProtectedRoute role="employee" redirectTo="/employee/form"><EmployeeProvider><EmployeeDashboard /></EmployeeProvider></ProtectedRoute> } />
        <Route path="/employee/monitor-reviews" element={<ProtectedRoute role="employee" redirectTo="/employee/form"><EmployeeProvider><AdminMonitorReviews /></EmployeeProvider></ProtectedRoute>} />
        <Route path="/employee/profile" element={<ProtectedRoute role="employee" redirectTo="/employee/form"><EmployeeProvider><EmployeeProfile /></EmployeeProvider></ProtectedRoute>} />
        <Route path="/employee/edit-profile" element={<ProtectedRoute role="employee" redirectTo="/employee/form"><EmployeeProvider><EmployeeEditProfile /></EmployeeProvider></ProtectedRoute>} />
        
        {/* PATIENT PROFILE/EDIT ROUTES */}
        <Route path="/patient/profile" element={<ProtectedRoute role="patient" redirectTo="/patient/form"><PatientProvider><PatientProfile /></PatientProvider></ProtectedRoute>} />
        <Route path="/patient/edit-profile" element={<ProtectedRoute role="patient" redirectTo="/patient/form"><PatientProvider><PatientEditProfile /></PatientProvider></ProtectedRoute>} />
        <Route path="/patient/prescriptions" element={<ProtectedRoute role="patient" redirectTo="/patient/form"><PatientProvider><PatientPrescriptions /></PatientProvider></ProtectedRoute>} />
        <Route path="/patient/submit-review" element={<ProtectedRoute role="patient" redirectTo="/patient/form"><PatientProvider><PatientReviewPage /></PatientProvider></ProtectedRoute>} />

        {/* SUPPLIER ROUTES */}
        <Route path="/supplier/form" element={<SupplierForm />} />
        <Route path="/supplier/dashboard" element={<ProtectedRoute role="supplier" redirectTo="/supplier/form"><SupplierProvider><SupplierDashboard /></SupplierProvider></ProtectedRoute>} />
        <Route path="/supplier/profile" element={<ProtectedRoute role="supplier" redirectTo="/supplier/form"><SupplierProvider><SupplierProfile /></SupplierProvider></ProtectedRoute>} />
        <Route path="/supplier/edit-profile" element={<ProtectedRoute role="supplier" redirectTo="/supplier/form"><SupplierProvider><SupplierEditProfile /></SupplierProvider></ProtectedRoute>} />

        {/* NEW E-COMMERCE ROUTES */}
        <Route path="/patient/order-medicines" element={<ProtectedRoute role="patient" redirectTo="/patient/form"><PatientProvider><OrderMedicines /></PatientProvider></ProtectedRoute>} />
        <Route path="/patient/medicines/:id" element={<ProtectedRoute role="patient" redirectTo="/patient/form"><MedicineDetail /></ProtectedRoute>} />
        <Route path="/patient/cart" element={<ProtectedRoute role="patient" redirectTo="/patient/form"><PatientCart /></ProtectedRoute>} />
        <Route path="/patient/orders" element={<ProtectedRoute role="patient" redirectTo="/patient/form"><PatientOrders /></ProtectedRoute>} />
        <Route path="/patient/orders/:id" element={<ProtectedRoute role="patient" redirectTo="/patient/form"><OrderDetails /></ProtectedRoute>} />
        <Route path="/patient/checkout" element={<ProtectedRoute role="patient" redirectTo="/patient/form"><Checkout /></ProtectedRoute>} /> 
        <Route path="/patient/order-details" element={<ProtectedRoute role="patient" redirectTo="/patient/form"><OrderDetails /></ProtectedRoute>} />
        <Route path="/patient/payment" element={<ProtectedRoute role="patient" redirectTo="/patient/form"><PaymentPage /></ProtectedRoute>} />
        <Route path="/patient/order-success" element={<ProtectedRoute role="patient" redirectTo="/patient/form"><OrderSuccess /></ProtectedRoute>} />
        {/* BLOG ROUTES */}
        {/* BLOG ROUTES 📝 (New) */}
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/post" element={<PostBlog />} />
        <Route path="/blog/:id" element={<SingleBlog />} />
        {/* Add route for single blog view. Component conversion not requested, so using placeholder. */}
        
        {/* STATIC PAGES */}
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/faqs" element={<FAQsPage />} />
        <Route path="/contact-us" element={<ContactUs />} />
        
        {/* ERROR PAGE */}
        <Route path="/error" element={<ErrorPage />} />
      </Routes>
        {showGlobalFooter && <Footer />}
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return null;
}