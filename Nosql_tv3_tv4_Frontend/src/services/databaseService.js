import apiClient from './apiClient';

export const databaseService = {
  // 1. Tổng quan collections
  async getOverview() {
    const { data } = await apiClient.get('/api/database/collections');
    return data;
  },

  // 2. Lấy documents theo collection
  async getDocuments(collectionName, params = {}) {
    const { data } = await apiClient.get(`/api/database/collections/${collectionName}/documents`, {
      params,
    });
    return data;
  },

  // 3. CRUD document
  async createDocument(collectionName, docData) {
    const { data } = await apiClient.post(`/api/database/collections/${collectionName}/documents`, docData);
    return data;
  },

  async updateDocument(collectionName, id, updateData) {
    const { data } = await apiClient.put(`/api/database/collections/${collectionName}/documents/${id}`, updateData);
    return data;
  },

  async deleteDocument(collectionName, id) {
    const { data } = await apiClient.delete(`/api/database/collections/${collectionName}/documents/${id}`);
    return data;
  },

  // 4. Quản lý indexes
  async getIndexes(collectionName) {
    const { data } = await apiClient.get(`/api/database/collections/${collectionName}/indexes`);
    return data;
  },

  async createIndex(collectionName, field, isUnique = false) {
    const { data } = await apiClient.post(`/api/database/collections/${collectionName}/indexes`, {
      field,
      unique: isUnique,
    });
    return data;
  },

  // 5. Playground
  async getPlaygroundQueries() {
    const { data } = await apiClient.get('/api/database/playground/queries');
    return data;
  },

  async runPlaygroundQuery(queryId) {
    const { data } = await apiClient.post('/api/database/playground/run', { queryId });
    return data;
  },

  // 6. Tính toàn vẹn (Database Integrity)
  async getIntegrityReport() {
    const { data } = await apiClient.get('/api/database/integrity');
    return data;
  },

  // 7. Backup & Restore
  async getBackups() {
    const { data } = await apiClient.get('/api/database/backup/list');
    return data;
  },

  async createBackup() {
    const { data } = await apiClient.post('/api/database/backup');
    return data;
  },

  async restoreBackup(filename) {
    const { data } = await apiClient.post('/api/database/restore', { filename });
    return data;
  },

  // 8. Import / Export
  async importData(collectionName, items, mode = 'insert') {
    const { data } = await apiClient.post(`/api/database/import/${collectionName}`, {
      items,
      mode,
    });
    return data;
  },
};
