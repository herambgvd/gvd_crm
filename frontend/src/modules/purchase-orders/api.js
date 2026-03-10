import axios, { API, getAuthHeader } from "../../lib/axios";

// ─── Purchase Orders ─────────────────────────────────

export const fetchPurchaseOrders = async (params = {}) => {
  const response = await axios.get(`${API}/purchase-orders`, {
    headers: getAuthHeader(),
    params,
  });
  return response.data;
};

export const fetchPurchaseOrderStats = async () => {
  const response = await axios.get(`${API}/purchase-orders/stats`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchPurchaseOrder = async (id) => {
  const response = await axios.get(`${API}/purchase-orders/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createPurchaseOrder = async (data) => {
  const response = await axios.post(`${API}/purchase-orders`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const updatePurchaseOrder = async (id, data) => {
  const response = await axios.put(`${API}/purchase-orders/${id}`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const deletePurchaseOrder = async (id) => {
  const response = await axios.delete(`${API}/purchase-orders/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const uploadPODocument = async (poId, file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post(
    `${API}/purchase-orders/${poId}/upload-document`,
    formData,
    {
      headers: {
        ...getAuthHeader(),
      },
    },
  );
  return response.data;
};
