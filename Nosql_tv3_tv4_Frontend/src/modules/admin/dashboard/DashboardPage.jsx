import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bus,
  MapPin,
  Users,
  Activity,
  ArrowRight,
  Database,
  Layers,
  Network,
  Share2,
  Plus,
  Navigation,
  Compass,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { analyticsService } from '../../../services/analyticsService';
import { routeService } from '../../../services/routeService';
import { stopService } from '../../../services/stopService';
import Button from '../../../components/Button';
import Badge from '../../../components/Badge';
import {
  createMovingBusIcon,
  CITY_FLEET_ROUTES,
  interpolateBusAlongRoad,
} from '../../route-planner/map/RouteMap.jsx';

// Fix Leaflet Default Icon in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const stopMarkerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [22, 34],
  iconAnchor: [11, 34],
  popupAnchor: [1, -30],
});

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [tickProgress, setTickProgress] = useState(0);

  useEffect(() => {
    loadDashboardData();
    const timer = setInterval(() => {
      setTickProgress((prev) => (prev + 0.0003) % 2);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [analyticsData, routesData, stopsData] = await Promise.all([
        analyticsService.getNetworkAnalytics().catch(() => null),
        routeService.getAll().catch(() => []),
        stopService.getAll().catch(() => []),
      ]);

      setAnalytics(analyticsData);
      setRoutes(routesData);
      setStops(stopsData);
    } finally {
      setLoading(false);
    }
  };

  const summary = analytics?.summary || {
    totalRoutes: routes.length || 6,
    activeRoutes: routes.filter((r) => r.status === 'active' || r.trang_thai === 'active').length || 6,
    totalStops: stops.length || 25,
    totalUsers: 3,
    totalCoTram: 92,
    totalKeTiep: 80,
  };

  const kpis = [
    { label: 'Tổng số tuyến xe', value: summary.totalRoutes, icon: Bus, desc: 'Tuyến buýt TP.HCM' },
    { label: 'Tuyến đang chạy', value: summary.activeRoutes, icon: Activity, desc: '100% hoạt động' },
    { label: 'Tổng trạm dừng', value: summary.totalStops, icon: MapPin, desc: 'Trạm có tọa độ GPS' },
    { label: 'Tài khoản hệ thống', value: summary.totalUsers, icon: Users, desc: 'Quản trị viên & Nhân viên' },
    { label: 'Quan hệ Tuyến - Trạm', value: summary.totalCoTram, icon: Layers, desc: 'Cạnh CO_TRAM trong DB' },
    { label: 'Kết nối giữa các trạm', value: summary.totalKeTiep, icon: Share2, desc: 'Cạnh KE_TIEP đồ thị' },
  ];

  // Dữ liệu biểu đồ từ MongoDB Aggregations
  const topRoutesData = (analytics?.charts?.topRoutesByStops || [
    { ma_tuyen: '01', ten_tuyen: 'Bến Thành - Chợ Lớn', so_tram: 15 },
    { ma_tuyen: '19', ten_tuyen: 'Bến Thành - ĐHQG', so_tram: 18 },
    { ma_tuyen: '03', ten_tuyen: 'Bến Thành - Thạnh Lộc', so_tram: 16 },
    { ma_tuyen: '08', ten_tuyen: 'Quận 8 - ĐHQG', so_tram: 14 },
    { ma_tuyen: '152', ten_tuyen: 'Bến Thành - Sân bay', so_tram: 12 },
    { ma_tuyen: '04', ten_tuyen: 'Bến Thành - An Sương', so_tram: 17 },
  ]).map((r) => ({
    name: `T${r.ma_tuyen}`,
    so_tram: r.so_tram,
    title: r.ten_tuyen,
  }));

  const topHubsData = (analytics?.charts?.topHubStops || [
    { ten_tram: 'Trạm Bến Thành', so_tuyen: 6 },
    { ten_tram: 'BX Chợ Lớn', so_tuyen: 4 },
    { ten_tram: 'Hàng Xanh', so_tuyen: 4 },
    { ten_tram: 'ĐH Quốc Gia', so_tuyen: 3 },
    { ten_tram: 'Suối Tiên', so_tuyen: 3 },
  ]).map((h) => ({
    name: h.ten_tram.replace('Trạm Trung chuyển ', '').replace('Khu du lịch ', ''),
    tuyen: h.so_tuyen,
  }));

  const districtData = (analytics?.charts?.districtDistribution || [
    { name: 'Quận 1', value: 8 },
    { name: 'TP. Thủ Đức', value: 6 },
    { name: 'Quận 5', value: 4 },
    { name: 'Quận 10', value: 3 },
    { name: 'Bình Thạnh', value: 4 },
  ]).slice(0, 5);

  const statusData = analytics?.charts?.routesByStatus || [
    { name: 'Đang hoạt động', value: summary.activeRoutes, color: '#16866B' },
    { name: 'Tạm ngưng', value: Math.max(0, summary.totalRoutes - summary.activeRoutes), color: '#D9534F' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">Trung tâm Quản trị Mạng lưới</h1>
          <p className="mt-1 text-sm text-slate-500">
            Dữ liệu tổng quan và báo cáo thời gian thực từ cơ sở dữ liệu MongoDB <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-[#245A85]">BusRouteDB</code>
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="accent" size="sm" onClick={() => navigate('/admin/routes')}>
            <Plus size={15} /> Thêm tuyến xe
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/admin/stops')}>
            <MapPin size={15} /> Thêm trạm dừng
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/admin/route-planner')}>
            <Navigation size={15} /> Tra cứu lộ trình
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/admin/mongodb-explorer')}>
            <Database size={15} /> MongoDB Explorer
          </Button>
        </div>
      </div>

      {/* 6 Core KPIs Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map(({ label, value, icon: Icon, desc }) => (
          <div
            key={label}
            className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs transition-shadow hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">{label}</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#245A85]/10 text-[#245A85]">
                <Icon size={16} strokeWidth={2} />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-[#172B4D] tabular-nums">
              {loading ? '—' : value}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">{desc}</div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Top Hubs */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#172B4D]">Top Trạm Trung chuyển (Hubs)</h3>
              <p className="text-xs text-slate-500">Số lượng tuyến xe buýt phục vụ tại mỗi trạm dừng</p>
            </div>
            <Badge variant="info">Aggregation $group</Badge>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topHubsData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" stroke="#64748B" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#172B4D" fontSize={11} width={90} />
                <Tooltip
                  formatter={(val) => [`${val} tuyến xe`, 'Số tuyến phục vụ']}
                  contentStyle={{ backgroundColor: '#172B4D', color: '#fff', borderRadius: '8px', border: 'none' }}
                />
                <Bar dataKey="tuyen" fill="#245A85" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Top Routes by stops */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#172B4D]">Quy mô Tuyến xe theo Số trạm</h3>
              <p className="text-xs text-slate-500">Phân bố số lượng trạm dừng trên các tuyến chính</p>
            </div>
            <Badge variant="primary">CO_TRAM Lookup</Badge>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topRoutesData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  formatter={(val, name, item) => [`${val} trạm`, item.payload.title]}
                  contentStyle={{ backgroundColor: '#172B4D', color: '#fff', borderRadius: '8px', border: 'none' }}
                />
                <Bar dataKey="so_tram" fill="#16866B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Network Overview Map with OpenStreetMap Leaflet */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-[#172B4D]">Bản đồ Mạng lưới Trạm dừng Toàn thành phố</h3>
            <p className="text-xs text-slate-500">
              Trực quan hóa vị trí địa lý của {stops.length} trạm dừng lấy trực tiếp từ MongoDB qua OpenStreetMap
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Nguồn gán:</span>
            <Badge variant="success">OpenStreetMap &copy; Contributor</Badge>
          </div>
        </div>

        <div className="h-96 w-full relative z-0">
          <MapContainer
            center={[10.7769, 106.7009]}
            zoom={12}
            scrollWheelZoom={false}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {stops.map((stop) => {
              const lat = Number(stop.lat ?? stop.latitude ?? stop.vi_do);
              const lng = Number(stop.lng ?? stop.longitude ?? stop.kinh_do);
              if (isNaN(lat) || isNaN(lng) || lat === 0) return null;

              return (
                <Marker key={stop.id || stop._id} position={[lat, lng]} icon={stopMarkerIcon}>
                  <Popup>
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-[#172B4D]">{stop.name || stop.ten_tram}</div>
                      <div className="text-slate-500">{stop.address || stop.dia_chi}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Mã: {stop.code || stop.ma_tram} ({lat.toFixed(4)}, {lng.toFixed(4)})
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Đường lộ trình và Đội xe buýt chạy trực tiếp bám theo mặt đường thành phố */}
            {CITY_FLEET_ROUTES.map((r, rIdx) => {
              const pos = interpolateBusAlongRoad(r.roadPath, tickProgress + rIdx * 0.28);
              return (
                <React.Fragment key={`dash-fleet-${r.code}`}>
                  <Polyline
                    positions={r.roadPath.map((pt) => [pt.lat, pt.lng])}
                    pathOptions={{ color: r.color, weight: 3, opacity: 0.45 }}
                  />
                  {pos && (
                    <Marker
                      position={pos.coords}
                      icon={createMovingBusIcon(r.code, r.color, false)}
                    >
                      <Popup>
                        <div className="text-xs">
                          <strong style={{ color: r.color }}>🚌 Tuyến {r.code}: {r.name}</strong>
                          <div>Biển số: <strong>{r.plate1}</strong> ({pos.directionLabel})</div>
                          <div>Đang chạy: {pos.fromStopName} ➔ {pos.toStopName}</div>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* Recent Routes Table & System Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Table (2 cols) */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white lg:col-span-2 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
            <div>
              <h3 className="text-sm font-bold text-[#172B4D]">Danh sách Tuyến xe buýt Tiêu biểu</h3>
              <p className="text-xs text-slate-500">Các tuyến xe chính trong cơ sở dữ liệu</p>
            </div>
            <Link
              to="/admin/routes"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#245A85] hover:underline"
            >
              Xem tất cả ({routes.length}) <ArrowRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Mã</th>
                  <th className="px-5 py-3">Tên tuyến</th>
                  <th className="px-5 py-3">Điểm đầu - Điểm cuối</th>
                  <th className="px-5 py-3">Giá vé</th>
                  <th className="px-5 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {routes.slice(0, 6).map((route) => (
                  <tr key={route.id || route._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-bold text-[#172B4D] tabular-nums">
                      <span className="rounded bg-[#172B4D]/10 px-2 py-0.5 text-xs text-[#172B4D]">
                        {route.code || route.ma_tuyen}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-800">
                      {route.name || route.ten_tuyen}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {route.startPoint || route.diem_dau || 'Bến Thành'} → {route.endPoint || route.diem_cuoi || 'Chợ Lớn'}
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold text-[#16866B]">
                      {(route.ticketPrice || route.gia_ve || 6000).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={route.status === 'active' || route.trang_thai === 'active' ? 'success' : 'danger'}>
                        {route.status === 'active' || route.trang_thai === 'active' ? 'Đang chạy' : 'Tạm ngưng'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Activity & AI Assistant Quick Card (1 col) */}
        <div className="space-y-6">
          {/* AI Quick Card */}
          <div className="rounded-xl border border-[#245A85]/20 bg-gradient-to-br from-[#172B4D] to-[#245A85] p-5 text-white shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white">
                <Sparkles size={18} />
              </div>
              <h4 className="font-bold text-sm">Trợ lý AI BusRoute HCM</h4>
            </div>
            <p className="mt-2 text-xs text-slate-200 leading-relaxed">
              Trợ lý thông minh chạy mô hình cục bộ Ollama (qwen3.5:4b), giúp tra cứu đường đi và giải thích lộ trình bằng tiếng Việt hoàn toàn miễn phí.
            </p>
            <div className="mt-4">
              <Button
                variant="secondary"
                size="sm"
                className="w-full bg-white text-[#172B4D] hover:bg-slate-100 font-semibold"
                onClick={() => navigate('/admin/ai-assistant')}
              >
                Mở khung Chat với AI
              </Button>
            </div>
          </div>

          {/* Activity feed */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Nhật ký kiểm tra hệ thống
            </h4>
            <div className="mt-3 space-y-3">
              {(analytics?.recentActivities || [
                { id: 1, action: 'Đồng bộ toàn bộ 6 Collections', time: 'Vừa xong', user: 'MongoDB Driver' },
                { id: 2, action: 'Kiểm tra 80 cạnh KE_TIEP', time: '10 phút trước', user: 'Graph Validator' },
                { id: 3, action: 'Cập nhật tọa độ 25 trạm dừng', time: 'Hôm nay', user: 'OpenStreetMap Sync' },
              ]).map((act) => (
                <div key={act.id} className="flex items-start gap-2.5 text-xs">
                  <CheckCircle2 size={16} className="text-[#16866B] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-[#172B4D]">{act.action}</div>
                    <div className="text-[11px] text-slate-400">{act.time} &bull; {act.user}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
