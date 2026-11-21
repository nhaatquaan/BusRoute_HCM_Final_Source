import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import PassengerLayout from './layouts/PassengerLayout';
import OperatorLayout from './layouts/OperatorLayout';
import AdminLayout from './layouts/AdminLayout';

// Auth Pages
import LoginPage from './modules/admin/auth/LoginPage';
import RegisterPage from './modules/admin/auth/RegisterPage';

// Public & Shared Pages
import HomePage from './modules/public/HomePage';
import ProfilePage from './modules/profile/ProfilePage';
import { RoutePlannerModule } from './modules/route-planner';
import { CytoscapeGraph } from './modules/route-planner/graph/CytoscapeGraph';
import AIAssistantPage from './modules/admin/ai/AIAssistantPage';
import NearbyStopsPage from './modules/admin/stops/NearbyStopsPage';

// Passenger Pages
import PassengerDashboardPage from './modules/passenger/PassengerDashboardPage';

// Operator Pages
import OperatorDashboardPage from './modules/operator/OperatorDashboardPage';

// Admin & Entity Management Pages
import DashboardPage from './modules/admin/dashboard/DashboardPage';
import NetworkAnalyticsPage from './modules/admin/analytics/NetworkAnalyticsPage';
import RoutesPage from './modules/admin/routes/RoutesPage';
import RouteDetailPage from './modules/admin/routes/RouteDetailPage';
import StopsPage from './modules/admin/stops/StopsPage';
import UsersPage from './modules/admin/users/UsersPage';

// MongoDB Management Pages
import MongoExplorerPage from './modules/admin/database/MongoExplorerPage';
import MongoPlaygroundPage from './modules/admin/database/MongoPlaygroundPage';
import DatabaseIntegrityPage from './modules/admin/database/DatabaseIntegrityPage';
import ImportExportPage from './modules/admin/database/ImportExportPage';
import BackupRestorePage from './modules/admin/database/BackupRestorePage';

export default function App() {
  return (
    <Routes>
      {/* 1. PUBLIC PORTAL (Dành cho Khách vãng lai & Tra cứu công khai) */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/explore-graph"
          element={
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-[#172B4D]">Khám phá mạng lưới xe buýt TP.HCM</h1>
                <p className="mt-1 text-xs text-slate-500">
                  Trực quan hóa toàn bộ mạng lưới đỉnh (Tuyến xe, Trạm dừng) và quan hệ liên kết có hướng trên Cytoscape.js
                </p>
              </div>
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
                <CytoscapeGraph />
              </div>
            </div>
          }
        />
        <Route path="/ai-assistant" element={<AIAssistantPage />} />
      </Route>

      {/* 2. AUTHENTICATION ROUTES */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* 3. PASSENGER PORTAL (/portal) - Không gian dành riêng cho Hành khách */}
      <Route
        path="/portal"
        element={
          <ProtectedRoute allowedRoles={['passenger', 'admin']}>
            <PassengerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PassengerDashboardPage />} />
        <Route path="planner" element={<RoutePlannerModule />} />
        <Route path="nearby-stops" element={<NearbyStopsPage />} />
        <Route
          path="graph"
          element={
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-[#172B4D]">Khám phá mạng lưới đồ thị</h1>
                <p className="mt-1 text-xs text-slate-500">
                  Trực quan hóa cấu trúc topo các tuyến xe và trạm trung chuyển TP.HCM
                </p>
              </div>
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
                <CytoscapeGraph />
              </div>
            </div>
          }
        />
        <Route path="ai-assistant" element={<AIAssistantPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* 4. OPERATOR PORTAL (/operator) - Không gian dành cho Điều hành viên */}
      <Route
        path="/operator"
        element={
          <ProtectedRoute allowedRoles={['operator', 'admin']}>
            <OperatorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<OperatorDashboardPage />} />
        <Route path="routes" element={<RoutesPage />} />
        <Route path="routes/:id" element={<RouteDetailPage />} />
        <Route path="stops" element={<StopsPage />} />
        <Route path="nearby-stops" element={<NearbyStopsPage />} />
        <Route path="planner" element={<RoutePlannerModule />} />
        <Route
          path="graph"
          element={
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-[#172B4D]">Mạng lưới liên kết Đồ thị</h1>
                <p className="mt-1 text-xs text-slate-500">
                  Xem toàn bộ quan hệ đỉnh - cạnh (CO_TRAM, KE_TIEP) phục vụ công tác điều độ mạng lưới
                </p>
              </div>
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
                <CytoscapeGraph />
              </div>
            </div>
          }
        />
        <Route path="ai-assistant" element={<AIAssistantPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* 5. ADMIN PORTAL (/admin) - Không gian Quản trị Toàn quyền */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* Tổng quan & Thống kê */}
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="analytics" element={<NetworkAnalyticsPage />} />

        {/* Quản lý thực thể */}
        <Route path="routes" element={<RoutesPage />} />
        <Route path="routes/:id" element={<RouteDetailPage />} />
        <Route path="stops" element={<StopsPage />} />
        <Route path="nearby-stops" element={<NearbyStopsPage />} />
        <Route path="users" element={<UsersPage />} />

        {/* Tra cứu & Đồ thị & AI */}
        <Route path="route-planner" element={<RoutePlannerModule />} />
        <Route
          path="graph"
          element={
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-[#172B4D]">Khám phá mạng lưới xe buýt</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Trực quan hóa toàn bộ mạng lưới đỉnh (Tuyến xe, Trạm dừng) và quan hệ kết nối trên nền tảng Cytoscape.js
                </p>
              </div>
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
                <CytoscapeGraph />
              </div>
            </div>
          }
        />
        <Route path="ai-assistant" element={<AIAssistantPage />} />

        {/* Quản trị Cơ sở Dữ liệu NoSQL MongoDB */}
        <Route path="mongodb-explorer" element={<MongoExplorerPage />} />
        <Route path="mongodb-playground" element={<MongoPlaygroundPage />} />
        <Route path="integrity" element={<DatabaseIntegrityPage />} />
        <Route path="import-export" element={<ImportExportPage />} />
        <Route path="backup-restore" element={<BackupRestorePage />} />

        {/* Hồ sơ Quản trị viên */}
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Route Aliases & Compatibility Redirects */}
      <Route path="/passenger" element={<Navigate to="/portal" replace />} />
      <Route path="/passenger/dashboard" element={<Navigate to="/portal" replace />} />
      <Route path="/portal/dashboard" element={<Navigate to="/portal" replace />} />
      <Route path="/operator/route-planner" element={<Navigate to="/operator/planner" replace />} />
      <Route path="/portal/route-planner" element={<Navigate to="/portal/planner" replace />} />
      <Route path="/admin/planner" element={<Navigate to="/admin/route-planner" replace />} />

      {/* Fallback & Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
