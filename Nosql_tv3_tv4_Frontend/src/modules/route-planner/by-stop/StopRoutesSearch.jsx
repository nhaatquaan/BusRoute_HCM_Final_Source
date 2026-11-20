import React from 'react';
import { Bus, Search, Loader2, AlertCircle, Clock, Tag } from 'lucide-react';
import { StopSelector } from '../search/StopSelector.jsx';
import { formatCurrency } from '../utils/routeHelpers.js';
import './byStop.css';

export function StopRoutesSearch({
  selectedStop,
  setSelectedStop,
  onSearch,
  result,
  loading = false,
  error = null,
  stops = [],
}) {
  const handleSelect = (stopId) => {
    setSelectedStop(stopId);
    if (stopId) {
      onSearch(stopId);
    }
  };

  return (
    <div className="by-stop-container">
      <div className="by-stop-search-card">
        <div className="by-stop-header">
          <h3>Tra cứu tuyến xe buýt đi qua một trạm</h3>
          <p>
            Chọn trạm dừng để truy vấn quan hệ CO_TRAM trong MongoDB và hiển thị danh sách các tuyến xe kết nối
          </p>
        </div>

        <div className="by-stop-controls">
          <div className="by-stop-selector-flex">
            <StopSelector
              label="Chọn trạm cần tra cứu"
              value={selectedStop}
              onChange={handleSelect}
              stops={stops}
              placeholder="Chọn hoặc gõ tên trạm dừng..."
              iconColor="#2563eb"
              disabled={loading}
            />
          </div>

          <button
            type="button"
            className="by-stop-submit-btn"
            onClick={() => onSearch(selectedStop)}
            disabled={loading || !selectedStop}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Đang tra cứu...</span>
              </>
            ) : (
              <>
                <Search size={18} />
                <span>Tra cứu tuyến</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="route-error-banner">
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>{error}</div>
        </div>
      )}

      {result && result.routes && (
        <div className="by-stop-result-card">
          <div className="by-stop-info-header">
            <div>
              <div className="by-stop-station-name">{result.stop?.name}</div>
              {result.stop?.address && (
                <div className="by-stop-station-address">{result.stop.address}</div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: result.isMock ? '#fef3c7' : '#dbeafe',
                  color: result.isMock ? '#92400e' : '#1e40af',
                  border: `1px solid ${result.isMock ? '#fde68a' : '#bfdbfe'}`,
                }}
              >
                {result.isMock
                  ? 'Nguồn: Dữ liệu mẫu (Offline)'
                  : 'Nguồn: MongoDB (Quan hệ CO_TRAM)'}
              </span>
              <span className="summary-count-badge">
                Có {result.totalRoutes} tuyến đi qua
              </span>
            </div>
          </div>

          {result.routes.length === 0 ? (
            <div className="route-empty-state">
              Hiện tại chưa có tuyến xe buýt nào đi qua trạm này trong cơ sở dữ liệu.
            </div>
          ) : (
            <div className="by-stop-routes-grid">
              {result.routes.map((route, i) => (
                <div key={route.maTuyen || i} className="by-stop-route-item">
                  <div className="route-item-top">
                    <span
                      className="route-number-pill"
                      style={{ backgroundColor: route.mauSac || '#2563eb' }}
                    >
                      Tuyến {route.maTuyen}
                    </span>
                    <span className="route-item-title">{route.tenTuyen}</span>
                  </div>

                  <div className="route-item-meta">
                    <div className="route-meta-tag">
                      <Tag size={12} />
                      <span>
                        Thứ tự: Trạm thứ {route.orderAtStop || 1} trên lộ trình (
                        {route.direction === 've' ? 'Chiều về' : 'Chiều đi'})
                      </span>
                    </div>
                    {route.thoiGianHoatDong && (
                      <div className="route-meta-tag">
                        <Clock size={12} />
                        <span>Giờ hoạt động: {route.thoiGianHoatDong}</span>
                      </div>
                    )}
                    {route.gianCachChuyen && (
                      <div>Giãn cách chuyến: {route.gianCachChuyen}</div>
                    )}
                    <div>
                      {route.giaVe !== null && route.giaVe !== undefined
                        ? `Giá vé: ${formatCurrency(route.giaVe)}`
                        : 'Giá vé: Đang cập nhật biểu phí'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StopRoutesSearch;
