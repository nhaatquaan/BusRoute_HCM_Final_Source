import apiClient from './apiClient';
import { USE_MOCK } from './config';
import { delay, mockStore } from './mockData';

const TOKEN_KEY = 'bus_admin_token';
const USER_KEY = 'bus_admin_user';

export const authService = {
  async login({ username, password }) {
    if (USE_MOCK) {
      await delay(200);
      const users = mockStore.getUsers();
      const found = users.find(
        (u) => u.username === username.trim() || u.email === username.trim()
      );

      if (!found || password !== '123456') {
        throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
      if (found.status === 'locked') {
        throw new Error('Tài khoản này đang bị khóa. Vui lòng liên hệ quản trị viên.');
      }

      const token = `mock-jwt-token-${found.id}-${Date.now()}`;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(found));
      return { token, user: found };
    }

    const { data } = await apiClient.post('/api/auth/login', {
      username,
      password,
    });
    const token = data.token || data.data?.token;
    const user = data.user || data.data?.user;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    return { token, user };
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getCurrentUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return Boolean(localStorage.getItem(TOKEN_KEY));
  },
};
