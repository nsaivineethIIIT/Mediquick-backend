import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showMessage } from '../../utils/alerts';
import { useSupplier } from '../../context/SupplierContext';
import { getToken, removeToken } from '../../utils/authUtils';
import SupplierLayoutShell from '../common/SupplierLayoutShell';

const BASE_URL = import.meta.env.VITE_API_URL;

const getStatusClass = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'pending':
      return 'bg-amber-100 text-amber-700';
    case 'confirmed':
      return 'bg-blue-100 text-blue-700';
    case 'shipped':
      return 'bg-violet-100 text-violet-700';
    case 'delivered':
      return 'bg-emerald-100 text-emerald-700';
    case 'cancelled':
      return 'bg-rose-100 text-rose-700';
    case 'in_cart':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const getStatusDisplayText = (status) => {
  if (!status) return 'N/A';
  if (status.toLowerCase() === 'in_cart') return 'In Cart';
  if (status.toLowerCase() === 'all') return 'All';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const StatCard = ({ title, value, icon, tone, subtitle }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-[0_20px_40px_rgba(15,23,42,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-lg">
    <div className="mb-4 flex items-start justify-center">
      <div className={`rounded-xl p-2.5 ${tone}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
    </div>
    <p className="text-sm font-semibold text-slate-500">{title}</p>
    <h3 className="mt-1 text-3xl font-black text-slate-900">{value}</h3>
    <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>
  </div>
);

const SupplierDashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [stats, setStats] = useState({
    totalMedicines: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    cartItems: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [activeOrderFilter, setActiveOrderFilter] = useState('all');

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken('supplier')}`,
  });

  useEffect(() => {
    Promise.all([fetchMedicines(true), fetchOrders(true)])
      .then(() => setLoading(false))
      .catch((err) => {
        setLoading(false);
        if (err.message?.includes('Unauthorized')) navigate('/supplier/form');
      });

    const interval = setInterval(() => {
      fetchOrders(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async (initialLoad = false) => {
    if (initialLoad) setError('');
    try {
      const response = await fetch(`${BASE_URL}/supplier/api/orders`, {
        headers: { Authorization: `Bearer ${getToken('supplier')}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          removeToken('supplier');
          navigate('/supplier/form');
          return;
        }
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data);
      if (initialLoad) fetchDashboardStats(data);
    } catch (err) {
      console.error('Error fetching orders:', err);
      if (initialLoad) setError('Failed to load orders.');
      throw err;
    }
  };

  const fetchMedicines = async (initialLoad = false) => {
    if (initialLoad) setError('');
    try {
      const response = await fetch(`${BASE_URL}/supplier/api/medicines`, {
        headers: { Authorization: `Bearer ${getToken('supplier')}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          removeToken('supplier');
          navigate('/supplier/form');
          return;
        }
        throw new Error('Failed to fetch medicines');
      }

      const data = await response.json();
      setMedicines(data);
      if (initialLoad) {
        setStats((prev) => ({ ...prev, totalMedicines: data.length }));
      }
      return data;
    } catch (err) {
      console.error('Error fetching medicines:', err);
      if (initialLoad) setError('Failed to load medicines.');
      throw err;
    }
  };

  const fetchDashboardStats = (orderSource) => {
    const orderList = Array.isArray(orderSource) ? orderSource : orders;
    const pendingOrders = orderList.filter((o) => ['pending', 'confirmed', 'shipped'].includes(o.status)).length;
    const cartItems = orderList.filter((o) => o.status === 'in_cart').length;
    const totalRevenue = orderList
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + (o.supplierPayoutAmount || ((o.totalCost || 0) * 0.95)), 0);

    setStats((prev) => ({
      ...prev,
      pendingOrders,
      cartItems,
      totalRevenue,
    }));
  };

  const addMedicine = async (event) => {
    event.preventDefault();
    const form = event.target;

    const formData = {
      name: form.medicineName.value.trim(),
      medicineID: form.medicineID.value.trim(),
      quantity: parseInt(form.quantity.value, 10),
      cost: parseFloat(form.cost.value),
      manufacturer: form.manufacturer.value.trim(),
      expiryDate: form.expiryDate.value,
    };

    const errors = {};
    if (!formData.name) errors.name = 'Medicine name is required';
    else if (!/^[A-Za-z][A-Za-z0-9\s\-]*$/.test(formData.name)) errors.name = 'Name must start with a letter';

    if (!formData.medicineID) errors.medicineID = 'Medicine ID is required';
    else if (!/^[A-Za-z0-9]+[A-Za-z0-9\-_]*$/.test(formData.medicineID)) errors.medicineID = 'Invalid Medicine ID format';

    if (!formData.manufacturer) errors.manufacturer = 'Manufacturer is required';
    else if (/^[0-9\s\-]+$/.test(formData.manufacturer)) errors.manufacturer = 'Manufacturer cannot be only numbers';

    if (!formData.expiryDate) errors.expiryDate = 'Expiry date is required';
    else {
      const selected = new Date(formData.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected <= today) errors.expiryDate = 'Expiry date must be in the future';
    }

    if (Number.isNaN(formData.quantity) || formData.quantity <= 0 || !Number.isInteger(formData.quantity)) {
      errors.quantity = 'Quantity must be a positive whole number';
    }

    if (Number.isNaN(formData.cost) || formData.cost <= 0) {
      errors.cost = 'Cost must be a positive number';
    }

    if (Object.keys(errors).length > 0) {
      Object.values(errors).forEach((msg) => showMessage(msg, 'error'));
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/supplier/api/add-medicine`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        showMessage(data.message || 'Medicine added successfully!', 'success');
        form.reset();
        await fetchMedicines(true);
        fetchDashboardStats();
        setActiveSection('medicines');
      } else {
        if (response.status === 401) {
          removeToken('supplier');
          navigate('/supplier/form');
          return;
        }
        showMessage(`${data.error || 'Failed to add medicine'} ${data.details || ''}`, 'error');
      }
    } catch {
      showMessage('Failed to add medicine', 'error');
    }
  };

  const removeMedicine = async (medicineId) => {
    if (!window.confirm('Are you sure you want to remove this medicine?')) return;

    try {
      const response = await fetch(`${BASE_URL}/supplier/api/medicines/${medicineId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken('supplier')}` },
      });

      const data = await response.json();
      if (response.ok) {
        showMessage(data.message || 'Medicine removed successfully', 'success');
        await fetchMedicines(true);
        fetchDashboardStats();
      } else {
        if (response.status === 401) {
          removeToken('supplier');
          navigate('/supplier/form');
          return;
        }
        showMessage(data.error || 'Failed to remove medicine', 'error');
      }
    } catch {
      showMessage('Failed to remove medicine. Try again.', 'error');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    if (!window.confirm(`Update order status to ${status}?`)) return;

    try {
      const response = await fetch(`${BASE_URL}/supplier/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        showMessage('Order status updated successfully', 'success');
        await fetchOrders(true);
        fetchDashboardStats();
      } else {
        if (response.status === 401) {
          removeToken('supplier');
          navigate('/supplier/form');
          return;
        }
        const data = await response.json();
        throw new Error(data.error || 'Failed to update order status');
      }
    } catch (err) {
      showMessage(err.message, 'error');
    }
  };

  const viewOrderDetails = (orderId) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      alert('Order details not found.');
      return;
    }

    let addressText = 'N/A';
    if (order.deliveryAddress) {
      if (typeof order.deliveryAddress === 'string') {
        addressText = order.deliveryAddress;
      } else if (typeof order.deliveryAddress === 'object') {
        const a = order.deliveryAddress;
        addressText = [a.street, a.city, a.state, a.pincode || a.zipcode, a.country]
          .filter(Boolean)
          .join(', ') || JSON.stringify(a);
      }
    }

    alert(
      `Order Details\n\nOrder ID: ${order.id}\nCustomer: ${order.patient || 'N/A'}\nEmail: ${order.patientEmail || 'N/A'}\nPhone: ${order.patientMobile || 'N/A'}\nAddress: ${addressText}\nMedicine: ${order.medicine || 'N/A'} (${order.medicineId || 'N/A'})\nQuantity: ${order.quantity || 'N/A'}\nAmount: INR ${order.totalCost || 0}\nDelivery Charge: INR ${order.deliveryCharge || 0}\nFinal Amount: INR ${order.finalAmount || order.totalCost || 0}\nPayment: ${order.paymentMethod || 'N/A'}\nStatus: ${getStatusDisplayText(order.status)}\nDate: ${order.orderDate || 'N/A'}`
    );
  };

  const getMedicineIncome = (medicineID) =>
    orders
      .filter((o) => o.status === 'delivered' && o.medicineId === medicineID)
      .reduce((sum, o) => sum + (o.supplierPayoutAmount || ((o.totalCost || 0) * 0.95)), 0);

  const filteredOrders = useMemo(() => {
    if (activeOrderFilter === 'all') return orders;
    return orders.filter((o) => o.status === activeOrderFilter);
  }, [orders, activeOrderFilter]);

  const recentOrders = orders.slice(0, 4);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f9fb]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          <p className="text-sm font-semibold text-slate-600">Loading supplier dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <SupplierLayoutShell activeItem={activeSection} onSectionChange={setActiveSection}>
      <div className="mb-8 text-center">
        <h2 className="font-['Manrope'] text-3xl font-extrabold tracking-tight text-slate-900">Overview</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">Welcome back. Here is what is happening in your supplier account today.</p>
        {error && <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p>}
      </div>

      {activeSection === 'overview' && (
        <>
          <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total Medicines" value={stats.totalMedicines} icon="medication" tone="bg-blue-50 text-[#0058be]" subtitle="Inventory count" />
            <StatCard title="Active Orders" value={stats.pendingOrders} icon="pending_actions" tone="bg-amber-50 text-amber-600" subtitle="Pending, confirmed, shipped" />
            <StatCard title="Total Revenue" value={`INR ${stats.totalRevenue.toFixed(0)}`} icon="payments" tone="bg-emerald-50 text-emerald-600" subtitle="Delivered orders only" />
            <StatCard title="Cart Items" value={stats.cartItems} icon="shopping_cart" tone="bg-violet-50 text-violet-600" subtitle="Waiting for checkout" />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.03)]">
            <div className="flex flex-wrap items-center justify-center gap-3 border-b border-slate-200 px-6 py-5 text-center sm:px-8">
              <h3 className="font-['Manrope'] text-xl font-bold text-slate-900">Recent Orders</h3>
              <button className="text-sm font-bold text-[#0058be] hover:underline" onClick={() => setActiveSection('orders')}>
                View All Orders
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-center">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:px-8">Order ID</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:px-8">Medicine</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:px-8">Patient</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:px-8">Amount</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:px-8">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:px-8">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-8 py-10 text-center text-sm font-medium text-slate-500">No recent orders available.</td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order.id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-6 py-5 text-sm font-bold text-[#0058be] sm:px-8">{order.status === 'in_cart' ? 'CART-' : 'ORD-'}{String(order.id).substring(0, 8)}</td>
                        <td className="px-6 py-5 text-sm font-semibold text-slate-800 sm:px-8">{order.medicine || 'Unknown'}</td>
                        <td className="px-6 py-5 text-sm text-slate-600 sm:px-8">{order.patient || 'Unknown'}</td>
                        <td className="px-6 py-5 text-sm font-bold text-slate-900 sm:px-8">INR {(order.totalCost || 0).toFixed(2)}</td>
                        <td className="px-6 py-5 sm:px-8">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-tight ${getStatusClass(order.status)}`}>
                            {getStatusDisplayText(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-600 sm:px-8">{order.orderDate || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeSection === 'orders' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.03)] sm:p-8">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-3 text-center">
            <div className="w-full">
              <h3 className="font-['Manrope'] text-xl font-bold text-slate-900">Order Management</h3>
              <p className="text-sm font-medium text-slate-500">Filter and update customer order statuses.</p>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap justify-center gap-2">
            {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'in_cart', 'cancelled'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveOrderFilter(filter)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                  activeOrderFilter === filter
                    ? 'border-[#0058be] bg-[#0058be] text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {getStatusDisplayText(filter)}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-center">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500">Order ID</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500">Medicine</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500">Patient</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500">Qty</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500">Amount</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-sm text-slate-500">No orders matching this filter.</td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-4 text-sm font-bold text-[#0058be]">{order.status === 'in_cart' ? 'CART-' : 'ORD-'}{String(order.id).substring(0, 8)}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-800">{order.medicine || 'Unknown'}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{order.patient || 'Unknown'}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{order.quantity || 0}</td>
                      <td className="px-4 py-4 text-sm font-bold text-slate-900">INR {(order.totalCost || 0).toFixed(2)}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-tight ${getStatusClass(order.status)}`}>
                          {getStatusDisplayText(order.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-center gap-2">
                          <button className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50" onClick={() => viewOrderDetails(order.id)}>
                            View
                          </button>
                          {order.status === 'confirmed' && (
                            <button className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-bold text-white" onClick={() => updateOrderStatus(order.id, 'shipped')}>
                              Ship
                            </button>
                          )}
                          {order.status === 'shipped' && (
                            <button className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white" onClick={() => updateOrderStatus(order.id, 'delivered')}>
                              Deliver
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSection === 'medicines' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.03)] sm:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-center gap-3 text-center">
            <div className="w-full">
              <h3 className="font-['Manrope'] text-xl font-bold text-slate-900">Medicines Inventory</h3>
              <p className="text-sm font-medium text-slate-500">Manage all medicines supplied by your account.</p>
            </div>
            <button className="rounded-xl bg-[#0058be] px-4 py-2 text-sm font-bold text-white" onClick={() => setActiveSection('add')}>
              Add Medicine
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-center">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500">Name</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500">Medicine ID</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500">Qty</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500">Cost</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500">Manufacturer</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500">Expiry</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500">Revenue</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicines.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-sm text-slate-500">No medicines found. Add one to get started.</td>
                  </tr>
                ) : (
                  medicines.map((med) => (
                    <tr key={med.id}>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-800">{med.name}</td>
                      <td className="px-4 py-4 text-sm font-mono text-slate-500">{med.medicineID}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{med.quantity}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-900">INR {med.cost}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{med.manufacturer}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{med.expiryDate}</td>
                      <td className="px-4 py-4 text-sm font-bold text-emerald-700">INR {getMedicineIncome(med.medicineID).toFixed(2)}</td>
                      <td className="px-4 py-4">
                        <button className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-bold text-white" onClick={() => removeMedicine(med.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSection === 'add' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.03)] sm:p-8">
          <div className="mb-5 text-center">
            <h3 className="font-['Manrope'] text-xl font-bold text-slate-900">Add New Medicine</h3>
            <p className="text-sm font-medium text-slate-500">Only required medicine fields are included for this website workflow.</p>
          </div>

          <form onSubmit={addMedicine} className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-center text-sm font-semibold text-slate-700">Medicine Name</label>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0058be]"
                type="text"
                name="medicineName"
                required
                pattern="^[A-Za-z][A-Za-z0-9\s\-]*$"
                placeholder="e.g. Paracetamol 500mg"
              />
            </div>

            <div>
              <label className="mb-1 block text-center text-sm font-semibold text-slate-700">Medicine ID</label>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0058be]"
                type="text"
                name="medicineID"
                required
                pattern="^[A-Za-z0-9]+[A-Za-z0-9\-_]*$"
                placeholder="e.g. MED-001"
              />
            </div>

            <div>
              <label className="mb-1 block text-center text-sm font-semibold text-slate-700">Quantity</label>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0058be]"
                type="number"
                name="quantity"
                min="1"
                step="1"
                required
                placeholder="e.g. 100"
              />
            </div>

            <div>
              <label className="mb-1 block text-center text-sm font-semibold text-slate-700">Cost per unit (INR)</label>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0058be]"
                type="number"
                name="cost"
                min="0.01"
                step="0.01"
                required
                placeholder="e.g. 12.50"
              />
            </div>

            <div>
              <label className="mb-1 block text-center text-sm font-semibold text-slate-700">Manufacturer</label>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0058be]"
                type="text"
                name="manufacturer"
                required
                placeholder="e.g. Sun Pharma"
              />
            </div>

            <div>
              <label className="mb-1 block text-center text-sm font-semibold text-slate-700">Expiry Date</label>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0058be]"
                type="date"
                name="expiryDate"
                required
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              />
            </div>

            <div className="col-span-1 mt-2 flex flex-wrap justify-center gap-3 md:col-span-2">
              <button type="submit" className="rounded-xl bg-[#0058be] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#004aa0]">
                Add Medicine
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700"
                onClick={() => setActiveSection('medicines')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </SupplierLayoutShell>
  );
};

export default SupplierDashboard;
