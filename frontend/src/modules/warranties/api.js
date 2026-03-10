import axios, { API, getAuthHeader } from "../../lib/axios";

// ─── Warranties ─────────────────────────────────

export const fetchWarranties = async () => {
  const response = await axios.get(`${API}/warranties`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchWarranty = async (id) => {
  const response = await axios.get(`${API}/warranties/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createWarranty = async (data) => {
  const response = await axios.post(`${API}/warranties`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const updateWarranty = async (id, data) => {
  const response = await axios.put(`${API}/warranties/${id}`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const deleteWarranty = async (id) => {
  const response = await axios.delete(`${API}/warranties/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};
