import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import MedicineHeader from '../common/MedicineHeader';
import { showMessage, getToastClass } from '../../utils/alerts';
import { getToken, removeToken } from '../../utils/authUtils';
import '../../assets/css/PaymentPage.css';

const PaymentPage = () => {
    const [orderDetails, setOrderDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState('upi'); // Default to a non-COD method
    const [displayTotal, setDisplayTotal] = useState(0);
    const navigate = useNavigate();

    const COD_CHARGE = 10;

    // Fetch order details on component mount
    useEffect(() => {
        fetchOrderDetails();
    }, []);

    const fetchOrderDetails = async () => {
        setLoading(true);
        try {
            const token = getToken();
            // Fetch order details from session (checkoutController.js)
            const API = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API}/patient/api/session-order-details`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include' // Include cookies for session management
            }); 
            
            if (response.status === 401) {
                removeToken();
                navigate('/patient/form');
                return;
            }
            
            if (response.status === 404) {
                 navigate('/patient/order-medicines');
                 return;
            }

            const data = await response.json();
            
            if (data.orderDetails) {
                setOrderDetails(data.orderDetails);
            } else {
                 throw new Error('No order details found. Please go back to checkout.');
            }

        } catch (err) {
            console.error('Error fetching order details for payment:', err);
            navigate('/patient/order-medicines');
        } finally {
            setLoading(false);
        }
    };

    // Update total when payment method or order details change
    useEffect(() => {
        if (!orderDetails) return;

        const baseTotal = orderDetails.finalTotal || 0;
        if (paymentMethod === 'cod') {
            setDisplayTotal(baseTotal + COD_CHARGE);
        } else {
            setDisplayTotal(baseTotal);
        }
    }, [paymentMethod, orderDetails]);

    const selectPayment = (method) => {
        setPaymentMethod(method);
    };
    
    const processPayment = async () => {
        if (!orderDetails) {
            alert("No order details found. Please go back and try again.");
            return;
        }
        
        console.log('Processing payment with method:', paymentMethod);
        const loadingSpinner = document.getElementById("loadingSpinner");
        const payButton = document.querySelector(".btn-pay-now");

        loadingSpinner.style.display = "block";
        payButton.disabled = true;

        try {
            const token = getToken();
            const API = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API}/patient/process-payment`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include', // Include cookies for session management
                body: JSON.stringify({ paymentMethod })
            });

            if (response.status === 401) {
                removeToken();
                navigate('/patient/form');
                return;
            }

            const data = await response.json();

            if (data.success) {
                // Show success message before redirect
                alert("Payment processed successfully! Redirecting to confirmation...");
                // Redirect to success page
                navigate(`/patient/order-success?paymentMethod=${paymentMethod}`);
            } else {
                alert("Payment failed: " + (data.error || 'Unknown error occurred'));
            }
        } catch (error) {
            console.error("Payment error:", error);
            alert("Payment failed. Please try again.");
        } finally {
            loadingSpinner.style.display = "none";
            payButton.disabled = false;
        }
    };

    if (loading || !orderDetails) return <div style={{paddingTop: '80px', textAlign: 'center'}}>Loading...</div>;

    return (
        <>
            <MedicineHeader />
            <div style={{ height: '76px' }} />
            <div className="container payment-container">
                <div className="text-center mb-4">
                    <h2><i className="fas fa-credit-card me-2"></i>Payment</h2>
                    <p className="text-muted">Choose your preferred payment method</p>
                </div>

                <div className="payment-card">
                    <h5 className="mb-3">Order Summary</h5>
                    <div className="d-flex justify-content-between mb-2">
                        <span>Items Total:</span>
                        <span>₹{orderDetails.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                        <span>Delivery Charges:</span>
                        <span>₹{orderDetails.deliveryCharge.toFixed(2)}</span>
                    </div>
                    {paymentMethod === 'cod' && (
                        <div className="d-flex justify-content-between mb-2 text-danger">
                            <span>COD Fee:</span>
                            <span>+ ₹{COD_CHARGE.toFixed(2)}</span>
                        </div>
                    )}
                    
                    <hr />
                    <div className="d-flex justify-content-between align-items-center">
                        <span>Total Amount:</span>
                        <span className="amount-display">
                            ₹{displayTotal.toFixed(2)}
                        </span>
                    </div>
                </div>

                <div className="payment-card">
                    <h5 className="mb-3">Select Payment Method</h5>
                    <div className="payment-options-grid">
                        {['card', 'upi', 'cod'].map(method => (
                        <div
                            key={method}
                            className={`payment-method ${paymentMethod === method ? 'selected' : ''}`}
                            onClick={() => selectPayment(method)}
                            id={`${method}-payment`}
                        >
                            <input type="radio" name="paymentMethod" value={method} id={method} checked={paymentMethod === method} style={{ display: 'none' }} readOnly/>
                            <div className="d-flex align-items-center">
                                <i className={`fas fa-${method === 'card' ? 'credit-card' : method === 'upi' ? 'mobile-alt' : 'money-bill-wave'} payment-icon text-${method === 'card' ? 'primary' : method === 'upi' ? 'success' : 'warning'}`}></i>
                                <div>
                                    <h6 className="mb-1">{method === 'card' ? 'Credit/Debit Card' : method === 'upi' ? 'UPI Payment' : 'Cash on Delivery'}</h6>
                                    <small className="text-muted">{method === 'card' ? 'Pay securely with your card' : method === 'upi' ? 'Pay using UPI apps' : 'Pay when you receive your order'}</small>
                                </div>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>

                <div className="payment-card">
                    <button className="btn btn-pay-now" onClick={processPayment} style={{background: 'linear-gradient(45deg, #e74c3c, #c0392b)', color: 'white', fontSize: '1.2rem', padding: '12px 30px', border: 'none', borderRadius: '8px', width: '100%'}}>
                        <i className="fas fa-lock me-2"></i>Pay Now - ₹{displayTotal.toFixed(2)}
                    </button>
                    <div className="text-center mt-2">
                        <small className="text-muted">Your payment is secure and encrypted</small>
                    </div>
                </div>

                <div className="text-center">
                    <Link to="/patient/order-details" className="btn btn-outline-secondary">
                        <i className="fas fa-arrow-left me-2"></i>Back to Order
                    </Link>
                </div>
            </div>

            <div id="loadingSpinner" className="text-center" style={{ display: 'none', position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1001, background: 'white', padding: '20px', borderRadius: '8px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Processing...</span>
                </div>
                <p className="mt-2">Processing your payment...</p>
            </div>
            <style>{`
                .payment-options-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                }
                .payment-method {
                    border: 2px solid #e0e0e0;
                    border-radius: 8px;
                    padding: 1rem;
                    cursor: pointer;
                    transition: all 0.2s ease-in-out;
                }
                .payment-method:hover {
                    border-color: #0d6efd;
                }
                .payment-method.selected {
                    border-color: #0d6efd;
                    box-shadow: 0 0 10px rgba(13, 110, 253, 0.4);
                }
            `}</style>
        </>
    );
};

export default PaymentPage;