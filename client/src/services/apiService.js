import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.data.success) {
            localStorage.setItem('token', response.data.data.token);
            originalRequest.headers.Authorization = `Bearer ${response.data.data.token}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
        if (window.location.pathname !== '/login') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Helper function to get society settings from localStorage (fallback)
const getSocietySettingsLocal = () => {
  try {
    const saved = localStorage.getItem('societySettings');
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
};

// Auth API
export const authAPI = {
  register: async (userData) => { const r = await api.post('/auth/register', userData); return r.data; },
  verifyOTP: async (email, otp) => { const r = await api.post('/auth/verify-otp', { email, otp }); return r.data; },
  resendOTP: async (email) => { const r = await api.post('/auth/resend-otp', { email }); return r.data; },
  login: async (credentials) => { 
    const r = await api.post('/auth/login', credentials); 
    if (r.data.success) { 
      localStorage.setItem('token', r.data.data.token); 
      localStorage.setItem('userRole', r.data.data.user.role); 
      localStorage.setItem('userEmail', r.data.data.user.email); 
      localStorage.setItem('userId', r.data.data.user.user_id); 
    } 
    return r.data; 
  },
  getProfile: async () => { const r = await api.get('/auth/profile'); return r.data; },
  refreshToken: async () => { const r = await api.post('/auth/refresh'); if (r.data.success) localStorage.setItem('token', r.data.data.token); return r.data; },
  logout: async () => { 
    try { await api.post('/auth/logout'); } 
    finally { 
      localStorage.removeItem('token'); 
      localStorage.removeItem('userRole'); 
      localStorage.removeItem('userEmail'); 
      localStorage.removeItem('userId'); 
      return { success: true }; 
    } 
  }
};

// Dashboard API
export const dashboardAPI = {
  getAdminDashboard: async () => { const r = await api.get('/dashboard/admin'); return r.data; },
  getResidentDashboard: async () => { const r = await api.get('/dashboard/resident'); return r.data; },
  getSecurityDashboard: async () => { const r = await api.get('/dashboard/security'); return r.data; }
};

// Settings API
export const settingsAPI = {
  getSettings: async () => { const r = await api.get('/settings'); return r.data; },
  saveSettings: async (settings) => { const r = await api.post('/settings', settings); return r.data; }
};

// Maintenance API
export const maintenanceAPI = {
  generateBills: async () => { const r = await api.post('/maintenance/generate'); return r.data; },
  getAllBills: async (flat, year) => { const params = new URLSearchParams(); if (flat) params.append('flat', flat); if (year) params.append('year', year); const r = await api.get(`/maintenance/all?${params}`); return r.data; },
  getMyBills: async () => { const r = await api.get('/maintenance/my-bills'); return r.data; },
  payBill: async (billId, transactionId) => { const r = await api.patch(`/maintenance/pay/${billId}`, { transactionId }); return r.data; },
  verifyBill: async (billId) => { const r = await api.patch(`/maintenance/verify/${billId}`); return r.data; },
    downloadBill: async (billId) => { 
    // Get settings from database or localStorage
    let settings;
    try {
      const result = await settingsAPI.getSettings();
      settings = result.success ? result.data : getSocietySettingsLocal();
    } catch (e) {
      settings = getSocietySettingsLocal();
    }
    const r = await api.post(`/maintenance/download-bill/${billId}`, settings, { responseType: 'blob' }); 
    return r.data; 
  },
    generateBillsWithBreakdown: async (data) => {
      const r = await api.post('/maintenance/generate-with-breakdown', data);
      return r.data;
    },
    downloadReceipt: async (billId) => { 
    let settings;
    try {
      const result = await settingsAPI.getSettings();
      settings = result.success ? result.data : getSocietySettingsLocal();
    } catch (e) {
      settings = getSocietySettingsLocal();
    }
    const r = await api.post(`/maintenance/download-receipt/${billId}`, settings, { responseType: 'blob' }); 
    return r.data; 
  }
};

// Property/Flat API
export const propertyAPI = {
  getAllFlats: async () => { const r = await api.get('/property/flats'); return r.data; },
  getFlatById: async (flatId) => { const r = await api.get(`/property/flats/${flatId}`); return r.data; },
  createFlat: async (flatData) => { const r = await api.post('/property/flats', flatData); return r.data; },
  updateFlat: async (flatId, flatData) => { const r = await api.put(`/property/flats/${flatId}`, flatData); return r.data; },
  deleteFlat: async (flatId) => { const r = await api.delete(`/property/flats/${flatId}`); return r.data; },
  getFlatTypes: async () => { const r = await api.get('/property/types'); return r.data; },
  getAllRates: async () => { const r = await api.get('/property/rates'); return r.data; },
  updateFlatRate: async (flatType, rate) => { const r = await api.put('/property/rates', { flatType, rate }); return r.data; },
  getSocietySummary: async () => { const r = await api.get('/property/summary'); return r.data; }
};

// Tenant API
export const tenantAPI = {
  getAllTenants: async () => { const r = await api.get('/tenants'); return r.data; },
  getTenantById: async (tenantId) => { const r = await api.get(`/tenants/${tenantId}`); return r.data; },
  getTenantByFlatId: async (flatId) => { const r = await api.get(`/tenants/flat/${flatId}`); return r.data; },
  createTenant: async (tenantData) => { const r = await api.post('/tenants', tenantData); return r.data; },
  updateTenant: async (tenantId, tenantData) => { const r = await api.put(`/tenants/${tenantId}`, tenantData); return r.data; },
  deleteTenant: async (tenantId) => { const r = await api.delete(`/tenants/${tenantId}`); return r.data; },
  ownerMovingIn: async (tenantId) => { const r = await api.post(`/tenants/${tenantId}/owner-moving-in`); return r.data; },
  getTenantSummary: async () => { const r = await api.get('/tenants/summary'); return r.data; }
};

// Complaint API
export const complaintAPI = {
  getAllComplaints: async () => { const r = await api.get('/complaints'); return r.data; },
  createComplaint: async (complaintData) => { const r = await api.post('/complaints', complaintData); return r.data; },
  updateComplaintStatus: async (complaintId, status, sendWhatsApp = true) => { const r = await api.patch(`/complaints/${complaintId}`, { status, sendWhatsApp }); return r.data; },
  deleteComplaint: async (complaintId) => { const r = await api.delete(`/complaints/${complaintId}`); return r.data; }
};

// Notice API
export const noticeAPI = {
  getAllNotices: async (category) => { const params = category && category !== 'All' ? `?category=${category}` : ''; const r = await api.get(`/notices${params}`); return r.data; },
  getNoticeById: async (noticeId) => { const r = await api.get(`/notices/${noticeId}`); return r.data; },
  createNotice: async (noticeData) => { const r = await api.post('/notices', noticeData); return r.data; },
  updateNotice: async (noticeId, noticeData) => { const r = await api.put(`/notices/${noticeId}`, noticeData); return r.data; },
  deleteNotice: async (noticeId) => { const r = await api.delete(`/notices/${noticeId}`); return r.data; }
};

// Ownership Transfer API
export const ownershipTransferAPI = {
  getAllTransfers: async () => { const r = await api.get('/ownership-transfers'); return r.data; },
  getTransferById: async (transferId) => { const r = await api.get(`/ownership-transfers/${transferId}`); return r.data; },
  getTransferHistoryByFlat: async (flatId) => { const r = await api.get(`/ownership-transfers/flat/${flatId}`); return r.data; },
  createTransfer: async (transferData) => { const r = await api.post('/ownership-transfers', transferData); return r.data; },
  getTransferSummary: async () => { const r = await api.get('/ownership-transfers/summary'); return r.data; }
};

// Visitor/Security API
export const visitorAPI = {
  getVisitors: async (today = false) => { const r = await api.get(`/visitors?today=${today}`); return r.data; },
  getVisitorById: async (id) => { const r = await api.get(`/visitors/${id}`); return r.data; },
  addVisitor: async (visitorData) => { const r = await api.post('/visitors', visitorData); return r.data; },
  checkoutVisitor: async (id) => { const r = await api.put(`/visitors/${id}/checkout`); return r.data; }
};

// Approval API
export const approvalAPI = {
  getAll:      async () => { const r = await api.get('/approvals'); return r.data; },
  getPending:  async () => { const r = await api.get('/approvals/pending'); return r.data; },
  getById:     async (id) => { const r = await api.get(`/approvals/${id}`); return r.data; },
  create:      async (data) => { const r = await api.post('/approvals', data); return r.data; },
  approve:     async (id, data) => { const r = await api.post(`/approvals/${id}/approve`, data); return r.data; },
  reject:      async (id, data) => { const r = await api.post(`/approvals/${id}/reject`, data); return r.data; }
};

// Work Order API
export const workOrderAPI = {
  getAll:     async (params = {}) => { const r = await api.get('/work-orders', { params }); return r.data; },
  getById:    async (id) => { const r = await api.get(`/work-orders/${id}`); return r.data; },
  create:     async (data) => { const r = await api.post('/work-orders', data); return r.data; },
  start:      async (id) => { const r = await api.patch(`/work-orders/${id}/start`); return r.data; },
  complete:   async (id, data) => { const r = await api.patch(`/work-orders/${id}/complete`, data); return r.data; },
  uploadPhoto: async (id, stage, formData) => {
    const r = await api.post(`/work-orders/${id}/photos/${stage}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return r.data;
  },
  residentVerify: async (id, data) => { const r = await api.post(`/work-orders/${id}/resident-verify`, data); return r.data; },
  adminVerify: async (id) => { const r = await api.post(`/work-orders/${id}/admin-verify`); return r.data; }
};

// Vendor API
export const vendorAPI = {
  getAll:     async (params = {}) => { const r = await api.get('/vendors', { params }); return r.data; },
  getById:    async (id) => { const r = await api.get(`/vendors/${id}`); return r.data; },
  getHistory: async (id) => { const r = await api.get(`/vendors/${id}/history`); return r.data; },
  create:     async (data) => { const r = await api.post('/vendors', data); return r.data; },
  verify:     async (id) => { const r = await api.patch(`/vendors/${id}/verify`); return r.data; },
  blacklist:  async (id, reason) => { const r = await api.patch(`/vendors/${id}/blacklist`, { reason }); return r.data; },
  rate:       async (id, data) => { const r = await api.post(`/vendors/${id}/rate`, data); return r.data; }
};

// Compliance API
export const complianceAPI = {
  getNotices:   async (params = {}) => { const r = await api.get('/compliance/notices', { params }); return r.data; },
  getDefaulters: async () => { const r = await api.get('/compliance/defaulters'); return r.data; },
  getInsights:  async () => { const r = await api.get('/compliance/insights'); return r.data; },
  runNow:       async () => { const r = await api.post('/compliance/run'); return r.data; }
};

// Payment API
export const paymentAPI = {
  createOrder:  async (bill_id, amount) => { const r = await api.post('/payments/create-order', { bill_id, amount }); return r.data; },
  verifyPayment: async (data) => { const r = await api.post('/payments/verify', data); return r.data; },
  getHistory:   async () => { const r = await api.get('/payments/history'); return r.data; }
};

// Document Upload API
export const documentAPI = {
  upload: async (entityType, entityId, documentType, file, description = '') => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('entity_type', entityType);
    formData.append('entity_id', entityId);
    formData.append('document_type', documentType);
    formData.append('description', description);
    const r = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return r.data;
  },
  getEntityDocuments: async (entityType, entityId) => {
    const r = await api.get(`/documents/${entityType}/${entityId}`);
    return r.data;
  },
  verify: async (documentId) => {
    const r = await api.patch(`/documents/${documentId}/verify`);
    return r.data;
  },
  reject: async (documentId, reason) => {
    const r = await api.patch(`/documents/${documentId}/reject`, { reason });
    return r.data;
  },
  delete: async (documentId) => {
    const r = await api.delete(`/documents/${documentId}`);
    return r.data;
  }
};

// Reports API
export const reportAPI = {
  collection:  async (year, month) => { const p = new URLSearchParams(); if(year)p.append('year',year); if(month)p.append('month',month); const r=await api.get(`/reports/collection?${p}`); return r.data; },
  defaulters:  async () => { const r=await api.get('/reports/defaulters'); return r.data; },
  summary:     async (year) => { const p=year?`?year=${year}`:''; const r=await api.get(`/reports/summary${p}`); return r.data; },
  flatWise:    async () => { const r=await api.get('/reports/flat-wise'); return r.data; }
};

// Amenity API
export const amenityAPI = {
  getAll:      async () => { const r=await api.get('/amenities'); return r.data; },
  getById:     async (id) => { const r=await api.get(`/amenities/${id}`); return r.data; },
  create:      async (data) => { const r=await api.post('/amenities', data); return r.data; },
  getSlots:    async (amenityId, date) => { const r=await api.get(`/amenities/${amenityId}/slots/${date}`); return r.data; },
  createBooking: async (data) => { const r=await api.post('/amenities/bookings', data); return r.data; },
  myBookings:  async () => { const r=await api.get('/amenities/bookings/mine'); return r.data; },
  allBookings: async () => { const r=await api.get('/amenities/bookings/all'); return r.data; },
  approveBooking: async (id) => { const r=await api.patch(`/amenities/bookings/${id}/approve`); return r.data; },
  rejectBooking:  async (id, reason) => { const r=await api.patch(`/amenities/bookings/${id}/reject`, { reason }); return r.data; },
  cancelBooking:  async (id) => { const r=await api.patch(`/amenities/bookings/${id}/cancel`); return r.data; },
  lateFeeSettings: async () => { const r=await api.get('/amenities/late-fee/settings'); return r.data; },
  updateLateFee: async (data) => { const r=await api.put('/amenities/late-fee/settings', data); return r.data; },
  calculateLateFees: async () => { const r=await api.post('/amenities/late-fee/calculate'); return r.data; }
};

// Visitor Pass API
export const visitorPassAPI = {
  create: async (data) => { const r = await api.post('/visitor-passes', data); return r.data; },
  getMyPasses: async () => { const r = await api.get('/visitor-passes/my'); return r.data; },
  cancel: async (id) => { const r = await api.patch(`/visitor-passes/${id}/cancel`); return r.data; }
};

// Notifications API (in-app notifications)
export const notificationAPI = {
  getAll: async () => {
    try {
      const r = await api.get('/notifications');
      return r.data;
    } catch {
      // Fallback: generate from cached data
      const bills = JSON.parse(localStorage.getItem('cachedBills') || '[]');
      const complaints = JSON.parse(localStorage.getItem('cachedComplaints') || '[]');
      const notices = JSON.parse(localStorage.getItem('cachedNotices') || '[]');
      const items = [];
      bills.forEach(b => items.push({ id: `bill-${b.id}`, title: `Bill ${b.status}`, description: `Flat ${b.flat_no}: ₹${b.amount}`, time: b.created_at, icon: '💰', type: 'bill' }));
      complaints.forEach(c => items.push({ id: `comp-${c.id}`, title: `Complaint ${c.status}`, description: c.subject, time: c.created_at, icon: '🔧', type: 'complaint' }));
      notices.forEach(n => items.push({ id: `note-${n.notice_id}`, title: 'New Notice', description: n.title, time: n.created_at, icon: '📢', type: 'notice' }));
      items.sort((a, b) => new Date(b.time) - new Date(a.time));
      return { success: true, data: items };
    }
  }
};

export default api;
