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

export const searchEntities = async (q, limit = 10, entityType = null) => {
  const params = new URLSearchParams({ q: q || "", limit });
  if (entityType) params.append("entity_type", entityType);
  const response = await axios.get(
    `${API}/entities/search?${params.toString()}`,
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

export const bulkDeleteEntities = async (ids) => {
  const response = await axios.post(`${API}/entities/bulk-delete`, { ids }, {
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

// ─── Team Members ─────────────────────────────────

export const fetchTeamMembers = async (entityId) => {
  const response = await axios.get(`${API}/entities/${entityId}/team-members`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createTeamMember = async (entityId, data) => {
  const response = await axios.post(
    `${API}/entities/${entityId}/team-members`,
    { ...data, entity_id: entityId },
    { headers: getAuthHeader() },
  );
  return response.data;
};

export const updateTeamMember = async (entityId, memberId, data) => {
  const response = await axios.put(
    `${API}/entities/${entityId}/team-members/${memberId}`,
    data,
    { headers: getAuthHeader() },
  );
  return response.data;
};

export const deleteTeamMember = async (entityId, memberId) => {
  const response = await axios.delete(
    `${API}/entities/${entityId}/team-members/${memberId}`,
    { headers: getAuthHeader() },
  );
  return response.data;
};
