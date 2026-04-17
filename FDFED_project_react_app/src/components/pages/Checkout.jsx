import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import MedicineHeader from '../common/MedicineHeader';
import { showMessage, getToastClass } from '../../utils/alerts';
import { getToken, removeToken } from '../../utils/authUtils';
import '../../assets/css/Checkout.css';

const Checkout = () => {
    const [patientData, setPatientData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [isNewAddressFormVisible, setIsNewAddressFormVisible] = useState(true);
    const [initialError, setInitialError] = useState(null);
    
    const navigate = useNavigate();
    const location = useLocation();
    
    const searchParams = new URLSearchParams(location.search);
    const isSingle = searchParams.get('type') === 'single';
    const medicineId = searchParams.get('medicineId');
    const quantity = searchParams.get('quantity');
    const errorFromRedirect = searchParams.get('error');

    // Form state for new address
    const [newAddress, setNewAddress] = useState({
        label: 'Home', street: '', city: '', state: '', zip: '', country: 'India'
    });
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        if (errorFromRedirect) {
             showMessage(decodeURIComponent(errorFromRedirect), getToastClass('danger'));
        }
        
        fetchCheckoutData();
    }, [location.search]);

    const fetchCheckoutData = async () => {
        setLoading(true);
        try {
            const token = getToken();
            // Assuming a dedicated API endpoint returns checkout setup data
            const API = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API}/patient/api/checkout-data`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }); 
            
            if (response.status === 401) {
                removeToken();
                navigate('/patient/form');
                return;
            }
            
            if (!response.ok) throw new Error('Failed to fetch checkout data. Please log in.');

            const data = await response.json(); 
            const addresses = data.addresses || [];
            setPatientData(data); 

            // Initialize selection: if saved addresses exist, select the first one.
            if (addresses.length > 0) {
                const defaultAddress = addresses[0];
                setSelectedAddressId(defaultAddress._id);
                setIsNewAddressFormVisible(false); // Use saved address initially
            } else {
                setSelectedAddressId(null);
                setIsNewAddressFormVisible(true); // Default to new form
            }
        } catch (err) {
            console.error('Error fetching checkout data:', err);
            setInitialError('Failed to load checkout details. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSavedAddress = (id) => {
        setSelectedAddressId(id);
        setIsNewAddressFormVisible(false);
        setFormErrors({});
    };

    const handleUseNewAddress = () => {
        setSelectedAddressId(null);
        setIsNewAddressFormVisible(true);
    };

    const handleNewAddressChange = (e) => {
        const { name, value } = e.target;
        setNewAddress(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateNewAddress = () => {
        const errors = {};
        if (!newAddress.street.trim()) errors.street = 'Street Address is required';
        if (!newAddress.city.trim()) errors.city = 'City is required';
        if (!newAddress.state.trim()) errors.state = 'State is required';
        if (!newAddress.zip.trim()) errors.zip = 'ZIP Code is required';
        if (!newAddress.country.trim()) errors.country = 'Country is required';
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';

        let payload = {};
        
        if (isSingle) {
            payload = { type: 'single', medicineId, quantity };
        } else {
            payload = { type: 'cart' };
        }

        if (selectedAddressId && !isNewAddressFormVisible) {
            // Case 1: Using saved address
            payload.selectedAddressId = selectedAddressId;
        } else if (isNewAddressFormVisible) {
            // Case 2: Using new address
            if (!validateNewAddress()) {
                showMessage('Please fill in all required address fields.', getToastClass('danger'));
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-shopping-bag me-2"></i>Review Order & Continue';
                return;
            }
            payload = { ...payload, ...newAddress };
        } else {
            // Should not happen if initial logic is correct, but safe guard
            showMessage('Please select or enter a delivery address.', getToastClass('danger'));
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-shopping-bag me-2"></i>Review Order & Continue';
            return;
        }

        try {
            const token = getToken();
            // Submit to the server POST endpoint
            const API = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API}/patient/checkout`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include', // Include cookies for session management
                body: JSON.stringify(payload)
            });

            if (response.status === 401) {
                removeToken();
                navigate('/patient/form');
                return;
            }

            const data = await response.json();

            if (response.ok && data.success && data.redirectUrl) {
                // Navigate to the order details page on the client side
                navigate(data.redirectUrl);
            } else if (!response.ok && data.redirectUrl) {
                // Handle error with redirect from backend
                navigate(data.redirectUrl);
            } else {
                throw new Error(data.error || data.message || 'Error processing checkout.');
            }

        } catch (error) {
            console.error('Checkout error:', error);
            const errorMsg = error.message || 'Error processing checkout';
            showMessage(errorMsg, getToastClass('danger'));
            const redirectUrl = `/patient/checkout?${isSingle ? `type=single&medicineId=${medicineId}&quantity=${quantity}&` : ''}error=${encodeURIComponent(errorMsg)}`;
            navigate(redirectUrl);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-shopping-bag me-2"></i>Review Order & Continue';
        }
    };

    if (loading) return <div style={{paddingTop: '80px', textAlign: 'center'}}>Loading...</div>;
    if (initialError) return <div style={{paddingTop: '80px', textAlign: 'center', color: 'red'}}>{initialError}</div>;

    const addresses = patientData?.addresses || [];
    
    return (
        <>
            <MedicineHeader />
            <div className="container checkout-container" style={{ paddingTop: '100px', maxWidth: '1000px' }}>
                <div style={{textAlign: 'center', marginBottom: '3rem'}}>
                    <h1 style={{color: 'var(--primary-color, #007bff)', fontSize: '2.5rem', fontWeight: '600', marginBottom: '0.5rem'}}>Checkout</h1>
                    <p style={{color: '#6c757d', fontSize: '1.1rem'}}>Review your order and delivery details</p>
                </div>
                
                {/* Initial Error Display (from URL) */}
                {errorFromRedirect && (
                    <div className="alert alert-danger">
                        <strong>Error:</strong> {decodeURIComponent(errorFromRedirect)}
                    </div>
                )}

                {/* Order Summary (Placeholder values from EJS) */}
                <div className="order-summary">
                    <h5 className="mb-3">Order Summary</h5>
                    <div className="summary-item">
                        <span>Items Total:</span>
                        <span>Calculated at next step</span>
                    </div>
                    <div className="summary-item">
                        <span>Delivery Charges:</span>
                        <span>₹10.00</span>
                    </div>
                    <div className="summary-item total-amount">
                        <span>Total Amount:</span>
                        <span>Will be calculated</span>
                    </div>
                </div>

                <form id="checkoutForm" onSubmit={handleSubmit}>
                    {isSingle && (
                        <>
                            <input type="hidden" name="type" value="single" />
                            <input type="hidden" name="medicineId" value={medicineId} />
                            <input type="hidden" name="quantity" value={quantity} />
                        </>
                    )}
                    {!isSingle && <input type="hidden" name="type" value="cart" />}

                    <div className="mb-4">
                        <h4 className="mb-3">Delivery Address</h4>
                        
                        {/* Saved Addresses */}
                        {addresses.length > 0 && (
                            <div className="saved-addresses-section">
                                <h5 className="mb-3">Select from saved addresses</h5>
                                <div id="savedAddresses">
                                    {addresses.map(addr => (
                                        <div key={addr._id} className={`address-card ${selectedAddressId === addr._id && !isNewAddressFormVisible ? 'selected' : ''}`} onClick={() => handleSelectSavedAddress(addr._id)} id={`saved-card-${addr._id}`}>
                                            <h6 className="mb-2">
                                                {addr.label || 'Address'}
                                                {addr.isDefault && <span className="badge bg-success ms-2">Default</span>}
                                            </h6>
                                            <p className="mb-1">{addr.street}</p>
                                            <p className="mb-1">{addr.city}, {addr.state} {addr.zip}</p>
                                            <p className="mb-0">{addr.country}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Add New Address Button */}
                        <div className="mt-3 mb-3">
                            <button type="button" className="btn btn-outline-primary" onClick={handleUseNewAddress}>
                                <i className="fas fa-plus me-1"></i>Add New Address
                            </button>
                        </div>

                        {/* New Address Form Section - Shows below the button */}
                        <div className="address-form-section" style={{display: isNewAddressFormVisible ? 'block' : 'none'}}>
                            <div className="alert alert-info">
                                <strong>Enter Delivery Address</strong> - This address will be saved for future orders
                            </div>
                            
                            <div className="row">
                                <div className="col-md-6 form-group">
                                    <FormGroup label="Label" name="label" value={newAddress.label} onChange={handleNewAddressChange} required={isNewAddressFormVisible} disabled={!isNewAddressFormVisible} error={formErrors.label}/>
                                </div>
                            </div>
                            <FormGroup label="Street Address" name="street" value={newAddress.street} onChange={handleNewAddressChange} required={isNewAddressFormVisible} disabled={!isNewAddressFormVisible} error={formErrors.street}/>
                            <div className="row">
                                <div className="col-md-6 form-group">
                                    <FormGroup label="City" name="city" value={newAddress.city} onChange={handleNewAddressChange} required={isNewAddressFormVisible} disabled={!isNewAddressFormVisible} error={formErrors.city}/>
                                </div>
                                <div className="col-md-6 form-group">
                                    <FormGroup label="State" name="state" value={newAddress.state} onChange={handleNewAddressChange} required={isNewAddressFormVisible} disabled={!isNewAddressFormVisible} error={formErrors.state}/>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 form-group">
                                    <FormGroup label="ZIP Code" name="zip" value={newAddress.zip} onChange={handleNewAddressChange} required={isNewAddressFormVisible} disabled={!isNewAddressFormVisible} error={formErrors.zip}/>
                                </div>
                                <div className="col-md-6 form-group">
                                    <FormGroup label="Country" name="country" value={newAddress.country} onChange={handleNewAddressChange} required={isNewAddressFormVisible} disabled={!isNewAddressFormVisible} error={formErrors.country}/>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="alert alert-warning">
                        <h6><i className="fas fa-info-circle me-2"></i>Important Information</h6>
                        <ul className="mb-0">
                            <li>₹10 delivery charge will be applied for all orders</li>
                            <li>You can review your order and choose payment method in the next step</li>
                            <li>Orders are processed within 24 hours</li>
                            <li>Your address will be saved for faster checkout next time</li>
                        </ul>
                    </div>

                    <div className="d-grid gap-2">
                        <button type="submit" className="btn btn-place-order" id="submitBtn">
                            <i className="fas fa-shopping-bag me-2"></i>Review Order & Continue
                        </button>
                        <Link to="/patient/order-medicines" className="btn btn-outline-secondary">Continue Shopping</Link>
                    </div>
                </form>
            </div>
        </>
    );
};

const FormGroup = ({ label, name, value, onChange, required, disabled, error }) => (
    <div className="form-group">
        <label className={`form-label ${required ? 'required' : ''}`}>{label}</label>
        <input 
            type="text" 
            name={name} 
            className={`form-control ${error ? 'is-invalid' : ''}`} 
            value={value} 
            onChange={onChange} 
            required={required} 
            disabled={disabled}
        />
         {error && <div className="invalid-feedback">{error}</div>}
    </div>
);

export default Checkout;