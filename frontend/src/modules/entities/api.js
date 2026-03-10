import axios, { API, getAuthHeader } from "../../lib/axios";

// ─── Entities ─────────────────────────────────

export const fetchEntities = async (params = {}) => {
  const searchParams = new URLSearchParams();

  // Support old usage: fetchEntities("consultant") or fetchEntities()
  if (typeof params === "string") {
    if (params) searchParams.append("entity_type", params);
    searchParams.append("page_size", "100");
  } else {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, value);
      }
    });
    // Default large page for non-paginated callers (e.g. EnquiryForm)
    if (!searchParams.has("page_size")) searchParams.append("page_size", "100");
  }

  const response = await axios.get(
    `${API}/entities?${searchParams.toString()}`,
    { headers: getAuthHeader() },
  );
  return response.data;
};

export const searchEntities = async (q, limit = 10) => {
  const response = await axios.get(
    `${API}/entities/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    { headers: getAuthHeader() },
  );
  return response.data;
};

export const createEntity = async (data) => {
  const response = await axios.post(`${API}/entities`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const updateEntity = async (id, data) => {
  const response = await axios.put(`${API}/entities/${id}`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const deleteEntity = async (id) => {
  const response = await axios.delete(`${API}/entities/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchEntity = async (id) => {
  const response = await axios.get(`${API}/entities/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const bulkUploadEntities = async (data) => {
  const response = await axios.post(`${API}/entities/bulk-upload`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};
