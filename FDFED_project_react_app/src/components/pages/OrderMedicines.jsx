import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MedicineHeader from '../common/MedicineHeader';
import { showMessage, getToastClass } from '../../utils/alerts';
import { getToken, removeToken } from '../../utils/authUtils';

const OrderMedicines = () => {
    const navigate = useNavigate();
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [quantities, setQuantities] = useState({});

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchMedicines(searchQuery);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const fetchMedicines = async (query = '') => {
        setLoading(true);
        try {
            const token = getToken();
            const API = import.meta.env.VITE_API_URL;
            const params = new URLSearchParams();
            if (query.trim()) {
                params.append('query', query.trim());
            }

            const response = await fetch(`${API}/medicine/search?${params.toString()}`, {
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
                setMedicines(data.medicines);
            } else {
                setMedicines([]);
                showMessage(data.message || 'No medicines found.', getToastClass('info'));
            }

        } catch (err) {
            console.error('Error fetching medicines:', err);
            setMedicines([]);
            showMessage('Failed to load medicines. Please try again.', getToastClass('danger'));
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleAddToCart = async (medicineId) => {
        const quantity = quantities[medicineId] || 1;
        const medicine = medicines.find((m) => m._id === medicineId);
        const max = medicine?.quantity || 1;

        if (quantity < 1 || quantity > max) {
            showMessage(`Please enter a valid quantity (1-${max})`, getToastClass('warning'));
            return;
        }

        try {
            const token = getToken();
            const API = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API}/patient/api/add-to-cart`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ medicineId, quantity })
            });

            if (response.status === 401) {
                removeToken();
                navigate('/patient/form');
                return;
            }

            const data = await response.json();

            if (response.ok) {
                showMessage(data.message || `${quantity} item(s) added to cart`, getToastClass('success'));
                if (window.updateCartCount) window.updateCartCount();
            } else {
                if (data.available !== undefined) {
                    showMessage(`Only ${data.available} available in stock`, getToastClass('warning'));
                } else {
                    showMessage(`Failed to add to cart: ${data.error || "Unknown error"}`, getToastClass('danger'));
                }
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            showMessage('Failed to add to cart. Please try again.', getToastClass('danger'));
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getExpiryStatus = (expiryDate) => {
        const expiry = new Date(expiryDate);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
            return {
                text: 'Expired',
                className: 'bg-error-container text-on-error-container'
            };
        }

        if (daysUntilExpiry <= 30) {
            return {
                text: `${daysUntilExpiry} days left`,
                className: 'bg-[#fff4db] text-[#c07a00]'
            };
        }

        return {
            text: `${daysUntilExpiry} days left`,
            className: 'bg-tertiary/10 text-tertiary'
        };
    };

    const getStockState = (quantity) => {
        if (quantity <= 0) {
            return {
                dot: 'bg-error',
                text: 'Out of Stock',
                textColor: 'text-error'
            };
        }

        if (quantity <= 10) {
            return {
                dot: 'bg-[#c07a00]',
                text: `${quantity} units left`,
                textColor: 'text-[#c07a00]'
            };
        }

        return {
            dot: 'bg-tertiary',
            text: 'In Stock',
            textColor: 'text-tertiary'
        };
    };

    const visibleMedicines = useMemo(() => medicines.slice(0, 12), [medicines]);

    const updateQuantity = (medicineId, max, delta) => {
        setQuantities((prev) => {
            const current = prev[medicineId] || 1;
            const next = Math.max(1, Math.min(max, current + delta));
            return { ...prev, [medicineId]: next };
        });
    };

    return (
        <div className="min-h-screen bg-surface font-body text-on-surface antialiased">
            <MedicineHeader />

            <main className="mx-auto min-h-screen max-w-screen-2xl bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/40 via-surface to-surface px-6 pb-24 pt-32 md:px-8">
                <section className="mx-auto max-w-4xl pb-12 text-center">
                    <h1 className="mb-6 text-5xl font-extrabold leading-[1.1] tracking-tight text-on-surface md:text-6xl">Order Medicines</h1>
                    <p className="mx-auto max-w-2xl text-lg font-medium text-on-surface-variant md:text-xl">
                        Browse and order your medicines with fast delivery. Experience clinical precision and professional care.
                    </p>
                </section>

                <div className="mb-20 flex justify-center">
                    <div className="relative w-full max-w-2xl">
                        <input
                            className="h-16 w-full rounded-full border-0 bg-surface-container-lowest pl-14 pr-6 text-on-surface shadow-[0_20px_40px_rgba(15,23,42,0.06)] transition-all placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/10"
                            placeholder="Search for medicines, brands, or symptoms..."
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') fetchMedicines(searchQuery);
                            }}
                        />
                        <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-2xl text-primary">search</span>
                    </div>
                </div>

                {loading ? (
                    <div className="rounded-2xl bg-surface-container-lowest p-10 text-center shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
                        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-outline-variant border-t-primary" />
                        <p className="font-medium text-on-surface-variant">Loading medicines...</p>
                    </div>
                ) : visibleMedicines.length === 0 ? (
                    <div className="rounded-2xl bg-surface-container-lowest p-10 text-center shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
                        <span className="material-symbols-outlined mb-3 text-5xl text-outline">pill</span>
                        <h3 className="mb-2 text-2xl font-bold text-on-surface">No medicines found</h3>
                        <p className="text-on-surface-variant">Try a different keyword or check back later for new stock.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {visibleMedicines.map((medicine) => {
                            const qty = quantities[medicine._id] || 1;
                            const expiryInfo = getExpiryStatus(medicine.expiryDate);
                            const stock = getStockState(medicine.quantity);
                            const maxQuantity = Math.max(medicine.quantity || 1, 1);

                            return (
                                <div
                                    key={medicine._id}
                                    className="group flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest p-0 shadow-[0_20px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1"
                                >
                                    <div className="border-b border-outline-variant/10 bg-primary/5 px-6 py-5">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="text-xl font-bold text-primary">{medicine.name}</h3>
                                            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${expiryInfo.className}`}>
                                                {expiryInfo.text}
                                            </span>
                                        </div>
                                        <span className="font-mono text-xs text-on-surface-variant/60">ID: {medicine.medicineID || medicine._id}</span>
                                    </div>

                                    <div className="flex flex-grow flex-col space-y-6 p-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-on-surface-variant">Manufacturer</span>
                                                <span className="text-sm font-semibold text-on-surface">{medicine.manufacturer || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-on-surface-variant">Expiry Date</span>
                                                <span className="text-sm font-semibold text-on-surface">{formatDate(medicine.expiryDate)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-on-surface-variant">Stock</span>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`h-2 w-2 rounded-full ${stock.dot}`} />
                                                    <span className={`text-sm font-semibold ${stock.textColor}`}>{stock.text}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Price per unit</span>
                                                <span className="text-2xl font-extrabold text-on-surface">₹{Number(medicine.cost || 0).toFixed(2)}</span>
                                            </div>

                                            <div className="flex items-center rounded-lg border border-outline-variant/20 bg-white p-1">
                                                <button
                                                    type="button"
                                                    className="flex h-8 w-8 items-center justify-center rounded text-primary transition-colors hover:bg-primary/5"
                                                    onClick={() => updateQuantity(medicine._id, maxQuantity, -1)}
                                                    disabled={medicine.quantity <= 0}
                                                >
                                                    <span className="material-symbols-outlined text-lg">remove</span>
                                                </button>
                                                <span className="px-4 font-bold text-on-surface">{qty}</span>
                                                <button
                                                    type="button"
                                                    className="flex h-8 w-8 items-center justify-center rounded text-primary transition-colors hover:bg-primary/5"
                                                    onClick={() => updateQuantity(medicine._id, maxQuantity, 1)}
                                                    disabled={medicine.quantity <= 0}
                                                >
                                                    <span className="material-symbols-outlined text-lg">add</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 px-6 pb-6 pt-0">
                                        <button
                                            type="button"
                                            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white shadow-lg shadow-primary/20 transition-all active:scale-95 hover:bg-primary-container disabled:cursor-not-allowed disabled:bg-outline"
                                            onClick={() => handleAddToCart(medicine._id)}
                                            disabled={medicine.quantity <= 0}
                                        >
                                            <span className="material-symbols-outlined text-xl">shopping_cart</span>
                                            {medicine.quantity > 0 ? 'Add to Cart' : 'Out of Stock'}
                                        </button>

                                        <Link
                                            to={`/patient/medicines/${medicine._id}`}
                                            className="flex h-12 w-full items-center justify-center rounded-xl border border-outline-variant/20 bg-transparent font-bold text-primary transition-all hover:bg-surface-container-low"
                                        >
                                            View Details
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-20 flex justify-center">
                    <button
                        type="button"
                        className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-10 py-4 font-bold text-primary shadow-[0_20px_40px_rgba(15,23,42,0.06)] transition-all duration-500 hover:bg-primary hover:text-white"
                        onClick={() => fetchMedicines(searchQuery)}
                    >
                        Load More Medicines
                    </button>
                </div>
            </main>

            <div className="fixed bottom-8 right-8 z-50">
                <Link
                    to="/contact-us"
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-2xl shadow-primary/30 transition-all active:scale-95"
                    aria-label="Quick Help"
                >
                    <span className="material-symbols-outlined text-2xl">chat_bubble</span>
                </Link>
            </div>
        </div>
    );
};

export default OrderMedicines;