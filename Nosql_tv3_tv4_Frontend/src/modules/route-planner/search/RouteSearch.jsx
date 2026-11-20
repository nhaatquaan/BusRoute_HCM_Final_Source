import React from 'react';
import { ArrowLeftRight, Search, Loader2 } from 'lucide-react';
import { StopSelector } from './StopSelector.jsx';
import './search.css';

export function RouteSearch({
  fromStop,
  setFromStop,
  toStop,
  setToStop,
  onSwap,
  onSearch,
  loading = false,
  stops = [],
}) {
  const presets = [
    { label: 'Bến Thành ➔ BX Chợ Lớn (Tuyến 01)', from: 'TR_01', to: 'TR_08' },
    { label: 'Bến Thành ➔ ĐH Quốc Gia (Tuyến 19)', from: 'TR_01', to: 'TR_20' },
    { label: 'BX Chợ Lớn ➔ Sân bay TSN (Chuyển tuyến)', from: 'TR_08', to: 'TR_13' },
    { label: 'Bến Thành ➔ Thạnh Lộc (Tuyến 03)', from: 'TR_01', to: 'TR_25' },
  ];

  const handleApplyPreset = (p) => {
    setFromStop(p.from);
    setToStop(p.to);
  };

  const isReady = fromStop && toStop && fromStop !== toStop;

  return (
    <div className="route-search-card">
      <div className="search-header">
        <h3>Tìm đường đi bằng xe buýt</h3>
        <p>Chọn trạm xuất phát và trạm đích để tìm lộ trình tối ưu qua MongoDB Graph ($graphLookup)</p>
      </div>

      <div className="search-selectors-grid">
        <div className="search-field-wrapper">
          <StopSelector
            label="Trạm xuất phát"
            value={fromStop}
            onChange={setFromStop}
            stops={stops}
            placeholder="Chọn trạm xuất phát..."
            iconColor="#16a34a"
            disabled={loading}
          />
        </div>

        <button
          type="button"
          className="search-swap-btn"
          title="Hoán đổi điểm đi và điểm đến"
          onClick={onSwap}
          disabled={loading || (!fromStop && !toStop)}
        >
          <ArrowLeftRight size={18} />
        </button>

        <div className="search-field-wrapper">
          <StopSelector
            label="Trạm đích"
            value={toStop}
            onChange={setToStop}
            stops={stops}
            placeholder="Chọn trạm đích đến..."
            iconColor="#dc2626"
            disabled={loading}
          />
        </div>
      </div>

      <div className="search-actions">
        <div className="search-presets">
          <span className="preset-label">Gợi ý nhanh:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className="preset-chip"
              onClick={() => handleApplyPreset(p)}
              disabled={loading}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="search-submit-btn"
          onClick={onSearch}
          disabled={loading || !isReady}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="spinner" />
              <span>Đang tìm kiếm...</span>
            </>
          ) : (
            <>
              <Search size={18} />
              <span>Tìm lộ trình</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default RouteSearch;
