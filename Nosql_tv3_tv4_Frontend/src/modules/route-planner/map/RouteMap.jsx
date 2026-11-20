import React, { useEffect, useState } from 'react';
import { Map, MapPin, Bus, Play, Pause, Radio } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import './map.css';

// Tạo icon chiếc xe buýt di chuyển trên bản đồ
const createMovingBusIcon = (routeCode, color = '#2563eb') =>
  new L.DivIcon({
    className: 'live-moving-bus-marker',
    html: `
      <div style="
        display:flex;
        align-items:center;
        gap:3px;
        background:${color};
        color:#fff;
        font-weight:800;
        font-size:10px;
        padding:3px 7px;
        border-radius:999px;
        border:2px solid #ffffff;
        box-shadow:0 3px 10px rgba(0,0,0,0.35);
        white-space:nowrap;
        transform:translate(-50%, -50%);
      ">
        <span>🚌 T${routeCode}</span>
      </div>
    `,
    iconSize: [56, 24],
    iconAnchor: [28, 12],
  });

export function RouteMap({
  path,
  originWalkInfo = null,
  destWalkInfo = null,
  onInspectStop,
}) {
  const [simPlaying, setSimPlaying] = useState(true);
  const [busProgress, setBusProgress] = useState(0.15); // 0.0 -> 1.0 dọc theo polyline

  if (!path || !path.stops || path.stops.length === 0) {
    return null;
  }

  // Filter stops with valid lat/long
  const stopsWithCoords = path.stops.filter(
    (s) => typeof s.latitude === 'number' && typeof s.longitude === 'number'
  );

  // Hiệu ứng di chuyển xe buýt mượt mà trên bản đồ theo từng giây
  useEffect(() => {
    if (!simPlaying || stopsWithCoords.length < 2) return;
    const interval = setInterval(() => {
      setBusProgress((prev) => {
        const next = prev + 0.018;
        return next >= 1 ? 0 : next;
      });
    }, 350);
    return () => clearInterval(interval);
  }, [simPlaying, stopsWithCoords.length]);

  if (stopsWithCoords.length < 2) {
    return (
      <div className="route-map-container">
        <div className="map-header">
          <div className="map-title-group">
            <h4>
              <Map size={20} color="#2563eb" />
              <span>Bản đồ Lộ trình Di chuyển</span>
            </h4>
            <p>Vị trí các trạm đón trả khách và trạm chuyển tuyến trên bản đồ TP.HCM</p>
          </div>
        </div>
        <div className="map-missing-coords">
          <MapPin size={24} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
          <div>Chưa có đủ tọa độ địa lý (GPS) để hiển thị bản đồ cho lộ trình này.</div>
        </div>
      </div>
    );
  }

  // Xác định các trạm chuyển tuyến từ danh sách segments
  const transferStopIds = new Set();
  if (Array.isArray(path.segments) && path.segments.length > 1) {
    for (let i = 0; i < path.segments.length - 1; i++) {
      const segTo = path.segments[i].toStop;
      if (segTo) {
        if (segTo.maTram) transferStopIds.add(segTo.maTram);
        if (segTo.id) transferStopIds.add(segTo.id);
        if (segTo._key) transferStopIds.add(segTo._key);
        if (segTo._id) transferStopIds.add(segTo._id);
      }
    }
  }

  const centerLat = stopsWithCoords[0].latitude;
  const centerLng = stopsWithCoords[0].longitude;

  const polylinePositions = stopsWithCoords.map((s) => [s.latitude, s.longitude]);
  const routeColor = path.routeDetails?.[0]?.mauSac || '#2563eb';
  const primaryRouteCode = path.routes?.[0] || '01';

  // Tính tọa độ nội suy của 2 chiếc xe buýt mô phỏng trên tuyến
  const getInterpolatedCoord = (progress) => {
    if (stopsWithCoords.length < 2) return [centerLat, centerLng];
    const totalSegments = stopsWithCoords.length - 1;
    const exactIdx = progress * totalSegments;
    const segIdx = Math.min(totalSegments - 1, Math.floor(exactIdx));
    const t = exactIdx - segIdx;
    const p1 = stopsWithCoords[segIdx];
    const p2 = stopsWithCoords[segIdx + 1];
    const lat = p1.latitude + (p2.latitude - p1.latitude) * t;
    const lng = p1.longitude + (p2.longitude - p1.longitude) * t;
    const currentFromStop = p1.name;
    const currentToStop = p2.name;
    return { coords: [lat, lng], currentFromStop, currentToStop, segIdx };
  };

  const bus1 = getInterpolatedCoord(busProgress);
  const bus2 = getInterpolatedCoord((busProgress + 0.48) % 1);

  return (
    <div className="route-map-container">
      <div className="map-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div className="map-title-group">
          <h4>
            <Map size={20} color="#2563eb" />
            <span>Bản đồ Lộ trình & Mô phỏng Xe buýt Thời gian thực</span>
          </h4>
          <p>
            🚌 Xe 1 đang chạy đoạn: <strong>{bus1.currentFromStop} ➔ {bus1.currentToStop}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
              borderRadius: '999px',
              padding: '4px 10px',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}
          >
            <Radio size={12} />
            <span>2 xe đang hoạt động trên tuyến</span>
          </span>
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
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {simPlaying ? <Pause size={13} /> : <Play size={13} />}
            <span>{simPlaying ? 'Tạm dừng mô phỏng' : 'Chạy mô phỏng xe'}</span>
          </button>
        </div>
      </div>

      <div className="leaflet-wrapper">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Polyline connecting stops in order */}
          <Polyline
            positions={polylinePositions}
            pathOptions={{
              color: routeColor,
              weight: 5,
              opacity: 0.8,
              dashArray: path.transfers > 0 ? '6, 6' : undefined,
            }}
          />

          {/* Đoạn đi bộ từ vị trí của khách ra trạm xuất phát (nếu dùng Smart Location Search) */}
          {originWalkInfo && originWalkInfo.lat && originWalkInfo.lng && (
            <>
              <Polyline
                positions={[
                  [originWalkInfo.lat, originWalkInfo.lng],
                  [stopsWithCoords[0].latitude, stopsWithCoords[0].longitude],
                ]}
                pathOptions={{ color: '#16a34a', weight: 3, dashArray: '4, 6' }}
              />
              <CircleMarker
                center={[originWalkInfo.lat, originWalkInfo.lng]}
                radius={8}
                pathOptions={{ fillColor: '#15803d', color: '#ffffff', weight: 2, fillOpacity: 1 }}
              >
                <Popup>
                  <div style={{ fontSize: '12px' }}>
                    <strong>📍 Vị trí xuất phát của bạn: {originWalkInfo.placeName}</strong>
                    <div>Đi bộ {originWalkInfo.distanceMeters}m (~{originWalkInfo.walkMinutes} phút) ra trạm đón.</div>
                  </div>
                </Popup>
              </CircleMarker>
            </>
          )}

          {/* Đoạn đi bộ từ trạm đích tới địa điểm cần đến */}
          {destWalkInfo && destWalkInfo.lat && destWalkInfo.lng && (
            <>
              <Polyline
                positions={[
                  [
                    stopsWithCoords[stopsWithCoords.length - 1].latitude,
                    stopsWithCoords[stopsWithCoords.length - 1].longitude,
                  ],
                  [destWalkInfo.lat, destWalkInfo.lng],
                ]}
                pathOptions={{ color: '#dc2626', weight: 3, dashArray: '4, 6' }}
              />
              <CircleMarker
                center={[destWalkInfo.lat, destWalkInfo.lng]}
                radius={8}
                pathOptions={{ fillColor: '#b91c1c', color: '#ffffff', weight: 2, fillOpacity: 1 }}
              >
                <Popup>
                  <div style={{ fontSize: '12px' }}>
                    <strong>🏁 Điểm đến của bạn: {destWalkInfo.placeName}</strong>
                    <div>Đi bộ {destWalkInfo.distanceMeters}m (~{destWalkInfo.walkMinutes} phút) từ trạm xuống xe.</div>
                  </div>
                </Popup>
              </CircleMarker>
            </>
          )}

          {/* 2 Chiếc Xe buýt mô phỏng di chuyển thời gian thực trên lộ trình */}
          <Marker
            position={bus1.coords}
            icon={createMovingBusIcon(primaryRouteCode, routeColor)}
          >
            <Popup>
              <div style={{ fontSize: '12px' }}>
                <strong>🚌 Xe buýt Tuyến {primaryRouteCode} (51B-152.38)</strong>
                <div>Đang di chuyển: {bus1.currentFromStop} ➔ {bus1.currentToStop}</div>
                <div style={{ color: '#16a34a', fontWeight: 600 }}>Tốc độ trung bình: 28 km/h • Còn ghế trống</div>
              </div>
            </Popup>
          </Marker>

          {stopsWithCoords.length > 3 && (
            <Marker
              position={bus2.coords}
              icon={createMovingBusIcon(path.routes?.[path.routes.length - 1] || primaryRouteCode, '#0f766e')}
            >
              <Popup>
                <div style={{ fontSize: '12px' }}>
                  <strong>🚌 Xe buýt Tuyến {path.routes?.[path.routes.length - 1] || primaryRouteCode} (51B-289.14)</strong>
                  <div>Đang di chuyển: {bus2.currentFromStop} ➔ {bus2.currentToStop}</div>
                  <div style={{ color: '#0284c7', fontWeight: 600 }}>Tốc độ trung bình: 30 km/h • Đúng giờ</div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Markers for stops */}
          {stopsWithCoords.map((stop, idx) => {
            const isStart = idx === 0;
            const isEnd = idx === stopsWithCoords.length - 1;
            const isTransfer =
              !isStart &&
              !isEnd &&
              (transferStopIds.has(stop.id) || transferStopIds.has(stop._id));

            let fillColor = '#3b82f6';
            let radius = 7;
            if (isStart) {
              fillColor = '#16a34a';
              radius = 10;
            } else if (isEnd) {
              fillColor = '#dc2626';
              radius = 10;
            } else if (isTransfer) {
              fillColor = '#d97706';
              radius = 9;
            }

            return (
              <CircleMarker
                key={stop.id || idx}
                center={[stop.latitude, stop.longitude]}
                radius={radius}
                pathOptions={{
                  fillColor,
                  color: '#ffffff',
                  weight: 2,
                  fillOpacity: 0.95,
                }}
              >
                <Popup>
                  <div style={{ padding: '4px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                      {stop.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Mã trạm: {stop.id}
                    </div>
                    {stop.address && (
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                        {stop.address}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px', color: fillColor }}>
                      {isStart
                        ? '🟢 Trạm xuất phát'
                        : isEnd
                        ? '🔴 Trạm đích đến'
                        : isTransfer
                        ? '🟠 Trạm chuyển tuyến (Đổi xe tại đây)'
                        : `🔵 Trạm trung gian số ${idx + 1}`}
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
                        Xem bảng điện tử & chi tiết trạm
                      </button>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
      <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
        * Ghi chú: Đường nối giữa các trạm trên bản đồ là đường vẽ thẳng minh họa thứ tự hành trình (Direct Polyline), không phải hình học mạng lưới đường xe chạy thực tế.
      </div>
    </div>
  );
}

export default RouteMap;
