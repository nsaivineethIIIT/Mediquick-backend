import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupplier } from '../../context/SupplierContext';

const SupplierLayoutShell = ({ children, activeItem = 'overview', onSectionChange }) => {
  const { supplier, logout } = useSupplier();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = useMemo(
    () => [
      { id: 'overview', label: 'Overview', icon: 'dashboard', type: 'section' },
      { id: 'orders', label: 'Orders', icon: 'shopping_cart', type: 'section' },
      { id: 'medicines', label: 'Medicines', icon: 'medication', type: 'section' },
      { id: 'add', label: 'Add Medicine', icon: 'add_circle', type: 'section' },
      { id: 'profile', label: 'Profile', icon: 'person', type: 'route', to: '/supplier/profile' },
    ],
    []
  );

  const handleItemClick = (item) => {
    if (item.type === 'section' && typeof onSectionChange === 'function') {
      onSectionChange(item.id);
      setSidebarOpen(false);
      return;
    }

    if (item.type === 'route' && item.to) {
      navigate(item.to);
      setSidebarOpen(false);
      return;
    }

    if (item.type === 'section') {
      navigate('/supplier/dashboard');
      setSidebarOpen(false);
    }
  };

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-slate-900">
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 border-r border-slate-200 bg-white shadow-[20px_0_40px_rgba(15,23,42,0.03)] transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col p-6">
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0058be] text-white">
                <span className="material-symbols-outlined">medical_services</span>
              </div>
              <div>
                <h1 className="font-['Manrope'] text-lg font-black tracking-tight text-[#0058be]">MediQuick</h1>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Supplier Portal</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1 text-slate-500 lg:hidden">X</button>
          </div>

          <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-blue-700">
              {(supplier?.name?.[0] || 'S').toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{supplier?.name || 'Supplier'}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Inventory Manager</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-['Manrope'] text-[15px] font-semibold transition-all ${
                  activeItem === item.id ? 'bg-blue-50 text-[#0058be]' : 'text-slate-600 hover:translate-x-1 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <button className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-[#0058be]">
              <span className="material-symbols-outlined text-[18px]">help_center</span>
              <span>Support Center</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-['Manrope'] text-[15px] font-semibold text-slate-600 transition-colors hover:text-rose-600"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)}></div>}

      <div className="min-h-screen lg:ml-72">
        <div className="fixed left-1/2 top-3 z-30 w-[calc(100vw-1rem)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-[#f7f9fb]/95 px-2 py-3 shadow-sm backdrop-blur-xl sm:w-[calc(100vw-1.5rem)] sm:px-3 lg:left-[calc(50%+9rem)] lg:w-[min(96rem,calc(100vw-19rem))] lg:px-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="rounded-xl border border-slate-200 bg-white p-2 lg:hidden">
                <span className="material-symbols-outlined">menu</span>
              </button>
              <div className="flex min-w-0 flex-1 items-center rounded-full border border-slate-200 bg-white px-4 py-2 lg:max-w-[90rem]">
                <span className="material-symbols-outlined text-slate-400">search</span>
                <input
                  type="text"
                  placeholder="Search medicines, orders, suppliers..."
                  className="ml-2 w-full border-none bg-transparent text-sm font-medium text-slate-700 outline-none"
                />
              </div>
            </div>
            <div className="hidden items-center gap-4 sm:flex">
              <Link to="/supplier/profile" className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-bold leading-tight text-slate-900">{supplier?.name || 'Supplier User'}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Supplier Account</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 font-bold text-blue-700">
                  {(supplier?.name?.[0] || 'S').toUpperCase()}
                </div>
              </Link>
            </div>
          </div>
        </div>

        <main className="px-5 pb-5 pt-[110px] sm:px-8 sm:pb-8 sm:pt-[114px]">{children}</main>
      </div>
    </div>
  );
};

export default SupplierLayoutShell;
