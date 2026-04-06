import axios, { API, getAuthHeader } from "../../lib/axios";

export const fetchImportableEntities = async () => {
  const response = await axios.get(`${API}/import/entities`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const previewFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axios.post(`${API}/import/preview`, formData, {
    headers: { ...getAuthHeader(), "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const executeImport = async (file, entityType, columnMapping) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("entity_type", entityType);
  formData.append("column_mapping_json", JSON.stringify(columnMapping));
  const response = await axios.post(`${API}/import/execute`, formData, {
    headers: { ...getAuthHeader(), "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const previewGoogleSheet = async (url) => {
  const response = await axios.post(
    `${API}/import/google-sheets/preview`,
    { url },
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const executeGoogleSheetImport = async (url, entityType, columnMapping) => {
  const response = await axios.post(
    `${API}/import/google-sheets/execute`,
    { url, entity_type: entityType, column_mapping: columnMapping },
    { headers: getAuthHeader() }
  );
  return response.data;
};
