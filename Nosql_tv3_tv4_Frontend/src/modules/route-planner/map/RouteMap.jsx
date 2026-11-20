import React, { useEffect, useState, useMemo } from 'react';
import {
  Map,
  MapPin,
  Bus,
  Play,
  Pause,
  Radio,
  Crosshair,
  Navigation,
  MousePointerClick,
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
import { findNearestStopsFromCoords, formatDistance } from '../utils/routeHelpers.js';
import './map.css';

// Tạo icon chiếc xe buýt di chuyển liên tục trên bản đồ (kiểu Google Maps / BusMap Live)
const createMovingBusIcon = (routeCode, color = '#2563eb', isPrimary = false) =>
  new L.DivIcon({
    className: 'live-moving-bus-marker',
    html: `
      <div style="
        position:relative;
        display:flex;
        align-items:center;
        gap:3px;
        background:${color};
        color:#fff;
        font-weight:800;
        font-size:${isPrimary ? '11px' : '10px'};
        padding:${isPrimary ? '4px 9px' : '3px 7px'};
        border-radius:999px;
        border:2px solid #ffffff;
        box-shadow:0 4px 12px rgba(0,0,0,0.4);
        white-space:nowrap;
        transform:translate(-50%, -50%);
        transition:transform 0.15s linear;
      ">
        <span>🚌 T${routeCode}</span>
      </div>
    `,
    iconSize: [64, 26],
    iconAnchor: [32, 13],
  });

// Component điều khiển camera bản đồ (Bám theo xe buýt hoặc fit lộ trình)
function MapCameraController({ followCoords, centerCoords }) {
  const map = useMap();

  useEffect(() => {
    if (followCoords && Array.isArray(followCoords) && followCoords.length === 2) {
      map.panTo(followCoords, { animate: true, duration: 0.25 });
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

// Đội xe buýt toàn thành phố (6 tuyến chính của TP.HCM chạy liên tục 24/7 trên bản đồ)
const CITY_FLEET_ROUTES = [
  {
    code: '01',
    name: 'Bến Thành - BX Chợ Lớn',
    color: '#2563eb',
    plate1: '51B-101.24',
    plate2: '51B-101.89',
    stopKeys: ['TR_01', 'TR_02', 'TR_03', 'TR_05', 'TR_07', 'TR_08'],
  },
  {
    code: '03',
    name: 'Bến Thành - Thạnh Lộc',
    color: '#16866B',
    plate1: '51B-032.15',
    plate2: '51B-039.41',
    stopKeys: ['TR_01', 'TR_09', 'TR_12', 'TR_23', 'TR_24', 'TR_25'],
  },
  {
    code: '04',
    name: 'Bến Thành - BX An Sương',
    color: '#d97706',
    plate1: '51B-045.67',
    plate2: '51B-048.12',
    stopKeys: ['TR_01', 'TR_10', 'TR_12', 'TR_13', 'TR_21', 'TR_22'],
  },
  {
    code: '08',
    name: 'BX Quận 8 - ĐH Quốc Gia',
    color: '#7c3aed',
    plate1: '51B-081.33',
    plate2: '51B-086.90',
    stopKeys: ['TR_14', 'TR_06', 'TR_11', 'TR_16', 'TR_18', 'TR_20'],
  },
  {
    code: '19',
    name: 'Bến Thành - ĐH Quốc Gia',
    color: '#dc2626',
    plate1: '51B-192.05',
    plate2: '51B-198.77',
    stopKeys: ['TR_01', 'TR_09', 'TR_16', 'TR_17', 'TR_19', 'TR_20'],
  },
  {
    code: '152',
    name: 'KDC Trung Sơn - Sân bay TSN',
    color: '#0891b2',
    plate1: '51B-152.38',
    plate2: '51B-152.94',
    stopKeys: ['TR_15', 'TR_01', 'TR_10', 'TR_12', 'TR_13'],
  },
];

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
  const [followBus, setFollowBus] = useState(false);
  const [showCityFleet, setShowCityFleet] = useState(true);
  const [clickedPin, setClickedPin] = useState(null); // { lat, lng, nearestStop }
  const [tickProgress, setTickProgress] = useState(0); // Tăng mượt 60ms/lần

  // Chạy vòng lặp 60ms (~16 FPS) giúp tất cả xe buýt trượt liên tục không bị giật
  useEffect(() => {
    if (!simPlaying) return;
    const interval = setInterval(() => {
      setTickProgress((prev) => (prev + 0.0022) % 1);
    }, 60);
    return () => clearInterval(interval);
  }, [simPlaying]);

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

  const stopLookupMap = useMemo(() => {
    const map = new Map();
    validAllStops.forEach((s) => {
      map.set(s.id, s);
      if (s._key) map.set(s._key, s);
    });
    return map;
  }, [validAllStops]);

  // Các trạm của lộ trình đang chọn (nếu người dùng đã tìm đường)
  const pathStopsWithCoords = useMemo(() => {
    if (!path || !Array.isArray(path.stops)) return [];
    return path.stops.filter(
      (s) => typeof s.latitude === 'number' && typeof s.longitude === 'number'
    );
  }, [path]);

  const hasActivePath = pathStopsWithCoords.length >= 2;

  // Hàm nội suy vị trí chiếc xe buýt chạy dọc theo một dãy trạm
  const interpolateAlongStops = (stopsSeq, progressVal) => {
    if (!stopsSeq || stopsSeq.length < 2) return null;
    const p = ((progressVal % 1) + 1) % 1;
    const totalSegs = stopsSeq.length - 1;
    const exact = p * totalSegs;
    const segIdx = Math.min(totalSegs - 1, Math.floor(exact));
    const t = exact - segIdx;
    const s1 = stopsSeq[segIdx];
    const s2 = stopsSeq[segIdx + 1];
    const lat = s1.latitude + (s2.latitude - s1.latitude) * t;
    const lng = s1.longitude + (s2.longitude - s1.longitude) * t;
    const remainRatio = 1 - t;
    const etaNextMin = Math.max(1, Math.round(remainRatio * 4));
    return {
      coords: [lat, lng],
      fromStopName: s1.name,
      toStopName: s2.name,
      etaNextMin,
      segIdx,
    };
  };

  // Tính toán vị trí 12 chiếc xe buýt toàn thành phố chạy liên tục
  const activeFleetBuses = useMemo(() => {
    if (validAllStops.length < 3) return [];
    const list = [];
    CITY_FLEET_ROUTES.forEach((r, rIdx) => {
      const routeStops = r.stopKeys
        .map((k) => stopLookupMap.get(k))
        .filter(Boolean);
      const seq = routeStops.length >= 2 ? routeStops : validAllStops.slice(0, 6);
      const revSeq = [...seq].reverse();

      // Xe lượt đi
      const pos1 = interpolateAlongStops(seq, (tickProgress * 1.1 + rIdx * 0.17) % 1);
      if (pos1) {
        list.push({
          id: `FLEET_${r.code}_1`,
          routeCode: r.code,
          routeName: r.name,
          color: r.color,
          plate: r.plate1,
          directionLabel: 'Lượt đi',
          speedKmh: 28 + (rIdx % 7),
          ...pos1,
        });
      }

      // Xe lượt về
      const pos2 = interpolateAlongStops(revSeq, (tickProgress * 0.95 + rIdx * 0.23 + 0.45) % 1);
      if (pos2) {
        list.push({
          id: `FLEET_${r.code}_2`,
          routeCode: r.code,
          routeName: r.name,
          color: r.color,
          plate: r.plate2,
          directionLabel: 'Lượt về',
          speedKmh: 26 + ((rIdx * 3) % 8),
          ...pos2,
        });
      }
    });
    return list;
  }, [validAllStops, stopLookupMap, tickProgress]);

  // Nếu đang có lộ trình tìm kiếm: tính 2 chiếc xe đang chạy trực tiếp trên lộ trình đó
  const primaryRouteCode = path?.routes?.[0] || '01';
  const routeColor = path?.routeDetails?.[0]?.mauSac || '#2563eb';
  const activeBus1 = hasActivePath
    ? interpolateAlongStops(pathStopsWithCoords, (tickProgress * 1.35) % 1)
    : null;
  const activeBus2 = hasActivePath
    ? interpolateAlongStops(pathStopsWithCoords, (tickProgress * 1.35 + 0.5) % 1)
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
          if (segTo._key) set.add(segTo.key);
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
    ? pathStopsWithCoords.map((s) => [s.latitude, s.longitude])
    : [];

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
            <Map size={20} color="#2563eb" />
            <span>
              {hasActivePath
                ? 'Bản đồ Lộ trình & Theo dõi Xe buýt Thời gian thực (Live GPS)'
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
                ? 'Đang theo dõi xe trên lộ trình'
                : `${activeFleetBuses.length} xe buýt đang chạy trực tiếp`}
            </span>
          </span>

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

          {/* 1. Vẽ toàn bộ 25 bến xe buýt trên bản đồ (Khi chưa chọn lộ trình hoặc làm nền) */}
          {validAllStops.map((stop) => {
            const isInActivePath =
              hasActivePath &&
              pathStopsWithCoords.some((ps) => ps.id === stop.id || ps._id === stop._id);
            if (isInActivePath) return null; // Đã được vẽ nổi bật ở mục 4

            return (
              <CircleMarker
                key={`bg-stop-${stop.id}`}
                center={[stop.latitude, stop.longitude]}
                radius={6}
                pathOptions={{
                  fillColor: '#64748b',
                  color: '#ffffff',
                  weight: 1.5,
                  fillOpacity: 0.75,
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

          {/* 2. Đội xe buýt toàn thành phố chạy liên tục trên bản đồ */}
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

          {/* 4. Nếu đã tìm lộ trình: Vẽ đường lộ trình nổi bật, đường đi bộ ra bến, và 2 xe buýt của lộ trình */}
          {hasActivePath && (
            <>
              <Polyline
                positions={polylinePositions}
                pathOptions={{
                  color: routeColor,
                  weight: 6,
                  opacity: 0.9,
                  dashArray: path.transfers > 0 ? '8, 6' : undefined,
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

              {activeBus2 && pathStopsWithCoords.length > 3 && (
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
          <span>🚌 <strong>Icon xe di chuyển:</strong> Vị trí xe buýt thời gian thực</span>
        </div>
        <span style={{ fontStyle: 'italic', color: '#64748b' }}>
          Click chuột vào điểm bất kỳ trên bản đồ để chọn Điểm đi / Điểm đến như Google Maps
        </span>
      </div>
    </div>
  );
}

export default RouteMap;
