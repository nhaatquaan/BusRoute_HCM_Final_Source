import apiClient from './apiClient';

const GUEST_HISTORY_KEY = 'bus_guest_search_history';

export const passengerService = {
  // ==========================================================================
  // 1. LỊCH SỬ TÌM KIẾM
  // ==========================================================================

  async recordSearch({ fromStopId, toStopId, fromStopName, toStopName, criteria, summaryResult }) {
    try {
      const { data } = await apiClient.post('/api/passenger/history', {
        fromStopId,
        toStopId,
        fromStopName,
        toStopName,
        criteria,
        summaryResult,
      });
      return data.data;
    } catch (err) {
      console.warn('Could not record search history on server:', err.message);
      return null;
    }
  },

  async getSearchHistory(params = {}) {
    const { data } = await apiClient.get('/api/passenger/history', { params });
    return data;
  },

  async deleteHistoryItem(id) {
    const { data } = await apiClient.delete(`/api/passenger/history/${id}`);
    return data;
  },

  async clearAllHistory() {
    const { data } = await apiClient.delete('/api/passenger/history');
    return data;
  },

  async syncGuestHistory(guestSearches) {
    const { data } = await apiClient.post('/api/passenger/history/sync', { guestSearches });
    return data;
  },

  // Helpers cho Guest trên LocalStorage (Tối đa 5 lần tìm kiếm gần nhất)
  getGuestLocalHistory() {
    try {
      const raw = localStorage.getItem(GUEST_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveGuestLocalSearch(item) {
    try {
      if (!item || !item.fromStopId || !item.toStopId) return;
      const history = this.getGuestLocalHistory();
      const filtered = history.filter(
        (h) => !(h.fromStopId === item.fromStopId && h.toStopId === item.toStopId)
      );
      const newEntry = {
        ...item,
        createdAt: new Date().toISOString(),
      };
      filtered.unshift(newEntry);
      const trimmed = filtered.slice(0, 5); // Tối đa 5 lượt tìm kiếm gần nhất
      localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(trimmed));
    } catch (err) {
      console.warn('Could not save guest history locally:', err);
    }
  },

  clearGuestLocalHistory() {
    localStorage.removeItem(GUEST_HISTORY_KEY);
  },

  // ==========================================================================
  // 2. ĐỊA ĐIỂM ĐÃ LƯU (Nhà, Cơ quan, Trường học, ...)
  // ==========================================================================

  async getSavedPlaces() {
    const { data } = await apiClient.get('/api/passenger/places');
    return data.data || [];
  },

  async addSavedPlace(placeData) {
    const { data } = await apiClient.post('/api/passenger/places', placeData);
    return data.data;
  },

  async updateSavedPlace(id, placeData) {
    const { data } = await apiClient.put(`/api/passenger/places/${id}`, placeData);
    return data.data;
  },

  async deleteSavedPlace(id) {
    const { data } = await apiClient.delete(`/api/passenger/places/${id}`);
    return data;
  },

  // ==========================================================================
  // 3. TUYẾN XE YÊU THÍCH
  // ==========================================================================

  async getFavoriteRoutes() {
    const { data } = await apiClient.get('/api/passenger/favorites');
    return data.data || [];
  },

  async addFavoriteRoute({ routeId, routeCode, routeName }) {
    const { data } = await apiClient.post('/api/passenger/favorites', {
      routeId,
      routeCode,
      routeName,
    });
    return data;
  },

  async removeFavoriteRoute(routeId) {
    const { data } = await apiClient.delete(`/api/passenger/favorites/${routeId}`);
    return data;
  },

  // ==========================================================================
  // 4. SỞ THÍCH TÌM ĐƯỜNG (PREFERENCES)
  // ==========================================================================

  async getPreferences() {
    const { data } = await apiClient.get('/api/passenger/preferences');
    return data.data;
  },

  async updatePreferences(preferences) {
    const { data } = await apiClient.put('/api/passenger/preferences', preferences);
    return data.data;
  },

  // ==========================================================================
  // 5. ĐỀ XUẤT LỘ TRÌNH THÔNG MINH (RECOMMENDATIONS)
  // ==========================================================================

  async getRecommendations() {
    const { data } = await apiClient.get('/api/passenger/recommendations');
    return data.data;
  },
};
