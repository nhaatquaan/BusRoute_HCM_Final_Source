import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import simulationService from '../../../services/simulationService';

// Bảng màu nhận diện cho từng tuyến xe buýt TP.HCM
const ROUTE_COLORS = {
  '01': '#2563eb',  // Xanh dương đậm
  '03': '#059669',  // Xanh lá lục bảo
  '04': '#d97706',  // Vàng cam hổ phách
  '08': '#7c3aed',  // Tím thạch anh
  '19': '#dc2626',  // Đỏ cờ
  '152': '#0891b2', // Xanh mòng két (Tuyến sân bay)
};

/**
 * Tạo icon xe buýt bằng HTML DivIcon của Leaflet
 */
function createBusDivIcon(routeCode, direction, status, isSelected = false) {
  const color = ROUTE_COLORS[routeCode] || '#2563eb';
  const isApproaching = status === 'approaching';
  const isAtStop = status === 'at_stop';

  const pulseClass = isApproaching ? 'live-bus-approaching' : isAtStop ? 'live-bus-at-stop' : '';
  const dirArrow = direction === 'luot_di' ? '➔' : '⬅';

  const html = `
    <div class="live-bus-marker ${pulseClass} ${isSelected ? 'is-focused' : ''}" style="
      background-color: ${color};
      color: #ffffff;
      border: 2px solid #ffffff;
      box-shadow: 0 3px 8px rgba(0,0,0,0.35);
      border-radius: 999px;
      padding: 3px 8px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
      cursor: pointer;
      user-select: none;
      transform: translate(-50%, -50%);
    ">
      <span style="font-size: 13px; line-height: 1;">🚌</span>
      <span>${routeCode}</span>
      <span style="font-size: 9px; opacity: 0.85;">${dirArrow}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-bus-div-icon',
    iconSize: [60, 26],
    iconAnchor: [30, 13],
    popupAnchor: [0, -14],
  });
}

export function LiveBusLayer({
  filterRouteCode = null,
  filterDirection = null,
  onSelectVehicle = null,
  enabled = true,
}) {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const isTabVisibleRef = useRef(true);
  const timerRef = useRef(null);

  // Polling vị trí xe từ backend
  const fetchVehicles = async () => {
    if (!enabled || !isTabVisibleRef.current) return;
    try {
      const data = await simulationService.getActiveVehicles({
        routeId: filterRouteCode || undefined,
        direction: filterDirection || undefined,
      });

      if (data && data.success && Array.isArray(data.vehicles)) {
        setVehicles(data.vehicles);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.warn('[LiveBusLayer] Lỗi cập nhật xe mô phỏng:', err.message);
    }
  };

  // Thiết lập chu kỳ cập nhật định kỳ (12 giây) và theo dõi tab trình duyệt
  useEffect(() => {
    if (!enabled) {
      setVehicles([]);
      return;
    }

    fetchVehicles();

    // Dừng khi tab bị ẩn để tiết kiệm tài nguyên
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      isTabVisibleRef.current = isVisible;
      if (isVisible) {
        fetchVehicles();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    timerRef.current = setInterval(() => {
      fetchVehicles();
    }, 12000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, filterRouteCode, filterDirection]);

  // Bộ lọc danh sách xe hiển thị
  const displayVehicles = useMemo(() => {
    if (!filterRouteCode) return vehicles;
    return vehicles.filter((v) => String(v.routeCode) === String(filterRouteCode));
  }, [vehicles, filterRouteCode]);

  if (!enabled || displayVehicles.length === 0) {
    return null;
  }

  return (
    <>
      {displayVehicles.map((bus) => {
        const icon = createBusDivIcon(
          bus.routeCode,
          bus.direction,
          bus.status,
          bus.vehicleId === selectedVehicleId
        );

        return (
          <Marker
            key={bus.vehicleId}
            position={[bus.latitude, bus.longitude]}
            icon={icon}
            eventHandlers={{
              click: () => {
                setSelectedVehicleId(bus.vehicleId);
                if (onSelectVehicle) onSelectVehicle(bus);
              },
            }}
          >
            <Popup minWidth={240}>
              <div style={{ fontSize: '12px', lineHeight: 1.4 }}>
                {/* Header nhãn minh bạch mô phỏng */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    paddingBottom: '4px',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <span
                    style={{
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    MÔ PHỎNG – DỮ LIỆU MINH HỌA
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>
                    {bus.directionLabel || (bus.direction === 'luot_di' ? 'Lượt đi' : 'Lượt về')}
                  </span>
                </div>

                {/* Tiêu đề xe & tuyến */}
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>
                  🚌 Tuyến {bus.routeCode}: {bus.routeName}
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                  Mã xe: <strong>{bus.vehicleId}</strong>
                </div>

                {/* Vị trí và trạm tiếp theo */}
                <div
                  style={{
                    marginTop: '8px',
                    padding: '6px 8px',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  <div style={{ color: '#334155', fontWeight: 600 }}>
                    🏁 Trạm tiếp theo:{' '}
                    <span style={{ color: '#2563eb' }}>
                      {bus.nextStopName || bus.nextStopId}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px', fontWeight: 700 }}>
                    ⏱️ Dự kiến cập bến sau ~{bus.etaToNextStop} phút
                  </div>
                </div>

                {/* Trạng thái vận hành */}
                <div
                  style={{
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                  }}
                >
                  <span>
                    Trạng thái:{' '}
                    <strong>
                      {bus.status === 'at_stop'
                        ? '🔵 Đang đón khách tại trạm'
                        : bus.status === 'approaching'
                        ? '🟡 Sắp cập bến'
                        : '🟢 Đang di chuyển'}
                    </strong>
                  </span>
                  <span style={{ color: '#64748b' }}>
                    Tiến độ: {Math.round((bus.progress || 0) * 100)}%
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export default LiveBusLayer;
