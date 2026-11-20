// Đã kết nối trực tiếp với Backend MongoDB (BusRouteBackend)
export const USE_MOCK = false;

// URL của Backend Express kết nối MongoDB (mặc định http://localhost:3000)
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000';
