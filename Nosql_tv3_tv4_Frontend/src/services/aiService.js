import apiClient from './apiClient';

export const aiService = {
  async getStatus() {
    try {
      const { data } = await apiClient.get('/api/ai/status', { timeout: 5000 });
      return data;
    } catch {
      return { online: false, modelFound: false };
    }
  },

  async sendMessage(message, signal = null) {
    // Cấu hình timeout riêng 180 giây (180000ms) cho AI inference, hỗ trợ AbortSignal để hủy
    const { data } = await apiClient.post(
      '/api/ai/chat',
      { message },
      {
        timeout: 180000,
        signal,
      }
    );
    return data;
  },
};

export default aiService;
