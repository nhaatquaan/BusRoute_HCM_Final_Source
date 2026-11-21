import React, { useState, useEffect, useMemo } from 'react';
import {
  Bus,
  Clock,
  Milestone,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Heart,
  Radio,
  Printer,
  Footprints,
  Navigation,
} from 'lucide-react';
import { StopList } from './StopList.jsx';
import { formatDistance, formatDuration, formatCurrency, printRouteDocument } from '../utils/routeHelpers.js';
import { authService } from '../../../services/authService';
import { passengerService } from '../../../services/passengerService';
import { simulationService } from '../../../services/simulationService';

export function RouteCard({
  path,
  isSelected = false,
  onSelect,
  originWalkInfo = null,
  destWalkInfo = null,
  onInspectStop,
}) {
  const [showDetails, setShowDetails] = useState(isSelected);
  const [favoriteRouteCodes, setFavoriteRouteCodes] = useState(new Set());
  const [favLoading, setFavLoading] = useState(false);

  // Tích hợp dữ liệu xe buýt mô phỏng đang tới trạm xuất phát (Bus Simulation Service)
  const primaryRouteCode = path?.routes?.[0] || '01';
  const startStop = path?.stops?.[0];
  const startStopId = startStop?.id || startStop?.maTram || startStop?._key || startStop?._id;
  const startStopName = startStop?.name || 'Trạm xuất phát';
  const primaryDirection = path?.segments?.[0]?.direction || 'luot_di';

  const [liveWaitInfo, setLiveWaitInfo] = useState(null);
  const [waitLoading, setWaitLoading] = useState(false);

  useEffect(() => {
    if (!startStopId || !primaryRouteCode) return;
    let mounted = true;

    async function fetchWait() {
      try {
        setWaitLoading(true);
        const wait = await simulationService.getRouteWait(primaryRouteCode, primaryDirection, startStopId);
        if (mounted) {
          setLiveWaitInfo(wait);
        }
      } catch (err) {
        console.warn('Error fetching route wait info:', err.message);
      } finally {
        if (mounted) setWaitLoading(false);
      }
    }

    fetchWait();

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchWait();
      }
    }, 15000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [primaryRouteCode, primaryDirection, startStopId]);

  const handlePrintThisPath = (e) => {
    e.stopPropagation();
    const firstStop = path?.stops?.[0]?.name || '';
    const lastStop = path?.stops?.[path.stops.length - 1]?.name || '';
    printRouteDocument({
      title: `PHIẾU HƯỚNG DẪN LỘ TRÌNH XE BUÝT (PHƯƠNG ÁN #${path.pathIndex || 1})`,
      subtitle: `Hành trình: ${firstStop} ➔ ${lastStop} (Tuyến ${path.routes.join(' ➔ Tuyến ')})`,
      stops: path.stops || [],
      segments: path.segments || [],
      metaList: [
        { label: 'Tuyến sử dụng', value: `Tuyến ${path.routes.join(', ')}` },
        { label: 'Số lần chuyển tuyến', value: path.transfers === 0 ? 'Đi thẳng (0 đổi xe)' : `${path.transfers} lần chuyển` },
        { label: 'Tổng thời gian & cự ly', value: `~${formatDuration(path.totalDuration)} (${formatDistance(path.totalDistance)})` },
        { label: 'Tổng số trạm qua', value: `${path.totalStops} trạm dừng` },
      ],
    });
  };

  const isAuth = authService.isAuthenticated();

  useEffect(() => {
    if (isAuth) {
      passengerService
        .getFavoriteRoutes()
        .then((favs) => {
          if (Array.isArray(favs)) {
            setFavoriteRouteCodes(new Set(favs.map((f) => f.routeCode || f.ma_tuyen)));
          }
        })
        .catch(() => {});
    }
  }, [isAuth]);

  const toggleFavorite = async (e, routeCode, detail) => {
    e.stopPropagation();
    if (!isAuth) {
      alert('Vui lòng đăng nhập với tài khoản Hành khách để lưu tuyến xe yêu thích.');
      return;
    }

    const isFav = favoriteRouteCodes.has(routeCode);
    const targetRouteId = detail?.id || detail?._id || `TX_${routeCode}`;

    try {
      setFavLoading(true);
      if (isFav) {
        await passengerService.removeFavoriteRoute(targetRouteId);
        setFavoriteRouteCodes((prev) => {
          const next = new Set(prev);
          next.delete(routeCode);
          return next;
        });
      } else {
        await passengerService.addFavoriteRoute({
          routeId: targetRouteId,
          routeCode,
          routeName: detail?.tenTuyen || detail?.ten_tuyen || `Tuyến xe số ${routeCode}`,
        });
        setFavoriteRouteCodes((prev) => new Set(prev).add(routeCode));
      }
    } catch (err) {
      console.warn('Lỗi khi cập nhật tuyến yêu thích:', err.message);
    } finally {
      setFavLoading(false);
    }
  };

  const hasUnknownFare =
    !path.routeDetails ||
    path.routeDetails.length === 0 ||
    path.routeDetails.some((r) => r.giaVe === null || r.giaVe === undefined);

  const totalFare = hasUnknownFare
    ? null
    : path.routeDetails.reduce((sum, r) => sum + (r.giaVe || 0), 0);

  return (
    <div className={`route-card ${isSelected ? 'is-selected' : ''}`}>
      <div className="route-card-header" onClick={onSelect}>
        <div className="route-badges-row">
          {path.routes.map((routeCode, idx) => {
            const detail = path.routeDetails?.find((d) => d.maTuyen === routeCode);
            const color = detail?.mauSac || '#2563eb';
            const isUnknown = !routeCode || routeCode === 'CHUA_XAC_DINH';
            const isFavorite = favoriteRouteCodes.has(routeCode);

            return (
              <React.Fragment key={routeCode || idx}>
                {idx > 0 && <ArrowRight size={14} className="route-arrow-icon" />}
                <span
                  className="route-pill-badge"
                  style={{ backgroundColor: isUnknown ? '#64748b' : color }}
                >
                  <Bus size={13} />
                  <span>{isUnknown ? 'Chưa rõ tuyến' : `Tuyến ${routeCode}`}</span>
                  {!isUnknown && (
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, routeCode, detail)}
                      disabled={favLoading}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0 2px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        marginLeft: '4px',
                        color: isFavorite ? '#ef4444' : '#ffffffcc',
                      }}
                      title={isFavorite ? 'Bỏ lưu tuyến yêu thích' : 'Lưu tuyến này vào danh sách yêu thích'}
                    >
                      <Heart size={13} fill={isFavorite ? '#ef4444' : 'none'} />
                    </button>
                  )}
                </span>
              </React.Fragment>
            );
          })}

          {path.transfers === null || path.transfers === undefined ? (
            <span className="transfer-tag" style={{ background: '#f1f5f9', color: '#64748b' }}>
              Chưa xác định chuyển tuyến
            </span>
          ) : path.transfers === 0 ? (
            <span className="transfer-tag direct">Trực tiếp (0 chuyển tuyến)</span>
          ) : (
            <span className="transfer-tag transfer">
              {path.transfers} lần chuyển tuyến
            </span>
          )}

          {isSelected && (
            <span className="active-viewing-tag">
              <Eye size={12} /> Đang xem trên đồ thị
            </span>
          )}
        </div>

        {/* Quick metrics */}
        <div className="route-metrics-row">
          <div className="metric-item">
            <Clock size={15} />
            <span>~{formatDuration(path.totalDuration)}</span>
          </div>
          <div className="metric-divider">•</div>
          <div className="metric-item">
            <Milestone size={15} />
            <span>{formatDistance(path.totalDistance)}</span>
          </div>
          <div className="metric-divider">•</div>
          <div className="metric-item">
            <span>{path.totalStops} trạm</span>
          </div>
          <div className="metric-divider">•</div>
          {hasUnknownFare ? (
            <div className="metric-item" style={{ color: '#64748b', fontSize: '0.8125rem' }}>
              <span>Vé: Đang cập nhật</span>
            </div>
          ) : path.transfers > 0 ? (
            <div
              className="metric-item fare-item"
              title="Tổng giá vé cộng dồn từng chặng (Chưa áp dụng chính sách giảm giá vé chuyển tuyến)"
            >
              <span>Vé ước tính: {formatCurrency(totalFare)} (Cộng dồn)</span>
            </div>
          ) : (
            <div className="metric-item fare-item">
              <span>Vé: {formatCurrency(totalFare)}</span>
            </div>
          )}
        </div>

        {/* LIVE BUS SIMULATION & WAIT TIME BAR (Tích hợp Bus Simulation Service thống nhất) */}
        {(() => {
          const isArrived = liveWaitInfo && (liveWaitInfo.etaMinutes === 0 || liveWaitInfo.status === 'at_stop');
          const isScheduled = liveWaitInfo && liveWaitInfo.status === 'scheduled';
          const walkMin = originWalkInfo?.walkMinutes || 0;
          const destWalkMin = destWalkInfo?.walkMinutes || 0;
          const busMin = path.totalDuration || 0;
          const waitMin = liveWaitInfo ? liveWaitInfo.etaMinutes : null;

          return (
            <>
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: isArrived ? '#ecfdf5' : '#f0f9ff',
                  border: isArrived ? '1px solid #6ee7b7' : '1px solid #bae6fd',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  fontSize: '0.78rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: isArrived ? '#059669' : '#0284c7',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    <Radio size={12} />
                    <span>MÔ PHỎNG – THỜI GIAN ĐẾN ƯỚC TÍNH</span>
                  </span>
                  <span>
                    🚌 <strong>Tuyến {primaryRouteCode}</strong>
                    {liveWaitInfo?.vehicleId && (
                      <> (Mã xe <code style={{ fontWeight: 700 }}>{liveWaitInfo.vehicleId}</code>)</>
                    )}
                    :{' '}
                    {waitLoading && !liveWaitInfo ? (
                      <span style={{ color: '#64748b' }}>Đang tra cứu xe mô phỏng tới trạm...</span>
                    ) : isArrived ? (
                      <strong style={{ color: '#059669' }}>
                        Xe đã cập bến tại {startStopName} — Sẵn sàng lên xe!
                      </strong>
                    ) : isScheduled ? (
                      <>
                        Chưa xuất bến đầu tuyến, dự kiến tới trạm đón <strong>{startStopName}</strong> sau{' '}
                        <strong>~{liveWaitInfo?.etaMinutes} phút</strong>
                      </>
                    ) : liveWaitInfo ? (
                      <>
                        Đang cách trạm đón <strong>{startStopName}</strong> khoảng{' '}
                        <strong>{liveWaitInfo.stopsAway} trạm</strong>
                      </>
                    ) : (
                      <span style={{ color: '#64748b' }}>
                        Chưa có xe mô phỏng trên tuyến này trong khung giờ hiện tại.
                      </span>
                    )}
                  </span>
                </div>

                <div style={{ fontWeight: 800, color: isArrived ? '#059669' : '#0369a1' }}>
                  {isArrived
                    ? '🟢 Sẵn sàng lên xe'
                    : liveWaitInfo?.etaMinutes !== undefined
                    ? `⏱️ Chờ xe: ~${liveWaitInfo.etaMinutes} phút`
                    : 'Chờ: Chưa cập nhật'}
                </div>
              </div>

              {/* Detailed Timeline Breakdown (Đi bộ + Chờ xe + Đi xe buýt = Tổng thời gian) */}
              <div
                style={{
                  marginTop: '8px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.75rem',
                  color: '#334155',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontWeight: 700, color: '#0f172a' }}>Hành trình dự kiến:</span>
                {walkMin > 0 && (
                  <>
                    <span>🚶 Đi bộ: <strong>{walkMin}p</strong></span>
                    <span style={{ color: '#94a3b8' }}>+</span>
                  </>
                )}
                <span>
                  ⏱️ Chờ xe mô phỏng:{' '}
                  <strong>
                    {waitMin !== null ? `${waitMin}p` : 'Đang tính'}
                  </strong>
                </span>
                <span style={{ color: '#94a3b8' }}>+</span>
                <span>🚌 Đi xe buýt: <strong>~{busMin}p</strong></span>
                {destWalkMin > 0 && (
                  <>
                    <span style={{ color: '#94a3b8' }}>+</span>
                    <span>🏁 Đi bộ đích: <strong>{destWalkMin}p</strong></span>
                  </>
                )}
                <span style={{ color: '#94a3b8' }}>=</span>
                <span
                  style={{
                    fontWeight: 800,
                    color: '#0284c7',
                    background: '#e0f2fe',
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}
                >
                  {waitMin !== null
                    ? `Tổng dự kiến: ~${walkMin + waitMin + busMin + destWalkMin} phút`
                    : `Tổng di chuyển: ~${walkMin + busMin + destWalkMin} phút`}
                </span>
              </div>
            </>
          );
        })()}

        {/* Walking guidance if user searched from a custom location */}
        {(originWalkInfo || destWalkInfo) && (
          <div
            style={{
              marginTop: '6px',
              padding: '6px 10px',
              borderRadius: '6px',
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              fontSize: '0.74rem',
              color: '#334155',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {originWalkInfo && (
              <span>
                🚶 <strong>Chặng đầu:</strong> Đi bộ {originWalkInfo.distanceMeters}m (~{originWalkInfo.walkMinutes} phút) từ{' '}
                <strong>{originWalkInfo.placeName}</strong> ra trạm <strong>{originWalkInfo.nearestStopName}</strong>
              </span>
            )}
            {destWalkInfo && (
              <span>
                🏁 <strong>Chặng cuối:</strong> Xuống tại trạm <strong>{destWalkInfo.nearestStopName}</strong> rồi đi bộ{' '}
                {destWalkInfo.distanceMeters}m (~{destWalkInfo.walkMinutes} phút) tới <strong>{destWalkInfo.placeName}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="route-card-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="toggle-details-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
          >
            {showDetails ? (
              <>
                <ChevronUp size={16} />
                <span>Thu gọn danh sách trạm</span>
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                <span>Xem chi tiết lộ trình ({path.totalStops} trạm)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrintThisPath}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
            }}
            title="In phiếu hướng dẫn lộ trình này hoặc lưu thành PDF"
          >
            <Printer size={13} />
            <span>In lộ trình</span>
          </button>
        </div>

        {!isSelected && (
          <button
            type="button"
            className="select-graph-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            Trực quan hóa đồ thị
          </button>
        )}
      </div>

      {/* Expanded Stop List */}
      {showDetails && (
        <div className="route-card-expanded">
          <StopList path={path} onInspectStop={onInspectStop} />
        </div>
      )}
    </div>
  );
}

export default RouteCard;
