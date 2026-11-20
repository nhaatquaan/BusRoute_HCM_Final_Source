import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  Save,
  Search,
  CheckCircle2,
  RotateCcw,
  MapPin,
  Map as MapIcon,
  Navigation,
  Clock,
  Milestone
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { routeService } from '../../../services/routeService';
import { stopService } from '../../../services/stopService';
import Button from '../../../components/Button';
import Badge from '../../../components/Badge';

const stopMarkerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [22, 34],
  iconAnchor: [11, 34],
  popupAnchor: [1, -30],
});

export default function RouteDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/operator') ? '/operator' : '/admin';
  const [route, setRoute] = useState(null);
  const [allStops, setAllStops] = useState([]);
  const [direction, setDirection] = useState('luot_di'); // 'luot_di' | 'luot_ve'
  const [orderedStops, setOrderedStops] = useState([]);
  const [initialOrder, setInitialOrder] = useState([]);
  const [searchStop, setSearchStop] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [error, setError] = useState('');

  const loadData = async (targetDirection = direction) => {
    try {
      setError('');
      const [routeData, stopsData] = await Promise.all([
        routeService.getById(id, targetDirection),
        stopService.getAll(),
      ]);
      setRoute(routeData);
      setAllStops(stopsData);
      const stopsList = (routeData.stops || []).map((s, idx) => ({
        ...s,
        khoang_cach_km: s.khoang_cach_km ?? s.distance ?? (idx === 0 ? 0 : 1.5),
        thoi_gian_di_chuyen_phut: s.thoi_gian_di_chuyen_phut ?? s.duration ?? (idx === 0 ? 0 : 5),
      }));
      setOrderedStops(stopsList);
      setInitialOrder(stopsList);
      setDirty(false);
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu tuyến xe.');
    }
  };

  useEffect(() => {
    loadData(direction);
  }, [id, direction]);

  const handleDirectionChange = (newDir) => {
    if (dirty) {
      if (!window.confirm('Bạn có thay đổi chưa lưu cho chiều này. Chuyển chiều sẽ làm mất thay đổi?')) {
        return;
      }
    }
    setDirection(newDir);
  };

  const availableStops = useMemo(() => {
    const assignedIds = new Set(orderedStops.map((s) => s.id));
    const q = searchStop.trim().toLowerCase();
    return allStops.filter((s) => {
      if (assignedIds.has(s.id)) return false;
      if (!q) return true;
      return (
        (s.code || '').toLowerCase().includes(q) ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.district || '').toLowerCase().includes(q)
      );
    });
  }, [allStops, orderedStops, searchStop]);

  const moveStop = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= orderedStops.length) return;
    const next = [...orderedStops];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setOrderedStops(next);
    setDirty(true);
    setSavedNotice(false);
  };

  const addStop = (stop) => {
    const newStop = {
      ...stop,
      khoang_cach_km: orderedStops.length === 0 ? 0 : 1.5,
      thoi_gian_di_chuyen_phut: orderedStops.length === 0 ? 0 : 5,
    };
    setOrderedStops((prev) => [...prev, newStop]);
    setDirty(true);
    setSavedNotice(false);
  };

  const removeStop = (stopId) => {
    setOrderedStops((prev) => prev.filter((s) => s.id !== stopId));
    setDirty(true);
    setSavedNotice(false);
  };

  const updateStopMetric = (index, field, value) => {
    setOrderedStops((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: Number(value) };
      return next;
    });
    setDirty(true);
    setSavedNotice(false);
  };

  const handleResetOrder = () => {
    setOrderedStops([...initialOrder]);
    setDirty(false);
  };

  const handleSaveOrder = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn lưu lộ trình "${direction === 'luot_di' ? 'Lượt đi' : 'Lượt về'}" vào MongoDB?`)) {
      return;
    }
    try {
      setSaving(true);
      await routeService.updateStopsOrder(id, orderedStops, direction);
      setInitialOrder([...orderedStops]);
      setDirty(false);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      alert('Lỗi khi lưu thứ tự: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const routePolylineCoords = useMemo(() => {
    return orderedStops
      .map((s) => {
        const lat = Number(s.lat ?? s.latitude ?? s.vi_do);
        const lng = Number(s.lng ?? s.longitude ?? s.kinh_do);
        return !isNaN(lat) && !isNaN(lng) && lat !== 0 ? [lat, lng] : null;
      })
      .filter(Boolean);
  }, [orderedStops]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-white p-6 shadow-xs">
        <p className="text-sm text-rose-700 font-medium">{error}</p>
        <Link
          to={`${basePath}/routes`}
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#245A85] hover:underline"
        >
          <ArrowLeft size={16} /> Quay lại danh sách tuyến
        </Link>
      </div>
    );
  }

  if (!route) {
    return <div className="py-12 text-center text-sm text-slate-500">Đang tải dữ liệu tuyến xe từ MongoDB...</div>;
  }

  const mapCenter = routePolylineCoords.length > 0 ? routePolylineCoords[0] : [10.7769, 106.7009];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to={`${basePath}/routes`}
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#172B4D]"
          >
            <ArrowLeft size={14} /> Danh sách tuyến xe
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#172B4D]">
              Tuyến {route.code}: {route.name}
            </h1>
            <Badge variant={route.status === 'active' ? 'success' : 'danger'}>
              {route.status === 'active' ? 'Đang hoạt động' : 'Tạm ngưng'}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Giờ chạy: <strong>{route.operatingHours || route.thoiGianHoatDong || '05:00 - 20:30'}</strong> &bull; Giãn cách: {route.frequency || '10-15 phút'} &bull; Giá vé: <strong>{Number(route.ticketPrice || route.giaVe || 6000).toLocaleString('vi-VN')} đ</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {dirty && (
            <Button variant="secondary" size="sm" onClick={handleResetOrder}>
              <RotateCcw size={14} /> Hoàn tác
            </Button>
          )}
          {savedNotice && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#16866B]">
              <CheckCircle2 size={16} /> Đã lưu vào MongoDB
            </span>
          )}
          <Button variant="primary" size="sm" onClick={handleSaveOrder} disabled={!dirty || saving}>
            <Save size={14} />
            {saving ? 'Đang lưu...' : 'Lưu thứ tự trạm'}
          </Button>
        </div>
      </div>

      {/* Direction Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
        <span className="text-xs font-semibold text-slate-500 mr-2 flex items-center gap-1">
          <Navigation size={14} /> Chiều di chuyển:
        </span>
        <button
          type="button"
          onClick={() => handleDirectionChange('luot_di')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            direction === 'luot_di'
              ? 'bg-[#245A85] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-[#E2E8F0] hover:bg-slate-50'
          }`}
        >
          Lượt đi ({route.startPoint || 'Điểm đầu'} ➔ {route.endPoint || 'Điểm cuối'})
        </button>
        <button
          type="button"
          onClick={() => handleDirectionChange('luot_ve')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            direction === 'luot_ve'
              ? 'bg-[#245A85] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-[#E2E8F0] hover:bg-slate-50'
          }`}
        >
          Lượt về ({route.endPoint || 'Điểm cuối'} ➔ {route.startPoint || 'Điểm đầu'})
        </button>
      </div>

      {/* Map of the Route Sequence */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-3.5 bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <MapIcon size={16} className="text-[#245A85]" />
            <h3 className="text-sm font-bold text-[#172B4D]">
              Lộ trình {direction === 'luot_di' ? 'Lượt đi' : 'Lượt về'} trên Bản đồ OpenStreetMap
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {routePolylineCoords.length} trạm dừng &bull; Thứ tự kết nối đồ thị KE_TIEP
          </span>
        </div>

        <div className="h-72 w-full relative z-0">
          <MapContainer center={mapCenter} zoom={12} scrollWheelZoom={false} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {routePolylineCoords.length > 1 && (
              <Polyline positions={routePolylineCoords} pathOptions={{ color: '#245A85', weight: 4, opacity: 0.8 }} />
            )}
            {orderedStops.map((stop, idx) => {
              const lat = Number(stop.lat ?? stop.latitude ?? stop.vi_do);
              const lng = Number(stop.lng ?? stop.longitude ?? stop.kinh_do);
              if (isNaN(lat) || isNaN(lng) || lat === 0) return null;

              return (
                <Marker key={stop.id || stop._id || idx} position={[lat, lng]} icon={stopMarkerIcon}>
                  <Popup>
                    <div className="text-xs">
                      <div className="font-bold text-[#172B4D]">#{idx + 1}. {stop.name || stop.ten_tram}</div>
                      <div className="text-slate-500">{stop.address || stop.dia_chi}</div>
                      {idx > 0 && (
                        <div className="mt-1 text-[11px] text-blue-700">
                          Khoảng cách: {stop.khoang_cach_km || 1.5} km &bull; {stop.thoi_gian_di_chuyen_phut || 5} phút
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* 2-column layout for stops reordering */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Ordered Stops List (7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-3.5 bg-[#F8FAFC]">
            <h2 className="text-sm font-bold text-[#172B4D]">
              Thứ tự trạm dừng ({direction === 'luot_di' ? 'Lượt đi' : 'Lượt về'}) &bull; {orderedStops.length} trạm
            </h2>
            {dirty && (
              <Badge variant="warning">Có thay đổi chưa lưu</Badge>
            )}
          </div>

          <div className="divide-y divide-[#E2E8F0] max-h-[520px] overflow-y-auto">
            {orderedStops.map((stop, index) => (
              <div
                key={stop.id || stop._id || index}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#245A85]/20 bg-[#245A85]/10 text-xs font-bold text-[#245A85] tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-[#172B4D]">
                      {stop.name || stop.ten_tram}
                    </div>
                    <div className="truncate text-[11px] text-slate-500">
                      <span className="font-mono text-slate-600">{stop.code || stop.ma_tram}</span> &bull;{' '}
                      {stop.address || stop.dia_chi}
                    </div>

                    {/* Inline Distance and Duration Editor */}
                    {index > 0 && (
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Milestone size={11} className="text-slate-400" />
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={stop.khoang_cach_km ?? 1.5}
                            onChange={(e) => updateStopMetric(index, 'khoang_cach_km', e.target.value)}
                            className="w-14 rounded border border-[#E2E8F0] px-1 py-0.5 text-[11px] text-[#172B4D] focus:border-[#245A85] focus:outline-none"
                          />
                          km
                        </span>
                        <span>&bull;</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} className="text-slate-400" />
                          <input
                            type="number"
                            step="1"
                            min="1"
                            value={stop.thoi_gian_di_chuyen_phut ?? 5}
                            onChange={(e) => updateStopMetric(index, 'thoi_gian_di_chuyen_phut', e.target.value)}
                            className="w-12 rounded border border-[#E2E8F0] px-1 py-0.5 text-[11px] text-[#172B4D] focus:border-[#245A85] focus:outline-none"
                          />
                          phút
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveStop(index, -1)}
                    disabled={index === 0}
                    title="Di chuyển lên"
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-20"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStop(index, 1)}
                    disabled={index === orderedStops.length - 1}
                    title="Di chuyển xuống"
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-20"
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStop(stop.id)}
                    title="Gỡ khỏi tuyến"
                    className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-[#D9534F]"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            ))}

            {orderedStops.length === 0 && (
              <div className="px-5 py-10 text-center text-xs text-slate-400">
                Tuyến này chưa được gán trạm nào cho {direction === 'luot_di' ? 'Lượt đi' : 'Lượt về'}. Hãy chọn từ danh sách bên phải.
              </div>
            )}
          </div>
        </div>

        {/* Available Stops (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden flex flex-col">
          <div className="border-b border-[#E2E8F0] p-4 bg-[#F8FAFC]">
            <h2 className="text-sm font-bold text-[#172B4D]">Gán thêm trạm dừng</h2>
            <div className="relative mt-2">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchStop}
                onChange={(e) => setSearchStop(e.target.value)}
                placeholder="Tìm trạm để gán vào tuyến..."
                className="w-full rounded-lg border border-[#E2E8F0] bg-white pl-8 pr-3 py-1.5 text-xs text-[#172B4D] focus:outline-none focus:border-[#245A85]"
              />
            </div>
          </div>

          <div className="flex-1 divide-y divide-[#E2E8F0] max-h-[480px] overflow-y-auto">
            {availableStops.map((stop) => (
              <div
                key={stop.id || stop._id}
                className="flex items-center justify-between gap-2 p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-[#172B4D]">
                    {stop.name || stop.ten_tram}
                  </div>
                  <div className="truncate text-[11px] text-slate-500">
                    <span className="font-mono">{stop.code || stop.ma_tram}</span> &bull; {stop.district || stop.khuVuc || 'TP.HCM'}
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => addStop(stop)}>
                  <Plus size={13} /> Thêm
                </Button>
              </div>
            ))}

            {availableStops.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                Không có trạm dừng khả dụng nào phù hợp.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
