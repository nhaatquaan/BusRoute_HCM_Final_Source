import React, { useState } from 'react';
import { Bus, Navigation, Network, Map, Search, Database, Layers, Scale, BarChart3 } from 'lucide-react';
import { useRoutePlanner } from './hooks/useRoutePlanner.js';
import { RouteSearch } from './search/RouteSearch.jsx';
import { RouteResult } from './result/RouteResult.jsx';
import { RouteGraph } from './graph/RouteGraph.jsx';
import { CytoscapeGraph } from './graph/CytoscapeGraph.jsx';
import { RouteMap } from './map/RouteMap.jsx';
import { StopRoutesSearch } from './by-stop/StopRoutesSearch.jsx';
import { RouteComparison } from './compare/RouteComparison.jsx';
import { StopDetailModal } from './by-stop/StopDetailModal.jsx';
import { findNearestStopsFromCoords } from './utils/routeHelpers.js';
import NetworkAnalyticsPage from '../admin/analytics/NetworkAnalyticsPage.jsx';
import './routePlanner.css';

export function RoutePlannerModule({
  defaultCriteria = 'least_transfers',
  initialFrom = '',
  initialTo = '',
  autoSearchTrigger = 0,
} = {}) {
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
    criteria,
    setCriteria,
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
  } = useRoutePlanner({
    defaultCriteria,
    initialFrom,
    initialTo,
    autoSearchTrigger,
  });

  const [showMap, setShowMap] = useState(true);
  const [showGraph, setShowGraph] = useState(true);
  const [originWalkInfo, setOriginWalkInfo] = useState(null);
  const [destWalkInfo, setDestWalkInfo] = useState(null);
  const [inspectingStop, setInspectingStop] = useState(null);

  const handleOpenStopDetail = (stopObj) => {
    if (!stopObj) return;
    const stopId = stopObj.maTram || stopObj.ma_tram || stopObj.code || stopObj.id || stopObj._key;
    const fullStop =
      stopsList.find(
        (s) =>
          s.maTram === stopId ||
          s.ma_tram === stopId ||
          s.code === stopId ||
          s.id === stopId ||
          s._key === stopId
      ) || stopObj;
    setInspectingStop(fullStop);
  };

  // Khi người dùng click trực tiếp một điểm trên Bản đồ làm Điểm đi hoặc Điểm đến (giống Google Maps)
  const handleMapPinSelection = (pinData, isOrigin = true) => {
    const nearestList = findNearestStopsFromCoords(pinData.lat, pinData.lng, stopsList, 2);
    if (nearestList.length === 0) return;
    const best = nearestList[0];
    const walkInfo = {
      placeName: pinData.name,
      placeAddress: pinData.address,
      lat: pinData.lat,
      lng: pinData.lng,
      nearestStopId: best.stopId,
      nearestStopName: best.stopName,
      distanceMeters: best.distanceMeters,
      walkMinutes: best.walkMinutes,
      alternativeStop: nearestList[1] || null,
    };

    if (isOrigin) {
      setFromStop(best.stopId);
      setOriginWalkInfo(walkInfo);
      if (toStop && toStop !== best.stopId) {
        searchRoute(best.stopId, toStop, criteria);
      }
    } else {
      setToStop(best.stopId);
      setDestWalkInfo(walkInfo);
      if (fromStop && fromStop !== best.stopId) {
        searchRoute(fromStop, best.stopId, criteria);
      }
    }
  };

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
          <span>Tìm tuyến theo trạm dừng</span>
        </button>

        <button
          type="button"
          className={`module-tab-btn ${activeTab === 'compare-routes' ? 'active' : ''}`}
          onClick={() => setActiveTab('compare-routes')}
        >
          <Scale size={18} />
          <span>So sánh hai tuyến</span>
        </button>

        <button
          type="button"
          className={`module-tab-btn ${activeTab === 'network-graph' ? 'active' : ''}`}
          onClick={() => setActiveTab('network-graph')}
        >
          <Layers size={18} />
          <span>Khám phá mạng lưới (Graph)</span>
        </button>

        <button
          type="button"
          className={`module-tab-btn ${activeTab === 'mongo-stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('mongo-stats')}
        >
          <BarChart3 size={18} />
          <span>Dashboard thống kê MongoDB</span>
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
            criteria={criteria}
            setCriteria={setCriteria}
            onSwap={swapStops}
            onSearch={searchRoute}
            loading={loading}
            stops={stopsList}
            originWalkInfo={originWalkInfo}
            setOriginWalkInfo={setOriginWalkInfo}
            destWalkInfo={destWalkInfo}
            setDestWalkInfo={setDestWalkInfo}
          />

          {/* Results List */}
          <RouteResult
            routeInfo={routeInfo}
            paths={paths}
            selectedPathIndex={selectedPathIndex}
            onSelectPath={setSelectedPathIndex}
            error={error}
            loading={loading}
            originWalkInfo={originWalkInfo}
            destWalkInfo={destWalkInfo}
            onInspectStop={handleOpenStopDetail}
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

          {/* Leaflet Map Visualization - LUÔN MỞ SẴN GIỐNG GOOGLE MAPS ĐỂ XEM XE BUÝT CHẠY TRỰC TIẾP */}
          {showMap && (
            <RouteMap
              path={selectedPath}
              allStops={stopsList}
              originWalkInfo={originWalkInfo}
              destWalkInfo={destWalkInfo}
              onInspectStop={handleOpenStopDetail}
              onPinSelectAsOrigin={(pin) => handleMapPinSelection(pin, true)}
              onPinSelectAsDestination={(pin) => handleMapPinSelection(pin, false)}
            />
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
          onInspectStop={handleOpenStopDetail}
        />
      )}

      {/* Tab 3: Compare Two Routes */}
      {activeTab === 'compare-routes' && (
        <RouteComparison onInspectStop={handleOpenStopDetail} />
      )}

      {/* Tab 4: Cytoscape Network Graph Explorer */}
      {activeTab === 'network-graph' && (
        <CytoscapeGraph />
      )}

      {/* Tab 5: MongoDB Analytics Dashboard */}
      {activeTab === 'mongo-stats' && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          <NetworkAnalyticsPage />
        </div>
      )}

      {/* Modal: Trang Chi Tiết Trạm Dừng & Bảng Điện Tử Dự Báo Xe Tới */}
      <StopDetailModal
        isOpen={Boolean(inspectingStop)}
        onClose={() => setInspectingStop(null)}
        stop={inspectingStop}
        onSetAsOrigin={(stopId) => {
          setActiveTab('path-finder');
          setFromStop(stopId);
        }}
        onSetAsDestination={(stopId) => {
          setActiveTab('path-finder');
          setToStop(stopId);
        }}
      />
    </div>
  );
}

export default RoutePlannerModule;
