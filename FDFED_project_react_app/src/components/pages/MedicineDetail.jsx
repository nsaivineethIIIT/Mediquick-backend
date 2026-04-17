import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MedicineHeader from '../common/MedicineHeader';
import { showMessage, getToastClass } from '../../utils/alerts';
import { getToken, removeToken } from '../../utils/authUtils';
import '../../assets/css/MedicineDetail.css';

const MedicineDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [medicine, setMedicine] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);

    // Helper functions for date and stock calculation
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    };

    const getExpiryStatus = (medicine) => {
        // Try different possible field names for expiry date
        const expiryDate = medicine.expiryDate || medicine.expiry_date || medicine.expiry || medicine.expirationDate;
        
        if (!expiryDate) return { class: 'unknown', text: 'Unknown' };
        
        const expiry = new Date(expiryDate);
        // Check if the date is valid
        if (isNaN(expiry.getTime())) return { class: 'unknown', text: 'Invalid Date' };
        
        const today = new Date();
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return { class: 'expired', text: 'Expired' };
        if (diffDays <= 30) return { class: 'expiring-soon', text: `Expires in ${diffDays} days` };
        if (diffDays <= 90) return { class: 'expiring-medium', text: `Expires in ${Math.ceil(diffDays/30)} months` };
        return { class: 'fresh', text: 'Fresh Stock' };
    };

    const getStockStatus = (stock) => {
        if (stock <= 0) return { class: 'stock-out', text: 'Out of Stock' };
        if (stock <= 10) return { class: 'stock-low', text: `Low Stock (${stock} left)` };
        return { class: 'stock-available', text: `In Stock (${stock} available)` };
    };

    useEffect(() => {
        fetchMedicineDetails();
    }, [id]);

    const fetchMedicineDetails = async () => {
        setLoading(true);
        try {
            const token = getToken();
            // First try to get medicine from the search API like OrderMedicines
            const API = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API}/medicine/search?query=`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.status === 401) {
                removeToken();
                navigate('/patient/form');
                return;
            }
            
            const data = await response.json();
            
            if (data.success && data.medicines) {
                // Find the specific medicine by ID from all medicines
                const foundMedicine = data.medicines.find(med => med._id === id || med.medicineID === id);
                
                if (foundMedicine) {
                    console.log('Found medicine:', foundMedicine); // Debug log
                    setMedicine(foundMedicine);
                    setQuantity(1);
                } else {
                    throw new Error('Medicine not found in database');
                }
            } else {
                throw new Error('Failed to fetch medicines data');
            }
            
        } catch (err) {
            console.error('Error fetching medicine details:', err);
            // Fallback: try direct API call
            try {
                const token = getToken();
                const fallbackResponse = await fetch(`${import.meta.env.VITE_API_URL}/patient/api/medicines/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    setMedicine(fallbackData.medicine);
                    setQuantity(1);
                } else {
                    setMedicine(null);
                }
            } catch (fallbackErr) {
                console.error('Fallback API also failed:', fallbackErr);
                setMedicine(null);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBuyNow = () => {
        if (quantity < 1 || quantity > medicine.quantity) {
             showMessage(`Please select a valid quantity (1-${medicine.quantity})`, getToastClass('warning'));
             return;
        }
        // Redirect to checkout page for single medicine purchase
        navigate(`/patient/checkout?type=single&medicineId=${id}&quantity=${quantity}`);
    };

    const handleAddToCart = async () => {
        if (quantity < 1 || quantity > medicine.quantity) {
             showMessage(`Please select a valid quantity (1-${medicine.quantity})`, getToastClass('warning'));
             return;
        }

        try {
            const token = getToken();
            const API = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API}/patient/api/add-to-cart`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ medicineId: id, quantity: quantity })
            });

            if (response.status === 401) {
                removeToken();
                navigate('/patient/form');
                return;
            }

            const data = await response.json();

            if (response.ok) {
                showMessage(data.message || "Item added to cart successfully!", getToastClass('success'));
                if (window.updateCartCount) window.updateCartCount();
            } else {
                if (data.available !== undefined) {
                    showMessage(`Only ${data.available} units available in stock`, getToastClass('warning'));
                    setMedicine(prev => ({...prev, quantity: data.available}));
                    if (quantity > data.available) setQuantity(data.available);
                } else {
                    showMessage(data.error || "Failed to add to cart", getToastClass('danger'));
                }
            }
        } catch (error) {
            console.error("Add to cart error:", error);
            showMessage("Failed to add to cart. Please try again.", getToastClass('danger'));
        }
    };

    if (loading) {
        return (
            <>
                <MedicineHeader />
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">Loading medicine details...</p>
                </div>
            </>
        );
    }

    if (!medicine) {
        return (
            <>
                <MedicineHeader />
                <div className="error-container">
                    <p className="error-text">Medicine details not found.</p>
                </div>
            </>
        );
    }

    const stockAvailable = medicine.quantity > 0;
    const stockInfo = getStockStatus(medicine.quantity);
    const expiryInfo = getExpiryStatus(medicine);

    return (
        <>
            <MedicineHeader />
            <div className="medicine-detail-container">
                <div className="medicine-detail-card">
                    <div className="medicine-detail-row">
                        <div className="medicine-image-section">
                            <img
                                src={medicine.imageUrl || medicine.image || "https://th.bing.com/th/id/OIP.1N_r8UyW1bIoHyb_YCmcaAHaHa?w=250&h=250&c=8&rs=1&qlt=90&o=6&dpr=1.3&pid=3.1&rm=2"}
                                alt={medicine.name}
                                className="medicine-detail-image"
                            />
                        </div>

                        <div className="medicine-info-section">
                            <h1 className="medicine-detail-name">{medicine.name}</h1>
                            
                            <div className="medicine-detail-info">
                                <div className="info-item">
                                    <span className="info-label">Medicine ID:</span>
                                    <span className="info-value">{medicine.medicineID}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Manufacturer:</span>
                                    <span className="info-value">{medicine.manufacturer}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Expiry Date:</span>
                                    <span className="info-value">
                                        {formatDate(medicine.expiryDate || medicine.expiry_date || medicine.expiry || medicine.expirationDate)} 
                                        <span className={`expiry-badge ${expiryInfo.class}`} style={{marginLeft: '10px', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem'}}>
                                            {expiryInfo.text}
                                        </span>
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Return Policy:</span>
                                    <span className="info-value">{medicine.returnPolicy || "3 DAYS RETURNABLE"}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Consume Type:</span>
                                    <span className="info-value">{medicine.consumeType || "ORAL"}</span>
                                </div>
                            </div>

                            <div className="medicine-price-section">
                                <p className="medicine-price">
                                    <span className="price-currency">₹</span>{medicine.cost.toFixed(2)}
                                </p>
                            </div>

                            <div className="stock-section">
                                <div className={`stock-info ${stockInfo.class}`}>
                                    <i className="fas fa-boxes" style={{marginRight: '8px'}}></i>
                                    {stockInfo.text}
                                </div>

                                {stockAvailable ? (
                                    <>
                                        <div className="quantity-section">
                                            <label className="quantity-label">Select Quantity:</label>
                                            <div className="quantity-controls">
                                                <button 
                                                    className="quantity-btn" 
                                                    onClick={() => setQuantity(q => q > 1 ? q - 1 : 1)}
                                                    disabled={quantity <= 1}
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    className="quantity-input"
                                                    value={quantity}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        if (val < 1 || isNaN(val)) setQuantity(1);
                                                        else if (val > medicine.quantity) setQuantity(medicine.quantity);
                                                        else setQuantity(val);
                                                    }}
                                                    min="1"
                                                    max={medicine.quantity}
                                                />
                                                <button 
                                                    className="quantity-btn" 
                                                    onClick={() => setQuantity(q => q < medicine.quantity ? q + 1 : medicine.quantity)}
                                                    disabled={quantity >= medicine.quantity}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        <div className="action-buttons">
                                            <button
                                                className="action-btn btn-buy-now"
                                                onClick={handleBuyNow}
                                            >
                                                <i className="fas fa-bolt"></i> Buy Now
                                            </button>
                                            <button
                                                className="action-btn btn-add-to-cart"
                                                onClick={handleAddToCart}
                                            >
                                                <i className="fas fa-shopping-cart"></i> Add to Cart
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="out-of-stock-message">
                                            <p className="out-of-stock-text">Currently Out of Stock</p>
                                        </div>
                                        <div className="action-buttons">
                                            <button className="action-btn btn-disabled" disabled>
                                                <i className="fas fa-times-circle"></i> Not Available
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MedicineDetail;