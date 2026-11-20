import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Database,
  Layers,
  Info,
  MapPin,
  Bus,
  ArrowRight,
} from 'lucide-react';
import { routePlannerService } from '../services/routePlannerService.js';
import './cytoscapeGraph.css';

export function CytoscapeGraph() {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedElement, setSelectedElement] = useState(null);
  const [graphMeta, setGraphMeta] = useState({
    source: 'mongodb',
    isMock: false,
    stats: { stopsCount: 0, routesCount: 0, edgesCount: 0 },
  });

  const loadGraphData = useCallback(async (routeFilter = '') => {
    setLoading(true);
    setError(null);
    try {
      const res = await routePlannerService.getGraphData({
        route: routeFilter || undefined,
        limit: 80,
      });

      setGraphMeta({
        source: res.source,
        isMock: res.isMock,
        stats: res.data?.stats || { stopsCount: 0, routesCount: 0, edgesCount: 0 },
      });

      if (!containerRef.current) return;

      const rawElements = res.data?.elements || { nodes: [], edges: [] };

      // Clean up previous cy instance if exists
      if (cyRef.current) {
        cyRef.current.destroy();
      }

      // Initialize Cytoscape
      const cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...rawElements.nodes.map((n) => ({
            group: 'nodes',
            data: n.data,
          })),
          ...rawElements.edges.map((e) => ({
            group: 'edges',
            data: e.data,
          })),
        ],
        style: [
          // Base Node Style
          {
            selector: 'node',
            style: {
              'label': 'data(label)',
              'text-valign': 'bottom',
              'text-margin-y': 6,
              'font-size': '11px',
              'font-family': 'system-ui, sans-serif',
              'color': '#1e293b',
              'text-background-opacity': 0.8,
              'text-background-color': '#ffffff',
              'text-background-padding': '3px',
              'text-background-shape': 'roundrectangle',
              'border-width': 2,
              'transition-property': 'background-color, line-color, target-arrow-color',
              'transition-duration': '0.2s',
            },
          },
          // Stop Node (TramDung)
          {
            selector: 'node[type = "stop"]',
            style: {
              'shape': 'ellipse',
              'width': 28,
              'height': 28,
              'background-color': '#16866B',
              'border-color': '#126b55',
            },
          },
          // Bus Route Node (TuyenXe)
          {
            selector: 'node[type = "route"]',
            style: {
              'shape': 'roundrectangle',
              'width': 44,
              'height': 32,
              'background-color': '#172B4D',
              'border-color': '#245A85',
              'color': '#ffffff',
              'font-weight': 'bold',
            },
          },
          // Selected Node
          {
            selector: 'node:selected',
            style: {
              'border-width': 4,
              'border-color': '#D9534F',
              'shadow-blur': 12,
              'shadow-color': 'rgba(217, 83, 79, 0.4)',
              'shadow-opacity': 0.8,
            },
          },
          // Base Edge Style
          {
            selector: 'edge',
            style: {
              'width': 2,
              'curve-style': 'bezier',
              'target-arrow-shape': 'triangle',
              'arrow-scale': 1.1,
              'font-size': '9px',
              'color': '#64748b',
              'text-background-opacity': 0.7,
              'text-background-color': '#ffffff',
              'text-background-padding': '2px',
            },
          },
          // KE_TIEP Edge (Bus Hop between stops)
          {
            selector: 'edge[type = "KE_TIEP"]',
            style: {
              'line-color': '#16866B',
              'target-arrow-color': '#16866B',
              'label': 'data(label)',
              'width': 2.5,
            },
          },
          // CO_TRAM Edge (Bus Route to Stop relationship)
          {
            selector: 'edge[type = "CO_TRAM"]',
            style: {
              'line-color': '#245A85',
              'target-arrow-color': '#245A85',
              'line-style': 'dashed',
              'width': 1.5,
              'label': 'CO_TRAM',
            },
          },
          // Selected Edge
          {
            selector: 'edge:selected',
            style: {
              'width': 4,
              'line-color': '#ef4444',
              'target-arrow-color': '#ef4444',
            },
          },
        ],
        layout: {
          name: 'cose',
          animate: false,
          padding: 30,
          nodeRepulsion: 6500,
          idealEdgeLength: 80,
          edgeElasticity: 100,
          gravity: 0.25,
          numIter: 800,
        },
      });

      // Node and Edge click events
      cy.on('tap', 'node', (evt) => {
        const node = evt.target;
        setSelectedElement({
          kind: 'node',
          ...node.data(),
        });
      });

      cy.on('tap', 'edge', (evt) => {
        const edge = evt.target;
        setSelectedElement({
          kind: 'edge',
          ...edge.data(),
        });
      });

      cy.on('tap', (evt) => {
        if (evt.target === cy) {
          setSelectedElement(null);
        }
      });

      cyRef.current = cy;
    } catch (err) {
      console.error('[CytoscapeGraph] Error loading graph:', err);
      setError(err.message || 'Không thể tải đồ thị MongoDB.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraphData(selectedRoute);

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [loadGraphData, selectedRoute]);

  // Controller Actions
  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.25);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(30);
    }
  };

  const handleResetLayout = () => {
    if (cyRef.current) {
      cyRef.current
        .layout({
          name: 'cose',
          animate: true,
          padding: 30,
          animationDuration: 500,
        })
        .run();
    }
  };

  return (
    <div className="cytoscape-graph-container">
      {/* Header & Controls */}
      <div className="cy-header">
        <div className="cy-header-title">
          <div>
            <h4>
              <Layers size={20} color="#2563eb" />
              <span>Trực quan hóa Toàn mạng lưới Graph (Cytoscape.js)</span>
            </h4>
            <p className="cy-header-subtitle">
              Hiển thị quan hệ giữa Tuyến xe (TuyenXe), Trạm dừng (TramDung), CO_TRAM và KE_TIEP
            </p>
          </div>
        </div>

        <div className="cy-controls">
          {/* Filter by Route */}
          <select
            className="cy-filter-select"
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
          >
            <option value="">-- Toàn bộ tuyến xe --</option>
            <option value="01">Tuyến 01: Bến Thành - BX Chợ Lớn</option>
            <option value="03">Tuyến 03: Bến Thành - Thạnh Lộc</option>
            <option value="04">Tuyến 04: Bến Thành - BX An Sương</option>
            <option value="08">Tuyến 08: BX Quận 8 - ĐHQG</option>
            <option value="19">Tuyến 19: Bến Thành - ĐHQG</option>
            <option value="152">Tuyến 152: KDC Trung Sơn - Sân bay TSN</option>
          </select>

          {/* Zoom & Fit buttons */}
          <button className="cy-btn" onClick={handleZoomIn} title="Phóng to">
            <ZoomIn size={15} /> Phóng to
          </button>
          <button className="cy-btn" onClick={handleZoomOut} title="Thu nhỏ">
            <ZoomOut size={15} /> Thu nhỏ
          </button>
          <button className="cy-btn" onClick={handleFit} title="Căn vừa khung nhìn">
            <Maximize2 size={15} /> Vừa khung
          </button>
          <button className="cy-btn" onClick={handleResetLayout} title="Sắp xếp lại bố cục">
            <RotateCcw size={15} /> Đặt lại
          </button>

          {/* Data Source Badge */}
          <div className={`cy-badge ${graphMeta.isMock ? 'mock' : 'arango'}`}>
            <Database size={13} />
            {graphMeta.isMock
              ? 'Nguồn: Mock Engine'
              : 'Nguồn: MongoDB (BusRouteGraph)'}
          </div>
        </div>
      </div>

      {/* Main Graph Layout */}
      <div className="cy-main-layout">
        {/* Canvas / Viewport */}
        <div className="cy-viewport" ref={containerRef}>
          {loading && (
            <div className="cy-loading">
              <div className="cy-spinner" />
              <span>Đang tải đồ thị mạng lưới xe buýt...</span>
            </div>
          )}
          {error && (
            <div className="cy-loading" style={{ color: '#ef4444' }}>
              <Info size={32} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Sidebar Inspector & Legend */}
        <div className="cy-sidebar">
          <div>
            <div className="cy-sidebar-title">
              <Info size={16} color="#2563eb" />
              <span>Thông tin đối tượng</span>
            </div>

            {selectedElement ? (
              <div className="cy-node-card">
                <div className="cy-node-header">
                  <strong>{selectedElement.label || selectedElement.id}</strong>
                  <span
                    className={`cy-node-type-pill ${
                      selectedElement.type === 'route' ? 'route' : 'stop'
                    }`}
                  >
                    {selectedElement.type || selectedElement.kind}
                  </span>
                </div>

                {selectedElement.type === 'stop' && (
                  <>
                    <div className="cy-node-info-row">
                      <span className="cy-node-info-label">Mã trạm:</span>
                      <span className="cy-node-info-val">{selectedElement.maTram}</span>
                    </div>
                    {selectedElement.address && (
                      <div className="cy-node-info-row">
                        <span className="cy-node-info-label">Địa chỉ:</span>
                        <span className="cy-node-info-val">{selectedElement.address}</span>
                      </div>
                    )}
                    {selectedElement.latitude && selectedElement.longitude && (
                      <div className="cy-node-info-row">
                        <span className="cy-node-info-label">Tọa độ:</span>
                        <span className="cy-node-info-val">
                          {selectedElement.latitude}, {selectedElement.longitude}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {selectedElement.type === 'route' && (
                  <>
                    <div className="cy-node-info-row">
                      <span className="cy-node-info-label">Mã tuyến:</span>
                      <span className="cy-node-info-val">{selectedElement.maTuyen}</span>
                    </div>
                    <div className="cy-node-info-row">
                      <span className="cy-node-info-label">Tên tuyến:</span>
                      <span className="cy-node-info-val">{selectedElement.tenTuyen}</span>
                    </div>
                    {selectedElement.giaVe && (
                      <div className="cy-node-info-row">
                        <span className="cy-node-info-label">Giá vé:</span>
                        <span className="cy-node-info-val">
                          {selectedElement.giaVe.toLocaleString()} đ
                        </span>
                      </div>
                    )}
                  </>
                )}

                {selectedElement.type === 'KE_TIEP' && (
                  <>
                    <div className="cy-node-info-row">
                      <span className="cy-node-info-label">Quan hệ:</span>
                      <span className="cy-node-info-val">KE_TIEP (Kế tiếp)</span>
                    </div>
                    {selectedElement.routeCode && (
                      <div className="cy-node-info-row">
                        <span className="cy-node-info-label">Tuyến xe:</span>
                        <span className="cy-node-info-val">{selectedElement.routeCode}</span>
                      </div>
                    )}
                    {selectedElement.distance && (
                      <div className="cy-node-info-row">
                        <span className="cy-node-info-label">Cự ly:</span>
                        <span className="cy-node-info-val">{selectedElement.distance} m</span>
                      </div>
                    )}
                  </>
                )}

                {selectedElement.type === 'CO_TRAM' && (
                  <>
                    <div className="cy-node-info-row">
                      <span className="cy-node-info-label">Quan hệ:</span>
                      <span className="cy-node-info-val">CO_TRAM (Tuyến có trạm)</span>
                    </div>
                    {selectedElement.thuTu && (
                      <div className="cy-node-info-row">
                        <span className="cy-node-info-label">Thứ tự trạm:</span>
                        <span className="cy-node-info-val">{selectedElement.thuTu}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="cy-empty-selection">
                Nhấp vào một đỉnh (Node) hoặc cạnh (Edge) trên canvas để xem thông tin chi tiết.
              </div>
            )}
          </div>

          {/* Network Stats */}
          <div className="cy-stats-bar">
            <span>
              <strong>{graphMeta.stats.stopsCount}</strong> Trạm
            </span>
            <span>•</span>
            <span>
              <strong>{graphMeta.stats.routesCount}</strong> Tuyến
            </span>
            <span>•</span>
            <span>
              <strong>{graphMeta.stats.edgesCount}</strong> Cung quan hệ
            </span>
          </div>

          {/* Legend */}
          <div className="cy-legend">
            <div className="cy-sidebar-title" style={{ fontSize: '0.85rem' }}>
              <span>Chú thích Đồ thị (Legend)</span>
            </div>

            <div className="cy-legend-item">
              <span className="cy-legend-icon stop-node" />
              <span>Đỉnh Trạm dừng (TramDung Vertex)</span>
            </div>

            <div className="cy-legend-item">
              <span className="cy-legend-icon route-node" />
              <span>Đỉnh Tuyến xe (TuyenXe Vertex)</span>
            </div>

            <div className="cy-legend-item">
              <span className="cy-legend-line ke-tiep" />
              <span>Cạnh KE_TIEP (Quan hệ di chuyển giữa 2 trạm)</span>
            </div>

            <div className="cy-legend-item">
              <span className="cy-legend-line co-tram" />
              <span>Cạnh CO_TRAM (Tuyến xe sở hữu trạm)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
