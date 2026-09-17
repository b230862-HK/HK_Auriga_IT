import api from './client.js';

export const authService = {
  login: async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },
  signup: async (userData) => {
    const res = await api.post('/auth/signup', userData);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const customerService = {
  listCustomers: async (params = {}) => {
    const res = await api.get('/customers', { params });
    return res.data;
  },
  getCustomerByPhone: async (phone) => {
    const res = await api.get(`/customers/${phone}`);
    return res.data;
  },
  createCustomer: async (customerData) => {
    const res = await api.post('/customers', customerData);
    return res.data;
  },
  pauseCustomer: async (id, pauseData) => {
    const res = await api.post(`/customers/${id}/pause`, pauseData);
    return res.data;
  },
  resumeCustomer: async (id) => {
    const res = await api.post(`/customers/${id}/resume`);
    return res.data;
  },
  getCustomerPauses: async (id) => {
    const res = await api.get(`/customers/${id}/pauses`);
    return res.data;
  },
  importCustomers: async (rows) => {
    const res = await api.post('/customers/import', rows);
    return res.data;
  },
};

export const subscriptionService = {
  getSubscription: async (id) => {
    const res = await api.get(`/subscriptions/${id}`);
    return res.data;
  },
  transferSubscription: async (id, transferData) => {
    const res = await api.post(`/subscriptions/${id}/transfer`, transferData);
    return res.data;
  },
  pauseSubscription: async (id, pauseData) => {
    const res = await api.post(`/subscriptions/${id}/pause`, pauseData);
    return res.data;
  },
  resumeSubscription: async (id) => {
    const res = await api.post(`/subscriptions/${id}/resume`);
    return res.data;
  },
};

export const planService = {
  getPlans: async () => {
    const res = await api.get('/plans');
    return res.data;
  },
  createPlan: async (planData) => {
    const res = await api.post('/plans', planData);
    return res.data;
  },
};

export const billingService = {
  generateBills: async (month) => {
    const res = await api.post('/billing/generate', {}, { params: { month } });
    return res.data;
  },
  getMonthlyBills: async (month) => {
    const res = await api.get('/billing', { params: { month } });
    return res.data;
  },
  getCustomerBill: async (customerId, month) => {
    const res = await api.get(`/billing/${customerId}`, { params: { month } });
    return res.data;
  },
};

export const clockService = {
  advanceClock: async (date) => {
    const body = date ? { date } : {};
    const res = await api.post('/clock', body);
    return res.data;
  },
  getOutbox: async (date) => {
    const params = date ? { date } : {};
    const res = await api.get('/outbox', { params });
    return res.data;
  },
  resetOutbox: async () => {
    const res = await api.post('/outbox/reset');
    return res.data;
  },
};
