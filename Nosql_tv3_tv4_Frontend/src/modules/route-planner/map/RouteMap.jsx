import React from 'react';
import { Map, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup } from 'react-leaflet';
import './map.css';

export function RouteMap({ path }) {
  if (!path || !path.stops || path.stops.length === 0) {
    return null;
  }

  // Filter stops with valid lat/long
  const stopsWithCoords = path.stops.filter(
    (s) => typeof s.latitude === 'number' && typeof s.longitude === 'number'
  );

  if (stopsWithCoords.length < 2) {
    return (
      <div className="route-map-container">
        <div className="map-header">
          <div className="map-title-group">
            <h4>
              <Map size={20} color="#2563eb" />
              <span>Bản đồ Tuyến đường (Leaflet Map - P2)</span>
            </h4>
            <p>Trực quan hóa địa lý các trạm dừng trên nền bản đồ OpenStreetMap</p>
          </div>
        </div>
        <div className="map-missing-coords">
          <MapPin size={24} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
          <div>Chưa có đủ tọa độ địa lý (GPS Latitude/Longitude) để hiển thị bản đồ.</div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Cần bổ sung thuộc tính latitude, longitude cho các trạm trong Vertex Collection TramDung.
          </span>
        </div>
      </div>
    );
  }

  const centerLat = stopsWithCoords[0].latitude;
  const centerLng = stopsWithCoords[0].longitude;

  const polylinePositions = stopsWithCoords.map((s) => [s.latitude, s.longitude]);
  const routeColor = path.routeDetails?.[0]?.mauSac || '#2563eb';

  return (
    <div className="route-map-container">
      <div className="map-header">
        <div className="map-title-group">
          <h4>
            <Map size={20} color="#2563eb" />
            <span>Bản đồ Tuyến đường (Leaflet Map - P2)</span>
          </h4>
          <p>Trực quan hóa địa lý các trạm dừng trên nền bản đồ OpenStreetMap</p>
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

          {/* Markers for stops */}
          {stopsWithCoords.map((stop, idx) => {
            const isStart = idx === 0;
            const isEnd = idx === stopsWithCoords.length - 1;

            let fillColor = '#3b82f6';
            let radius = 7;
            if (isStart) {
              fillColor = '#16a34a';
              radius = 10;
            } else if (isEnd) {
              fillColor = '#dc2626';
              radius = 10;
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
                  fillOpacity: 0.9,
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
                      {isStart ? '🟢 Trạm xuất phát' : isEnd ? '🔴 Trạm đích đến' : `Trạm số ${idx + 1}`}
                    </div>
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
