import axios, { API, getAuthHeader } from "../../lib/axios";

// ─── Dashboard ─────────────────────────────────

export const fetchDashboardStats = async () => {
  const response = await axios.get(`${API}/dashboard/stats`, {
    headers: getAuthHeader(),
  });
  return response.data;
};
