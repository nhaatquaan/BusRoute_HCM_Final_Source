import { tramDungData, tuyenXeData, coTramData, keTiepData } from './mockClientData.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
// Check environment variable: default is FALSE (real backend), only true if explicitly configured
const ENV_USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || import.meta.env.VITE_USE_MOCK === true;

class RoutePlannerClientService {
  constructor() {
    this.useMock = ENV_USE_MOCK;
  }

  setMockMode(enable) {
    this.useMock = Boolean(enable);
  }

  isMockMode() {
    return this.useMock;
  }

  /**
   * Fetch all stops
   */
  async getStops(query = '') {
    if (!this.useMock) {
      try {
        const url = `${API_BASE}/api/stops${query ? `?q=${encodeURIComponent(query)}` : ''}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) {
          throw new Error(`Máy chủ Backend trả về lỗi HTTP ${res.status}`);
        }
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const source = json.source || 'mongodb';
          const isMock = source === 'mock_fallback' || source === 'client_mock';
          return { data: json.data, source, isMock };
        }
        throw new Error(json.error?.message || 'Định dạng dữ liệu trạm không hợp lệ');
      } catch (err) {
        console.error('[RoutePlannerService] Lỗi kết nối Backend /api/stops:', err.message);
        throw new Error(
          `Không thể kết nối đến Backend API (/api/stops): ${err.message}. ` +
          `Vui lòng kiểm tra dịch vụ Backend hoặc kích hoạt VITE_USE_MOCK=true để chạy ngoại tuyến.`
        );
      }
    }

    // Explicit Mock Mode only (VITE_USE_MOCK=true)
    let stops = [...tramDungData];
    if (query) {
      const q = query.toLowerCase().trim();
      stops = stops.filter(
        (s) =>
          (s.tenTram && s.tenTram.toLowerCase().includes(q)) ||
          (s.maTram && s.maTram.toLowerCase().includes(q)) ||
          (s.diaChi && s.diaChi.toLowerCase().includes(q))
      );
    }
    return { data: stops, source: 'client_mock', isMock: true };
  }

  /**
   * Plan paths between two stops
   * GET /api/path?from=...&to=...
   */
  async planRoute(fromId, toId, options = {}) {
    if (!this.useMock) {
      let res;
      try {
        const params = new URLSearchParams({
          from: fromId,
          to: toId,
        });
        if (options.maxDepth) params.append('maxDepth', options.maxDepth);
        if (options.limit) params.append('limit', options.limit);

        const url = `${API_BASE}/api/path?${params.toString()}`;
        res = await fetch(url, { headers: { Accept: 'application/json' } });
      } catch (networkErr) {
        console.error('[RoutePlannerService] Mất kết nối tới máy chủ Backend:', networkErr.message);
        throw new Error(
          `Không thể kết nối đến máy chủ Backend (/api/path). ` +
          `Vui lòng đảm bảo server Backend đang chạy (cổng 3000), hoặc bật VITE_USE_MOCK=true để chạy thử nghiệm độc lập.`
        );
      }

      let json;
      try {
        json = await res.json();
      } catch (parseErr) {
        throw new Error(`Phản hồi từ máy chủ không phải JSON hợp lệ (HTTP ${res.status})`);
      }

      if (res.ok && json.success) {
        const source = json.source || 'mongodb';
        const isMock = source === 'mock_fallback' || source === 'client_mock';
        return {
          ...json.data,
          source,
          traversalMode: json.traversalMode || 'edge_collection',
          isMock,
          message: json.message,
        };
      } else {
        const msg = json.error?.message || json.message || `Lỗi máy chủ (${res.status})`;
        const error = new Error(msg);
        error.code = json.error?.code || res.status;
        throw error;
      }
    }

    // Client-side mock calculation ONLY when explicitly enabled
    return this._mockPlanRoute(fromId, toId, options);
  }

  /**
   * Search routes passing through a stop
   * GET /api/search/by-stop/:id
   */
  async searchByStop(stopId) {
    if (!this.useMock) {
      let res;
      try {
        const url = `${API_BASE}/api/search/by-stop/${encodeURIComponent(stopId)}`;
        res = await fetch(url, { headers: { Accept: 'application/json' } });
      } catch (networkErr) {
        console.error('[RoutePlannerService] Mất kết nối tới máy chủ Backend:', networkErr.message);
        throw new Error(
          `Không thể kết nối đến máy chủ Backend (/api/search/by-stop/:id). ` +
          `Vui lòng kiểm tra máy chủ Backend hoặc bật VITE_USE_MOCK=true.`
        );
      }

      let json;
      try {
        json = await res.json();
      } catch (parseErr) {
        throw new Error(`Phản hồi từ máy chủ không phải JSON hợp lệ (HTTP ${res.status})`);
      }

      if (res.ok && json.success) {
        const source = json.source || 'mongodb';
        const isMock = source === 'mock_fallback' || source === 'client_mock';
        return {
          ...json.data,
          source,
          isMock,
        };
      } else {
        const msg = json.error?.message || json.message || `Lỗi máy chủ (${res.status})`;
        const error = new Error(msg);
        error.code = json.error?.code || res.status;
        throw error;
      }
    }

    // Explicit Mock Mode only
    return this._mockSearchByStop(stopId);
  }

  // Explicit Mock generators for standalone demo testing
  _mockPlanRoute(fromId, toId, options = {}) {
    const fromStop = tramDungData.find((s) => s.maTram === fromId || s._id === fromId || s._key === fromId);
    const toStop = tramDungData.find((s) => s.maTram === toId || s._id === toId || s._key === toId);

    if (!fromStop || !toStop) {
      const error = new Error('Trạm không tồn tại trong dữ liệu mẫu.');
      error.code = 404;
      throw error;
    }

    const startId = fromStop._id;
    const targetId = toStop._id;
    const stopMap = new Map(tramDungData.map((s) => [s._id, s]));

    const candidateLimit = 25;
    const limit = options.limit || 5;

    const queue = [
      {
        currentId: startId,
        vertices: [fromStop],
        edges: [],
        visited: new Set([startId]),
        currentRoute: null,
        transfers: 0,
        cost: 0,
      },
    ];

    const pathsFound = [];
    const seenSignatures = new Set();

    while (queue.length > 0 && pathsFound.length < candidateLimit * 2) {
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift();

      if (current.currentId === targetId && current.edges.length > 0) {
        // DEDUPLICATION: Check BOTH stop sequence AND route sequence
        const stopSeq = current.vertices.map((v) => v._id).join('->');
        const routeSeq = current.edges.map((e) => e.maTuyen || e.tuyenId || e.ma_tuyen || e.routeCode || '?').join('->');
        const pathSig = `${stopSeq}|${routeSeq}`;

        if (!seenSignatures.has(pathSig)) {
          seenSignatures.add(pathSig);
          pathsFound.push({
            vertices: current.vertices,
            edges: current.edges,
            transfers: current.transfers,
          });
        }
        if (pathsFound.length >= candidateLimit) break;
        continue;
      }

      if (current.vertices.length > (options.maxDepth || 15)) continue;

      const outbound = keTiepData.filter((e) => e._from === current.currentId);
      for (const edge of outbound) {
        if (!current.visited.has(edge._to)) {
          const nextStop = stopMap.get(edge._to);
          if (nextStop) {
            const isTransfer = current.currentRoute !== null && current.currentRoute !== edge.maTuyen;
            const newTransfers = current.transfers + (isTransfer ? 1 : 0);
            if (newTransfers > 2) continue;

            const nextVisited = new Set(current.visited);
            nextVisited.add(edge._to);

            queue.push({
              currentId: edge._to,
              vertices: [...current.vertices, nextStop],
              edges: [...current.edges, edge],
              visited: nextVisited,
              currentRoute: edge.maTuyen,
              transfers: newTransfers,
              cost: current.vertices.length + 1 + newTransfers * 4,
            });
          }
        }
      }
    }

    const routeMap = new Map(tuyenXeData.map((r) => [r.maTuyen, r]));

    const formattedPaths = pathsFound.map((rawPath, idx) => {
      const vertices = rawPath.vertices;
      const edges = rawPath.edges;
      let totalDistance = 0;
      let totalDuration = 0;
      let transfers = 0;
      let hasUnidentifiedRoute = false;
      const usedRouteKeys = [];
      const segments = [];
      let currentSeg = null;

      edges.forEach((edge, i) => {
        totalDistance += edge.khoangCach || 0;
        totalDuration += edge.thoiGian || 0;
        const code = edge.maTuyen;

        if (!code) {
          hasUnidentifiedRoute = true;
        }

        const routeCode = code || 'CHUA_XAC_DINH';

        if (!currentSeg || currentSeg.routeCode !== routeCode) {
          if (currentSeg) {
            transfers += 1;
            segments.push(currentSeg);
          }
          if (code && !usedRouteKeys.includes(code)) usedRouteKeys.push(code);
          const rInfo = routeMap.get(code) || null;
          currentSeg = {
            segmentIndex: segments.length + 1,
            routeCode,
            routeName: rInfo ? rInfo.tenTuyen : (code ? `Tuyến ${code}` : 'Tuyến chưa xác định'),
            color: rInfo?.mauSac || '#2563eb',
            fare: rInfo?.giaVe ?? null,
            fromStop: vertices[i],
            toStop: vertices[i + 1],
            stopsCount: 1,
            distance: edge.khoangCach || 0,
            duration: edge.thoiGian || 0,
            intermediateStops: [vertices[i], vertices[i + 1]],
          };
        } else {
          currentSeg.stopsCount += 1;
          currentSeg.distance += edge.khoangCach || 0;
          currentSeg.duration += edge.thoiGian || 0;
          currentSeg.toStop = vertices[i + 1];
          currentSeg.intermediateStops.push(vertices[i + 1]);
        }
      });
      if (currentSeg) segments.push(currentSeg);

      return {
        pathIndex: idx + 1,
        totalStops: vertices.length,
        transfers: hasUnidentifiedRoute ? null : transfers,
        hasUnidentifiedRoute,
        totalDistance,
        totalDuration,
        routes: usedRouteKeys,
        routeDetails: usedRouteKeys.map((c) => {
          const r = routeMap.get(c);
          return {
            maTuyen: c,
            tenTuyen: r ? r.tenTuyen : `Tuyến ${c}`,
            mauSac: r?.mauSac || '#2563eb',
            giaVe: r?.giaVe ?? null,
            loaiTuyen: r?.loaiTuyen || 'Chưa cập nhật',
          };
        }),
        segments,
        stops: vertices.map((v, i) => ({
          order: i + 1,
          id: v.maTram || v._key,
          _id: v._id,
          name: v.tenTram,
          address: v.diaChi,
          latitude: v.latitude,
          longitude: v.longitude,
        })),
        edges,
      };
    });

    formattedPaths.sort((a, b) => {
      if (a.transfers !== null && b.transfers !== null) {
        if (a.transfers !== b.transfers) return a.transfers - b.transfers;
      }
      if (a.totalStops !== b.totalStops) return a.totalStops - b.totalStops;
      return a.totalDuration - b.totalDuration;
    });

    const finalPaths = formattedPaths.slice(0, limit);
    finalPaths.forEach((p, idx) => {
      p.pathIndex = idx + 1;
    });

    return {
      source: 'client_mock',
      traversalMode: 'mock_engine',
      isMock: true,
      from: {
        id: fromStop.maTram,
        _id: fromStop._id,
        name: fromStop.tenTram,
        address: fromStop.diaChi,
        latitude: fromStop.latitude,
        longitude: fromStop.longitude,
      },
      to: {
        id: toStop.maTram,
        _id: toStop._id,
        name: toStop.tenTram,
        address: toStop.diaChi,
        latitude: toStop.latitude,
        longitude: toStop.longitude,
      },
      paths: finalPaths,
    };
  }

  _mockSearchByStop(stopId) {
    const stop = tramDungData.find((s) => s.maTram === stopId || s._id === stopId || s._key === stopId);
    if (!stop) {
      const error = new Error(`Trạm dừng không tồn tại: ${stopId}`);
      error.code = 404;
      throw error;
    }

    const matches = coTramData.filter((r) => r._to === stop._id || r._from === stop._id);
    const routes = matches.map((m) => {
      const routeId = m._from.startsWith('TuyenXe/') ? m._from : m._to;
      const found = tuyenXeData.find((r) => r._id === routeId) || { maTuyen: routeId.replace('TuyenXe/', '') };
      return {
        maTuyen: found.maTuyen,
        tenTuyen: found.tenTuyen,
        loaiTuyen: found.loaiTuyen,
        giaVe: found.giaVe ?? null,
        thoiGianHoatDong: found.thoiGianHoatDong,
        gianCachChuyen: found.gianCachChuyen,
        mauSac: found.mauSac,
        cuLy: found.cuLy,
        orderAtStop: m.thuTu,
        direction: m.chieuDi || 'di',
      };
    });

    return {
      source: 'client_mock',
      isMock: true,
      stop: {
        id: stop.maTram,
        _id: stop._id,
        name: stop.tenTram,
        address: stop.diaChi,
        latitude: stop.latitude,
        longitude: stop.longitude,
      },
      totalRoutes: routes.length,
      routes,
    };
  }

  /**
   * Fetch graph elements for Cytoscape.js visualization
   */
  async getGraphData(options = {}) {
    const { route, limit = 50 } = options;
    if (!this.useMock) {
      try {
        const params = new URLSearchParams();
        if (route) params.append('route', route);
        if (limit) params.append('limit', String(limit));
        const url = `${API_BASE}/api/graph${params.toString() ? `?${params.toString()}` : ''}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) {
          throw new Error(`Máy chủ Backend trả về lỗi HTTP ${res.status}`);
        }
        const json = await res.json();
        if (json.success && json.data) {
          const source = json.source || 'mongodb';
          const isMock = source === 'mock_fallback' || source === 'client_mock';
          return { data: json.data, source, isMock };
        }
        throw new Error(json.error?.message || 'Định dạng dữ liệu đồ thị không hợp lệ');
      } catch (err) {
        console.error('[RoutePlannerService] Lỗi kết nối Backend /api/graph:', err.message);
        throw new Error(
          `Không thể kết nối đến Backend API (/api/graph): ${err.message}. ` +
          `Vui lòng kiểm tra dịch vụ Backend hoặc kích hoạt VITE_USE_MOCK=true để chạy ngoại tuyến.`
        );
      }
    }

    return {
      data: this._mockGetGraphData(options),
      source: 'client_mock',
      isMock: true,
    };
  }

  _mockGetGraphData(options = {}) {
    const { route, limit = 50 } = options;
    let routes = tuyenXeData;
    if (route) {
      routes = routes.filter((r) => r.maTuyen === route || r._key === route);
    }
    const routeIds = new Set(routes.map((r) => r._id));

    const coTram = coTramData.filter((e) => routeIds.has(e._from) || routeIds.has(e._to));
    const stopIds = new Set();
    coTram.forEach((e) => {
      if (e._from.startsWith('TramDung/')) stopIds.add(e._from);
      if (e._to.startsWith('TramDung/')) stopIds.add(e._to);
    });

    const stops = tramDungData.filter((s) => stopIds.size === 0 || stopIds.has(s._id)).slice(0, limit);
    const validStopIds = new Set(stops.map((s) => s._id));

    let keTiep = keTiepData.filter((e) => validStopIds.has(e._from) && validStopIds.has(e._to));
    if (route) {
      keTiep = keTiep.filter((e) => e.maTuyen === route);
    }

    const nodes = [];
    const edges = [];
    const nodeSet = new Set();

    stops.forEach((s) => {
      if (!nodeSet.has(s._id)) {
        nodeSet.add(s._id);
        nodes.push({
          data: {
            id: s._id,
            label: s.tenTram || s.maTram,
            type: 'stop',
            maTram: s.maTram || s._key,
            tenTram: s.tenTram,
            address: s.diaChi || '',
            latitude: s.latitude,
            longitude: s.longitude,
          },
        });
      }
    });

    routes.forEach((r) => {
      if (!nodeSet.has(r._id)) {
        nodeSet.add(r._id);
        nodes.push({
          data: {
            id: r._id,
            label: `Tuyến ${r.maTuyen}`,
            type: 'route',
            maTuyen: r.maTuyen,
            tenTuyen: r.tenTuyen,
            color: r.mauSac || '#2563eb',
            giaVe: r.giaVe,
          },
        });
      }
    });

    coTram.forEach((e, idx) => {
      if (nodeSet.has(e._from) && nodeSet.has(e._to)) {
        edges.push({
          data: {
            id: e._id || `co_tram_${idx}`,
            source: e._from,
            target: e._to,
            type: 'CO_TRAM',
            label: 'CO_TRAM',
            thuTu: e.thuTu,
            chieuDi: e.chieuDi || 'di',
          },
        });
      }
    });

    keTiep.forEach((e, idx) => {
      if (nodeSet.has(e._from) && nodeSet.has(e._to)) {
        edges.push({
          data: {
            id: e._id || `ke_tiep_${idx}`,
            source: e._from,
            target: e._to,
            type: 'KE_TIEP',
            label: e.maTuyen ? `T${e.maTuyen}` : 'KE_TIEP',
            routeCode: e.maTuyen,
            distance: e.khoangCach,
            duration: e.thoiGian,
          },
        });
      }
    });

    return {
      elements: { nodes, edges },
      stats: {
        stopsCount: nodes.filter((n) => n.data.type === 'stop').length,
        routesCount: nodes.filter((n) => n.data.type === 'route').length,
        edgesCount: edges.length,
      },
    };
  }
}

export const routePlannerService = new RoutePlannerClientService();
export default routePlannerService;
