import axios, { API, getAuthHeader } from "../../lib/axios";

const BASE = `${API}/tasks`;

export const fetchTasks = async (params = {}) => {
  const { data } = await axios.get(BASE, { headers: getAuthHeader(), params });
  return data;
};

export const fetchCalendarTasks = async (start, end) => {
  const { data } = await axios.get(`${BASE}/calendar`, {
    headers: getAuthHeader(),
    params: { start, end },
  });
  return data;
};

export const fetchTask = async (id) => {
  const { data } = await axios.get(`${BASE}/${id}`, { headers: getAuthHeader() });
  return data;
};

export const createTask = async (payload) => {
  const { data } = await axios.post(BASE, payload, { headers: getAuthHeader() });
  return data;
};

export const updateTask = async (id, payload) => {
  const { data } = await axios.put(`${BASE}/${id}`, payload, { headers: getAuthHeader() });
  return data;
};

export const deleteTask = async (id) => {
  const { data } = await axios.delete(`${BASE}/${id}`, { headers: getAuthHeader() });
  return data;
};

export const fetchComments = async (taskId) => {
  const { data } = await axios.get(`${BASE}/${taskId}/comments`, { headers: getAuthHeader() });
  return data;
};

export const createComment = async (taskId, comment) => {
  const { data } = await axios.post(
    `${BASE}/${taskId}/comments`,
    { comment },
    { headers: getAuthHeader() }
  );
  return data;
};

export const deleteComment = async (taskId, commentId) => {
  const { data } = await axios.delete(`${BASE}/${taskId}/comments/${commentId}`, {
    headers: getAuthHeader(),
  });
  return data;
};

export const uploadTaskAttachment = async (taskId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await axios.post(`${BASE}/${taskId}/upload`, formData, {
    headers: { ...getAuthHeader(), "Content-Type": "multipart/form-data" },
  });
  return data;
};
