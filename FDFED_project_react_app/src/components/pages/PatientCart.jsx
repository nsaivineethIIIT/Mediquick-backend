import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MedicineHeader from '../common/MedicineHeader'; // Already present, which is good.
import { showMessage } from '../../utils/alerts';
import { getToken, removeToken } from '../../utils/authUtils';
import '../../assets/css/PatientCart.css';

const PatientCart = () => {
    const navigate = useNavigate();
    const [cartData, setCartData] = useState({ items: [] });
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // First check if user is logged in
        checkLoginStatus();
    }, []);

    const checkLoginStatus = async () => {
        try {
            const token = getToken('patient');
            if (!token) {
                setIsLoggedIn(false);
                setLoading(false);
                showMessage('Please login to view your cart.', 'warning');
                return;
            }
            const API = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API}/patient/profile-data`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                setIsLoggedIn(true);
                fetchCart();
            } else if (response.status === 401) {
                removeToken('patient');
                setIsLoggedIn(false);
                setLoading(false);
                showMessage('Session expired. Please login again.', 'warning');
                navigate('/patient/form');
            } else {
                setIsLoggedIn(false);
                setLoading(false);
                showMessage('Please login to view your cart.', 'warning');
            }
        } catch (err) {
            console.error('Login check error:', err);
            setIsLoggedIn(false);
            setLoading(false);
            showMessage('Please login to view your cart.', 'warning');
        }
    };

    const fetchCart = async () => {
        setLoading(true);
        try {
            const token = getToken('patient');
            console.log('Fetching cart from:', `${import.meta.env.VITE_API_URL}/patient/api/cart`);
            
            const response = await fetch(`${import.meta.env.VITE_API_URL}/patient/api/cart`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }); 
            
            console.log('Cart response status:', response.status);
            console.log('Cart response ok:', response.ok);
            
            if (!response.ok) {
                if (response.status === 401) {
                    removeToken('patient');
                    navigate('/patient/form');
                    showMessage('Session expired. Please login again.', 'warning');
                    return;
                }
                const errorText = await response.text();
                console.error('Cart response error:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to load cart'}`);
            }
            
            const data = await response.json();
            console.log('Cart data received:', data);
            
            if (!data.success && data.error) {
                throw new Error(data.error);
            }
            
            let fetchedItems = data.cart?.items || [];
            let calculatedTotal = data.total || 0; // Fixed: total is at root level, not inside cart
            
            setCartData({ items: fetchedItems }); 
            setTotal(calculatedTotal); 
            
        } catch (err) {
            console.error('Error fetching cart:', err); 
            if (err.message.includes('401') || err.message.includes('Not logged in')) {
                showMessage('Please login to view your cart.', 'warning');
            } else {
                showMessage('Failed to load cart: ' + err.message, 'danger');
            }
        } finally {
            setLoading(false);
        }
    };
    
    const updateQuantity = async (medicineId, change) => {
        const input = document.querySelector(`.quantity-input[data-id="${medicineId}"]`);
        let newQuantity = (change === 0 ? parseInt(input?.value) : parseInt(input?.value) + change);

        if (newQuantity < 1) {
            showMessage('Quantity cannot be less than 1', 'warning');
            return;
        }
        
        try {
            const token = getToken('patient');
            const API = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API}/patient/api/cart/update`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ medicineId: medicineId, quantity: newQuantity })
            });

            const data = await response.json();
            
            if (response.status === 401) {
                removeToken('patient');
                navigate('/patient/form');
                showMessage('Session expired. Please login again.', 'warning');
                return;
            }
            
            if (data.success) {
                fetchCart(); // Reload the cart data
                if (window.updateCartCount) window.updateCartCount(); // Update header count
            } else {
                showMessage(data.error || 'Failed to update quantity', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Failed to update quantity. Please try again.', 'danger');
        }
    };

    const removeItem = async (medicineId) => {
        if (!window.confirm('Are you sure you want to remove this item from your cart?')) {
            return;
        }

        try {
            const token = getToken('patient');
            const API = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API}/patient/api/cart/item/${medicineId}`, { 
                method: 'DELETE', 
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            
            if (response.status === 401) {
                removeToken('patient');
                navigate('/patient/form');
                showMessage('Session expired. Please login again.', 'warning');
                return;
            }
            
            if (data.success) {
                showMessage('Item removed from cart', 'success');
                fetchCart();
                if (window.updateCartCount) window.updateCartCount();
            } else {
                showMessage(data.error || 'Failed to remove item', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Failed to remove item. Please try again.', 'danger');
        }
    };

    if (loading) return <div style={{paddingTop: '80px', textAlign: 'center'}}>Loading...</div>;

    if (!isLoggedIn) {
        return (
            <div className="patient-cart-page">
                <MedicineHeader />
                <div className="container cart-container" style={{ paddingTop: '80px' }}>
                    <div className="empty-cart text-center">
                        <i className="fas fa-user-lock fa-3x mb-3" style={{ color: '#e74c3c' }}></i>
                        <h3>Please Login</h3>
                        <p className="text-muted">You need to be logged in to view your cart</p>
                        <Link to="/patient/form" className="btn btn-primary mt-3">
                            <i className="fas fa-sign-in-alt me-2"></i>Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="patient-cart-page">
            <MedicineHeader />
            <div className="container cart-container" style={{ paddingTop: '80px' }}>
                <h2 className="mb-4"><i className="fas fa-shopping-cart me-2"></i>Your Shopping Cart</h2>
                
                {cartData.items.length === 0 ? (
                    <div className="empty-cart">
                        <i className="fas fa-shopping-cart fa-3x mb-3" style={{ color: '#bdc3c7' }}></i>
                        <h3>Your cart is empty</h3>
                        <p className="text-muted">Add some medicines to get started</p>
                        <Link to="/patient/order-medicines" className="btn btn-primary mt-3">
                            <i className="fas fa-pills me-2"></i>Browse Medicines
                        </Link>
                    </div>
                ) : (
                    <>
                        <div id="cartItems">
                            {cartData.items.map(item => (
                                <div key={item.medicineId._id} className="cart-item" data-medicine-id={item.medicineId._id}>
                                    <div className="cart-item-details">
                                        <div className="medicine-name">{item.medicineId.name}</div>
                                        <div className="medicine-details">
                                            ID: {item.medicineId.medicineID} | Manufacturer: {item.medicineId.manufacturer}
                                        </div>
                                        <div className="price-info">
                                            ₹{item.medicineId.cost.toFixed(2)} per unit
                                        </div>
                                    </div>
                                    
                                    <div className="cart-item-actions">
                                        <div className="quantity-controls">
                                            <button className="btn btn-outline-secondary btn-sm" onClick={() => updateQuantity(item.medicineId._id, -1)}>-</button>
                                            <input 
                                                type="number" 
                                                className="form-control quantity-input" 
                                                defaultValue={item.quantity} 
                                                min="1" 
                                                data-id={item.medicineId._id}
                                                style={{ width: '70px', textAlign: 'center' }}
                                                onChange={(e) => updateQuantity(item.medicineId._id, 0)}
                                            />
                                            <button className="btn btn-outline-secondary btn-sm" onClick={() => updateQuantity(item.medicineId._id, 1)}>+</button>
                                        </div>
                                        
                                        <div className="item-total">
                                            ₹{(item.quantity * item.medicineId.cost).toFixed(2)}
                                        </div>
                                        <button className="btn-remove" onClick={() => removeItem(item.medicineId._id)}>
                                            <i className="fas fa-trash"></i> Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="total">
                            Total: ₹{total}
                        </div>
                        
                        <div className="d-grid gap-2">
                            <Link to="/patient/checkout" className="btn btn-checkout">
                                <i className="fas fa-credit-card me-2"></i>Proceed to Checkout
                            </Link>
                            <Link to="/patient/order-medicines" className="btn btn-outline-secondary">
                                <i className="fas fa-arrow-left me-2"></i>Continue Shopping
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PatientCart;