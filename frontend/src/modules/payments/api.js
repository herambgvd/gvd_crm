import axios, { API, getAuthHeader } from "../../lib/axios";

// ─── Payments ─────────────────────────────────

export const fetchPayments = async (params = {}) => {
  const response = await axios.get(`${API}/payments`, {
    headers: getAuthHeader(),
    params,
  });
  return response.data;
};

export const fetchPayment = async (id) => {
  const response = await axios.get(`${API}/payments/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createPayment = async (data) => {
  const response = await axios.post(`${API}/payments`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const updatePayment = async (id, data) => {
  const response = await axios.put(`${API}/payments/${id}`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const deletePayment = async (id) => {
  const response = await axios.delete(`${API}/payments/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchPaymentStats = async () => {
  const response = await axios.get(`${API}/payments/stats`, {
    headers: getAuthHeader(),
  });
  return response.data;
};
