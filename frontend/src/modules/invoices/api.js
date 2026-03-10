import axios, { API, getAuthHeader } from "../../lib/axios";

// ─── Invoices ─────────────────────────────────

export const fetchInvoices = async (params = {}) => {
  const response = await axios.get(`${API}/invoices`, {
    headers: getAuthHeader(),
    params,
  });
  return response.data;
};

export const fetchInvoice = async (id) => {
  const response = await axios.get(`${API}/invoices/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createInvoice = async (data) => {
  const response = await axios.post(`${API}/invoices`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const updateInvoice = async (id, data) => {
  const response = await axios.put(`${API}/invoices/${id}`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const deleteInvoice = async (id) => {
  const response = await axios.delete(`${API}/invoices/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchInvoiceStats = async () => {
  const response = await axios.get(`${API}/invoices/stats`, {
    headers: getAuthHeader(),
  });
  return response.data;
};
