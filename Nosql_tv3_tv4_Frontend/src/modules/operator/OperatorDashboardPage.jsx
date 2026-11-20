import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bus, MapPin, Network, ArrowRight, Plus, Compass, Navigation, Wrench, CheckCircle2 } from 'lucide-react';
import { routeService } from '../../services/routeService';
import { stopService } from '../../services/stopService';
import Button from '../../components/Button';

export default function OperatorDashboardPage() {
  const [stats, setStats] = useState({
    routesCount: 6,
    stopsCount: 25,
    loading: true,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [routes, stops] = await Promise.all([
          routeService.getAll(),
          stopService.getAll(),
        ]);
        setStats({
          routesCount: Array.isArray(routes) ? routes.length : 6,
          stopsCount: Array.isArray(stops) ? stops.length : 25,
          loading: false,
        });
      } catch (err) {
        console.warn('Could not load operator stats:', err);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-[#245A85] to-[#172B4D] p-6 text-white shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">
              <Wrench size={13} />
            </span>
            <h1 className="text-xl font-bold tracking-tight">Trung tâm Điều hành Mạng lưới Xe buýt</h1>
          </div>
          <p className="mt-1 text-xs text-slate-200 max-w-xl">
            Không gian làm việc dành riêng cho Điều hành viên (Operator): Cập nhật thông tin tuyến xe, quản lý vị trí GPS trạm dừng và gán thứ tự trạm đón trả khách.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/operator/routes"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[#172B4D] hover:bg-slate-100 transition-colors shadow-xs"
          >
            Quản lý tuyến <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tuyến xe hoạt động</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#245A85]">
              <Bus size={18} />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-[#172B4D] tabular-nums">
            {stats.loading ? '...' : stats.routesCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Tất cả tuyến trong cơ sở dữ liệu MongoDB
          </div>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạm dừng phục vụ</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#16866B]">
              <MapPin size={18} />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-[#172B4D] tabular-nums">
            {stats.loading ? '...' : stats.stopsCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Trạm có tọa độ GPS hợp lệ tại TP.HCM
          </div>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái quyền hạn</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3 text-sm font-bold text-emerald-700">
            Điều hành viên Mạng lưới
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Được cấp quyền CRUD Tuyến, Trạm & Thứ tự
          </div>
        </div>
      </div>

      {/* Action Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#172B4D]">Quản lý Tuyến xe buýt</h2>
            <Link to="/operator/routes" className="text-xs font-semibold text-[#245A85] hover:underline">
              Xem toàn bộ
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            Thêm mới tuyến, cập nhật giá vé, giờ xuất bến và nhấp vào chi tiết tuyến để sắp xếp lại thứ tự đón trả khách trên bản đồ Leaflet.
          </p>
          <div className="pt-2">
            <Link to="/operator/routes">
              <Button variant="primary" size="sm" className="w-full">
                <Bus size={14} /> Mở danh sách tuyến xe
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#172B4D]">Quản lý Trạm dừng & GPS</h2>
            <Link to="/operator/stops" className="text-xs font-semibold text-[#245A85] hover:underline">
              Xem toàn bộ
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            Thêm trạm dừng mới bằng cách ghim vị trí trực tiếp trên bản đồ OpenStreetMap, chỉnh sửa địa chỉ và quản lý danh mục theo từng Quận/Huyện.
          </p>
          <div className="pt-2">
            <Link to="/operator/stops">
              <Button variant="secondary" size="sm" className="w-full">
                <MapPin size={14} /> Mở danh mục trạm dừng
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
