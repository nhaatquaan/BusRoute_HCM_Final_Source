import React, { useState, useEffect } from 'react';
import {
  Compass,
  MapPin,
  Navigation,
  Crosshair,
  Bus,
  ArrowRight,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { stopService } from '../../../services/stopService';
import Button from '../../../components/Button';
import Badge from '../../../components/Badge';
import { StopDetailModal } from '../../route-planner/by-stop/StopDetailModal.jsx';
import {
  createMovingBusIcon,
  CITY_FLEET_ROUTES,
  interpolateBusAlongRoad,
} from '../../route-planner/map/RouteMap.jsx';

// Leaflet User Location Icon
const userLocationIcon = new L.DivIcon({
  className: 'user-location-marker',
  html: `<div style="background-color: #245A85; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(36,90,133,0.8);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const stopMarkerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [22, 34],
  iconAnchor: [11, 34],
  popupAnchor: [1, -30],
});

// Công thức Haversine tính khoảng cách theo tọa độ (km)
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function NearbyStopsPage() {
  const [stops, setStops] = useState([]);
  const [userLocation, setUserLocation] = useState({ lat: 10.7769, lng: 106.7009 }); // Mặc định trung tâm Q1
  const [locationDetected, setLocationDetected] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const [sortedStops, setSortedStops] = useState([]);
  const [inspectingStop, setInspectingStop] = useState(null);
  const [tickProgress, setTickProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickProgress((prev) => (prev + 0.0003) % 2);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadStops();
  }, []);

  useEffect(() => {
    if (stops.length > 0 && userLocation) {
      const withDistance = stops
        .map((s) => {
          const lat = Number(s.lat ?? s.latitude ?? s.vi_do);
          const lng = Number(s.lng ?? s.longitude ?? s.kinh_do);
          if (isNaN(lat) || isNaN(lng) || lat === 0) return null;
          const distKm = calculateHaversineDistance(userLocation.lat, userLocation.lng, lat, lng);
          return {
            ...s,
            parsedLat: lat,
            parsedLng: lng,
            distanceKm: distKm,
            distanceMeters: Math.round(distKm * 1000),
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      setSortedStops(withDistance);
    }
  }, [stops, userLocation]);

  const loadStops = async () => {
    try {
      const res = await stopService.getAll();
      setStops(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách trạm:', err);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Trình duyệt của bạn không hỗ trợ định vị GPS Geolocation.');
      return;
    }

    setLocating(true);
    setLocError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        setLocationDetected(true);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocError('Không thể lấy vị trí hiện tại: ' + err.message + '. Hệ thống sử dụng vị trí trung tâm TP.HCM.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">Tìm Trạm Dừng Gần Tôi</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sử dụng Geolocation API của trình duyệt và công thức Haversine tính toán khoảng cách thực tế đến {stops.length} trạm dừng MongoDB
          </p>
        </div>

        <Button variant="accent" onClick={handleGetCurrentLocation} disabled={locating}>
          <Crosshair size={15} className={locating ? 'animate-spin' : ''} />
          {locating ? 'Đang xác định GPS...' : 'Lấy vị trí GPS hiện tại'}
        </Button>
      </div>

      {locError && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <AlertCircle size={16} />
          <span>{locError}</span>
        </div>
      )}

      {locationDetected && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-[#16866B]">
          <Crosshair size={16} />
          <span>
            Đã phát hiện vị trí của bạn: <strong>{userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}</strong>
          </span>
        </div>
      )}

      {/* Map & Nearest List Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Nearest Stops List (1 col) */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden flex flex-col h-[520px]">
          <div className="border-b border-[#E2E8F0] p-4 bg-[#F8FAFC]">
            <h3 className="text-sm font-bold text-[#172B4D]">Danh sách trạm gần nhất</h3>
            <p className="text-xs text-slate-500">Sắp xếp theo khoảng cách đường chim bay</p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#E2E8F0]">
            {sortedStops.map((s, idx) => (
              <div
                key={s.id || s._id}
                onClick={() => setInspectingStop(s)}
                title="Bấm để xem chi tiết trạm và bảng điện tử các tuyến xe sắp tới"
                className="p-3.5 hover:bg-blue-50/60 transition-colors space-y-1 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#172B4D] truncate">
                    {idx + 1}. {s.name || s.ten_tram}
                  </span>
                  <Badge variant={idx === 0 ? 'success' : 'primary'}>
                    {s.distanceMeters < 1000 ? `${s.distanceMeters} m` : `${s.distanceKm.toFixed(2)} km`}
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {s.address || s.dia_chi}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Mã: {s.code || s.ma_tram} &bull; Khu vực: {s.district || s.khuVuc || 'TP.HCM'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaflet Map (2 cols) */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden lg:col-span-2 h-[520px] relative z-0">
          <MapContainer
            center={[userLocation.lat, userLocation.lng]}
            zoom={13}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Vị trí người dùng */}
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
              <Popup>
                <div className="text-xs font-bold text-[#245A85]">Vị trí hiện tại của bạn</div>
              </Popup>
            </Marker>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={800}
              pathOptions={{ fillColor: '#245A85', fillOpacity: 0.1, color: '#245A85', weight: 1 }}
            />

            {/* Các trạm dừng */}
            {sortedStops.map((stop) => (
              <Marker
                key={stop.id || stop._id}
                position={[stop.parsedLat, stop.parsedLng]}
                icon={stopMarkerIcon}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-[#172B4D]">{stop.name || stop.ten_tram}</div>
                    <div className="text-slate-500">{stop.address || stop.dia_chi}</div>
                    <div className="text-[#16866B] font-semibold text-[11px]">
                      Cách bạn: {stop.distanceMeters < 1000 ? `${stop.distanceMeters} m` : `${stop.distanceKm.toFixed(2)} km`}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Đường trục và các chiếc xe buýt mô phỏng chạy dọc theo đường phố */}
            {CITY_FLEET_ROUTES.map((r, rIdx) => {
              const pos = interpolateBusAlongRoad(r.roadPath, tickProgress + rIdx * 0.28);
              return (
                <React.Fragment key={`nearby-fleet-${r.code}`}>
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

      <StopDetailModal
        isOpen={Boolean(inspectingStop)}
        onClose={() => setInspectingStop(null)}
        stop={inspectingStop}
      />
    </div>
  );
}
