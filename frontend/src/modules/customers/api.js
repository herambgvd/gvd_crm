import { api, getAuthHeader } from "../../lib/axios";

const BASE = "/customers";

export const fetchCustomers = async (params = {}) => {
  const response = await api.get(BASE, { params });
  return response.data;
};

export const fetchCustomer = async (id) => {
  const response = await api.get(`${BASE}/${id}`);
  return response.data;
};

export const searchCustomers = async (q = "", limit = 10) => {
  const response = await api.get(`${BASE}/search`, { params: { q, limit } });
  return response.data;
};

export const createCustomer = async (data) => {
  const response = await api.post(BASE, data);
  return response.data;
};

export const updateCustomer = async (id, data) => {
  const response = await api.put(`${BASE}/${id}`, data);
  return response.data;
};

export const deleteCustomer = async (id) => {
  const response = await api.delete(`${BASE}/${id}`);
  return response.data;
};
