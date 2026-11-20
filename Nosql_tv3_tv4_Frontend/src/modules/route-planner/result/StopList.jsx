import React, { useState } from 'react';
import { MapPin, Navigation, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistance, formatDuration } from '../utils/routeHelpers.js';

export function StopList({ path, onInspectStop }) {
  const [expandedSegments, setExpandedSegments] = useState({});

  if (!path || !path.segments || path.segments.length === 0) {
    // Fallback simple list
    return (
      <div className="simple-stops-timeline">
        {path?.stops?.map((stop, i) => (
          <div key={stop.id || i} className="simple-stop-row">
            <span className="stop-step-num">{i + 1}</span>
            <span className="stop-step-name">{stop.name}</span>
          </div>
        ))}
      </div>
    );
  }

  const toggleSegment = (segIdx) => {
    setExpandedSegments((prev) => ({
      ...prev,
      [segIdx]: !prev[segIdx],
    }));
  };

  return (
    <div className="route-timeline-container">
      {path.segments.map((seg, sIdx) => {
        const isLastSegment = sIdx === path.segments.length - 1;
        const isExpanded = expandedSegments[sIdx] ?? true; // expanded by default

        return (
          <div key={sIdx} className="timeline-segment-block">
            {/* Segment Header */}
            <div
              className="segment-banner"
              style={{ borderLeftColor: seg.color || '#2563eb' }}
            >
              <div className="segment-badge" style={{ backgroundColor: seg.color || '#2563eb' }}>
                Tuyến {seg.routeCode}
              </div>
              <div className="segment-summary-text">
                <span className="segment-name">{seg.routeName}</span>
                <span className="segment-meta">
                  {seg.stopsCount} trạm • {formatDistance(seg.distance)} • {formatDuration(seg.duration)}
                </span>
              </div>
              <button
                type="button"
                className="segment-toggle-btn"
                onClick={() => toggleSegment(sIdx)}
                title={isExpanded ? 'Thu gọn trạm' : 'Mở rộng trạm'}
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {/* Stops list within segment */}
            {isExpanded && (
              <div className="segment-stops-list">
                {seg.intermediateStops.map((stop, stIdx) => {
                  const isFirstInSegment = stIdx === 0;
                  const isLastInSegment = stIdx === seg.intermediateStops.length - 1;
                  const isFirstOverall = sIdx === 0 && isFirstInSegment;
                  const isLastOverall = isLastSegment && isLastInSegment;
                  const isTransferPoint = isLastInSegment && !isLastOverall;

                  return (
                    <div
                      key={stop._id || stop.maTram || stIdx}
                      className={`timeline-stop-item ${
                        isFirstOverall
                          ? 'is-start'
                          : isLastOverall
                          ? 'is-end'
                          : isTransferPoint
                          ? 'is-transfer'
                          : 'is-intermediate'
                      }`}
                    >
                      <div className="timeline-node">
                        {isFirstOverall ? (
                          <div className="node-icon start-node">
                            <MapPin size={14} />
                          </div>
                        ) : isLastOverall ? (
                          <div className="node-icon end-node">
                            <MapPin size={14} />
                          </div>
                        ) : isTransferPoint ? (
                          <div className="node-icon transfer-node">
                            <Navigation size={12} />
                          </div>
                        ) : (
                          <div className="node-icon dot-node" />
                        )}
                        {!isLastOverall && <div className="node-line" />}
                      </div>

                      <div className="timeline-stop-content">
                        <div className="stop-name-row">
                          <span
                            className="timeline-stop-name"
                            onClick={() => onInspectStop && onInspectStop(stop)}
                            style={onInspectStop ? { cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#cbd5e1' } : undefined}
                            title="Bấm để xem bảng điện tử và các tuyến đi qua trạm này"
                          >
                            {stop.tenTram || stop.name}
                          </span>
                          <span className="timeline-stop-code">
                            {stop.maTram || stop.id || stop._key}
                          </span>
                        </div>
                        {(stop.diaChi || stop.address) && (
                          <div className="timeline-stop-address">
                            {stop.diaChi || stop.address}
                          </div>
                        )}
                        {isTransferPoint && (
                          <div className="transfer-hint-badge">
                            🔄 Xuống xe tại đây để chuyển sang tuyến kế tiếp
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default StopList;
