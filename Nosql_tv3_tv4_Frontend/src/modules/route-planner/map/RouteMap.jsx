import React, { useEffect, useState, useMemo } from 'react';
import {
  Map as MapIcon,
  MapPin,
  Bus,
  Play,
  Pause,
  Radio,
  Crosshair,
  Gauge,
} from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Popup,
  Marker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  findNearestStopsFromCoords,
  formatDistance,
  calculateDistanceMeters,
} from '../utils/routeHelpers.js';
import './map.css';

// Tạo icon hình chiếc xe buýt đồ họa SVG sắc nét + sóng radar trên bản đồ
const createMovingBusIcon = (routeCode, color = '#2563eb', isPrimary = false) => {
  const scale = isPrimary ? 1.12 : 0.96;
  return new L.DivIcon({
    className: 'live-moving-bus-marker',
    html: `
      <div style="
        position:relative;
        width:68px;
        height:54px;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        transform:translate(-50%, -50%) scale(${scale});
        pointer-events:auto;
      ">
        <!-- Vòng sóng GPS tỏa ra dưới gầm xe -->
        <div style="
          position:absolute;
          width:36px;
          height:36px;
          border-radius:50%;
          background:${color};
          opacity:0.22;
          animation:busPulseRing 2s infinite ease-out;
        "></div>

        <!-- Nhãn số hiệu tuyến nổi trên nóc xe -->
        <div style="
          z-index:3;
          background:#0f172a;
          color:#ffffff;
          font-weight:900;
          font-size:10px;
          padding:1px 6px;
          border-radius:6px;
          border:1.5px solid #ffffff;
          box-shadow:0 2px 6px rgba(0,0,0,0.35);
          margin-bottom:2px;
          white-space:nowrap;
        ">
          Tuyến ${routeCode}
        </div>

        <!-- Hình chiếc xe buýt SVG -->
        <div style="
          z-index:2;
          width:33px;
          height:33px;
          border-radius:50%;
          background:#ffffff;
          border:2.5px solid ${color};
          box-shadow:0 4px 10px rgba(0,0,0,0.32);
          display:flex;
          align-items:center;
          justify-content:center;
        ">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="3" width="16" height="15" rx="3.5" fill="${color}" />
            <rect x="6" y="5" width="12" height="5" rx="1.5" fill="#e0f2fe" />
            <circle cx="7.5" cy="14.5" r="1.5" fill="#fef08a" />
            <circle cx="16.5" cy="14.5" r="1.5" fill="#fef08a" />
            <rect x="10" y="14" width="4" height="1.5" rx="0.5" fill="#ffffff" opacity="0.8" />
            <rect x="6" y="18" width="3" height="3" rx="1" fill="#1e293b" />
            <rect x="15" y="18" width="3" height="3" rx="1" fill="#1e293b" />
            <rect x="2" y="6" width="2" height="3.5" rx="1" fill="${color}" />
            <rect x="20" y="6" width="2" height="3.5" rx="1" fill="${color}" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [68, 54],
    iconAnchor: [34, 27],
  });
};

// Component điều khiển camera bản đồ (Bám theo xe buýt hoặc fit lộ trình)
function MapCameraController({ followCoords, centerCoords }) {
  const map = useMap();

  useEffect(() => {
    if (followCoords && Array.isArray(followCoords) && followCoords.length === 2) {
      map.panTo(followCoords, { animate: true, duration: 0.3 });
    }
  }, [followCoords, map]);

  useEffect(() => {
    if (centerCoords && Array.isArray(centerCoords) && centerCoords.length === 2) {
      map.setView(centerCoords, 13, { animate: true });
    }
  }, [centerCoords?.[0], centerCoords?.[1], map]);

  return null;
}

// Component bắt sự kiện Click chuột bất kỳ lên bản đồ (giống Google Maps Drop Pin)
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

/**
 * 6 Tuyến xe buýt thực tế khớp 100% với CO_TRAM trong MongoDB kèm các tọa độ khúc cua đường phố thực tế
 * (Trần Hưng Đạo, Hai Bà Trưng, Nguyễn Kiệm, Nguyễn Oanh, Nam Kỳ Khởi Nghĩa, Cộng Hòa, Trường Chinh,
 * Lý Thường Kiệt, Điện Biên Phủ, Cầu Sài Gòn, Xa lộ Hà Nội, Trường Sơn) để xe luôn bám đúng mặt đường.
 */
const CITY_FLEET_ROUTES = [
  {
    code: '01',
    name: 'Bến Thành - Trần Hưng Đạo - BX Chợ Lớn',
    color: '#2563eb',
    plate1: '51B-101.24',
    plate2: '51B-101.89',
    stopKeys: ['TR_03', 'TR_04', 'TR_02', 'TR_01', 'TR_05', 'TR_06', 'TR_07', 'TR_08'],
    roadPath: [
      { lat: 10.77456, lng: 106.70615, name: 'Công trường Mê Linh' },
      { lat: 10.77092, lng: 106.70245, name: 'Chợ Cũ (Hàm Nghi)' },
      { lat: 10.77168, lng: 106.70109, name: 'Trường Cao Thắng' },
      { lat: 10.76895, lng: 106.69348, name: 'Bến Thành' },
      { lat: 10.76420, lng: 106.69010, name: 'Trần Hưng Đạo (Q.1)' },
      { lat: 10.75890, lng: 106.68510, name: 'Ngã tư Nguyễn Văn Cừ' },
      { lat: 10.75541, lng: 106.68122, name: 'Trần Bình Trọng' },
      { lat: 10.75320, lng: 106.67020, name: 'Trần Hưng Đạo (Q.5)' },
      { lat: 10.75776, lng: 106.65947, name: 'Bệnh viện Chợ Rẫy' },
      { lat: 10.75083, lng: 106.65995, name: 'Bưu điện Quận 5' },
      { lat: 10.75162, lng: 106.65211, name: 'Bến xe Chợ Lớn' },
    ],
  },
  {
    code: '03',
    name: 'Bến Thành - Nguyễn Oanh - Thạnh Lộc',
    color: '#16866B',
    plate1: '51B-032.15',
    plate2: '51B-039.41',
    stopKeys: ['TR_01', 'TR_02', 'TR_09', 'TR_23', 'TR_24', 'TR_25'],
    roadPath: [
      { lat: 10.76895, lng: 106.69348, name: 'Bến Thành' },
      { lat: 10.77168, lng: 106.70109, name: 'Trường Cao Thắng' },
      { lat: 10.77978, lng: 106.69902, name: 'Nhà thờ Đức Bà' },
      { lat: 10.78850, lng: 106.68950, name: 'Cầu Kiệu (Hai Bà Trưng)' },
      { lat: 10.79955, lng: 106.68112, name: 'Ngã tư Phú Nhuận' },
      { lat: 10.81380, lng: 106.67910, name: 'Vòng xoay Nguyễn Thái Sơn' },
      { lat: 10.82661, lng: 106.67895, name: 'Ngã sáu Gò Vấp' },
      { lat: 10.84450, lng: 106.67780, name: 'Cầu An Lộc (Nguyễn Oanh)' },
      { lat: 10.86200, lng: 106.67890, name: 'Hà Huy Giáp (Quận 12)' },
      { lat: 10.88042, lng: 106.67988, name: 'Bến xe Thạnh Lộc' },
    ],
  },
  {
    code: '04',
    name: 'Bến Thành - Cộng Hòa - BX An Sương',
    color: '#d97706',
    plate1: '51B-045.67',
    plate2: '51B-048.12',
    stopKeys: ['TR_01', 'TR_10', 'TR_11', 'TR_12', 'TR_14', 'TR_15', 'TR_16'],
    roadPath: [
      { lat: 10.76895, lng: 106.69348, name: 'Bến Thành' },
      { lat: 10.77699, lng: 106.69535, name: 'Dinh Độc Lập' },
      { lat: 10.79156, lng: 106.68385, name: 'Chùa Vĩnh Nghiêm' },
      { lat: 10.79750, lng: 106.67520, name: 'Nguyễn Văn Trỗi' },
      { lat: 10.80168, lng: 106.66661, name: 'CV Hoàng Văn Thụ' },
      { lat: 10.79331, lng: 106.65292, name: 'Ngã tư Bảy Hiền' },
      { lat: 10.80120, lng: 106.65450, name: 'Lăng Cha Cả (Cộng Hòa)' },
      { lat: 10.80320, lng: 106.64150, name: 'Đường Cộng Hòa (Tân Bình)' },
      { lat: 10.81782, lng: 106.63175, name: 'Mũi tàu Cộng Hòa' },
      { lat: 10.83150, lng: 106.62250, name: 'Trường Chinh (Tân Bình)' },
      { lat: 10.84378, lng: 106.61334, name: 'Bến xe An Sương' },
    ],
  },
  {
    code: '08',
    name: 'BX Quận 8 - Hàng Xanh - ĐH Quốc Gia',
    color: '#7c3aed',
    plate1: '51B-081.33',
    plate2: '51B-086.90',
    stopKeys: ['TR_22', 'TR_06', 'TR_14', 'TR_12', 'TR_23', 'TR_17', 'TR_18', 'TR_19', 'TR_20'],
    roadPath: [
      { lat: 10.73514, lng: 106.65439, name: 'Bến xe Quận 8' },
      { lat: 10.74850, lng: 106.65780, name: 'Tùng Thiện Vương' },
      { lat: 10.75776, lng: 106.65947, name: 'Bệnh viện Chợ Rẫy' },
      { lat: 10.77240, lng: 106.65780, name: 'ĐH Bách Khoa (Lý Thường Kiệt)' },
      { lat: 10.79331, lng: 106.65292, name: 'Ngã tư Bảy Hiền' },
      { lat: 10.80168, lng: 106.66661, name: 'CV Hoàng Văn Thụ' },
      { lat: 10.79955, lng: 106.68112, name: 'Ngã tư Phú Nhuận' },
      { lat: 10.80250, lng: 106.69650, name: 'Chợ Bà Chiểu (Bạch Đằng)' },
      { lat: 10.80123, lng: 106.71145, name: 'Ngã tư Hàng Xanh' },
      { lat: 10.79920, lng: 106.72750, name: 'Cầu Sài Gòn' },
      { lat: 10.80450, lng: 106.74450, name: 'Xa lộ Hà Nội (Thảo Điền)' },
      { lat: 10.83155, lng: 106.76238, name: 'Ngã tư Bình Thái' },
      { lat: 10.84850, lng: 106.77350, name: 'Ngã tư Thủ Đức' },
      { lat: 10.85889, lng: 106.78762, name: 'Khu Công nghệ cao' },
      { lat: 10.86620, lng: 106.80250, name: 'KDL Suối Tiên' },
      { lat: 10.87815, lng: 106.80355, name: 'Bến xe ĐH Quốc Gia' },
    ],
  },
  {
    code: '19',
    name: 'Bến Thành - Điện Biên Phủ - ĐH Quốc Gia',
    color: '#dc2626',
    plate1: '51B-192.05',
    plate2: '51B-198.77',
    stopKeys: ['TR_01', 'TR_04', 'TR_03', 'TR_09', 'TR_17', 'TR_18', 'TR_19', 'TR_20'],
    roadPath: [
      { lat: 10.76895, lng: 106.69348, name: 'Bến Thành' },
      { lat: 10.77092, lng: 106.70245, name: 'Chợ Cũ' },
      { lat: 10.77456, lng: 106.70615, name: 'Công trường Mê Linh' },
      { lat: 10.77978, lng: 106.69902, name: 'Nhà thờ Đức Bà' },
      { lat: 10.78920, lng: 106.69980, name: 'Điện Biên Phủ (Đa Kao)' },
      { lat: 10.80123, lng: 106.71145, name: 'Ngã tư Hàng Xanh' },
      { lat: 10.79920, lng: 106.72750, name: 'Cầu Sài Gòn' },
      { lat: 10.80450, lng: 106.74450, name: 'Xa lộ Hà Nội (An Phú)' },
      { lat: 10.83155, lng: 106.76238, name: 'Ngã tư Bình Thái' },
      { lat: 10.84850, lng: 106.77350, name: 'Ngã tư Thủ Đức' },
      { lat: 10.85889, lng: 106.78762, name: 'Khu Công nghệ cao' },
      { lat: 10.87815, lng: 106.80355, name: 'Bến xe ĐH Quốc Gia' },
    ],
  },
  {
    code: '152',
    name: 'KDC Trung Sơn - Bến Thành - Sân bay TSN',
    color: '#0891b2',
    plate1: '51B-152.38',
    plate2: '51B-152.94',
    stopKeys: ['TR_21', 'TR_05', 'TR_01', 'TR_10', 'TR_11', 'TR_23', 'TR_12', 'TR_13'],
    roadPath: [
      { lat: 10.73322, lng: 106.68811, name: 'KDC Trung Sơn' },
      { lat: 10.74800, lng: 106.68600, name: 'Cầu Nguyễn Văn Cừ' },
      { lat: 10.75541, lng: 106.68122, name: 'Trần Bình Trọng' },
      { lat: 10.76895, lng: 106.69348, name: 'Bến Thành' },
      { lat: 10.77699, lng: 106.69535, name: 'Dinh Độc Lập' },
      { lat: 10.79156, lng: 106.68385, name: 'Chùa Vĩnh Nghiêm' },
      { lat: 10.79955, lng: 106.68112, name: 'Ngã tư Phú Nhuận' },
      { lat: 10.80168, lng: 106.66661, name: 'CV Hoàng Văn Thụ' },
      { lat: 10.80950, lng: 106.66550, name: 'Đường Trường Sơn' },
      { lat: 10.81665, lng: 106.66498, name: 'Sân bay Tân Sơn Nhất' },
    ],
  },
];

/**
 * Hàm nội suy vị trí xe buýt có tính trọng số theo chiều dài thực tế của từng đoạn đường
 * và chạy khứ hồi (Ping-Pong: đi tới bến cuối sẽ quay đầu chạy lượt về chứ không nhảy cóc).
 */
export function interpolateBusAlongRoad(waypoints, rawPhase) {
  if (!waypoints || waypoints.length < 2) return null;

  // Chuyển rawPhase thành chu kỳ khứ hồi [0 -> 1 -> 0] (0..1 là Lượt đi, 1..2 là Lượt về)
  const cycle = ((rawPhase % 2) + 2) % 2;
  const isReturnTrip = cycle > 1;
  const normalizedProgress = isReturnTrip ? 2 - cycle : cycle;

  // Tính khoảng cách từng chặng để vận tốc xe luôn đều đặn trên mọi đoạn đường
  const segLengths = [];
  let totalDist = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const lat1 = Number(p1.lat ?? p1.latitude);
    const lng1 = Number(p1.lng ?? p1.longitude);
    const lat2 = Number(p2.lat ?? p2.latitude);
    const lng2 = Number(p2.lng ?? p2.longitude);
    const d = Math.max(50, calculateDistanceMeters(lat1, lng1, lat2, lng2));
    segLengths.push(d);
    totalDist += d;
  }

  const targetDist = normalizedProgress * totalDist;
  let accumulated = 0;
  let segIdx = 0;
  for (let i = 0; i < segLengths.length; i++) {
    if (accumulated + segLengths[i] >= targetDist || i === segLengths.length - 1) {
      segIdx = i;
      break;
    }
    accumulated += segLengths[i];
  }

  const localT = segLengths[segIdx] > 0 ? (targetDist - accumulated) / segLengths[segIdx] : 0;
  const clampedT = Math.max(0, Math.min(1, localT));

  const p1 = waypoints[segIdx];
  const p2 = waypoints[segIdx + 1];
  const lat1 = Number(p1.lat ?? p1.latitude);
  const lng1 = Number(p1.lng ?? p1.longitude);
  const lat2 = Number(p2.lat ?? p2.latitude);
  const lng2 = Number(p2.lng ?? p2.longitude);

  const lat = lat1 + (lat2 - lat1) * clampedT;
  const lng = lng1 + (lng2 - lng1) * clampedT;

  const fromName = isReturnTrip ? p2.name || 'Trạm trước' : p1.name || 'Trạm trước';
  const toName = isReturnTrip ? p1.name || 'Trạm kế' : p2.name || 'Trạm kế';
  const remainMeters = Math.round(
    (isReturnTrip ? clampedT : 1 - clampedT) * segLengths[segIdx]
  );
  // Vận tốc xe buýt đô thị trung bình ~30 km/h (~500m/phút)
  const etaNextMin = Math.max(1, Math.round(remainMeters / 480));

  return {
    coords: [lat, lng],
    fromStopName: fromName,
    toStopName: toName,
    etaNextMin,
    remainMeters,
    directionLabel: isReturnTrip ? 'Lượt về' : 'Lượt đi',
  };
}

export function RouteMap({
  path = null,
  allStops = [],
  originWalkInfo = null,
  destWalkInfo = null,
  onInspectStop,
  onPinSelectAsOrigin,
  onPinSelectAsDestination,
}) {
  const [simPlaying, setSimPlaying] = useState(true);
  const [simSpeed, setSimSpeed] = useState(1); // 1x (Thực tế ~30km/h), 3x, 6x
  const [followBus, setFollowBus] = useState(false);
  const [showCityFleet, setShowCityFleet] = useState(true);
  const [clickedPin, setClickedPin] = useState(null);
  const [tickPhase, setTickPhase] = useState(0); // Chu kỳ khứ hồi [0..2]
  const [osrmRoadWaypoints, setOsrmRoadWaypoints] = useState(null);

  // Vòng lặp 80ms với bước tiến rất nhỏ để xe buýt lướt êm đúng tốc độ thực ngoài đời (~30-35 km/h)
  useEffect(() => {
    if (!simPlaying) return;
    const interval = setInterval(() => {
      // Ở tốc độ 1x: mất ~260 giây (hơn 4 phút) để đi hết toàn tuyến ~15km
      setTickPhase((prev) => (prev + 0.0003 * simSpeed) % 2);
    }, 80);
    return () => clearInterval(interval);
  }, [simPlaying, simSpeed]);

  // Chuẩn hóa toàn bộ danh sách trạm có tọa độ hợp lệ
  const validAllStops = useMemo(() => {
    return (allStops || [])
      .map((s) => ({
        ...s,
        id: s.maTram || s.ma_tram || s.code || s.id || s._key,
        name: s.tenTram || s.ten_tram || s.name,
        address: s.diaChi || s.dia_chi || s.address,
        latitude: Number(s.latitude ?? s.vi_do ?? s.lat),
        longitude: Number(s.longitude ?? s.kinh_do ?? s.lng),
      }))
      .filter((s) => !isNaN(s.latitude) && !isNaN(s.longitude) && s.latitude !== 0);
  }, [allStops]);

  // Các trạm của lộ trình đang chọn (nếu người dùng đã tìm đường)
  const pathStopsWithCoords = useMemo(() => {
    if (!path || !Array.isArray(path.stops)) return [];
    return path.stops.filter(
      (s) => typeof s.latitude === 'number' && typeof s.longitude === 'number'
    );
  }, [path]);

  const hasActivePath = pathStopsWithCoords.length >= 2;

  // Khi người dùng tìm lộ trình: Tự động gọi OSRM Routing API để lấy đường cong bám theo mặt đường thật trên bản đồ
  useEffect(() => {
    if (!hasActivePath) {
      setOsrmRoadWaypoints(null);
      return;
    }
    let cancelled = false;

    async function fetchRealStreetGeometry() {
      try {
        const coordsStr = pathStopsWithCoords
          .map((s) => `${s.longitude},${s.latitude}`)
          .join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('OSRM unavailable');
        const data = await res.json();
        const coords = data?.routes?.[0]?.geometry?.coordinates;
        if (!cancelled && Array.isArray(coords) && coords.length >= 2) {
          // Gán tên trạm gần nhất cho từng điểm trên đường phố thực tế
          const waypoints = coords.map(([lng, lat]) => {
            let bestName = pathStopsWithCoords[0].name;
            let minDist = Infinity;
            pathStopsWithCoords.forEach((st) => {
              const d = calculateDistanceMeters(lat, lng, st.latitude, st.longitude);
              if (d < minDist) {
                minDist = d;
                bestName = st.name;
              }
            });
            return { lat, lng, name: bestName };
          });
          setOsrmRoadWaypoints(waypoints);
        }
      } catch (_) {
        if (!cancelled) setOsrmRoadWaypoints(null);
      }
    }

    fetchRealStreetGeometry();
    return () => {
      cancelled = true;
    };
  }, [hasActivePath, pathStopsWithCoords]);

  // Tính toán vị trí 12 chiếc xe buýt toàn thành phố chạy bám theo các trục đường chính
  const activeFleetBuses = useMemo(() => {
    const list = [];
    CITY_FLEET_ROUTES.forEach((r, rIdx) => {
      // Xe 1 (xuất phát đầu tuyến)
      const pos1 = interpolateBusAlongRoad(r.roadPath, tickPhase + rIdx * 0.28);
      if (pos1) {
        list.push({
          id: `FLEET_${r.code}_1`,
          routeCode: r.code,
          routeName: r.name,
          color: r.color,
          plate: r.plate1,
          speedKmh: 28 + (rIdx % 6),
          ...pos1,
        });
      }

      // Xe 2 (chạy lệch pha ngược chiều trên cùng trục đường)
      const pos2 = interpolateBusAlongRoad(r.roadPath, tickPhase + 1.0 + rIdx * 0.31);
      if (pos2) {
        list.push({
          id: `FLEET_${r.code}_2`,
          routeCode: r.code,
          routeName: r.name,
          color: r.color,
          plate: r.plate2,
          speedKmh: 27 + ((rIdx * 2) % 7),
          ...pos2,
        });
      }
    });
    return list;
  }, [tickPhase]);

  // Nếu đang có lộ trình tìm kiếm: ưu tiên chạy trên đường phố OSRM thực tế (hoặc qua danh sách trạm)
  const activePathWaypoints = useMemo(() => {
    if (osrmRoadWaypoints && osrmRoadWaypoints.length >= 2) {
      return osrmRoadWaypoints;
    }
    return pathStopsWithCoords.map((s) => ({
      lat: s.latitude,
      lng: s.longitude,
      name: s.name,
    }));
  }, [osrmRoadWaypoints, pathStopsWithCoords]);

  const primaryRouteCode = path?.routes?.[0] || '01';
  const routeColor = path?.routeDetails?.[0]?.mauSac || '#2563eb';
  const activeBus1 = hasActivePath
    ? interpolateBusAlongRoad(activePathWaypoints, tickPhase * 1.15)
    : null;
  const activeBus2 = hasActivePath
    ? interpolateBusAlongRoad(activePathWaypoints, tickPhase * 1.15 + 0.65)
    : null;

  // Xác định trạm chuyển tuyến trên lộ trình
  const transferStopIds = useMemo(() => {
    const set = new Set();
    if (Array.isArray(path?.segments) && path.segments.length > 1) {
      for (let i = 0; i < path.segments.length - 1; i++) {
        const segTo = path.segments[i].toStop;
        if (segTo) {
          if (segTo.maTram) set.add(segTo.maTram);
          if (segTo.id) set.add(segTo.id);
          if (segTo._key) set.add(segTo._key);
          if (segTo._id) set.add(segTo._id);
        }
      }
    }
    return set;
  }, [path]);

  // Khi người dùng Click chuột vào điểm bất kỳ trên bản đồ -> Định vị bến gần điểm vừa click nhất
  const handleMapClick = ({ lat, lng }) => {
    const nearest = findNearestStopsFromCoords(lat, lng, validAllStops, 1)[0] || null;
    setClickedPin({
      lat,
      lng,
      nearest,
    });
  };

  const centerLat = hasActivePath ? pathStopsWithCoords[0].latitude : 10.7769;
  const centerLng = hasActivePath ? pathStopsWithCoords[0].longitude : 106.6953;
  const polylinePositions = hasActivePath
    ? activePathWaypoints.map((pt) => [pt.lat, pt.lng])
    : [];

  const cycleSpeed = () => {
    setSimSpeed((prev) => (prev === 1 ? 3 : prev === 3 ? 6 : 1));
  };

  return (
    <div className="route-map-container">
      {/* Header điều khiển kiểu Google Maps Transit */}
      <div
        className="map-header"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <div className="map-title-group">
          <h4>
            <MapIcon size={20} color="#2563eb" />
            <span>
              {hasActivePath
                ? 'Bản đồ Lộ trình & Theo dõi Xe buýt Thời gian thực (Bám theo Đường phố)'
                : 'Bản đồ Trực tiếp Mạng lưới Xe buýt TP.HCM (Google Maps Transit Mode)'}
            </span>
          </h4>
          <p>
            {hasActivePath && activeBus1 ? (
              <>
                🚌 <strong>Xe Tuyến {primaryRouteCode}</strong> đang di chuyển đoạn:{' '}
                <strong style={{ color: '#1d4ed8' }}>
                  {activeBus1.fromStopName} ➔ {activeBus1.toStopName}
                </strong>{' '}
                (còn ~{activeBus1.etaNextMin} phút tới trạm kế)
              </>
            ) : (
              <>
                💡 <strong>Mẹo giống Google Maps:</strong> Nhấp chuột vào bất kỳ vị trí nào trên bản đồ để ghim tọa độ và tự động tìm bến xe buýt gần nhất!
              </>
            )}
          </p>
        </div>

        {/* Các nút điều khiển Live Bus & Camera */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#ecfdf5',
              color: '#047857',
              border: '1px solid #6ee7b7',
              borderRadius: '999px',
              padding: '4px 10px',
              fontSize: '0.73rem',
              fontWeight: 700,
            }}
          >
            <Radio size={12} />
            <span>
              {hasActivePath
                ? 'Đang bám theo mặt đường thực tế'
                : `${activeFleetBuses.length} xe buýt đang chạy đúng tuyến đường`}
            </span>
          </span>

          <button
            type="button"
            onClick={cycleSpeed}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Chỉnh tốc độ di chuyển của xe buýt mô phỏng"
          >
            <Gauge size={13} />
            <span>
              Tốc độ: {simSpeed === 1 ? '1x (Thực tế ~30km/h)' : `${simSpeed}x (Tua nhanh)`}
            </span>
          </button>

          {hasActivePath && (
            <button
              type="button"
              onClick={() => setFollowBus(!followBus)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: followBus ? '#dc2626' : '#f1f5f9',
                color: followBus ? '#ffffff' : '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '5px 10px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Camera bản đồ tự động trượt theo chiếc xe buýt đang chạy"
            >
              <Crosshair size={13} />
              <span>{followBus ? '🎯 Đang bám theo xe' : 'Bám theo xe buýt'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowCityFleet(!showCityFleet)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: showCityFleet ? '#eff6ff' : '#f8fafc',
              color: showCityFleet ? '#1d4ed8' : '#64748b',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Bus size={13} />
            <span>{showCityFleet ? 'Hiện đội xe toàn TP' : 'Chỉ hiện tuyến đang tìm'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSimPlaying(!simPlaying)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: simPlaying ? '#172B4D' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '5px 11px',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {simPlaying ? <Pause size={13} /> : <Play size={13} />}
            <span>{simPlaying ? 'Tạm dừng' : 'Tiếp tục chạy'}</span>
          </button>
        </div>
      </div>

      {/* Khung Bản đồ Leaflet tương tác */}
      <div className="leaflet-wrapper" style={{ height: '480px' }}>
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler onMapClick={handleMapClick} />
          <MapCameraController
            followCoords={followBus && activeBus1 ? activeBus1.coords : null}
            centerCoords={hasActivePath ? [centerLat, centerLng] : null}
          />

          {/* 0. Vẽ đường trục lộ trình của 6 tuyến xe thành phố để thấy rõ đường xe chạy */}
          {(showCityFleet || !hasActivePath) &&
            CITY_FLEET_ROUTES.map((r) => (
              <Polyline
                key={`fleet-road-${r.code}`}
                positions={r.roadPath.map((pt) => [pt.lat, pt.lng])}
                pathOptions={{
                  color: r.color,
                  weight: hasActivePath ? 2.5 : 3.5,
                  opacity: hasActivePath ? 0.3 : 0.55,
                  dashArray: hasActivePath ? '4, 6' : undefined,
                }}
              />
            ))}

          {/* 1. Vẽ toàn bộ 25 bến xe buýt trên bản đồ */}
          {validAllStops.map((stop) => {
            const isInActivePath =
              hasActivePath &&
              pathStopsWithCoords.some((ps) => ps.id === stop.id || ps._id === stop._id);
            if (isInActivePath) return null;

            return (
              <CircleMarker
                key={`bg-stop-${stop.id}`}
                center={[stop.latitude, stop.longitude]}
                radius={6}
                pathOptions={{
                  fillColor: '#475569',
                  color: '#ffffff',
                  weight: 1.5,
                  fillOpacity: 0.85,
                }}
              >
                <Popup>
                  <div style={{ fontSize: '12px', minWidth: '190px' }}>
                    <div style={{ fontWeight: 800, color: '#172B4D', fontSize: '13px' }}>
                      🚏 {stop.name} ({stop.id})
                    </div>
                    <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                      {stop.address}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      {onPinSelectAsOrigin && (
                        <button
                          type="button"
                          onClick={() =>
                            onPinSelectAsOrigin({
                              name: stop.name,
                              address: stop.address,
                              lat: stop.latitude,
                              lng: stop.longitude,
                            })
                          }
                          style={{
                            flex: 1,
                            background: '#16a34a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            padding: '4px 6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          🟢 Đi từ đây
                        </button>
                      )}
                      {onPinSelectAsDestination && (
                        <button
                          type="button"
                          onClick={() =>
                            onPinSelectAsDestination({
                              name: stop.name,
                              address: stop.address,
                              lat: stop.latitude,
                              lng: stop.longitude,
                            })
                          }
                          style={{
                            flex: 1,
                            background: '#dc2626',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            padding: '4px 6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          🔴 Đến đây
                        </button>
                      )}
                    </div>
                    {onInspectStop && (
                      <button
                        type="button"
                        onClick={() => onInspectStop(stop)}
                        style={{
                          marginTop: '5px',
                          width: '100%',
                          background: '#172B4D',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '5px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Xem bảng điện tử xe sắp tới bến
                      </button>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* 2. Đội xe buýt toàn thành phố chạy bám theo đường phố trên bản đồ */}
          {(showCityFleet || !hasActivePath) &&
            activeFleetBuses.map((bus) => (
              <Marker
                key={bus.id}
                position={bus.coords}
                icon={createMovingBusIcon(bus.routeCode, bus.color, false)}
              >
                <Popup>
                  <div style={{ fontSize: '12px', lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 800, color: bus.color, fontSize: '13px' }}>
                      🚌 Tuyến {bus.routeCode}: {bus.routeName}
                    </div>
                    <div>
                      Biển số: <strong>{bus.plate}</strong> ({bus.directionLabel})
                    </div>
                    <div>
                      Đoạn đang chạy: <strong>{bus.fromStopName} ➔ {bus.toStopName}</strong>
                    </div>
                    <div style={{ color: '#059669', fontWeight: 700 }}>
                      ⏱️ Dự kiến tới {bus.toStopName} sau ~{bus.etaNextMin} phút • Vận tốc {bus.speedKmh} km/h
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* 3. Ghim vị trí bất kỳ khi người dùng Click chuột lên Bản đồ (Google Maps Drop Pin) */}
          {clickedPin && (
            <>
              {clickedPin.nearest && (
                <Polyline
                  positions={[
                    [clickedPin.lat, clickedPin.lng],
                    [clickedPin.nearest.stop.latitude, clickedPin.nearest.stop.longitude],
                  ]}
                  pathOptions={{ color: '#0284c7', weight: 3, dashArray: '4, 6' }}
                />
              )}
              <CircleMarker
                center={[clickedPin.lat, clickedPin.lng]}
                radius={9}
                pathOptions={{ fillColor: '#0284c7', color: '#ffffff', weight: 2.5, fillOpacity: 1 }}
              >
                <Popup>
                  <div style={{ fontSize: '12px', minWidth: '210px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>
                      📍 Vị trí bạn vừa chọn trên bản đồ
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                      GPS: {clickedPin.lat.toFixed(4)}, {clickedPin.lng.toFixed(4)}
                    </div>
                    {clickedPin.nearest && (
                      <div
                        style={{
                          marginTop: '6px',
                          padding: '5px 8px',
                          background: '#f0f9ff',
                          border: '1px solid #bae6fd',
                          borderRadius: '6px',
                          fontSize: '11px',
                          color: '#0369a1',
                        }}
                      >
                        🚏 Bến gần nhất: <strong>{clickedPin.nearest.stopName}</strong>
                        <br />
                        Cách đây <strong>{formatDistance(clickedPin.nearest.distanceMeters)}</strong> (~
                        {clickedPin.nearest.walkMinutes} phút đi bộ)
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      {onPinSelectAsOrigin && (
                        <button
                          type="button"
                          onClick={() => {
                            onPinSelectAsOrigin({
                              name: `Vị trí đã ghim (${clickedPin.lat.toFixed(3)}, ${clickedPin.lng.toFixed(3)})`,
                              address: `Gần bến ${clickedPin.nearest?.stopName || 'TP.HCM'}`,
                              lat: clickedPin.lat,
                              lng: clickedPin.lng,
                            });
                            setClickedPin(null);
                          }}
                          style={{
                            flex: 1,
                            background: '#16a34a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            padding: '5px 6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          🟢 Đặt làm Điểm đi
                        </button>
                      )}
                      {onPinSelectAsDestination && (
                        <button
                          type="button"
                          onClick={() => {
                            onPinSelectAsDestination({
                              name: `Điểm đến đã ghim (${clickedPin.lat.toFixed(3)}, ${clickedPin.lng.toFixed(3)})`,
                              address: `Gần bến ${clickedPin.nearest?.stopName || 'TP.HCM'}`,
                              lat: clickedPin.lat,
                              lng: clickedPin.lng,
                            });
                            setClickedPin(null);
                          }}
                          style={{
                            flex: 1,
                            background: '#dc2626',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            padding: '5px 6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          🔴 Đặt làm Điểm đến
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </>
          )}

          {/* 4. Nếu đã tìm lộ trình: Vẽ đường lộ trình bám phố OSRM, đường đi bộ ra bến, và 2 xe buýt của lộ trình */}
          {hasActivePath && (
            <>
              <Polyline
                positions={polylinePositions}
                pathOptions={{
                  color: routeColor,
                  weight: 6,
                  opacity: 0.92,
                }}
              />

              {/* Đoạn đi bộ từ vị trí xuất phát ra bến đón */}
              {originWalkInfo && originWalkInfo.lat && originWalkInfo.lng && (
                <>
                  <Polyline
                    positions={[
                      [originWalkInfo.lat, originWalkInfo.lng],
                      [pathStopsWithCoords[0].latitude, pathStopsWithCoords[0].longitude],
                    ]}
                    pathOptions={{ color: '#16a34a', weight: 3.5, dashArray: '4, 7' }}
                  />
                  <CircleMarker
                    center={[originWalkInfo.lat, originWalkInfo.lng]}
                    radius={9}
                    pathOptions={{ fillColor: '#15803d', color: '#ffffff', weight: 2.5, fillOpacity: 1 }}
                  >
                    <Popup>
                      <div style={{ fontSize: '12px' }}>
                        <strong>📍 Điểm xuất phát của bạn: {originWalkInfo.placeName}</strong>
                        <div>
                          Đi bộ {formatDistance(originWalkInfo.distanceMeters)} (~{originWalkInfo.walkMinutes} phút) ra bến{' '}
                          <strong>{originWalkInfo.nearestStopName}</strong>.
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                </>
              )}

              {/* Đoạn đi bộ từ bến xuống tới điểm đích */}
              {destWalkInfo && destWalkInfo.lat && destWalkInfo.lng && (
                <>
                  <Polyline
                    positions={[
                      [
                        pathStopsWithCoords[pathStopsWithCoords.length - 1].latitude,
                        pathStopsWithCoords[pathStopsWithCoords.length - 1].longitude,
                      ],
                      [destWalkInfo.lat, destWalkInfo.lng],
                    ]}
                    pathOptions={{ color: '#dc2626', weight: 3.5, dashArray: '4, 7' }}
                  />
                  <CircleMarker
                    center={[destWalkInfo.lat, destWalkInfo.lng]}
                    radius={9}
                    pathOptions={{ fillColor: '#b91c1c', color: '#ffffff', weight: 2.5, fillOpacity: 1 }}
                  >
                    <Popup>
                      <div style={{ fontSize: '12px' }}>
                        <strong>🏁 Điểm đến của bạn: {destWalkInfo.placeName}</strong>
                        <div>
                          Xuống tại bến <strong>{destWalkInfo.nearestStopName}</strong> và đi bộ{' '}
                          {formatDistance(destWalkInfo.distanceMeters)} (~{destWalkInfo.walkMinutes} phút).
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                </>
              )}

              {/* 2 Chiếc xe buýt chính trên lộ trình vừa tìm */}
              {activeBus1 && (
                <Marker
                  position={activeBus1.coords}
                  icon={createMovingBusIcon(primaryRouteCode, routeColor, true)}
                >
                  <Popup>
                    <div style={{ fontSize: '12px' }}>
                      <strong>🚌 Xe đón bạn — Tuyến {primaryRouteCode} (51B-152.38)</strong>
                      <div>
                        Đang chạy: <strong>{activeBus1.fromStopName} ➔ {activeBus1.toStopName}</strong>
                      </div>
                      <div style={{ color: '#16a34a', fontWeight: 700 }}>
                        ⏱️ Tới {activeBus1.toStopName} sau ~{activeBus1.etaNextMin} phút • Vận tốc 30 km/h
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {activeBus2 && pathStopsWithCoords.length > 2 && (
                <Marker
                  position={activeBus2.coords}
                  icon={createMovingBusIcon(
                    path.routes?.[path.routes.length - 1] || primaryRouteCode,
                    '#0f766e',
                    true
                  )}
                >
                  <Popup>
                    <div style={{ fontSize: '12px' }}>
                      <strong>
                        🚌 Xe chuyến kế — Tuyến {path.routes?.[path.routes.length - 1] || primaryRouteCode} (51B-289.14)
                      </strong>
                      <div>
                        Đang chạy: <strong>{activeBus2.fromStopName} ➔ {activeBus2.toStopName}</strong>
                      </div>
                      <div style={{ color: '#0284c7', fontWeight: 700 }}>
                        ⏱️ Tới {activeBus2.toStopName} sau ~{activeBus2.etaNextMin} phút
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Các trạm dừng thuộc lộ trình */}
              {pathStopsWithCoords.map((stop, idx) => {
                const isStart = idx === 0;
                const isEnd = idx === pathStopsWithCoords.length - 1;
                const isTransfer =
                  !isStart &&
                  !isEnd &&
                  (transferStopIds.has(stop.id) || transferStopIds.has(stop._id));

                let fillColor = '#3b82f6';
                let radius = 8;
                if (isStart) {
                  fillColor = '#16a34a';
                  radius = 11;
                } else if (isEnd) {
                  fillColor = '#dc2626';
                  radius = 11;
                } else if (isTransfer) {
                  fillColor = '#d97706';
                  radius = 10;
                }

                return (
                  <CircleMarker
                    key={`active-stop-${stop.id || idx}`}
                    center={[stop.latitude, stop.longitude]}
                    radius={radius}
                    pathOptions={{
                      fillColor,
                      color: '#ffffff',
                      weight: 2.5,
                      fillOpacity: 1,
                    }}
                  >
                    <Popup>
                      <div style={{ padding: '4px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{stop.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Mã bến: {stop.id}</div>
                        {stop.address && (
                          <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                            {stop.address}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            marginTop: '4px',
                            color: fillColor,
                          }}
                        >
                          {isStart
                            ? '🟢 Bến đón xe xuất phát'
                            : isEnd
                            ? '🔴 Bến xuống xe đích'
                            : isTransfer
                            ? '🟠 Bến chuyển tuyến (Đổi xe tại đây)'
                            : `🔵 Bến trung gian #${idx + 1}`}
                        </div>
                        {onInspectStop && (
                          <button
                            type="button"
                            onClick={() => onInspectStop(stop)}
                            style={{
                              marginTop: '6px',
                              width: '100%',
                              background: '#172B4D',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Xem bảng điện tử & chi tiết bến
                          </button>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </>
          )}
        </MapContainer>
      </div>

      <div
        style={{
          marginTop: '10px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          fontSize: '0.75rem',
          color: '#475569',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          <span>🟢 <strong>Chấm xanh lá:</strong> Bến xuất phát</span>
          <span>🟠 <strong>Chấm cam:</strong> Bến đổi tuyến</span>
          <span>🔴 <strong>Chấm đỏ:</strong> Bến đích</span>
          <span>🚌 <strong>Icon xe di chuyển:</strong> Xe chạy khứ hồi bám dọc theo trục đường phố</span>
        </div>
        <span style={{ fontStyle: 'italic', color: '#64748b' }}>
          Click chuột vào điểm bất kỳ trên bản đồ để chọn Điểm đi / Điểm đến như Google Maps
        </span>
      </div>
    </div>
  );
}

export { createMovingBusIcon, CITY_FLEET_ROUTES };
export default RouteMap;
