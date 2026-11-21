import apiClient from './apiClient';

/**
 * Service giao tiếp với Bus Simulation API của Backend
 */
export const simulationService = {
  /**
   * Lấy danh sách các xe buýt ảo đang vận hành trên mạng lưới
   * @param {Object} options - { routeId, direction, simTime }
   */
  async getActiveVehicles(options = {}) {
    try {
      const params = {};
      if (options.routeId) params.routeId = options.routeId;
      if (options.direction) params.direction = options.direction;
      if (options.simTime) params.simTime = options.simTime;

      const response = await apiClient.get('/api/simulation/vehicles', { params });
      return response.data;
    } catch (error) {
      console.warn('[simulationService] Lỗi khi lấy danh sách xe mô phỏng:', error.message);
      return {
        success: false,
        mode: 'simulation',
        disclaimer: 'MÔ PHỎNG – DỮ LIỆU MINH HỌA',
        vehiclesCount: 0,
        vehicles: [],
        error: error.message,
      };
    }
  },

  /**
   * Lấy danh sách xe sắp cập bến một trạm dừng
   * @param {string} stopId - Mã trạm (ví dụ 'TR_01')
   * @param {Object} options - { limit, simTime }
   */
  async getStopArrivals(stopId, options = {}) {
    try {
      if (!stopId) throw new Error('Thiếu mã trạm dừng');
      const cleanId = String(stopId).includes('/') ? stopId.split('/')[1] : stopId;

      const params = {};
      if (options.limit) params.limit = options.limit;
      if (options.simTime) params.simTime = options.simTime;

      const response = await apiClient.get(`/api/simulation/stops/${encodeURIComponent(cleanId)}/arrivals`, {
        params,
      });
      return response.data;
    } catch (error) {
      console.warn(`[simulationService] Lỗi lấy xe sắp đến trạm ${stopId}:`, error.message);
      return {
        success: false,
        mode: 'simulation',
        disclaimer: 'MÔ PHỎNG – THỜI GIAN ĐẾN ƯỚC TÍNH',
        status: 'error',
        stop: { id: stopId },
        arrivals: [],
        error: error.message,
      };
    }
  },

  /**
   * Lấy thông tin thời gian chờ xe cho một tuyến tại trạm đón
   * @param {string} routeCode - Mã tuyến (ví dụ '01')
   * @param {string} direction - 'luot_di' hoặc 'luot_ve'
   * @param {string} stopId - Mã trạm đón
   */
  async getRouteWait(routeCode, direction, stopId) {
    try {
      if (!routeCode || !stopId) return null;
      const cleanStop = String(stopId).includes('/') ? stopId.split('/')[1] : stopId;

      const response = await apiClient.get('/api/simulation/route-wait', {
        params: {
          routeCode,
          direction: direction || 'luot_di',
          stopId: cleanStop,
        },
      });

      if (response.data && response.data.success) {
        return response.data.waitInfo;
      }
      return null;
    } catch (error) {
      console.warn(`[simulationService] Lỗi tra cứu chờ xe tuyến ${routeCode}:`, error.message);
      return null;
    }
  },
};

export default simulationService;
