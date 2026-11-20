import React from 'react';
import { AlertCircle, ArrowRight, Info } from 'lucide-react';
import { RouteCard } from './RouteCard.jsx';
import './result.css';

export function RouteResult({
  routeInfo,
  paths = [],
  selectedPathIndex = 0,
  onSelectPath,
  error = null,
  loading = false,
}) {
  if (loading) {
    return (
      <div className="route-empty-state">
        <p>Đang tìm kiếm đường đi tối ưu qua mạng lưới xe buýt TP.HCM...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="route-error-banner">
        <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div className="error-title">Không thể tìm lộ trình</div>
          <div className="error-text">{error}</div>
        </div>
      </div>
    );
  }

  if (!routeInfo && paths.length === 0) {
    return null; // Initial state before searching
  }

  if (paths.length === 0) {
    return (
      <div className="route-empty-state">
        <Info size={24} style={{ margin: '0 auto 8px', color: '#64748b' }} />
        <p>Không tìm thấy lộ trình phù hợp giữa hai trạm đã chọn.</p>
        <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
          Gợi ý: Thử đổi điểm đi hoặc điểm đến, hoặc chọn các trạm trung chuyển lớn như Bến Thành, Hàng Xanh, Chợ Lớn.
        </span>
      </div>
    );
  }

  return (
    <div className="route-results-container">
      <div className="results-header-summary">
        <div className="summary-endpoints">
          <span className="endpoint-name">{routeInfo?.from?.name}</span>
          <ArrowRight size={16} className="endpoint-arrow" />
          <span className="endpoint-name">{routeInfo?.to?.name}</span>
        </div>
        <span className="summary-count-badge">
          Tìm thấy {paths.length} phương án
        </span>
      </div>

      {paths.map((path, idx) => (
        <RouteCard
          key={path.pathIndex || idx}
          path={path}
          isSelected={idx === selectedPathIndex}
          onSelect={() => onSelectPath(idx)}
        />
      ))}
    </div>
  );
}

export default RouteResult;
