import axios, { API, getAuthHeader } from "../../lib/axios";

// ─── Support Tickets ─────────────────────────────────

export const fetchTickets = async (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== "all"
    ) {
      searchParams.append(key, value);
    }
  });
  const response = await axios.get(
    `${API}/support/tickets?${searchParams.toString()}`,
    { headers: getAuthHeader() },
  );
  return response.data;
};

export const fetchTicketStats = async () => {
  const response = await axios.get(`${API}/support/tickets/stats`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchTicket = async (ticketId) => {
  const response = await axios.get(`${API}/support/tickets/${ticketId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createTicket = async (data) => {
  const response = await axios.post(`${API}/support/tickets`, data, {
    headers: {
      ...getAuthHeader(),
      "Content-Type": "application/json",
    },
  });
  return response.data;
};

export const updateTicket = async (ticketId, data) => {
  const response = await axios.put(`${API}/support/tickets/${ticketId}`, data, {
    headers: {
      ...getAuthHeader(),
      "Content-Type": "application/json",
    },
  });
  return response.data;
};

export const deleteTicket = async (ticketId) => {
  const response = await axios.delete(`${API}/support/tickets/${ticketId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const getTicketMetrics = async (ticketId) => {
  const response = await axios.get(
    `${API}/support/tickets/${ticketId}/metrics`,
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};
