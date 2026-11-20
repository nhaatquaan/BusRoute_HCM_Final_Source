import axios from 'axios';
import { API_BASE_URL } from './config';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Tự động đính kèm token nếu đã đăng nhập
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('bus_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Chuẩn hóa id cho MongoDB (_id và _key)
export const normalizeId = (item) => {
  if (!item || typeof item !== 'object') return item;
  return {
    ...item,
    id: item.id || item._key || item._id,
  };
};

export default apiClient;
