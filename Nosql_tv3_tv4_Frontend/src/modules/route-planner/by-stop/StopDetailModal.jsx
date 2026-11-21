import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Bus,
  Clock,
  Navigation,
  ArrowRight,
  Radio,
  Compass,
  Tag,
  X,
  CheckCircle2,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import routePlannerService from '../services/routePlannerService.js';
import simulationService from '../../../services/simulationService.js';
import { formatCurrency } from '../utils/routeHelpers.js';

const stopDetailIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export function StopDetailModal({
  isOpen,
  onClose,
  stop,
  onSetAsOrigin,
  onSetAsDestination,
}) {
  const [routesPassing, setRoutesPassing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [arrivalsLoading, setArrivalsLoading] = useState(false);
  const [liveArrivals, setLiveArrivals] = useState([]);
  const [simulationStatus, setSimulationStatus] = useState('active');
  const [lastUpdatedTime, setLastUpdatedTime] = useState(null);

  const stopId = stop?.maTram || stop?.ma_tram || stop?.code || stop?.id || stop?._key;
  const stopName = stop?.tenTram || stop?.ten_tram || stop?.name || stopId;
  const stopAddress = stop?.diaChi || stop?.dia_chi || stop?.address || 'TP.HCM';
  const stopDistrict = stop?.district || stop?.khuVuc || 'TP.HCM';
  const lat = Number(stop?.latitude ?? stop?.vi_do ?? stop?.lat ?? 10.7769);
  const lng = Number(stop?.longitude ?? stop?.kinh_do ?? stop?.lng ?? 106.7009);

  useEffect(() => {
    if (!isOpen || !stopId) return;
    let mounted = true;

    async function fetchStopRoutes() {
      setLoading(true);
      try {
        const res = await routePlannerService.searchByStop(stopId);
        if (mounted) {
          setRoutesPassing(res?.routes || []);
        }
      } catch (err) {
        console.warn('Error loading stop detail routes:', err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    async function fetchLiveArrivals() {
      setArrivalsLoading(true);
      try {
        const res = await simulationService.getStopArrivals(stopId, { limit: 5 });
        if (!mounted) return;
        if (res && res.success) {
          setLiveArrivals(res.arrivals || []);
          setSimulationStatus(res.status || 'active');
          setLastUpdatedTime(new Date());
        } else {
          setLiveArrivals([]);
          setSimulationStatus(res?.status || 'no_active_vehicle');
        }
      } catch (err) {
        console.warn('Error fetching live simulation arrivals:', err.message);
      } finally {
        if (mounted) setArrivalsLoading(false);
      }
    }

    fetchStopRoutes();
    fetchLiveArrivals();

    // Polling cập nhật mỗi 12 giây từ Simulation Service
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchLiveArrivals();
      }
    }, 12000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [isOpen, stopId]);

  if (!isOpen || !stop) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E2E8F0] bg-gradient-to-r from-[#172B4D] to-[#245A85] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
              <MapPin size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">{stopName}</h3>
                <span className="rounded bg-white/20 px-2 py-0.5 font-mono text-xs font-bold">
                  {stopId}
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-0.5">{stopAddress}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Actions & Coordinates Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-slate-600">
              <span>
                <strong>Khu vực:</strong> {stopDistrict}
              </span>
              <span>•</span>
              <span className="font-mono">
                <strong>GPS:</strong> {lat.toFixed(4)}, {lng.toFixed(4)}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 size={13} /> Đang hoạt động ({routesPassing.length} lượt tuyến)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onSetAsOrigin && (
                <button
                  type="button"
                  onClick={() => {
                    onSetAsOrigin(stopId);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  🟢 Đặt làm Điểm đi
                </button>
              )}
              {onSetAsDestination && (
                <button
                  type="button"
                  onClick={() => {
                    onSetAsDestination(stopId);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  🔴 Đặt làm Điểm đến
                </button>
              )}
            </div>
          </div>

          {/* Grid: Live Arrival Board & Mini Map */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Live Electronic Arrival Board (7 cols) */}
            <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-slate-900 p-4 text-white shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
                <div className="flex items-center gap-2">
                  <Radio size={16} className="text-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    MÔ PHỎNG – THỜI GIAN ĐẾN ƯỚC TÍNH
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  {lastUpdatedTime && (
                    <span>Cập nhật: {lastUpdatedTime.toLocaleTimeString('vi-VN')}</span>
                  )}
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-300 border border-slate-700">
                    Dữ liệu minh họa
                  </span>
                </div>
              </div>

              {arrivalsLoading && liveArrivals.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Đang tính toán dữ liệu mô phỏng từ vị trí các xe...
                </div>
              ) : liveArrivals.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                  <div>
                    {simulationStatus === 'outside_service_hours'
                      ? '🌙 Hiện tại ngoài khung giờ hoạt động của xe buýt (05:00 - 20:30).'
                      : '🚌 Chưa có chuyến xe mô phỏng nào đang tiến về trạm này.'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Hệ thống tự động đồng bộ theo chu kỳ xuất bến từ backend.
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {liveArrivals.map((bus, i) => {
                    const isArrived = bus.etaMinutes === 0 || bus.status === 'at_stop';
                    const isApproaching = bus.status === 'approaching';
                    const isScheduled = bus.status === 'scheduled';

                    return (
                      <div
                        key={`${bus.vehicleId}-${i}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-800/80 px-3 py-2 text-xs hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="flex h-7 w-11 shrink-0 items-center justify-center rounded font-bold text-white text-xs"
                            style={{ backgroundColor: bus.routeColor || '#2563eb' }}
                          >
                            T{bus.routeCode}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate">
                              {bus.routeName}{' '}
                              <span className="text-[10px] font-normal text-slate-300">
                                ({bus.directionLabel || (bus.direction === 'luot_di' ? 'Chiều đi' : 'Chiều về')})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Mã xe: <span className="font-mono text-amber-300 font-bold">{bus.vehicleId}</span> •{' '}
                              {isArrived
                                ? 'Đang đón khách tại trạm'
                                : isScheduled
                                ? 'Chưa xuất bến đầu tuyến'
                                : `Cách ${bus.stopsAway} trạm`}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {isArrived ? (
                            <span className="inline-block rounded bg-emerald-500/20 border border-emerald-400 px-2 py-0.5 text-[11px] font-bold text-emerald-300 animate-pulse">
                              🟢 Đã tới trạm
                            </span>
                          ) : (
                            <div>
                              <span
                                className={`text-sm font-extrabold tabular-nums ${
                                  isApproaching ? 'text-amber-400' : 'text-blue-400'
                                }`}
                              >
                                ~{bus.etaMinutes} phút
                              </span>
                              <div className="text-[10px] text-slate-400">
                                {isApproaching ? '🟡 Sắp cập bến' : isScheduled ? 'Chờ xuất bến' : 'sắp tới'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
                * Dữ liệu thời gian xe đến mang tính chất MÔ PHỎNG MINH HỌA trải nghiệm theo lịch trình và quan hệ đồ thị KE_TIEP, không phải dữ liệu GPS thực tế từ xe buýt.
              </p>
            </div>

            {/* Stop Location Mini Map (5 cols) */}
            <div className="lg:col-span-5 rounded-xl border border-slate-200 overflow-hidden h-64 relative z-0">
              <MapContainer
                key={`stop-mini-map-${stopId || 'default'}`}
                center={[lat, lng]}
                zoom={15}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[lat, lng]} icon={stopDetailIcon}>
                  <Popup>
                    <div className="text-xs font-bold">{stopName}</div>
                    <div className="text-[11px] text-slate-500">{stopAddress}</div>
                  </Popup>
                </Marker>
                <Circle
                  center={[lat, lng]}
                  radius={250}
                  pathOptions={{ color: '#16866B', fillColor: '#16866B', fillOpacity: 0.12, weight: 1 }}
                />
              </MapContainer>
            </div>
          </div>

          {/* All Routes Passing Through This Stop (MongoDB CO_TRAM Relationship) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#172B4D] flex items-center gap-2">
                <Bus size={16} className="text-[#245A85]" />
                <span>Danh sách Tuyến xe buýt kết nối qua trạm ({routesPassing.length} lượt tuyến)</span>
              </h4>
              <span className="text-[11px] text-slate-500">Truy vấn từ Edge Collection CO_TRAM</span>
            </div>

            {routesPassing.length === 0 && !loading ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                Chưa có tuyến xe nào được gán qua trạm dừng này.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {routesPassing.map((r, idx) => (
                  <div
                    key={`${r.maTuyen}-${r.direction}-${idx}`}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 hover:bg-white hover:border-blue-300 transition-all text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="rounded-md px-2.5 py-0.5 text-xs font-bold text-white"
                        style={{ backgroundColor: r.mauSac || '#2563eb' }}
                      >
                        Tuyến {r.maTuyen}
                      </span>
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                        {r.direction === 've' ? 'Chiều về' : 'Chiều đi'} • Trạm thứ #{r.orderAtStop || 1}
                      </span>
                    </div>
                    <div className="font-bold text-[#172B4D] text-sm">{r.tenTuyen}</div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} /> {r.thoiGianHoatDong || '05:00 - 20:30'}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-700">
                        Vé: {r.giaVe ? formatCurrency(r.giaVe) : '6.000 đ'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StopDetailModal;
