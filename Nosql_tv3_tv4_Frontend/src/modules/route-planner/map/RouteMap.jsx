import React, { useEffect, useState, useMemo } from 'react';
import { Map as MapIcon } from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Popup,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  findNearestStopsFromCoords,
  formatDistance,
  calculateDistanceMeters,
} from '../utils/routeHelpers.js';
import './map.css';

// Component điều khiển camera bản đồ tự động căn chỉnh khi tìm lộ trình
function MapCameraController({ centerCoords }) {
  const map = useMap();

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

export function RouteMap({
  path = null,
  allStops = [],
  originWalkInfo = null,
  destWalkInfo = null,
  onInspectStop,
  onPinSelectAsOrigin,
  onPinSelectAsDestination,
}) {
  const [clickedPin, setClickedPin] = useState(null);
  const [osrmRoadWaypoints, setOsrmRoadWaypoints] = useState(null);

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

  // Khi người dùng tìm lộ trình: gọi OSRM Routing API để vẽ đường lộ trình bám theo mặt đường thực tế
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
          setOsrmRoadWaypoints(coords.map(([lng, lat]) => ({ lat, lng })));
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

  const activePathWaypoints = useMemo(() => {
    if (osrmRoadWaypoints && osrmRoadWaypoints.length >= 2) {
      return osrmRoadWaypoints;
    }
    return pathStopsWithCoords.map((s) => ({
      lat: s.latitude,
      lng: s.longitude,
    }));
  }, [osrmRoadWaypoints, pathStopsWithCoords]);

  const routeColor = path?.routeDetails?.[0]?.mauSac || '#2563eb';

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

  return (
    <div className="route-map-container">
      {/* Header gọn sạch */}
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
                ? 'Bản đồ Lộ trình Di chuyển (OpenStreetMap)'
                : 'Bản đồ Mạng lưới Bến Xe buýt TP.HCM'}
            </span>
          </h4>
          <p>
            💡 <strong>Mẹo tìm nhanh:</strong> Nhấp chuột vào bất kỳ vị trí nào trên bản đồ để ghim tọa độ và tự động chọn bến xe buýt gần nhất làm Điểm đi hoặc Điểm đến.
          </p>
        </div>

        <span className="graph-source-badge arango">
          {hasActivePath
            ? `Lộ trình qua ${pathStopsWithCoords.length} bến dừng`
            : `${validAllStops.length} bến xe buýt trên bản đồ`}
        </span>
      </div>

      {/* Khung Bản đồ Leaflet tương tác */}
      <div className="leaflet-wrapper" style={{ height: '460px' }}>
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
            centerCoords={hasActivePath ? [centerLat, centerLng] : null}
          />

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

          {/* 2. Ghim vị trí bất kỳ khi người dùng Click chuột lên Bản đồ (Google Maps Drop Pin) */}
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

          {/* 3. Nếu đã tìm lộ trình: Vẽ đường lộ trình và các trạm dừng thuộc lộ trình */}
          {hasActivePath && (
            <>
              <Polyline
                positions={polylinePositions}
                pathOptions={{
                  color: routeColor,
                  weight: 5,
                  opacity: 0.9,
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
          <span>🔵 <strong>Chấm xanh dương:</strong> Bến trung gian</span>
        </div>
        <span style={{ fontStyle: 'italic', color: '#64748b' }}>
          Click chuột vào điểm bất kỳ trên bản đồ để chọn Điểm đi / Điểm đến như Google Maps
        </span>
      </div>
    </div>
  );
}

export default RouteMap;
