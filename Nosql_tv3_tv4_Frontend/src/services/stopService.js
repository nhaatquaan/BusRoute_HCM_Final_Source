import apiClient, { normalizeId } from './apiClient';
import { USE_MOCK } from './config';
import { delay, mockStore } from './mockData';

export const stopService = {
  async getAll() {
    if (USE_MOCK) {
      await delay();
      return mockStore.getStops();
    }
    const { data } = await apiClient.get('/api/stops');
    const list = Array.isArray(data) ? data : data.data || [];
    return list.map(normalizeId);
  },

  async create(payload) {
    if (USE_MOCK) {
      await delay();
      const stops = mockStore.getStops();
      const code = payload.code.trim().toUpperCase();
      if (stops.some((s) => s.code.toUpperCase() === code)) {
        throw new Error(`Mã trạm "${code}" đã tồn tại.`);
      }
      const newStop = {
        ...payload,
        id: code,
        code,
        lat: Number(payload.lat) || 0,
        lng: Number(payload.lng) || 0,
      };
      mockStore.saveStops([newStop, ...stops]);
      return newStop;
    }
    const { data } = await apiClient.post('/api/stops', payload);
    return normalizeId(data.data || data);
  },

  async update(id, payload) {
    if (USE_MOCK) {
      await delay();
      const stops = mockStore.getStops();
      const updated = stops.map((s) =>
        s.id === id
          ? {
              ...s,
              ...payload,
              lat: Number(payload.lat) || 0,
              lng: Number(payload.lng) || 0,
            }
          : s
      );
      mockStore.saveStops(updated);
      return updated.find((s) => s.id === id);
    }
    const { data } = await apiClient.put(`/api/stops/${id}`, payload);
    return normalizeId(data.data || data);
  },

  async remove(id) {
    if (USE_MOCK) {
      await delay();
      const stops = mockStore.getStops().filter((s) => s.id !== id);
      mockStore.saveStops(stops);

      // Đồng bộ gỡ trạm khỏi các tuyến đang chứa trạm này
      const routes = mockStore.getRoutes().map((r) => ({
        ...r,
        stopIds: (r.stopIds || []).filter((sid) => sid !== id),
      }));
      mockStore.saveRoutes(routes);
      return { success: true };
    }
    const { data } = await apiClient.delete(`/api/stops/${id}`);
    return data;
  },
};
