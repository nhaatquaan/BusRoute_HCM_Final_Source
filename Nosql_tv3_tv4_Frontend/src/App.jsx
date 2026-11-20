import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './modules/admin/auth/LoginPage';
import DashboardPage from './modules/admin/dashboard/DashboardPage';
import RoutesPage from './modules/admin/routes/RoutesPage';
import RouteDetailPage from './modules/admin/routes/RouteDetailPage';
import StopsPage from './modules/admin/stops/StopsPage';
import NearbyStopsPage from './modules/admin/stops/NearbyStopsPage';
import UsersPage from './modules/admin/users/UsersPage';
import { RoutePlannerModule } from './modules/route-planner';
import { CytoscapeGraph } from './modules/route-planner/graph/CytoscapeGraph';

// Các module MongoDB & AI & Analytics mới
import MongoExplorerPage from './modules/admin/database/MongoExplorerPage';
import MongoPlaygroundPage from './modules/admin/database/MongoPlaygroundPage';
import DatabaseIntegrityPage from './modules/admin/database/DatabaseIntegrityPage';
import ImportExportPage from './modules/admin/database/ImportExportPage';
import BackupRestorePage from './modules/admin/database/BackupRestorePage';
import NetworkAnalyticsPage from './modules/admin/analytics/NetworkAnalyticsPage';
import AIAssistantPage from './modules/admin/ai/AIAssistantPage';

export default function App() {
  return (
    <Routes>
      {/* Trang đăng nhập quản trị */}
      <Route path="/login" element={<LoginPage />} />

      {/* Cụm chức năng Quản trị & Điều hành Hệ thống */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* 1. Tổng quan */}
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="analytics" element={<NetworkAnalyticsPage />} />

        {/* 2. Quản lý thực thể */}
        <Route path="routes" element={<RoutesPage />} />
        <Route path="routes/:id" element={<RouteDetailPage />} />
        <Route path="stops" element={<StopsPage />} />
        <Route path="nearby-stops" element={<NearbyStopsPage />} />
        <Route path="users" element={<UsersPage />} />

        {/* 3. Tra cứu & Đồ thị */}
        <Route path="route-planner" element={<RoutePlannerModule />} />
        <Route
          path="graph"
          element={
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-[#172B4D]">Khám phá mạng lưới xe buýt</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Trực quan hóa toàn bộ mạng lưới đỉnh (Tuyến xe, Trạm dừng) và quan hệ kết nối trên nền tảng Cytoscape.js
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
                <CytoscapeGraph />
              </div>
            </div>
          }
        />
        <Route path="ai-assistant" element={<AIAssistantPage />} />

        {/* 4. Quản trị Dữ liệu NoSQL MongoDB */}
        <Route path="mongodb-explorer" element={<MongoExplorerPage />} />
        <Route path="mongodb-playground" element={<MongoPlaygroundPage />} />
        <Route path="integrity" element={<DatabaseIntegrityPage />} />
        <Route path="import-export" element={<ImportExportPage />} />
        <Route path="backup-restore" element={<BackupRestorePage />} />
      </Route>

      {/* Tra cứu công khai cho hành khách */}
      <Route
        path="/route-planner"
        element={
          <div className="min-h-screen bg-[#F4F7FA] p-6">
            <div className="mx-auto max-w-7xl">
              <RoutePlannerModule />
            </div>
          </div>
        }
      />

      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}
