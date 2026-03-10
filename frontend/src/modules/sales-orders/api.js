import axios, { API, getAuthHeader } from "../../lib/axios";

// ─── Sales Orders ─────────────────────────────────

export const fetchSalesOrders = async (params = {}) => {
  const response = await axios.get(`${API}/sales-orders`, {
    headers: getAuthHeader(),
    params,
  });
  return response.data;
};

export const fetchSalesOrderStats = async () => {
  const response = await axios.get(`${API}/sales-orders/stats`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchSalesOrder = async (id) => {
  const response = await axios.get(`${API}/sales-orders/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createSalesOrder = async (data) => {
  const response = await axios.post(`${API}/sales-orders`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const updateSalesOrder = async (id, data) => {
  const response = await axios.put(`${API}/sales-orders/${id}`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const deleteSalesOrder = async (id) => {
  const response = await axios.delete(`${API}/sales-orders/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const previewPOFromBOQ = async (boqId) => {
  const response = await axios.get(`${API}/sales-orders/preview/${boqId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const generatePOTemplate = async (orderId) => {
  const response = await axios.get(`${API}/sales-orders/template/${orderId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};
