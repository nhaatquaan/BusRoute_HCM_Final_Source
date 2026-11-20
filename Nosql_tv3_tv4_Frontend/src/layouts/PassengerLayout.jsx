import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  Bus,
  Navigation,
  Compass,
  Network,
  Bot,
  User,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  Server
} from 'lucide-react';
import { authService } from '../services/authService';

const NAV_ITEMS = [
  { to: '/portal', label: 'Tổng quan của tôi', icon: LayoutDashboard, end: true },
  { to: '/portal/planner', label: 'Tra cứu lộ trình', icon: Navigation },
  { to: '/portal/nearby-stops', label: 'Trạm gần tôi', icon: Compass },
  { to: '/portal/graph', label: 'Khám phá mạng lưới', icon: Network },
  { to: '/portal/ai-assistant', label: 'Trợ lý AI', icon: Bot },
  { to: '/portal/profile', label: 'Hồ sơ cá nhân', icon: User },
];

export default function PassengerLayout() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentUser = authService.getCurrentUser() || {
    fullName: 'Hành khách',
    email: 'user@busroute.vn',
    role: 'passenger',
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-[#F4F7FA] font-sans text-[#172B4D] antialiased">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#E2E8F0] bg-white transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between border-b border-[#E2E8F0] px-4">
          <Link to="/portal" className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#16866B] to-[#245A85] text-white shadow-md">
              <Bus className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-[#172B4D]">
                BusRoute <span className="text-[#16866B]">HCM</span>
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                Không gian Hành khách
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            TIỆN ÍCH HÀNH KHÁCH
          </div>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#16866B] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#172B4D]'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        {/* User Card & Logout Footer */}
        <div className="border-t border-[#E2E8F0] p-3 space-y-2 bg-[#F8FAFC]">
          <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#16866B] text-xs font-bold text-white uppercase">
                {(currentUser.fullName || currentUser.ho_ten || 'H')[0]}
              </div>
              <div className="min-w-0 truncate">
                <div className="truncate text-xs font-bold text-[#172B4D]">
                  {currentUser.fullName || currentUser.ho_ten}
                </div>
                <div className="truncate text-[10px] text-slate-500">
                  Hành khách
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Đăng xuất"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-[#D9534F] transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col transition-all duration-300 lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-white/95 backdrop-blur px-6 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-400">Không gian hành khách</span>
              <span>/</span>
              <span className="font-semibold text-[#172B4D]">BusRoute HCM</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/portal/profile"
              className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <User size={13} className="text-[#16866B]" />
              <span>Hồ sơ của tôi</span>
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
