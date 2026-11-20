import React, { useState } from 'react';
import { Network, Database, Info } from 'lucide-react';
import { formatDistance } from '../utils/routeHelpers.js';
import './graph.css';

export function RouteGraph({
  path,
  source = 'mongodb',
  traversalMode = 'edge_collection',
  isMock = false,
}) {
  const [activeNode, setActiveNode] = useState(null);

  if (!path || !path.stops || path.stops.length === 0) {
    return null;
  }

  const stops = path.stops;
  const edges = path.edges || [];

  // Identify transfer stops: stops where the routeCode changes
  const transferStopIds = new Set();
  edges.forEach((edge, idx) => {
    if (idx > 0 && edge.routeCode !== edges[idx - 1].routeCode) {
      // The start stop of this edge is the transfer point
      const transferVertexId = edge.from;
      transferStopIds.add(transferVertexId);
    }
  });

  // Calculate layout coordinates
  const nodeSpacing = 160;
  const startX = 70;
  const centerY = 110;
  const svgWidth = Math.max(720, startX * 2 + (stops.length - 1) * nodeSpacing);
  const svgHeight = 240;

  const nodePositions = stops.map((stop, i) => ({
    ...stop,
    x: startX + i * nodeSpacing,
    y: centerY,
    isStart: i === 0,
    isEnd: i === stops.length - 1,
    isTransfer: transferStopIds.has(stop._id) || (idxWithinSegments(stop, path.segments)),
  }));

  function idxWithinSegments(stop, segments = []) {
    if (!segments || segments.length <= 1) return false;
    for (let s = 0; s < segments.length - 1; s++) {
      const segTo = segments[s].toStop;
      if (segTo && (segTo._id === stop._id || segTo.maTram === stop.id)) {
        return true;
      }
    }
    return false;
  }

  const activeStopObj = activeNode
    ? nodePositions.find((n) => n.id === activeNode || n._id === activeNode)
    : null;

  let sourceLabel = 'Nguồn: MongoDB Edge Collection (KE_TIEP / $graphLookup)';
  if (isMock || source === 'mock_fallback' || source === 'client_mock') {
    sourceLabel = 'Nguồn: Dữ liệu mô phỏng ngoại tuyến';
  } else if (traversalMode === 'named_graph' || traversalMode === 'graph_lookup') {
    sourceLabel = "Nguồn: MongoDB Graph ('BusRouteGraph' / $graphLookup)";
  } else if (traversalMode === 'edge_collection') {
    sourceLabel = "Nguồn: MongoDB Edge Collection ('KE_TIEP')";
  }

  return (
    <div className="route-graph-container">
      <div className="graph-header">
        <div className="graph-title-group">
          <h4>
            <Network size={20} color="#2563eb" />
            <span>Trực quan hóa Đồ thị Lộ trình (Graph Traversal)</span>
          </h4>
          <p>
            Đồ thị biểu diễn các đỉnh trạm dừng (Vertex) và quan hệ di chuyển (KE_TIEP Edge)
          </p>
        </div>

        <div className={`graph-source-badge ${isMock ? 'mock' : 'arango'}`}>
          <Database size={13} style={{ display: 'inline', marginRight: 4 }} />
          {sourceLabel}
        </div>
      </div>

      <div className="graph-viewport-wrapper">
        <svg
          className="graph-svg"
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        >
          <defs>
            {/* Arrow marker for edges */}
            <marker
              id="graph-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb" />
            </marker>
            <marker
              id="graph-arrow-transfer"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#d97706" />
            </marker>
          </defs>

          {/* Render Directed Edges */}
          {nodePositions.slice(0, -1).map((node, i) => {
            const nextNode = nodePositions[i + 1];
            const edge = edges[i] || {};
            const rCode = edge.routeCode || path.routes?.[0] || null;
            const isUnknownRoute = !rCode || rCode === 'CHUA_XAC_DINH';
            const detail = rCode ? path.routeDetails?.find((d) => d.maTuyen === rCode) : null;
            const edgeColor = isUnknownRoute ? '#64748b' : (detail?.mauSac || '#2563eb');
            const routeText = isUnknownRoute ? 'Chưa rõ tuyến' : `Tuyến ${rCode}`;

            const midX = (node.x + nextNode.x) / 2;
            const midY = centerY;

            return (
              <g key={`edge-${i}`}>
                {/* Edge line */}
                <line
                  x1={node.x + 22}
                  y1={centerY}
                  x2={nextNode.x - 24}
                  y2={centerY}
                  stroke={edgeColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  markerEnd="url(#graph-arrow)"
                />

                {/* Edge route pill */}
                <rect
                  x={midX - 36}
                  y={midY - 26}
                  width="72"
                  height="20"
                  rx="10"
                  fill="#ffffff"
                  stroke={edgeColor}
                  strokeWidth="1.5"
                />
                <text
                  x={midX}
                  y={midY - 12}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="bold"
                  fill={edgeColor}
                >
                  {routeText}
                </text>

                {/* Edge distance text below */}
                {edge.distance && (
                  <text
                    x={midX}
                    y={midY + 18}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#64748b"
                  >
                    {formatDistance(edge.distance)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Render Nodes (Stops) */}
          {nodePositions.map((node, i) => {
            let fillColor = '#3b82f6';
            let strokeColor = '#1d4ed8';
            let haloColor = 'rgba(59, 130, 246, 0.15)';
            let roleText = `Trạm ${i + 1}`;

            if (node.isStart) {
              fillColor = '#16a34a';
              strokeColor = '#15803d';
              haloColor = 'rgba(22, 163, 74, 0.25)';
              roleText = 'Xuất phát';
            } else if (node.isEnd) {
              fillColor = '#dc2626';
              strokeColor = '#b91c1c';
              haloColor = 'rgba(220, 38, 38, 0.25)';
              roleText = 'Đích đến';
            } else if (node.isTransfer) {
              fillColor = '#d97706';
              strokeColor = '#b45309';
              haloColor = 'rgba(217, 119, 6, 0.25)';
              roleText = 'Chuyển tuyến';
            }

            const isSelected = activeNode === node.id || activeNode === node._id;

            return (
              <g
                key={`node-${node.id || i}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveNode(isSelected ? null : (node.id || node._id))}
              >
                {/* Halo / Glow effect */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? 26 : 22}
                  fill={haloColor}
                />

                {/* Main Node Circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="18"
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth="2.5"
                />

                {/* Node Order Number */}
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {i + 1}
                </text>

                {/* Role text above */}
                <text
                  x={node.x}
                  y={node.y - 32}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill={fillColor}
                >
                  {roleText}
                </text>

                {/* Stop Name label below */}
                <text
                  x={node.x}
                  y={node.y + 36}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="#1e293b"
                >
                  {node.name?.length > 18 ? `${node.name.slice(0, 16)}...` : node.name}
                </text>

                {/* Stop ID label */}
                <text
                  x={node.x}
                  y={node.y + 50}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill="#64748b"
                  fontFamily="monospace"
                >
                  {node.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="graph-legend">
        <div className="legend-item">
          <span className="legend-dot start" />
          <span>Trạm xuất phát</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot transfer" />
          <span>Trạm chuyển tuyến</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot intermediate" />
          <span>Trạm trung gian</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot end" />
          <span>Trạm đích đến</span>
        </div>
        <div className="legend-item">
          <span className="legend-line" />
          <span>Cạnh KE_TIEP (Quan hệ di chuyển)</span>
        </div>
      </div>

      {/* Active node details card */}
      {activeStopObj && (
        <div className="graph-node-details">
          <div>
            <span className="node-details-title">
              {activeStopObj.name} ({activeStopObj.id})
            </span>
            {activeStopObj.address && (
              <span className="node-details-sub"> — {activeStopObj.address}</span>
            )}
          </div>
          <button
            type="button"
            className="stop-search-clear"
            onClick={() => setActiveNode(null)}
          >
            Đóng
          </button>
        </div>
      )}
    </div>
  );
}

export default RouteGraph;
