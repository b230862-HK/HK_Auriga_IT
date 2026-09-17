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
    const res = await api.post('/billing/generate', null, { params: { month } });
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
