import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, Search, Loader2, Sparkles, MapPin, Zap, Shuffle, Footprints, Milestone, Home, Briefcase, GraduationCap } from 'lucide-react';
import { StopSelector } from './StopSelector.jsx';
import { authService } from '../../../services/authService';
import { passengerService } from '../../../services/passengerService';
import './search.css';

export function RouteSearch({
  fromStop,
  setFromStop,
  toStop,
  setToStop,
  criteria = 'least_transfers',
  setCriteria,
  onSwap,
  onSearch,
  loading = false,
  stops = [],
}) {
  const [savedPlaces, setSavedPlaces] = useState([]);

  useEffect(() => {
    if (authService.isAuthenticated()) {
      passengerService
        .getSavedPlaces()
        .then((places) => {
          if (Array.isArray(places)) {
            setSavedPlaces(places.filter((p) => p.nearestStopId));
          }
        })
        .catch(() => {});
    }
  }, []);

  const presets = [
    { label: 'Bến Thành ➔ BX Chợ Lớn (Tuyến 01)', from: 'TR_01', to: 'TR_08' },
    { label: 'Bến Thành ➔ ĐH Quốc Gia (Tuyến 19)', from: 'TR_01', to: 'TR_20' },
    { label: 'BX Chợ Lớn ➔ Sân bay TSN (Chuyển tuyến)', from: 'TR_08', to: 'TR_13' },
    { label: 'Bến Thành ➔ Thạnh Lộc (Tuyến 03)', from: 'TR_01', to: 'TR_25' },
  ];

  const criteriaOptions = [
    { id: 'least_transfers', label: 'Ít chuyển tuyến nhất', icon: Shuffle, desc: 'Ưu tiên tuyến trực tiếp hoặc chuyển 1 lần' },
    { id: 'fastest', label: 'Nhanh nhất', icon: Zap, desc: 'Ưu tiên tổng thời gian di chuyển ngắn nhất' },
    { id: 'fewest_stops', label: 'Ít trạm dừng nhất', icon: Milestone, desc: 'Ưu tiên số trạm dừng trung gian ít nhất' },
  ];

  const handleApplyPreset = (p) => {
    setFromStop(p.from);
    setToStop(p.to);
  };

  const getPlaceIcon = (iconName) => {
    switch (iconName) {
      case 'home':
        return <Home size={13} />;
      case 'briefcase':
        return <Briefcase size={13} />;
      case 'school':
        return <GraduationCap size={13} />;
      default:
        return <MapPin size={13} />;
    }
  };

  const isReady = fromStop && toStop && fromStop !== toStop;

  return (
    <div className="route-search-card">
      <div className="search-header">
        <h3>Tìm đường đi bằng xe buýt TP.HCM</h3>
        <p>Thuật toán đồ thị MongoDB $graphLookup tìm kiếm lộ trình tối ưu và đa tiêu chí</p>
      </div>

      {/* Selectors Grid */}
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

      {/* Criteria Selection Bar */}
      <div style={{ marginTop: '14px', marginBottom: '14px' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} style={{ color: '#2563eb' }} />
          <span>Tiêu chí tối ưu lộ trình:</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
          {criteriaOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = criteria === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCriteria && setCriteria(opt.id)}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  color: isSelected ? '#1d4ed8' : '#475569',
                  fontWeight: isSelected ? 600 : 500,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease-in-out',
                }}
                title={opt.desc}
              >
                <Icon size={16} style={{ color: isSelected ? '#2563eb' : '#64748b', shrink: 0 }} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Saved Places Quick Chips (if Passenger logged in) */}
      {savedPlaces.length > 0 && (
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Địa điểm của tôi:</span>
          {savedPlaces.map((place) => (
            <div
              key={place._id || place.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#f1f5f9',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '0.75rem',
                border: '1px solid #e2e8f0',
              }}
            >
              <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center' }}>{getPlaceIcon(place.icon)}</span>
              <span style={{ fontWeight: 500, color: '#1e293b' }}>{place.name}:</span>
              <button
                type="button"
                onClick={() => setFromStop(place.nearestStopId)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#16a34a',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: '0 2px',
                  textDecoration: 'underline',
                }}
                title={`Đặt ${place.name} làm Điểm đi`}
              >
                Đi
              </button>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <button
                type="button"
                onClick={() => setToStop(place.nearestStopId)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: '0 2px',
                  textDecoration: 'underline',
                }}
                title={`Đặt ${place.name} làm Điểm đến`}
              >
                Đến
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action Presets and Submit */}
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
