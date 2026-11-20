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

// Chuẩn hóa thông báo lỗi Tiếng Việt từ Backend thay vì lỗi tiếng Anh mặc định của Axios
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const serverMessage =
      error.response?.data?.message ||
      error.response?.data?.error?.message ||
      error.response?.data?.error;

    if (serverMessage && typeof serverMessage === 'string') {
      error.message = serverMessage;
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.message = 'Máy chủ phản hồi quá thời gian chờ. Vui lòng thử lại.';
    } else if (error.message === 'Network Error') {
      error.message = 'Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra kết nối mạng.';
    }
    return Promise.reject(error);
  }
);

// Chuẩn hóa id cho MongoDB (_id và _key)
export const normalizeId = (item) => {
  if (!item || typeof item !== 'object') return item;
  return {
    ...item,
    id: item.id || item._key || item._id,
  };
};

export default apiClient;
