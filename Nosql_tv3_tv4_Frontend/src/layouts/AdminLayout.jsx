import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Bus,
  MapPin,
  Users,
  LogOut,
  Database,
  Navigation,
  Bot,
  Network,
  Share2,
  HardDrive,
  FileSpreadsheet,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Compass,
  BarChart3,
  Terminal,
  Server
} from 'lucide-react';
import { authService } from '../services/authService';

const NAV_GROUPS = [
  {
    title: 'TỔNG QUAN',
    items: [
      { to: '/admin/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
      { to: '/admin/analytics', label: 'Thống kê mạng lưới', icon: BarChart3 },
    ],
  },
  {
    title: 'QUẢN LÝ',
    items: [
      { to: '/admin/routes', label: 'Quản lý tuyến xe', icon: Bus },
      { to: '/admin/stops', label: 'Quản lý trạm dừng', icon: MapPin },
      { to: '/admin/users', label: 'Quản lý người dùng', icon: Users },
    ],
  },
  {
    title: 'TRA CỨU & BẢN ĐỒ',
    items: [
      { to: '/admin/route-planner', label: 'Tra cứu lộ trình', icon: Navigation },
      { to: '/admin/nearby-stops', label: 'Trạm gần tôi', icon: Compass },
      { to: '/admin/graph', label: 'Khám phá mạng lưới', icon: Network },
      { to: '/admin/ai-assistant', label: 'Trợ lý AI', icon: Bot },
    ],
  },
  {
    title: 'DỮ LIỆU MONGODB',
    items: [
      { to: '/admin/mongodb-explorer', label: 'Quản lý dữ liệu', icon: Database },
      { to: '/admin/mongodb-playground', label: 'Query Playground', icon: Terminal },
      { to: '/admin/integrity', label: 'Kiểm tra toàn vẹn', icon: ShieldCheck },
      { to: '/admin/import-export', label: 'Import / Export', icon: FileSpreadsheet },
      { to: '/admin/backup-restore', label: 'Sao lưu và khôi phục', icon: HardDrive },
    ],
  },
];

const ROUTE_NAMES = {
  '/admin/dashboard': 'Tổng quan',
  '/admin/analytics': 'Thống kê mạng lưới',
  '/admin/routes': 'Quản lý tuyến xe',
  '/admin/stops': 'Quản lý trạm dừng',
  '/admin/users': 'Quản lý người dùng',
  '/admin/route-planner': 'Tra cứu lộ trình',
  '/admin/nearby-stops': 'Trạm gần tôi',
  '/admin/graph': 'Khám phá mạng lưới',
  '/admin/ai-assistant': 'Trợ lý AI',
  '/admin/mongodb-explorer': 'Quản lý dữ liệu',
  '/admin/mongodb-playground': 'Query Playground',
  '/admin/integrity': 'Kiểm tra toàn vẹn',
  '/admin/import-export': 'Import / Export',
  '/admin/backup-restore': 'Sao lưu và khôi phục',
};

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentUser = authService.getCurrentUser() || {
    fullName: 'Quản trị viên Hệ thống',
    username: 'admin',
    role: 'admin',
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login', { replace: true });
  };

  const currentTitle = ROUTE_NAMES[location.pathname] || 'BusRoute HCM';

  return (
    <div className="flex min-h-screen bg-[#F4F7FA] font-sans antialiased text-[#172B4D]">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#E2E8F0] bg-white transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-[#E2E8F0] px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#172B4D] to-[#245A85] text-white shadow-md">
              <Bus className="h-5 w-5" strokeWidth={2} />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-base font-bold tracking-tight text-[#172B4D]">
                  BusRoute <span className="text-[#245A85]">HCM</span>
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  NoSQL MongoDB System
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:flex"
            title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              {!collapsed && (
                <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {group.title}
                </div>
              )}
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#172B4D] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-[#172B4D]'
                    } ${collapsed ? 'justify-center px-0' : ''}`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        {/* Database Status & User Profile Footer */}
        <div className="border-t border-[#E2E8F0] p-3 space-y-2 bg-[#F8FAFC]">
          {!collapsed && (
            <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 rounded-full bg-[#16866B]" />
                <span className="font-semibold text-slate-700">MongoDB</span>
              </div>
              <span className="text-[11px] text-slate-500">BusRouteDB</span>
            </div>
          )}

          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-1`}>
            {!collapsed && (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#245A85] text-xs font-bold text-white uppercase">
                  {currentUser.fullName ? currentUser.fullName[0] : 'A'}
                </div>
                <div className="min-w-0 truncate">
                  <div className="truncate text-xs font-semibold text-[#172B4D]">
                    {currentUser.fullName}
                  </div>
                  <div className="truncate text-[11px] text-slate-500">
                    {currentUser.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                  </div>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              title="Đăng xuất"
              className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-[#D9534F] transition-colors"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex flex-1 flex-col transition-all duration-300 ${
          collapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
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
              <span className="font-medium text-slate-400">Trang chủ</span>
              <span>/</span>
              <span className="font-semibold text-[#172B4D]">{currentTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-[#16866B]">
              <Server size={13} />
              <span>MongoDB 127.0.0.1:27017</span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Port: 3000
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
