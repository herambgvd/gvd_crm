import axios, { API, getAuthHeader } from "../../lib/axios";

// ─── BOQs ─────────────────────────────────

export const fetchBOQs = async (params = {}) => {
  const response = await axios.get(`${API}/boqs`, {
    headers: getAuthHeader(),
    params,
  });
  return response.data;
};

export const fetchBOQ = async (id) => {
  const response = await axios.get(`${API}/boqs/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createBOQ = async (data) => {
  const response = await axios.post(`${API}/boqs`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const updateBOQ = async (id, data) => {
  const response = await axios.put(`${API}/boqs/${id}`, data, {
    headers: {
      ...getAuthHeader(),
      "Content-Type": "application/json",
    },
  });
  return response.data;
};

export const deleteBOQ = async (id) => {
  const response = await axios.delete(`${API}/boqs/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};
