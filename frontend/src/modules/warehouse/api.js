import axios, { API, getAuthHeader } from "../../lib/axios";

// Fetch warehouses with filters
export const fetchWarehouses = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page);
  if (params.page_size) searchParams.append("page_size", params.page_size);
  if (params.search) searchParams.append("search", params.search);
  if (params.is_active !== undefined)
    searchParams.append("is_active", params.is_active);

  const response = await axios.get(
    `${API}/warehouses?${searchParams.toString()}`,
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

// Fetch single warehouse
export const fetchWarehouse = async (id) => {
  const response = await axios.get(`${API}/warehouses/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// Create warehouse
export const createWarehouse = async (data) => {
  const response = await axios.post(`${API}/warehouses`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

// Update warehouse
export const updateWarehouse = async (id, data) => {
  const response = await axios.put(`${API}/warehouses/${id}`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

// Delete warehouse
export const deleteWarehouse = async (id) => {
  const response = await axios.delete(`${API}/warehouses/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};
