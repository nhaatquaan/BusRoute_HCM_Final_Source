import { useState, useEffect, useCallback } from 'react';
import routePlannerService from '../services/routePlannerService.js';
import { authService } from '../../../services/authService';
import { passengerService } from '../../../services/passengerService';

export function useRoutePlanner({
  defaultCriteria = 'least_transfers',
  initialFrom = '',
  initialTo = '',
  autoSearchTrigger = 0,
} = {}) {
  const [stopsList, setStopsList] = useState([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [stopsLoadError, setStopsLoadError] = useState(null);

  // Path finder state
  const [fromStop, setFromStop] = useState(initialFrom);
  const [toStop, setToStop] = useState(initialTo);
  const [criteria, setCriteria] = useState(defaultCriteria); // 'least_transfers' | 'fastest' | 'fewest_stops'
  const [paths, setPaths] = useState([]);
  const [selectedPathIndex, setSelectedPathIndex] = useState(0);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMock, setIsMock] = useState(routePlannerService.isMockMode());
  const [activeTab, setActiveTab] = useState('path-finder'); // 'path-finder' | 'by-stop'

  // By-stop search state
  const [byStopSelected, setByStopSelected] = useState('');
  const [byStopResult, setByStopResult] = useState(null);
  const [byStopLoading, setByStopLoading] = useState(false);
  const [byStopError, setByStopError] = useState(null);

  // Load stops function
  const loadStops = useCallback(async () => {
    setLoadingStops(true);
    setStopsLoadError(null);
    try {
      const res = await routePlannerService.getStops();
      if (res?.data) {
        setStopsList(res.data);
        setIsMock(Boolean(res.isMock));
      }
    } catch (err) {
      console.error('Failed to load stops:', err);
      setStopsLoadError(err.message || 'Không thể kết nối Backend để tải danh sách trạm.');
    } finally {
      setLoadingStops(false);
    }
  }, []);

  // Load stops on mount
  useEffect(() => {
    loadStops();
  }, [loadStops]);

  // Toggle mock mode explicitly
  const toggleMockMode = useCallback((enable) => {
    routePlannerService.setMockMode(enable);
    setIsMock(enable);
    loadStops();
  }, [loadStops]);

  // Swap from and to stops
  const swapStops = useCallback(() => {
    setFromStop(toStop);
    setToStop(fromStop);
    setError(null);
  }, [fromStop, toStop]);

  // Execute Route Planning
  const searchRoute = useCallback(async (overrideFrom, overrideTo, overrideCriteria) => {
    const targetFrom = typeof overrideFrom === 'string' && overrideFrom ? overrideFrom : fromStop;
    const targetTo = typeof overrideTo === 'string' && overrideTo ? overrideTo : toStop;
    const targetCriteria = typeof overrideCriteria === 'string' && overrideCriteria ? overrideCriteria : criteria;

    if (!targetFrom || !targetTo) {
      setError('Vui lòng chọn cả trạm xuất phát và trạm đích.');
      return;
    }
    if (targetFrom === targetTo) {
      setError('Trạm xuất phát và trạm đích không được trùng nhau.');
      return;
    }

    setLoading(true);
    setError(null);
    setPaths([]);
    setSelectedPathIndex(0);

    try {
      const data = await routePlannerService.planRoute(targetFrom, targetTo, { criteria: targetCriteria });
      setRouteInfo(data);
      setPaths(data.paths || []);
      setIsMock(Boolean(data.isMock));

      if (!data.paths || data.paths.length === 0) {
        setError(data.message || 'Không tìm thấy lộ trình phù hợp giữa hai trạm này.');
      } else {
        // Ghi nhận lịch sử tìm kiếm: Nếu đã đăng nhập thì lưu lên MongoDB, nếu là Guest thì lưu LocalStorage (tối đa 5 lượt)
        const primaryPath = data.paths[0];
        const searchPayload = {
          fromStopId: targetFrom,
          toStopId: targetTo,
          fromStopName: data.from?.name || targetFrom,
          toStopName: data.to?.name || targetTo,
          criteria: targetCriteria,
          summaryResult: {
            pathsCount: data.paths.length,
            transfers: primaryPath?.transfers,
            durationMinutes: primaryPath?.totalDuration,
            primaryRoute: primaryPath?.routes?.[0] || null,
          },
        };

        if (authService.isAuthenticated()) {
          passengerService.recordSearch(searchPayload);
        } else {
          passengerService.saveGuestLocalSearch(searchPayload);
        }
      }
    } catch (err) {
      setError(err.message || 'Đã có lỗi xảy ra khi tra cứu lộ trình.');
      setPaths([]);
    } finally {
      setLoading(false);
    }
  }, [fromStop, toStop, criteria]);

  // Đồng bộ defaultCriteria và autoSearch từ bên ngoài (ví dụ Cổng Hành khách)
  useEffect(() => {
    if (defaultCriteria) {
      setCriteria(defaultCriteria);
    }
  }, [defaultCriteria]);

  useEffect(() => {
    if (initialFrom && initialTo && autoSearchTrigger > 0) {
      setActiveTab('path-finder');
      setFromStop(initialFrom);
      setToStop(initialTo);
      searchRoute(initialFrom, initialTo, criteria);
    }
  }, [initialFrom, initialTo, autoSearchTrigger]);

  // Execute Search By Stop
  const searchRoutesByStop = useCallback(async (stopId) => {
    const id = stopId || byStopSelected;
    if (!id) {
      setByStopError('Vui lòng chọn trạm cần tra cứu.');
      return;
    }

    setByStopLoading(true);
    setByStopError(null);
    setByStopResult(null);

    try {
      const data = await routePlannerService.searchByStop(id);
      setByStopResult(data);
    } catch (err) {
      setByStopError(err.message || 'Lỗi khi tra cứu tuyến xe qua trạm.');
    } finally {
      setByStopLoading(false);
    }
  }, [byStopSelected]);

  const resetSearch = useCallback(() => {
    setFromStop('');
    setToStop('');
    setPaths([]);
    setRouteInfo(null);
    setError(null);
    setSelectedPathIndex(0);
  }, []);

  const selectedPath = paths[selectedPathIndex] || null;

  return {
    // Stops
    stopsList,
    loadingStops,
    stopsLoadError,
    loadStops,

    // Mock Mode
    isMock,
    toggleMockMode,

    // Path finder
    fromStop,
    setFromStop,
    toStop,
    setToStop,
    criteria,
    setCriteria,
    swapStops,
    searchRoute,
    resetSearch,
    paths,
    routeInfo,
    selectedPathIndex,
    setSelectedPathIndex,
    selectedPath,
    loading,
    error,

    // Tabs
    activeTab,
    setActiveTab,

    // By Stop
    byStopSelected,
    setByStopSelected,
    byStopResult,
    byStopLoading,
    byStopError,
    searchRoutesByStop,
  };
}
