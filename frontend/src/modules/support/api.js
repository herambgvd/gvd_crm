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

// ─── Ticket Lifecycle ─────────────────────────────────

export const startTroubleshooting = async (ticketId, assignedTo) => {
  const response = await axios.patch(
    `${API}/support/tickets/${ticketId}/status`,
    {
      status: "troubleshooting",
      assigned_to: assignedTo,
    },
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

export const escalateTicket = async (ticketId) => {
  const response = await axios.patch(
    `${API}/support/tickets/${ticketId}/status`,
    {
      status: "escalated",
    },
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

export const resolveTicket = async (ticketId) => {
  const response = await axios.patch(
    `${API}/support/tickets/${ticketId}/status`,
    {
      status: "resolved",
    },
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

export const requestCustomerFeedback = async (ticketId) => {
  const response = await axios.post(
    `${API}/support/tickets/${ticketId}/request-feedback`,
    null,
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

export const closeTicket = async (ticketId) => {
  const response = await axios.post(
    `${API}/support/tickets/${ticketId}/close`,
    null,
    {
      headers: getAuthHeader(),
    },
  );
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

// ─── Issue Logging ─────────────────────────────────

export const createIssueLogging = async (ticketId, data) => {
  const response = await axios.post(
    `${API}/support/tickets/${ticketId}/issue-logging`,
    data,
    {
      headers: {
        ...getAuthHeader(),
        "Content-Type": "application/json",
      },
    },
  );
  return response.data;
};

export const updateIssueLogging = async (ticketId, loggingId, data) => {
  const response = await axios.put(
    `${API}/support/tickets/${ticketId}/issue-logging/${loggingId}`,
    data,
    {
      headers: {
        ...getAuthHeader(),
        "Content-Type": "application/json",
      },
    },
  );
  return response.data;
};

// ─── System Environment ─────────────────────────────────

export const createSystemEnvironment = async (ticketId, data) => {
  const response = await axios.post(
    `${API}/support/tickets/${ticketId}/system-environment`,
    data,
    {
      headers: {
        ...getAuthHeader(),
        "Content-Type": "application/json",
      },
    },
  );
  return response.data;
};

export const updateSystemEnvironment = async (ticketId, envId, data) => {
  const response = await axios.put(
    `${API}/support/tickets/${ticketId}/system-environment/${envId}`,
    data,
    {
      headers: {
        ...getAuthHeader(),
        "Content-Type": "application/json",
      },
    },
  );
  return response.data;
};

// ─── Troubleshooting Actions ─────────────────────────────────

export const addTroubleshootingAction = async (ticketId, data) => {
  const response = await axios.post(
    `${API}/support/tickets/${ticketId}/troubleshooting-actions`,
    data,
    {
      headers: {
        ...getAuthHeader(),
        "Content-Type": "application/json",
      },
    },
  );
  return response.data;
};

export const fetchTroubleshootingActions = async (ticketId) => {
  const response = await axios.get(
    `${API}/support/tickets/${ticketId}/troubleshooting-actions`,
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

// ─── Escalation ─────────────────────────────────

export const createEscalation = async (ticketId, data) => {
  const response = await axios.post(
    `${API}/support/tickets/${ticketId}/escalations`,
    data,
    {
      headers: {
        ...getAuthHeader(),
        "Content-Type": "application/json",
      },
    },
  );
  return response.data;
};

export const updateEscalation = async (ticketId, escalationId, data) => {
  const response = await axios.put(
    `${API}/support/tickets/${ticketId}/escalations/${escalationId}`,
    data,
    {
      headers: {
        ...getAuthHeader(),
        "Content-Type": "application/json",
      },
    },
  );
  return response.data;
};

// ─── Resolution ─────────────────────────────────

export const createResolution = async (ticketId, data) => {
  const response = await axios.post(
    `${API}/support/tickets/${ticketId}/resolution`,
    data,
    {
      headers: {
        ...getAuthHeader(),
        "Content-Type": "application/json",
      },
    },
  );
  return response.data;
};

// ─── Customer Feedback ─────────────────────────────────

export const createCustomerFeedback = async (ticketId, data) => {
  const response = await axios.post(
    `${API}/support/tickets/${ticketId}/customer-feedback`,
    data,
    {
      headers: {
        ...getAuthHeader(),
        "Content-Type": "application/json",
      },
    },
  );
  return response.data;
};

export const updateCustomerFeedback = async (ticketId, feedbackId, data) => {
  const response = await axios.put(
    `${API}/support/tickets/${ticketId}/customer-feedback/${feedbackId}`,
    data,
    {
      headers: {
        ...getAuthHeader(),
        "Content-Type": "application/json",
      },
    },
  );
  return response.data;
};
