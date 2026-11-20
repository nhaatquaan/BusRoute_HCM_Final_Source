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

  // Mô phỏng vị trí xe buýt đang tới trạm xuất phát (Live ETA Simulation)
  const primaryRouteCode = path?.routes?.[0] || '01';
  const startStopName = path?.stops?.[0]?.name || 'Trạm xuất phát';
  const secondStopName = path?.stops?.[1]?.name || 'Trạm kế tiếp';

  const initialBusSim = useMemo(() => {
    const seed = (primaryRouteCode.charCodeAt(0) || 1) + (path?.pathIndex || 1) * 3;
    const stopsAway = (seed % 3) + 1; // Cách 1 - 3 trạm
    const distanceKm = Number((stopsAway * 0.65).toFixed(1));
    const etaMinutes = Math.max(1, Math.round(distanceKm * 2.4));
    const plateNum = `51B-${140 + (seed % 70)}.${20 + (seed % 65)}`;
    return {
      busPlate: plateNum,
      stopsAway,
      distanceKm,
      etaMinutes,
      currentLocationDesc:
        stopsAway === 1
          ? `Vừa rời trạm trước, đang tiến thẳng về ${startStopName}`
          : `Đang trên đường tiến về ${startStopName} (hướng đi ${secondStopName})`,
    };
  }, [primaryRouteCode, path?.pathIndex, startStopName, secondStopName]);

  const [busSim, setBusSim] = useState(initialBusSim);

  useEffect(() => {
    setBusSim(initialBusSim);
  }, [initialBusSim]);

  // Cập nhật mô phỏng xe tiến lại gần trạm đón theo thời gian thực
  useEffect(() => {
    const timer = setInterval(() => {
      setBusSim((prev) => {
        if (prev.etaMinutes <= 0) {
          // Reset sang chuyến xe kế tiếp sau khi xe đã tới trạm
          return initialBusSim;
        }
        const nextDist = Math.max(0, Number((prev.distanceKm - 0.15).toFixed(2)));
        const nextEta = nextDist <= 0.1 ? 0 : Math.max(1, Math.round(nextDist * 2.4));
        const nextStopsAway = nextEta === 0 ? 0 : Math.max(1, Math.ceil(nextDist / 0.65));
        return {
          ...prev,
          distanceKm: Number(nextDist.toFixed(1)),
          etaMinutes: nextEta,
          stopsAway: nextStopsAway,
        };
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [initialBusSim]);

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

        {/* LIVE BUS SIMULATION & ETA BAR (Mô phỏng vị trí xe buýt đang tới trạm bắt đầu) */}
        <div
          style={{
            marginTop: '10px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: busSim.etaMinutes === 0 ? '#ecfdf5' : '#f0f9ff',
            border: busSim.etaMinutes === 0 ? '1px solid #6ee7b7' : '1px solid #bae6fd',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            fontSize: '0.78rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: busSim.etaMinutes === 0 ? '#059669' : '#0284c7',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}
            >
              <Radio size={12} />
              <span>LIVE MÔ PHỎNG</span>
            </span>
            <span>
              🚌 <strong>Tuyến {primaryRouteCode}</strong> (Xe <code style={{ fontWeight: 700 }}>{busSim.busPlate}</code>):{' '}
              {busSim.etaMinutes === 0 ? (
                <strong style={{ color: '#059669' }}>Xe đã cập bến tại {startStopName} — Sẵn sàng đón khách!</strong>
              ) : (
                <>
                  Đang cách trạm đón <strong>{startStopName}</strong> khoảng{' '}
                  <strong>
                    {busSim.stopsAway} trạm (~{busSim.distanceKm} km)
                  </strong>
                </>
              )}
            </span>
          </div>

          <div style={{ fontWeight: 800, color: busSim.etaMinutes === 0 ? '#059669' : '#0369a1' }}>
            {busSim.etaMinutes === 0 ? '🟢 Đang đón khách' : `⏱️ Dự kiến tới trạm sau ~${busSim.etaMinutes} phút`}
          </div>
        </div>

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
