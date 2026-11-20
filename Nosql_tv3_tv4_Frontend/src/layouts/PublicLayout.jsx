import React from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { Bus, Navigation, MapPin, Network, Bot, LogIn, UserPlus, Server, User, LogOut, LayoutDashboard } from 'lucide-react';
import { authService } from '../services/authService';

export default function PublicLayout() {
  const navigate = useNavigate();
  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser();
  const userRole = authService.getUserRole();

  const handleLogout = () => {
    authService.logout();
    navigate('/login', { replace: true });
  };

  const getPortalLink = () => {
    if (userRole === 'admin') return '/admin/dashboard';
    if (userRole === 'operator') return '/operator/dashboard';
    return '/portal';
  };

  const getRoleDisplayName = () => {
    if (userRole === 'admin') return 'Quản trị viên';
    if (userRole === 'operator') return 'Điều hành viên';
    return 'Hành khách';
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F7FA] font-sans text-[#172B4D] antialiased">
      {/* Public Navbar */}
      <header className="sticky top-0 z-40 border-b border-[#E2E8F0] bg-white/95 backdrop-blur shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#172B4D] to-[#245A85] text-white shadow-md">
              <Bus className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-[#172B4D]">
                BusRoute <span className="text-[#245A85]">HCM</span>
              </div>
              <div className="text-[10px] font-medium text-slate-500">
                Giao thông công cộng TP.HCM
              </div>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-600">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 transition-colors ${
                  isActive ? 'bg-slate-100 text-[#172B4D] font-bold' : 'hover:bg-slate-50 hover:text-[#172B4D]'
                }`
              }
            >
              Tra cứu lộ trình
            </NavLink>
            <NavLink
              to="/explore-graph"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 transition-colors ${
                  isActive ? 'bg-slate-100 text-[#172B4D] font-bold' : 'hover:bg-slate-50 hover:text-[#172B4D]'
                }`
              }
            >
              Khám phá mạng lưới
            </NavLink>
            <NavLink
              to="/ai-assistant"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 transition-colors ${
                  isActive ? 'bg-slate-100 text-[#172B4D] font-bold' : 'hover:bg-slate-50 hover:text-[#172B4D]'
                }`
              }
            >
              Trợ lý AI
            </NavLink>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to={getPortalLink()}
                  className="flex items-center gap-1.5 rounded-lg bg-[#172B4D] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#245A85] transition-colors"
                >
                  <LayoutDashboard size={14} />
                  <span>Vào Không gian ({getRoleDisplayName()})</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="rounded-lg border border-[#E2E8F0] p-1.5 text-slate-500 hover:bg-rose-50 hover:text-[#D9534F] transition-colors"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <LogIn size={13} />
                  <span>Đăng nhập</span>
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 rounded-lg bg-[#245A85] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#172B4D] transition-colors shadow-xs"
                >
                  <UserPlus size={13} />
                  <span>Đăng ký</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-4 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div>
            <strong>BusRoute HCM</strong> &bull; Hệ thống quản lý và tra cứu lộ trình xe buýt TP.HCM
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#16866B]">
            <Server size={12} />
            <span>MongoDB Community Server &bull; Port: 3000</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
