import axios, { API, getAuthHeader } from "../../lib/axios";

// ────────────────── SOP CRUD ──────────────────

export const fetchSOPs = async (params = {}) => {
  const response = await axios.get(`${API}/workflow-engine/sops`, {
    headers: getAuthHeader(),
    params,
  });
  return response.data;
};

export const fetchSOPsByModule = async (module) => {
  const response = await axios.get(
    `${API}/workflow-engine/sops/module/${module}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const fetchSOP = async (id) => {
  const response = await axios.get(`${API}/workflow-engine/sops/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createSOP = async (data) => {
  const response = await axios.post(`${API}/workflow-engine/sops`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const updateSOP = async (id, data) => {
  const response = await axios.put(`${API}/workflow-engine/sops/${id}`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const deleteSOP = async (id) => {
  const response = await axios.delete(`${API}/workflow-engine/sops/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// ────────────────── Transitions ──────────────────

export const executeTransition = async (data) => {
  const response = await axios.post(
    `${API}/workflow-engine/transitions/execute`,
    data,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const fetchAvailableTransitions = async (recordType, recordId) => {
  const response = await axios.get(
    `${API}/workflow-engine/transitions/available/${recordType}/${recordId}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const fetchTransitionLogs = async (recordType, recordId) => {
  const response = await axios.get(
    `${API}/workflow-engine/transitions/logs/${recordType}/${recordId}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

// ────────────────── Assignment ──────────────────

export const assignSOP = async (recordType, recordId, data) => {
  const response = await axios.post(
    `${API}/workflow-engine/assign/${recordType}/${recordId}`,
    data,
    { headers: getAuthHeader() }
  );
  return response.data;
};

// ────────────────── Stats ──────────────────

export const fetchWorkflowStats = async (module, sopId) => {
  const response = await axios.get(
    `${API}/workflow-engine/stats/${module}`,
    { headers: getAuthHeader(), params: { sop_id: sopId } }
  );
  return response.data;
};
