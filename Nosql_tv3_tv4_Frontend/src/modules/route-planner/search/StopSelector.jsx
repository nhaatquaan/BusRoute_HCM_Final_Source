import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, X, ChevronDown } from 'lucide-react';
import { removeVietnameseTones } from '../utils/routeHelpers.js';

export function StopSelector({
  label,
  value,
  onChange,
  stops = [],
  placeholder = 'Chọn trạm dừng...',
  iconColor = '#2563eb',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selectedStop = stops.find(
    (s) => s.maTram === value || s._key === value || s._id === value
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStops = stops.filter((stop) => {
    if (!searchQuery) return true;
    const q = removeVietnameseTones(searchQuery);
    const nameMatch = removeVietnameseTones(stop.tenTram || '').includes(q);
    const codeMatch = removeVietnameseTones(stop.maTram || stop._key || '').includes(q);
    const addressMatch = removeVietnameseTones(stop.diaChi || '').includes(q);
    return nameMatch || codeMatch || addressMatch;
  });

  const handleSelect = (stopId) => {
    onChange(stopId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div className="stop-selector-group" ref={wrapperRef}>
      {label && <label className="stop-selector-label">{label}</label>}

      <div
        className={`stop-selector-input-box ${isOpen ? 'is-focused' : ''} ${disabled ? 'is-disabled' : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }}
      >
        <MapPin size={18} className="stop-selector-icon" style={{ color: iconColor }} />

        <div className="stop-selector-display">
          {selectedStop ? (
            <div className="stop-selected-info">
              <span className="stop-selected-name">{selectedStop.tenTram}</span>
              {selectedStop.khuVuc && (
                <span className="stop-selected-sub">({selectedStop.khuVuc})</span>
              )}
            </div>
          ) : (
            <span className="stop-placeholder">{placeholder}</span>
          )}
        </div>

        {selectedStop && !disabled && (
          <button
            type="button"
            className="stop-clear-btn"
            title="Xóa lựa chọn"
            onClick={handleClear}
          >
            <X size={14} />
          </button>
        )}

        <ChevronDown size={16} className={`stop-chevron ${isOpen ? 'rotated' : ''}`} />
      </div>

      {isOpen && (
        <div className="stop-dropdown-menu">
          <div className="stop-dropdown-search">
            <Search size={14} className="search-icon" />
            <input
              ref={inputRef}
              type="text"
              className="stop-search-input"
              placeholder="Gõ tên trạm, đường hoặc mã..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <button
                type="button"
                className="stop-search-clear"
                onClick={() => setSearchQuery('')}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="stop-options-list">
            {filteredStops.length === 0 ? (
              <div className="stop-no-options">Không tìm thấy trạm phù hợp</div>
            ) : (
              filteredStops.map((stop) => {
                const stopId = stop.maTram || stop._key;
                const isSelected = selectedStop && (selectedStop.maTram === stopId || selectedStop._key === stopId);
                return (
                  <div
                    key={stop._id || stopId}
                    className={`stop-option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(stopId)}
                  >
                    <div className="stop-option-header">
                      <span className="stop-option-name">{stop.tenTram}</span>
                      <span className="stop-option-code">{stop.maTram || stop._key}</span>
                    </div>
                    {stop.diaChi && (
                      <div className="stop-option-address">{stop.diaChi}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default StopSelector;
