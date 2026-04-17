import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getToken } from '../../utils/authUtils';
import '../../assets/css/MedicineFlowTheme.css';

const MedicineHeader = () => {
    const [cartCount, setCartCount] = useState(0);
    const [profilePhoto, setProfilePhoto] = useState('/images/default-patient.svg');
    const location = useLocation();

    const updateCartCount = async () => {
        try {
            const token = getToken();
            if (!token) {
                setCartCount(0);
                return;
            }
            const API = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API}/patient/api/cart/count`, { 
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            
            if (response.ok && data.success) {
                setCartCount(data.count || 0);
            }
        } catch (error) {
            console.error('Error fetching cart count:', error);
        }
    };

    useEffect(() => {
        updateCartCount();
        window.updateCartCount = updateCartCount;
        return () => { delete window.updateCartCount; };
    }, []);

    useEffect(() => {
        const fetchProfilePhoto = async () => {
            try {
                const token = getToken('patient') || getToken();
                if (!token) return;

                const API = import.meta.env.VITE_API_URL;
                const response = await fetch(`${API}/patient/profile-data`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) return;

                const data = await response.json();
                const photo = data?.patient?.profilePhoto;
                if (!photo) return;

                if (/^(https?:|data:|blob:)/i.test(photo)) {
                    setProfilePhoto(photo);
                    return;
                }

                setProfilePhoto(photo.startsWith('/') ? `${API}${photo}` : `${API}/${photo}`);
            } catch (error) {
                console.error('Error loading patient profile photo for medicine header:', error);
            }
        };

        fetchProfilePhoto();
    }, []);

    useEffect(() => {
        const previousRootFontSize = document.documentElement.style.fontSize;
        document.documentElement.style.fontSize = '14px';
        document.body.classList.add('medicine-flow-theme');

        return () => {
            document.documentElement.style.fontSize = previousRootFontSize;
            document.body.classList.remove('medicine-flow-theme');
        };
    }, []);

    const getNavLinkClass = (path) => {
        const isActive = location.pathname === path;
        if (isActive) {
            return 'border-b-2 border-blue-700 pb-1 text-sm font-medium text-blue-700';
        }

        return 'text-sm font-medium text-slate-500 transition-all duration-300 hover:text-blue-600';
    };

    return (
        <header className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-xl shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
            <div className="mx-auto w-full max-w-screen-2xl px-6 py-4 md:px-8">
                <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
                    <span className="text-2xl font-headline font-bold tracking-tighter text-primary justify-self-start">MediQuick</span>

                    <nav className="hidden items-center gap-6 justify-self-start md:flex md:justify-self-center">
                        <Link className={getNavLinkClass('/patient/dashboard')} to="/patient/dashboard">Home</Link>
                        <Link className={getNavLinkClass('/patient/order-medicines')} to="/patient/order-medicines">Medicines</Link>
                        <Link className={getNavLinkClass('/patient/orders')} to="/patient/orders">Orders</Link>
                        <Link className={getNavLinkClass('/patient/dashboard')} to="/patient/dashboard">Dashboard</Link>
                        <Link className={getNavLinkClass('/patient/profile')} to="/patient/profile">Profile</Link>
                    </nav>

                    <div className="flex items-center gap-4 justify-self-end">
                        <Link to="/patient/cart" className="group relative rounded-full p-2 transition-all hover:bg-slate-50/50" aria-label="Cart">
                            <span className="material-symbols-outlined text-on-surface-variant">shopping_cart</span>
                            {cartCount > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                        <Link to="/patient/profile" className="h-10 w-10 overflow-hidden rounded-full border border-outline-variant/15 bg-surface-container shadow-sm">
                            <img
                                alt="User Profile"
                                className="h-full w-full object-cover"
                                src={profilePhoto}
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = '/images/default-patient.svg';
                                }}
                            />
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default MedicineHeader;