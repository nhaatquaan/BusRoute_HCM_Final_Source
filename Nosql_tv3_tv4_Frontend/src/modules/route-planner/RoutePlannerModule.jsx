import React, { useState } from 'react';
import { Bus, Navigation, Network, Map, Search, Database, Layers } from 'lucide-react';
import { useRoutePlanner } from './hooks/useRoutePlanner.js';
import { RouteSearch } from './search/RouteSearch.jsx';
import { RouteResult } from './result/RouteResult.jsx';
import { RouteGraph } from './graph/RouteGraph.jsx';
import { CytoscapeGraph } from './graph/CytoscapeGraph.jsx';
import { RouteMap } from './map/RouteMap.jsx';
import { StopRoutesSearch } from './by-stop/StopRoutesSearch.jsx';
import './routePlanner.css';

export function RoutePlannerModule() {
  const {
    stopsList,
    loadingStops,
    stopsLoadError,
    loadStops,
    isMock,
    toggleMockMode,
    fromStop,
    setFromStop,
    toStop,
    setToStop,
    swapStops,
    searchRoute,
    paths,
    routeInfo,
    selectedPathIndex,
    setSelectedPathIndex,
    selectedPath,
    loading,
    error,
    activeTab,
    setActiveTab,
    byStopSelected,
    setByStopSelected,
    byStopResult,
    byStopLoading,
    byStopError,
    searchRoutesByStop,
  } = useRoutePlanner();

  const [showMap, setShowMap] = useState(true);
  const [showGraph, setShowGraph] = useState(true);

  return (
    <div className="route-planner-module">
      {/* Module Header */}
      <div className="module-header">
        <div className="module-branding">
          <div className="module-logo-icon">
            <Bus size={24} />
          </div>
          <div>
            <h2 className="module-title">Tra cứu lộ trình xe buýt</h2>
            <p className="module-subtitle">
              Tìm kiếm hành trình di chuyển tối ưu và trực quan hóa mạng lưới giao thông công cộng TP.HCM
            </p>
          </div>
        </div>

        <div className="module-status-tools">
          <button
            type="button"
            className={`status-pill ${isMock ? 'mock' : 'online'}`}
            onClick={() => toggleMockMode(!isMock)}
            title="Chuyển đổi giữa chế độ kết nối MongoDB trực tiếp và dữ liệu mẫu"
            style={{ cursor: 'pointer', border: '1px solid currentColor' }}
          >
            <Database size={13} />
            <span>{isMock ? 'Chế độ: Dữ liệu mẫu (Offline)' : 'Kết nối: MongoDB Live'}</span>
          </button>
        </div>
      </div>

      {/* Prominent Mock Disclaimer when in Mock Mode */}
      {isMock && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fde68a',
          color: '#92400e',
          padding: '8px 14px',
          borderRadius: '8px',
          fontSize: '0.8125rem',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <strong>LƯU Ý:</strong> Đang ở chế độ dữ liệu mẫu ngoại tuyến. Chuyển sang kết nối trực tiếp để truy vấn từ MongoDB.
          </div>
          <button
            type="button"
            onClick={() => toggleMockMode(false)}
            style={{
              background: '#92400e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            Kết nối API thật
          </button>
        </div>
      )}

      {/* Backend connection error warning for stops */}
      {stopsLoadError && !isMock && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.875rem',
          marginBottom: '16px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>Không thể kết nối đến máy chủ Backend</div>
          <div>{stopsLoadError}</div>
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={loadStops}
              style={{
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              Thử lại kết nối
            </button>
            <button
              type="button"
              onClick={() => toggleMockMode(true)}
              style={{
                background: '#f8fafc',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              Chuyển sang chế độ ngoại tuyến (Offline)
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="module-tabs-nav">
        <button
          type="button"
          className={`module-tab-btn ${activeTab === 'path-finder' ? 'active' : ''}`}
          onClick={() => setActiveTab('path-finder')}
        >
          <Navigation size={18} />
          <span>Tìm đường giữa hai trạm</span>
        </button>

        <button
          type="button"
          className={`module-tab-btn ${activeTab === 'by-stop' ? 'active' : ''}`}
          onClick={() => setActiveTab('by-stop')}
        >
          <Search size={18} />
          <span>Tra cứu tuyến qua một trạm</span>
        </button>

        <button
          type="button"
          className={`module-tab-btn ${activeTab === 'network-graph' ? 'active' : ''}`}
          onClick={() => setActiveTab('network-graph')}
        >
          <Layers size={18} />
          <span>Khám phá mạng lưới (Cytoscape.js)</span>
        </button>
      </div>

      {/* Tab 1: Path Finder */}
      {activeTab === 'path-finder' && (
        <div className="path-finder-section">
          {/* Search Box */}
          <RouteSearch
            fromStop={fromStop}
            setFromStop={setFromStop}
            toStop={toStop}
            setToStop={setToStop}
            onSwap={swapStops}
            onSearch={searchRoute}
            loading={loading}
            stops={stopsList}
          />

          {/* Results List */}
          <RouteResult
            routeInfo={routeInfo}
            paths={paths}
            selectedPathIndex={selectedPathIndex}
            onSelectPath={setSelectedPathIndex}
            error={error}
            loading={loading}
          />

          {/* Visualizations Toolbar (when a path exists) */}
          {selectedPath && (
            <div className="view-toggles-bar">
              <button
                type="button"
                className={`toggle-chip-btn ${showGraph ? 'active' : ''}`}
                onClick={() => setShowGraph(!showGraph)}
              >
                <Network size={14} />
                <span>{showGraph ? 'Ẩn đồ thị' : 'Hiện đồ thị Graph'}</span>
              </button>

              <button
                type="button"
                className={`toggle-chip-btn ${showMap ? 'active' : ''}`}
                onClick={() => setShowMap(!showMap)}
              >
                <Map size={14} />
                <span>{showMap ? 'Ẩn bản đồ' : 'Hiện bản đồ Leaflet'}</span>
              </button>
            </div>
          )}

          {/* Graph Visualization */}
          {showGraph && selectedPath && (
            <RouteGraph
              path={selectedPath}
              source={routeInfo?.source}
              traversalMode={routeInfo?.traversalMode}
              isMock={isMock}
            />
          )}

          {/* Leaflet Map Visualization */}
          {showMap && selectedPath && (
            <RouteMap path={selectedPath} />
          )}
        </div>
      )}

      {/* Tab 2: Search By Stop */}
      {activeTab === 'by-stop' && (
        <StopRoutesSearch
          selectedStop={byStopSelected}
          setSelectedStop={setByStopSelected}
          onSearch={searchRoutesByStop}
          result={byStopResult}
          loading={byStopLoading}
          error={byStopError}
          stops={stopsList}
        />
      )}

      {/* Tab 3: Cytoscape Network Graph Explorer */}
      {activeTab === 'network-graph' && (
        <CytoscapeGraph />
      )}
    </div>
  );
}

export default RoutePlannerModule;
