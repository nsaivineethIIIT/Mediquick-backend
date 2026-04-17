import React, { useState, useRef } from 'react';
import { useSupplier } from '../../context/SupplierContext';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import '../../assets/css/supplier_profile.css';
import '../../assets/css/ProfilePagesUnified.css';
import { getToken, removeToken } from '../../utils/authUtils';
import SupplierLayoutShell from '../common/SupplierLayoutShell';

// --- Yup Validation Schema ---
const supplierEditSchema = yup.object().shape({
    name: yup.string().required('Name is required').min(2, 'Name must be at least 2 characters').max(500)
        .matches(/^(?=.*[A-Za-z])[A-Za-z0-9\s\-'.]+$/, 'Name must contain at least one letter'),
    email: yup.string().required('Email is required')
        .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'),
    mobile: yup.string().required('Mobile number is required')
        .matches(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
    address: yup.string().required('Address is required').min(5, 'Address must be at least 5 characters'),
});

const SupplierEditProfile = () => {
    const { supplier, updateSupplier, refetch, logout } = useSupplier();
    const [loading, setLoading]           = useState(false);
    const [success, setSuccess]           = useState('');
    const [generalError, setGeneralError] = useState('');
    const [photoPreview, setPhotoPreview] = useState('');
    const navigate    = useNavigate();
    const fileInputRef = useRef(null);

    const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm({
        resolver: yupResolver(supplierEditSchema),
        mode: 'onChange',
        defaultValues: {
            name:       supplier?.name       || '',
            email:      supplier?.email      || '',
            mobile:     supplier?.mobile     || '',
            address:    supplier?.address    || '',
            supplierID: supplier?.supplierID || '',
        },
    });

    React.useEffect(() => {
        if (supplier) {
            setValue('name',       supplier.name       || '');
            setValue('email',      supplier.email      || '');
            setValue('mobile',     supplier.mobile     || '');
            setValue('address',    supplier.address    || '');
            setValue('supplierID', supplier.supplierID || '');
        }
        setPhotoPreview('');
    }, [supplier, setValue, reset]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setPhotoPreview(ev.target.result);
            reader.readAsDataURL(file);
        } else {
            setPhotoPreview('');
        }
    };

    const onSubmit = async (data) => {
        setLoading(true);
        setSuccess('');
        setGeneralError('');
        try {
            const form = new FormData();
            form.append('name',       data.name.trim());
            form.append('email',      data.email.trim());
            form.append('mobile',     data.mobile.trim());
            form.append('address',    data.address.trim());
            form.append('supplierID', data.supplierID);
            if (fileInputRef.current?.files?.length > 0) {
                form.append('profilePhoto', fileInputRef.current.files[0]);
            }
            const response = await fetch(`${import.meta.env.VITE_API_URL}/supplier/update-profile`, {
                method:  'POST',
                headers: { 'Authorization': `Bearer ${getToken('supplier')}` },
                body:    form,
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                if (response.status === 401) { removeToken('supplier'); navigate('/supplier/form'); return; }
                setGeneralError(result.message || 'Update failed.');
            } else {
                setSuccess('Profile updated successfully!');
                updateSupplier(result.supplier);
                refetch();
                setTimeout(() => navigate('/supplier/profile'), 1200);
            }
        } catch (err) {
            setGeneralError(err.message || 'An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = (e) => { e.preventDefault(); logout(); };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    if (!supplier) {
        return (
            <SupplierLayoutShell activeItem="profile">
                <div className="sp-root mq-unified-profile">
                    <div className="sp-state">
                        <div className="sp-spinner"></div>
                        <p>Loading supplier data…</p>
                    </div>
                </div>
            </SupplierLayoutShell>
        );
    }

    return (
        <SupplierLayoutShell activeItem="profile">
        <div className="sp-root mq-unified-profile">

            {/* ── Page Body ──────────────────────────── */}
            <main className="sp-content">

                <div className="sp-section-title">
                    <h2>Edit Profile</h2>
                    <p>Update your account information below.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="sp-layout">

                        {/* ── Left: Avatar preview card ─── */}
                        <div className="sp-avatar-card">
                            <div className="sp-avatar-circle">
                                {photoPreview
                                    ? <img src={photoPreview} alt="Preview" className="sp-avatar-img" />
                                    : getInitials(supplier.name)
                                }
                            </div>
                            <div className="sp-avatar-name">{supplier.name}</div>
                            <div className="sp-avatar-badge">Supplier</div>
                            <div className="sp-avatar-id">ID: {supplier.supplierID || 'N/A'}</div>

                            {/* Photo upload */}
                            <div className="sp-photo-upload">
                                <label className="sp-photo-label" htmlFor="profilePhoto">
                                    Change Photo
                                </label>
                                <input
                                    type="file"
                                    id="profilePhoto"
                                    accept="image/*"
                                    className="sp-photo-input"
                                    {...register('profilePhoto')}
                                    ref={(e) => {
                                        fileInputRef.current = e;
                                        register('profilePhoto').ref(e);
                                    }}
                                    onChange={(e) => {
                                        handleFileChange(e);
                                        register('profilePhoto').onChange(e);
                                    }}
                                />
                                <p className="sp-photo-hint">JPG, PNG or GIF (Optional)</p>
                            </div>
                        </div>

                        {/* ── Right: Edit form card ─────── */}
                        <div className="sp-info-card">
                            <div className="sp-info-card-header">
                                <div className="sp-info-card-title">Account Details</div>
                                <div className="sp-info-card-subtitle">All fields are required unless marked optional</div>
                            </div>

                            {/* Messages */}
                            {generalError && (
                                <div className="sp-form-alert sp-form-alert--error">{generalError}</div>
                            )}
                            {success && (
                                <div className="sp-form-alert sp-form-alert--success">{success}</div>
                            )}

                            <div className="sp-edit-grid">

                                <div className="sp-edit-field">
                                    <label className="sp-edit-label">Full Name</label>
                                    <input
                                        className={`sp-edit-input${errors.name ? ' sp-edit-input--error' : ''}`}
                                        type="text"
                                        autoComplete="off"
                                        placeholder="Your name"
                                        {...register('name')}
                                    />
                                    {errors.name && <span className="sp-edit-error">{errors.name.message}</span>}
                                </div>

                                <div className="sp-edit-field">
                                    <label className="sp-edit-label">Supplier ID</label>
                                    <input
                                        className="sp-edit-input sp-edit-input--readonly"
                                        type="text"
                                        readOnly
                                        {...register('supplierID')}
                                    />
                                    <span className="sp-edit-hint">This field cannot be changed</span>
                                </div>

                                <div className="sp-edit-field">
                                    <label className="sp-edit-label">Email Address</label>
                                    <input
                                        className={`sp-edit-input${errors.email ? ' sp-edit-input--error' : ''}`}
                                        type="email"
                                        autoComplete="off"
                                        placeholder="you@example.com"
                                        {...register('email')}
                                    />
                                    {errors.email && <span className="sp-edit-error">{errors.email.message}</span>}
                                </div>

                                <div className="sp-edit-field">
                                    <label className="sp-edit-label">Mobile Number</label>
                                    <input
                                        className={`sp-edit-input${errors.mobile ? ' sp-edit-input--error' : ''}`}
                                        type="text"
                                        autoComplete="off"
                                        placeholder="10-digit number"
                                        {...register('mobile')}
                                    />
                                    {errors.mobile && <span className="sp-edit-error">{errors.mobile.message}</span>}
                                </div>

                                <div className="sp-edit-field sp-edit-field--full">
                                    <label className="sp-edit-label">Address</label>
                                    <input
                                        className={`sp-edit-input${errors.address ? ' sp-edit-input--error' : ''}`}
                                        type="text"
                                        autoComplete="off"
                                        placeholder="Your address"
                                        {...register('address')}
                                    />
                                    {errors.address && <span className="sp-edit-error">{errors.address.message}</span>}
                                </div>

                            </div>

                            <div className="sp-info-card-footer">
                                <button type="submit" className="sp-btn-primary" disabled={loading}>
                                    {loading ? 'Saving…' : 'Save Changes'}
                                </button>
                                <button type="button" className="sp-btn-ghost"
                                    onClick={() => navigate('/supplier/profile')}>
                                    Cancel
                                </button>
                            </div>
                        </div>

                    </div>
                </form>

            </main>
        </div>
        </SupplierLayoutShell>
    );
};

export default SupplierEditProfile;
