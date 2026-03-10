import axios, { API, BACKEND_URL, getAuthHeader } from "../../lib/axios";

// ─── User Management ─────────────────────────────────

export const fetchUsers = async () => {
  const response = await axios.get(`${BACKEND_URL}/api/v1/auth/users`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchUserById = async (userId) => {
  const response = await axios.get(
    `${BACKEND_URL}/api/v1/auth/users/${userId}`,
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

export const createUser = async (data) => {
  const response = await axios.post(`${BACKEND_URL}/api/v1/auth/users`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

export const updateUser = async (userId, data) => {
  const response = await axios.put(
    `${BACKEND_URL}/api/v1/auth/users/${userId}`,
    data,
    {
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
    },
  );
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await axios.delete(
    `${BACKEND_URL}/api/v1/auth/users/${userId}`,
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

export const updateUserPassword = async (userId, passwordData) => {
  const response = await axios.put(
    `${BACKEND_URL}/api/v1/auth/users/${userId}/password`,
    passwordData,
    {
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
    },
  );
  return response.data;
};

// ─── Roles Management ─────────────────────────────────

export const fetchRoles = async () => {
  const response = await axios.get(`${BACKEND_URL}/api/v1/auth/roles`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchRoleById = async (roleId) => {
  const response = await axios.get(
    `${BACKEND_URL}/api/v1/auth/roles/${roleId}`,
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

export const fetchPermissions = async () => {
  const response = await axios.get(`${BACKEND_URL}/api/v1/auth/permissions`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createRole = async (data) => {
  const response = await axios.post(`${BACKEND_URL}/api/v1/auth/roles`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

export const updateRole = async (roleId, data) => {
  const response = await axios.put(
    `${BACKEND_URL}/api/v1/auth/roles/${roleId}`,
    data,
    {
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
    },
  );
  return response.data;
};

export const deleteRole = async (roleId) => {
  const response = await axios.delete(
    `${BACKEND_URL}/api/v1/auth/roles/${roleId}`,
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

// ─── Teams Management ─────────────────────────────────

export const fetchTeams = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page);
  if (params.page_size) searchParams.append("page_size", params.page_size);
  if (params.search) searchParams.append("search", params.search);
  const qs = searchParams.toString();
  const url = `${BACKEND_URL}/api/v1/teams${qs ? `?${qs}` : ""}`;
  const response = await axios.get(url, { headers: getAuthHeader() });
  return response.data;
};

export const fetchTeam = async (teamId) => {
  const response = await axios.get(`${BACKEND_URL}/api/v1/teams/${teamId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createTeam = async (data) => {
  const response = await axios.post(`${BACKEND_URL}/api/v1/teams`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

export const updateTeam = async (teamId, data) => {
  const response = await axios.put(
    `${BACKEND_URL}/api/v1/teams/${teamId}`,
    data,
    { headers: { ...getAuthHeader(), "Content-Type": "application/json" } },
  );
  return response.data;
};

export const deleteTeam = async (teamId) => {
  const response = await axios.delete(`${BACKEND_URL}/api/v1/teams/${teamId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// ─── Templates Management ─────────────────────────────────

export const fetchTemplates = async (templateType = null) => {
  const url = templateType
    ? `${BACKEND_URL}/api/v1/templates?template_type=${templateType}`
    : `${BACKEND_URL}/api/v1/templates`;
  const response = await axios.get(url, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchTemplate = async (templateId) => {
  const response = await axios.get(
    `${BACKEND_URL}/api/v1/templates/${templateId}`,
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

export const fetchTemplateById = fetchTemplate;

export const fetchDefaultTemplate = async (templateType) => {
  const response = await axios.get(
    `${BACKEND_URL}/api/v1/templates/default/${templateType}`,
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

export const createTemplate = async (data) => {
  let templateData;
  let headers = getAuthHeader();

  if (data instanceof FormData) {
    const templateFields = {};
    for (let [key, value] of data.entries()) {
      if (!key.endsWith("_image")) {
        templateFields[key] = value;
      }
    }
    templateData = templateFields;
    headers["Content-Type"] = "application/json";
    templateData = JSON.stringify(templateData);
  } else {
    templateData = data;
    headers["Content-Type"] = "application/json";
  }

  const response = await axios.post(
    `${BACKEND_URL}/api/v1/templates`,
    templateData,
    { headers },
  );

  if (data instanceof FormData) {
    const templateId = response.data.id;

    const headerImage = data.get("header_image");
    if (headerImage && headerImage.size > 0) {
      await uploadTemplateImage(templateId, "header", headerImage);
    }

    const footerImage = data.get("footer_image");
    if (footerImage && footerImage.size > 0) {
      await uploadTemplateImage(templateId, "footer", footerImage);
    }
  }

  return response.data;
};

export const updateTemplate = async (templateId, data) => {
  let templateData;
  let headers = getAuthHeader();

  if (data instanceof FormData) {
    const templateFields = {};
    for (let [key, value] of data.entries()) {
      if (!key.endsWith("_image")) {
        templateFields[key] = value;
      }
    }
    templateData = templateFields;
    headers["Content-Type"] = "application/json";
    templateData = JSON.stringify(templateFields);
  } else {
    templateData = data;
    headers["Content-Type"] = "application/json";
  }

  const response = await axios.put(
    `${BACKEND_URL}/api/v1/templates/${templateId}`,
    templateData,
    { headers },
  );

  if (data instanceof FormData) {
    const headerImage = data.get("header_image");
    if (headerImage && headerImage.size > 0) {
      await uploadTemplateImage(templateId, "header", headerImage);
    }

    const footerImage = data.get("footer_image");
    if (footerImage && footerImage.size > 0) {
      await uploadTemplateImage(templateId, "footer", footerImage);
    }
  }

  return response.data;
};

export const uploadTemplateImage = async (templateId, imageType, file) => {
  const formData = new FormData();
  formData.append("file", file);

  const endpoint = imageType === "header" ? "upload-header" : "upload-footer";
  const response = await axios.post(
    `${BACKEND_URL}/api/v1/templates/${templateId}/${endpoint}`,
    formData,
    {
      headers: {
        ...getAuthHeader(),
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
};

export const deleteTemplate = async (templateId) => {
  const response = await axios.delete(
    `${BACKEND_URL}/api/v1/templates/${templateId}`,
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

export const uploadTemplateHeaderImage = async (templateId, file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post(
    `${BACKEND_URL}/api/v1/templates/${templateId}/upload-header`,
    formData,
    {
      headers: {
        ...getAuthHeader(),
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
};

export const uploadTemplateFooterImage = async (templateId, file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post(
    `${BACKEND_URL}/api/v1/templates/${templateId}/upload-footer`,
    formData,
    {
      headers: {
        ...getAuthHeader(),
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
};

// ─── Config Management ─────────────────────────────────

export const fetchConfig = async () => {
  const response = await axios.get(`${BACKEND_URL}/api/v1/config`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const updateConfig = async (data) => {
  const response = await axios.put(`${BACKEND_URL}/api/v1/config`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};
