import React, { useState, useEffect } from 'react';
import { Bus, Clock, Milestone, ArrowRight, ChevronDown, ChevronUp, Eye, Heart } from 'lucide-react';
import { StopList } from './StopList.jsx';
import { formatDistance, formatDuration, formatCurrency } from '../utils/routeHelpers.js';
import { authService } from '../../../services/authService';
import { passengerService } from '../../../services/passengerService';

export function RouteCard({
  path,
  isSelected = false,
  onSelect,
}) {
  const [showDetails, setShowDetails] = useState(isSelected);
  const [favoriteRouteCodes, setFavoriteRouteCodes] = useState(new Set());
  const [favLoading, setFavLoading] = useState(false);

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
      </div>

      {/* Action footer */}
      <div className="route-card-footer">
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
          <StopList path={path} />
        </div>
      )}
    </div>
  );
}

export default RouteCard;
