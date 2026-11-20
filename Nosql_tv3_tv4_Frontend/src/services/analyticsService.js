import apiClient from './apiClient';

export const analyticsService = {
  async getNetworkAnalytics() {
    const { data } = await apiClient.get('/api/analytics/network');
    return data.data || data;
  },
};
