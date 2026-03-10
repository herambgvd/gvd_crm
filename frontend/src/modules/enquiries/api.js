import axios, { API, getAuthHeader } from "../../lib/axios";

// ─── Enquiries ─────────────────────────────────

export const fetchEnquiries = async (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, value);
    }
  });
  const response = await axios.get(
    `${API}/enquiries?${searchParams.toString()}`,
    { headers: getAuthHeader() },
  );
  return response.data;
};

export const fetchEnquiry = async (id) => {
  const response = await axios.get(`${API}/enquiries/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createEnquiry = async (data) => {
  const response = await axios.post(`${API}/enquiries`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

export const updateEnquiry = async (id, data) => {
  const response = await axios.put(`${API}/enquiries/${id}`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

export const deleteEnquiry = async (id) => {
  const response = await axios.delete(`${API}/enquiries/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const convertEnquiryToLead = async (id, data = {}) => {
  const response = await axios.post(`${API}/enquiries/${id}/convert`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

// ─── Enquiry Remarks ─────────────────────────────────

export const fetchEnquiryRemarks = async (enquiryId) => {
  const response = await axios.get(`${API}/enquiries/${enquiryId}/remarks`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const addEnquiryRemark = async (enquiryId, data) => {
  const response = await axios.post(
    `${API}/enquiries/${enquiryId}/remarks`,
    data,
    { headers: { ...getAuthHeader(), "Content-Type": "application/json" } },
  );
  return response.data;
};

export const deleteEnquiryRemark = async (enquiryId, remarkId) => {
  const response = await axios.delete(
    `${API}/enquiries/${enquiryId}/remarks/${remarkId}`,
    { headers: getAuthHeader() },
  );
  return response.data;
};

// ─── Enquiry Comments ─────────────────────────────────

export const fetchEnquiryComments = async (enquiryId) => {
  const response = await axios.get(`${API}/enquiries/${enquiryId}/comments`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const addEnquiryComment = async (enquiryId, data) => {
  const response = await axios.post(
    `${API}/enquiries/${enquiryId}/comments`,
    data,
    { headers: { ...getAuthHeader(), "Content-Type": "application/json" } },
  );
  return response.data;
};

export const updateEnquiryComment = async (enquiryId, commentId, data) => {
  const response = await axios.put(
    `${API}/enquiries/${enquiryId}/comments/${commentId}`,
    data,
    { headers: { ...getAuthHeader(), "Content-Type": "application/json" } },
  );
  return response.data;
};

export const deleteEnquiryComment = async (enquiryId, commentId) => {
  const response = await axios.delete(
    `${API}/enquiries/${enquiryId}/comments/${commentId}`,
    { headers: getAuthHeader() },
  );
  return response.data;
};
