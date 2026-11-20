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

  async getById(id) {
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
    const { data } = await apiClient.get(`/api/routes/${id}`);
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

  // Gán trạm hoặc cập nhật toàn bộ danh sách thứ tự trạm của tuyến
  async updateStopsOrder(routeId, orderedStopIds) {
    if (USE_MOCK) {
      await delay();
      const routes = mockStore.getRoutes();
      const updated = routes.map((r) =>
        r.id === routeId
          ? {
              ...r,
              stopIds: orderedStopIds,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : r
      );
      mockStore.saveRoutes(updated);
      return this.getById(routeId);
    }
    const { data } = await apiClient.put(`/api/routes/${routeId}/stops`, {
      stopIds: orderedStopIds,
    });
    return data;
  },
};
