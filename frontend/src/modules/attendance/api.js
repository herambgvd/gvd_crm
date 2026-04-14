import axios, { API, getAuthHeader } from "../../lib/axios";

const BASE = `${API}/attendance`;

export const punchIn = async (coords = {}) => {
  const { data } = await axios.post(`${BASE}/punch-in`, coords, { headers: getAuthHeader() });
  return data;
};

export const punchOut = async (coords = {}) => {
  const { data } = await axios.post(`${BASE}/punch-out`, coords, { headers: getAuthHeader() });
  return data;
};

export const fetchToday = async () => {
  const { data } = await axios.get(`${BASE}/today`, { headers: getAuthHeader() });
  return data;
};

export const fetchMyHistory = async (params = {}) => {
  const { data } = await axios.get(`${BASE}/my`, { headers: getAuthHeader(), params });
  return data;
};

export const fetchTeamAttendance = async (params = {}) => {
  const { data } = await axios.get(`${BASE}/team`, { headers: getAuthHeader(), params });
  return data;
};

export const fetchAllAttendance = async (params = {}) => {
  const { data } = await axios.get(`${BASE}/all`, { headers: getAuthHeader(), params });
  return data;
};

export const exportAttendance = async (params = {}) => {
  const response = await axios.get(`${BASE}/export`, {
    headers: getAuthHeader(),
    params,
    responseType: "blob",
  });
  // Trigger download
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `attendance_${params.scope || "my"}_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const updateAttendanceRecord = async (id, data) => {
  const { data: result } = await axios.put(`${BASE}/${id}`, data, { headers: getAuthHeader() });
  return result;
};

export const deleteAttendanceRecord = async (id) => {
  const { data } = await axios.delete(`${BASE}/${id}`, { headers: getAuthHeader() });
  return data;
};
