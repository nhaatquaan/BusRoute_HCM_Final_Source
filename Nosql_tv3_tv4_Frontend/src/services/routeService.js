import apiClient, { normalizeId } from './apiClient';
import { USE_MOCK } from './config';
import { delay, mockStore } from './mockData';

export const routeService = {
  async getAll() {
    if (USE_MOCK) {
      await delay();
      return mockStore.getRoutes();
    }
    const { data } = await apiClient.get('/api/routes');
    const list = Array.isArray(data) ? data : data.data || [];
    return list.map(normalizeId);
  },

  async getById(id, direction = null) {
    if (USE_MOCK) {
      await delay();
      const routes = mockStore.getRoutes();
      const stops = mockStore.getStops();
      const route = routes.find((r) => r.id === id);
      if (!route) throw new Error('Không tìm thấy tuyến xe.');

      const orderedStops = (route.stopIds || [])
        .map((sid, index) => {
          const stop = stops.find((s) => s.id === sid);
          return stop ? { ...stop, order: index + 1 } : null;
        })
        .filter(Boolean);

      return { ...route, stops: orderedStops };
    }
    const endpoint = direction
      ? `/api/routes/${id}/stops?ma_chieu=${direction}`
      : `/api/routes/${id}`;
    const { data } = await apiClient.get(endpoint);
    return normalizeId(data.data || data);
  },

  async create(payload) {
    if (USE_MOCK) {
      await delay();
      const routes = mockStore.getRoutes();
      const code = payload.code.trim();
      if (routes.some((r) => r.code.toLowerCase() === code.toLowerCase())) {
        throw new Error(`Mã tuyến "${code}" đã tồn tại.`);
      }
      const newRoute = {
        ...payload,
        id: `TX_${code}_${Date.now().toString().slice(-4)}`,
        code,
        ticketPrice: Number(payload.ticketPrice) || 5000,
        stopIds: [],
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      mockStore.saveRoutes([newRoute, ...routes]);
      return newRoute;
    }
    const { data } = await apiClient.post('/api/routes', payload);
    return normalizeId(data.data || data);
  },

  async update(id, payload) {
    if (USE_MOCK) {
      await delay();
      const routes = mockStore.getRoutes();
      const updated = routes.map((r) =>
        r.id === id
          ? {
              ...r,
              ...payload,
              ticketPrice: Number(payload.ticketPrice) || r.ticketPrice,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : r
      );
      mockStore.saveRoutes(updated);
      return updated.find((r) => r.id === id);
    }
    const { data } = await apiClient.put(`/api/routes/${id}`, payload);
    return normalizeId(data.data || data);
  },

  async remove(id) {
    if (USE_MOCK) {
      await delay();
      const routes = mockStore.getRoutes().filter((r) => r.id !== id);
      mockStore.saveRoutes(routes);
      return { success: true };
    }
    const { data } = await apiClient.delete(`/api/routes/${id}`);
    return data;
  },

  // Gán trạm hoặc cập nhật toàn bộ danh sách thứ tự trạm của tuyến theo chiều di chuyển
  async updateStopsOrder(routeId, stopsOrIds, direction = 'luot_di') {
    const isArrayOfObjects = Array.isArray(stopsOrIds) && typeof stopsOrIds[0] === 'object';
    const stopIds = isArrayOfObjects ? stopsOrIds.map((s) => s.id || s._id || s.code) : stopsOrIds;
    const stopsPayload = isArrayOfObjects
      ? stopsOrIds.map((s, idx) => ({
          id: s.id || s._id || s.code,
          khoang_cach_km: Number(s.khoang_cach_km || s.distance || (idx === 0 ? 0 : 1.5)),
          thoi_gian_di_chuyen_phut: Number(s.thoi_gian_di_chuyen_phut || s.duration || (idx === 0 ? 0 : 5)),
        }))
      : stopIds.map((sid, idx) => ({
          id: sid,
          khoang_cach_km: idx === 0 ? 0 : 1.5,
          thoi_gian_di_chuyen_phut: idx === 0 ? 0 : 5,
        }));

    if (USE_MOCK) {
      await delay();
      const routes = mockStore.getRoutes();
      const updated = routes.map((r) =>
        r.id === routeId
          ? {
              ...r,
              stopIds,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : r
      );
      mockStore.saveRoutes(updated);
      return this.getById(routeId, direction);
    }
    const { data } = await apiClient.put(`/api/routes/${routeId}/stops`, {
      ma_chieu: direction,
      stops: stopsPayload,
      stopIds,
    });
    return data;
  },
};
