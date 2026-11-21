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
      if (found.status === 'locked' || found.trang_thai === 'inactive') {
        throw new Error('Tài khoản này đang bị khóa. Vui lòng liên hệ quản trị viên.');
      }

      const role = found.role || (found.vai_tro === 'admin' ? 'admin' : (found.vai_tro === 'operator' ? 'operator' : 'passenger'));
      const token = `mock-jwt-token-${found.id}-${Date.now()}`;
      const safeUser = { ...found, role, vai_tro: role };
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(safeUser));
      return { token, user: safeUser };
    }

    const { data } = await apiClient.post('/api/auth/login', {
      username: username.trim(),
      password,
      mat_khau: password,
      email: username.trim(),
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

  async register({ fullName, email, password, phoneNumber }) {
    if (USE_MOCK) {
      await delay(300);
      const newUser = {
        id: `USR_${Date.now().toString().slice(-4)}`,
        username: email.split('@')[0],
        fullName: fullName.trim(),
        ho_ten: fullName.trim(),
        email: email.trim().toLowerCase(),
        so_dien_thoai: phoneNumber ? phoneNumber.trim() : '',
        role: 'passenger',
        vai_tro: 'passenger',
        status: 'active',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      const token = `mock-jwt-token-${newUser.id}-${Date.now()}`;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      return { token, user: newUser };
    }

    const { data } = await apiClient.post('/api/users/register', {
      fullName: fullName.trim(),
      ho_ten: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      mat_khau: password,
      so_dien_thoai: phoneNumber ? phoneNumber.trim() : '',
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

  async getProfile() {
    if (USE_MOCK) {
      return this.getCurrentUser();
    }
    const { data } = await apiClient.get('/api/users/me');
    const user = data.data || data.user;
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    return user;
  },

  async updateProfile({ fullName, phoneNumber, email }) {
    if (USE_MOCK) {
      await delay(200);
      const current = this.getCurrentUser() || {};
      const updated = {
        ...current,
        fullName: fullName || current.fullName,
        ho_ten: fullName || current.ho_ten,
        so_dien_thoai: phoneNumber !== undefined ? phoneNumber : current.so_dien_thoai,
        email: email || current.email,
      };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    }

    const { data } = await apiClient.put('/api/users/me', {
      fullName,
      ho_ten: fullName,
      so_dien_thoai: phoneNumber,
      email,
    });
    const user = data.data || data.user;
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    return user;
  },

  async changePassword({ currentPassword, newPassword }) {
    if (USE_MOCK) {
      await delay(300);
      if (currentPassword !== '123456') {
        throw new Error('Mật khẩu hiện tại không chính xác.');
      }
      return { success: true, message: 'Đổi mật khẩu thành công.' };
    }

    const { data } = await apiClient.put('/api/users/me/password', {
      currentPassword,
      newPassword,
      password: newPassword,
    });
    return data;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getCurrentUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) return JSON.parse(raw);

      // Rehydrate user from token payload if USER_KEY is missing
      const token = localStorage.getItem(TOKEN_KEY);
      if (token && !token.startsWith('mock-')) {
        const payload = this.parseJwt(token);
        if (payload && (payload.id || payload._id || payload.email || payload.vai_tro || payload.role)) {
          const restored = {
            id: payload.id || payload._id || payload.userId,
            username: payload.email?.split('@')[0] || payload.username || 'user',
            fullName: payload.ho_ten || payload.fullName || payload.name || 'Người dùng',
            email: payload.email || '',
            role: payload.role || payload.vai_tro || 'passenger',
            vai_tro: payload.role || payload.vai_tro || 'passenger',
          };
          localStorage.setItem(USER_KEY, JSON.stringify(restored));
          return restored;
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  parseJwt(token) {
    try {
      if (!token || typeof token !== 'string') return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  },

  getUserRole() {
    const user = this.getCurrentUser();
    if (!user) return 'guest';
    const r = String(user.role || user.vai_tro || '').toLowerCase().trim();
    if (r === 'admin') return 'admin';
    if (r === 'operator' || user.email === 'operator@busroute.vn') return 'operator';
    return 'passenger';
  },

  isAuthenticated() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    if (token.startsWith('mock-')) return true;
    const payload = this.parseJwt(token);
    if (!payload) return true;
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      this.logout();
      return false;
    }
    return true;
  },
};
