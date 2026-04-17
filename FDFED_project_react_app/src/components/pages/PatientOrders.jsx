import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MedicineHeader from '../common/MedicineHeader';
import { getToken, removeToken } from '../../utils/authUtils';
import '../../assets/css/PatientOrders.css';

const PatientOrders = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const token = getToken('patient');
            const API = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API}/patient/api/orders`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    removeToken('patient');
                    navigate('/patient/form');
                    throw new Error('Please log in to view your orders');
                }
                throw new Error('Failed to fetch orders');
            }

            const data = await response.json();
            // The API returns an array directly, not wrapped in success object
            if (Array.isArray(data)) {
                setOrders(data);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm('Are you sure you want to cancel this order?')) {
            return;
        }

        try {
            const token = getToken('patient');
            const API = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API}/patient/api/orders/${orderId}/cancel`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                removeToken('patient');
                navigate('/patient/form');
                return;
            }

            if (response.ok) {
                // Refresh orders list
                fetchOrders();
                alert('Order cancelled successfully');
            } else {
                throw new Error('Failed to cancel order');
            }
        } catch (err) {
            console.error('Error cancelling order:', err);
            alert('Failed to cancel order. Please try again.');
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status.toLowerCase()) {
            case 'pending': return 'status-pending';
            case 'processing': return 'status-processing';
            case 'shipped': return 'status-shipped';
            case 'delivered': return 'status-delivered';
            case 'cancelled': return 'status-cancelled';
            default: return 'status-pending';
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <>
                <MedicineHeader />
                <div className="orders-container" style={{ paddingTop: '80px' }}>
                    <div className="loading">
                        <div className="loading-spinner"></div>
                        <p>Loading your orders...</p>
                    </div>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <div className="orders-container" style={{ paddingTop: '80px' }}>
                <div className="error-message">
                    <i className="fas fa-exclamation-circle"></i>
                    <h3>Error Loading Orders</h3>
                    <p>{error}</p>
                    <button onClick={fetchOrders} className="retry-btn">
                        <i className="fas fa-redo"></i> Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="patient-orders-page">
            <MedicineHeader />
            <div className="orders-container" style={{ paddingTop: '80px' }}>
                <h1 className="orders-title">My Orders</h1>

                {orders.length === 0 ? (
                    <div className="no-orders">
                        <i className="fas fa-shopping-bag"></i>
                        <h3>No Orders Found</h3>
                        <p>You haven't placed any orders yet.</p>
                        <Link to="/patient/order-medicines" className="shop-now-btn">
                            Shop Now
                        </Link>
                    </div>
                ) : (
                    <div className="orders-list">
                        {orders.map(order => (
                            <div key={order.id} className="order-card">
                                <div className="order-header">
                                    <div className="order-info">
                                        <h3>Order #{order.id.substring(0, 8)}</h3>
                                        <p className="order-date">
                                            <i className="far fa-calendar"></i>
                                            {order.orderDate}
                                        </p>
                                    </div>
                                    <div className={`order-status ${getStatusBadgeClass(order.status)}`}>
                                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                    </div>
                                </div>

                                <div className="order-items">
                                    <div className="order-item">
                                        <div className="item-info">
                                            <h4>{order.medicineName}</h4>
                                            <p className="item-details">
                                                <span className="medicine-id">ID: {order.medicineID}</span>
                                            </p>
                                            <p className="item-details">
                                                Quantity: {order.quantity}
                                            </p>
                                        </div>
                                        <div className="item-total">
                                            ₹{order.totalCost ? order.totalCost.toFixed(2) : '0.00'}
                                        </div>
                                    </div>
                                </div>

                                <div className="order-footer">
                                    <div className="order-details-info">
                                        {order.paymentMethod && (
                                            <div className="payment-info">
                                                <i className="fas fa-credit-card"></i>
                                                <span>{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 
                                                      order.paymentMethod === 'upi' ? 'UPI Payment' : 'Card Payment'}</span>
                                            </div>
                                        )}
                                        {order.deliveryAddress && (
                                            <div className="address-info">
                                                <i className="fas fa-map-marker-alt"></i>
                                                <span>Delivery to: {order.deliveryAddress.city || 'Address on file'}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="order-total">
                                        <strong>Total Amount:</strong>
                                        <span>₹{order.totalCost ? order.totalCost.toFixed(2) : '0.00'}</span>
                                    </div>
                                    <div className="order-actions">
                                        <Link 
                                            to={`/patient/orders/${order.id}`}
                                            className="view-details-btn"
                                        >
                                            <i className="fas fa-eye"></i>
                                            View Details
                                        </Link>
                                        {order.status === 'pending' && (
                                            <button 
                                                onClick={() => handleCancelOrder(order.id)}
                                                className="cancel-btn"
                                            >
                                                <i className="fas fa-times"></i>
                                                Cancel Order
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientOrders;