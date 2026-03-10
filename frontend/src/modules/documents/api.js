import axios, { API, BACKEND_URL, getAuthHeader } from "../../lib/axios";

// ─── Documents ─────────────────────────────────

export { BACKEND_URL };

export const fetchDocuments = async (entityType, entityId) => {
  let url = `${API}/documents`;
  const params = [];
  if (entityType) params.push(`entity_type=${entityType}`);
  if (entityId) params.push(`entity_id=${entityId}`);
  if (params.length) url += `?${params.join("&")}`;

  const response = await axios.get(url, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const uploadDocument = async (file, entityType, entityId) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post(
    `${API}/documents/upload?entity_type=${entityType}&entity_id=${entityId}`,
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
