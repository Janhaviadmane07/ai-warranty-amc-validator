import axios from 'axios';

const API_BASE = '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('warrantyiq_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('warrantyiq_token');
      localStorage.removeItem('warrantyiq_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const api = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  getDashboardKPIs: async () => {
    const res = await apiClient.get('/dashboard/kpis');
    return res.data;
  },
  getUserDashboardSummary: async () => {
    const res = await apiClient.get('/dashboard/user-summary');
    return res.data;
  },
  getManagerDashboardSummary: async () => {
    const res = await apiClient.get('/dashboard/manager-summary');
    return res.data;
  },

  // ── Assets ────────────────────────────────────────────────────────────────
  getAssets: async (params) => {
    const res = await apiClient.get('/assets', { params });
    return res.data;
  },
  getAssetDetail: async (id) => {
    const res = await apiClient.get(`/assets/${id}`);
    return res.data;
  },
  createAsset: async (data) => {
    const res = await apiClient.post('/assets', data);
    return res.data;
  },
  updateAsset: async (id, data) => {
    const res = await apiClient.put(`/assets/${id}`, data);
    return res.data;
  },
  archiveAsset: async (id) => {
    const res = await apiClient.delete(`/assets/${id}`);
    return res.data;
  },

  // ── Documents ─────────────────────────────────────────────────────────────
  getDocuments: async () => {
    const res = await apiClient.get('/documents');
    return res.data;
  },
  getDocumentDetail: async (id) => {
    const res = await apiClient.get(`/documents/${id}`);
    return res.data;
  },
  uploadDocument: async (formData) => {
    const res = await apiClient.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  correctField: async (docId, fieldId, correctedValue) => {
    const res = await apiClient.post(`/documents/${docId}/fields/${fieldId}/correct`, {
      corrected_value: correctedValue,
    });
    return res.data;
  },
  approveDocument: async (docId) => {
    const res = await apiClient.post(`/documents/${docId}/approve`);
    return res.data;
  },

  // ── Review Cases ──────────────────────────────────────────────────────────
  getCases: async (params) => {
    const res = await apiClient.get('/cases', { params });
    return res.data;
  },
  getCaseDetail: async (caseId) => {
    const res = await apiClient.get(`/cases/${caseId}`);
    return res.data;
  },
  managerActionOnCase: async (caseId, action, notes = {}) => {
    const res = await apiClient.post(`/cases/${caseId}/manager-action`, { action, ...notes });
    return res.data;
  },
  userRespondToCase: async (caseId, userResponse, resubmit = false) => {
    const res = await apiClient.post(`/cases/${caseId}/user-response`, { user_response: userResponse, resubmit });
    return res.data;
  },
  sendCaseMessage: async (caseId, message) => {
    const res = await apiClient.post(`/cases/${caseId}/messages`, { message });
    return res.data;
  },

  // ── Suggestions ───────────────────────────────────────────────────────────
  getSuggestions: async () => {
    const res = await apiClient.get('/suggestions');
    return res.data;
  },
  createSuggestion: async (data) => {
    const res = await apiClient.post('/suggestions', data);
    return res.data;
  },
  userRespondToSuggestion: async (id, userResponse, status) => {
    const res = await apiClient.post(`/suggestions/${id}/user-respond`, { user_response: userResponse, status });
    return res.data;
  },
  managerReplySuggestion: async (id, managerReply, status) => {
    const res = await apiClient.post(`/suggestions/${id}/manager-reply`, { manager_reply: managerReply, status });
    return res.data;
  },

  // ── Manager — Assigned Users ──────────────────────────────────────────────
  getManagerAssignedUsers: async () => {
    const res = await apiClient.get('/manager/my-users');
    return res.data;
  },
  getUserProfileForManager: async (userId) => {
    const res = await apiClient.get(`/manager/users/${userId}/profile`);
    return res.data;
  },

  // ── Validation ────────────────────────────────────────────────────────────
  triggerValidationRun: async (targetType = 'Global', targetId = null) => {
    const res = await apiClient.post('/validation/run', null, {
      params: { target_type: targetType, target_id: targetId },
    });
    return res.data;
  },
  getValidationRuns: async () => {
    const res = await apiClient.get('/validation/runs');
    return res.data;
  },
  getValidationRunDetail: async (id) => {
    const res = await apiClient.get(`/validation/runs/${id}`);
    return res.data;
  },
  getFindings: async (params) => {
    const res = await apiClient.get('/validation/findings', { params });
    return res.data;
  },
  resolveFinding: async (findingId, status, resolutionNotes) => {
    const res = await apiClient.post(`/validation/findings/${findingId}/resolve`, {
      status, resolution_notes: resolutionNotes,
    });
    return res.data;
  },

  // ── Contracts & Renewals ──────────────────────────────────────────────────
  getContracts: async (params) => {
    const res = await apiClient.get('/contracts', { params });
    return res.data;
  },
  createContract: async (data) => {
    const res = await apiClient.post('/contracts', data);
    return res.data;
  },
  getUpcomingRenewals: async (windowDays = 90) => {
    const res = await apiClient.get('/renewals/upcoming', { params: { window_days: windowDays } });
    return res.data;
  },

  // ── Vendors ───────────────────────────────────────────────────────────────
  getVendors: async () => {
    const res = await apiClient.get('/vendors');
    return res.data;
  },
  createVendor: async (data) => {
    const res = await apiClient.post('/vendors', data);
    return res.data;
  },

  // ── Audit Logs & Notifications ────────────────────────────────────────────
  getAuditLogs: async () => {
    const res = await apiClient.get('/audit-logs');
    return res.data;
  },
  getNotifications: async () => {
    const res = await apiClient.get('/notifications');
    return res.data;
  },
  markNotificationRead: async (id) => {
    const res = await apiClient.post(`/notifications/${id}/read`);
    return res.data;
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  getRuleConfigs: async () => {
    const res = await apiClient.get('/settings/rules');
    return res.data;
  },
  updateRuleConfig: async (ruleId, data) => {
    const res = await apiClient.put(`/settings/rules/${ruleId}`, data);
    return res.data;
  },

  // ── Admin — User Management ───────────────────────────────────────────────
  getUsers: async (params) => {
    const res = await apiClient.get('/admin/users', { params });
    return res.data;
  },
  getUserDetail: async (userId) => {
    const res = await apiClient.get(`/admin/users/${userId}`);
    return res.data;
  },
  createUser: async (userData) => {
    const res = await apiClient.post('/admin/users', userData);
    return res.data;
  },
  updateUser: async (userId, userData) => {
    const res = await apiClient.put(`/admin/users/${userId}`, userData);
    return res.data;
  },
  toggleUserStatus: async (userId, isActive) => {
    const res = await apiClient.post(`/admin/users/${userId}/status`, { is_active: isActive });
    return res.data;
  },
  resetUserPassword: async (userId, newPassword) => {
    const res = await apiClient.post(`/admin/users/${userId}/reset-password`, { new_password: newPassword });
    return res.data;
  },
  assignManagerToUser: async (userId, managerId) => {
    const res = await apiClient.post(`/admin/users/${userId}/assign-manager`, { manager_id: managerId });
    return res.data;
  },

  // ── Admin — Manager Monitoring ────────────────────────────────────────────
  getManagerPerformance: async (params) => {
    const res = await apiClient.get('/admin/managers/performance', { params });
    return res.data;
  },
  getManagerActivity: async (managerId, params) => {
    const res = await apiClient.get(`/admin/managers/${managerId}/activity`, { params });
    return res.data;
  },

  // ── Tasks ─────────────────────────────────────────────────────────────────
  getTasks: async (params) => {
    const res = await apiClient.get('/tasks', { params });
    return res.data;
  },
  createTask: async (taskData) => {
    const res = await apiClient.post('/tasks', taskData);
    return res.data;
  },
  updateTaskStatus: async (taskId, statusData) => {
    const res = await apiClient.patch(`/tasks/${taskId}/status`, statusData);
    return res.data;
  },
  getTasksMonitoring: async () => {
    const res = await apiClient.get('/admin/tasks/monitoring');
    return res.data;
  },
};
