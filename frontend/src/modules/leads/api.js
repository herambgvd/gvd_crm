import axios, { API, getAuthHeader } from "../../lib/axios";

// ─── Leads ─────────────────────────────────

export const fetchLeads = async (params = {}) => {
  const response = await axios.get(`${API}/leads`, {
    headers: getAuthHeader(),
    params,
  });
  return response.data;
};

export const fetchLeadStats = async () => {
  const response = await axios.get(`${API}/leads/stats`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createLead = async (data) => {
  const response = await axios.post(`${API}/leads`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const updateLead = async (id, data) => {
  const response = await axios.put(`${API}/leads/${id}`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchLead = async (id) => {
  const response = await axios.get(`${API}/leads/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const deleteLead = async (id) => {
  const response = await axios.delete(`${API}/leads/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// ─── Lead Assignments ─────────────────────────────────

export const fetchLeadAssignments = async (leadId) => {
  const response = await axios.get(`${API}/assignments/lead/${leadId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createAssignment = async (data) => {
  const response = await axios.post(`${API}/assignments`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const deleteAssignment = async (assignmentId) => {
  const response = await axios.delete(`${API}/assignments/${assignmentId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// ─── Lead Remarks ─────────────────────────────────

export const fetchLeadRemarks = async (leadId) => {
  const response = await axios.get(`${API}/remarks/lead/${leadId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createRemark = async (data) => {
  const response = await axios.post(`${API}/remarks`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const updateRemark = async (remarkId, data) => {
  const response = await axios.put(`${API}/remarks/${remarkId}`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const deleteRemark = async (remarkId) => {
  const response = await axios.delete(`${API}/remarks/${remarkId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// ─── Lead Comments ─────────────────────────────────

export const fetchLeadComments = async (leadId) => {
  const response = await axios.get(`${API}/comments/lead/${leadId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createComment = async (data) => {
  const response = await axios.post(`${API}/comments`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const updateComment = async (commentId, comment) => {
  const response = await axios.put(`${API}/comments/${commentId}`, null, {
    params: { comment },
    headers: getAuthHeader(),
  });
  return response.data;
};

export const deleteComment = async (commentId) => {
  const response = await axios.delete(`${API}/comments/${commentId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// ─── Lead Documents ─────────────────────────────────

export const fetchLeadDocuments = async (leadId) => {
  const response = await axios.get(`${API}/lead-documents/lead/${leadId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const uploadLeadDocument = async (file, leadId, description) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("lead_id", leadId);
  if (description) formData.append("description", description);

  const response = await axios.post(`${API}/lead-documents`, formData, {
    headers: {
      ...getAuthHeader(),
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const deleteLeadDocument = async (documentId) => {
  const response = await axios.delete(`${API}/lead-documents/${documentId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// ─── Lead Involvements ─────────────────────────────────

export const fetchLeadInvolvements = async (leadId) => {
  const response = await axios.get(`${API}/lead-involvements/lead/${leadId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createLeadInvolvement = async (data) => {
  const response = await axios.post(`${API}/lead-involvements`, data, {
    headers: {
      ...getAuthHeader(),
      "Content-Type": "application/json",
    },
  });
  return response.data;
};

export const updateLeadInvolvement = async (involvementId, data) => {
  const response = await axios.put(
    `${API}/lead-involvements/${involvementId}`,
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

export const deleteLeadInvolvement = async (involvementId) => {
  const response = await axios.delete(
    `${API}/lead-involvements/${involvementId}`,
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

export const linkBusinessModel = async (involvementId, businessData) => {
  const response = await axios.post(
    `${API}/lead-involvements/${involvementId}/link-business-model`,
    businessData,
    {
      headers: {
        ...getAuthHeader(),
        "Content-Type": "application/json",
      },
    },
  );
  return response.data;
};

export const unlinkBusinessModel = async (involvementId, businessData) => {
  const response = await axios.delete(
    `${API}/lead-involvements/${involvementId}/unlink-business-model`,
    {
      data: businessData,
      headers: {
        ...getAuthHeader(),
        "Content-Type": "application/json",
      },
    },
  );
  return response.data;
};
