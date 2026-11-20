import apiClient, { normalizeId } from './apiClient';
import { USE_MOCK } from './config';
import { delay, mockStore } from './mockData';

export const userService = {
  async getAll() {
    if (USE_MOCK) {
      await delay();
      return mockStore.getUsers();
    }
    const { data } = await apiClient.get('/api/users');
    const list = Array.isArray(data) ? data : data.data || [];
    return list.map(normalizeId);
  },

  async create(payload) {
    if (USE_MOCK) {
      await delay();
      const users = mockStore.getUsers();
      if (
        users.some(
          (u) => u.username.toLowerCase() === payload.username.trim().toLowerCase()
        )
      ) {
        throw new Error(`Tên đăng nhập "${payload.username}" đã tồn tại.`);
      }
      const newUser = {
        id: `USR_${Date.now().toString().slice(-4)}`,
        username: payload.username.trim(),
        fullName: payload.fullName.trim(),
        ho_ten: payload.fullName.trim(),
        email: payload.email.trim(),
        so_dien_thoai: payload.so_dien_thoai || '',
        role: payload.role || 'passenger',
        vai_tro: payload.role || 'passenger',
        status: payload.status || 'active',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      mockStore.saveUsers([newUser, ...users]);
      return newUser;
    }
    const { data } = await apiClient.post('/api/users', payload);
    return normalizeId(data.data || data);
  },

  async update(id, payload) {
    if (USE_MOCK) {
      await delay();
      const users = mockStore.getUsers();
      const updated = users.map((u) => (u.id === id ? { ...u, ...payload } : u));
      mockStore.saveUsers(updated);
      return updated.find((u) => u.id === id);
    }
    const { data } = await apiClient.put(`/api/users/${id}`, payload);
    return normalizeId(data.data || data);
  },

  async remove(id) {
    if (USE_MOCK) {
      await delay();
      const users = mockStore.getUsers().filter((u) => u.id !== id);
      mockStore.saveUsers(users);
      return { success: true };
    }
    const { data } = await apiClient.delete(`/api/users/${id}`);
    return data;
  },
};
