import axios, { API, getAuthHeader } from "../../lib/axios";

// ─── Warehouses ─────────────────────────────────

export const fetchWarehouses = async () => {
  const response = await axios.get(`${API}/warehouses?page_size=100`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// ─── Products ─────────────────────────────────

export const fetchProducts = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page);
  if (params.page_size) searchParams.append("page_size", params.page_size);
  if (params.category) searchParams.append("category", params.category);
  if (params.subcategory)
    searchParams.append("subcategory", params.subcategory);
  if (params.search) searchParams.append("search", params.search);
  if (params.is_active !== undefined)
    searchParams.append("is_active", params.is_active);
  // Stock filters
  if (params.warehouse_location)
    searchParams.append("warehouse_location", params.warehouse_location);
  if (params.low_stock_only) searchParams.append("low_stock_only", "true");
  if (params.out_of_stock_only)
    searchParams.append("out_of_stock_only", "true");
  if (params.has_stock) searchParams.append("has_stock", "true");

  const response = await axios.get(
    `${API}/products?${searchParams.toString()}`,
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

// Stock Summary
export const fetchStockSummary = async () => {
  const response = await axios.get(`${API}/products/stock-summary`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// Transfer stock between types
export const transferProductStock = async (productId, data) => {
  const response = await axios.post(
    `${API}/products/${productId}/transfer-stock`,
    data,
    {
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
    },
  );
  return response.data;
};

export const createProduct = async (data) => {
  const headers = { ...getAuthHeader() };
  if (!(data instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const response = await axios.post(`${API}/products`, data, { headers });
  return response.data;
};

export const updateProduct = async (id, data) => {
  const headers = { ...getAuthHeader() };
  if (!(data instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const response = await axios.put(`${API}/products/${id}`, data, { headers });
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await axios.delete(`${API}/products/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchProduct = async (id) => {
  const response = await axios.get(`${API}/products/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const bulkUploadProducts = async (data) => {
  const response = await axios.post(`${API}/products/bulk-upload`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// ─── Product Categories ─────────────────────────────────

export const fetchProductCategories = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page);
  if (params.page_size) searchParams.append("page_size", params.page_size);
  if (params.search) searchParams.append("search", params.search);
  if (params.parent_only) searchParams.append("parent_only", "true");
  if (params.parent_id) searchParams.append("parent_id", params.parent_id);
  const response = await axios.get(
    `${API}/products/categories?${searchParams.toString()}`,
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

export const fetchAllCategories = async () => {
  const response = await axios.get(`${API}/products/categories/all`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchCategoryTree = async () => {
  const response = await axios.get(`${API}/products/categories/tree`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchSubcategories = async (parentId) => {
  const response = await axios.get(
    `${API}/products/categories/${parentId}/subcategories`,
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

export const createProductCategory = async (data) => {
  const response = await axios.post(`${API}/products/categories`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

export const updateProductCategory = async (id, data) => {
  const response = await axios.put(`${API}/products/categories/${id}`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

export const deleteProductCategory = async (id) => {
  const response = await axios.delete(`${API}/products/categories/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// ─── Movement Categories ─────────────────────────────────

export const fetchMovementCategories = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page);
  if (params.page_size) searchParams.append("page_size", params.page_size);
  if (params.search) searchParams.append("search", params.search);
  const response = await axios.get(
    `${API}/products/movement-categories?${searchParams.toString()}`,
    { headers: getAuthHeader() },
  );
  return response.data;
};

export const fetchAllMovementCategories = async () => {
  const response = await axios.get(`${API}/products/movement-categories/all`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchMovementCategory = async (id) => {
  const response = await axios.get(
    `${API}/products/movement-categories/${id}`,
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

export const createMovementCategory = async (data) => {
  const response = await axios.post(
    `${API}/products/movement-categories`,
    data,
    {
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
    },
  );
  return response.data;
};

export const updateMovementCategory = async (id, data) => {
  const response = await axios.put(
    `${API}/products/movement-categories/${id}`,
    data,
    {
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
    },
  );
  return response.data;
};

export const deleteMovementCategory = async (id) => {
  const response = await axios.delete(
    `${API}/products/movement-categories/${id}`,
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

// ─── Stock Movements ─────────────────────────────────

export const fetchStockMovements = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page);
  if (params.page_size) searchParams.append("page_size", params.page_size);
  if (params.category_id)
    searchParams.append("category_id", params.category_id);
  if (params.product_id) searchParams.append("product_id", params.product_id);
  if (params.entity_id) searchParams.append("entity_id", params.entity_id);
  if (params.status) searchParams.append("status", params.status);
  if (params.search) searchParams.append("search", params.search);
  const response = await axios.get(
    `${API}/products/movements?${searchParams.toString()}`,
    { headers: getAuthHeader() },
  );
  return response.data;
};

export const fetchStockMovement = async (id) => {
  const response = await axios.get(`${API}/products/movements/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createStockMovement = async (data) => {
  const response = await axios.post(`${API}/products/movements`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

export const updateStockMovement = async (id, data) => {
  const response = await axios.put(`${API}/products/movements/${id}`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

export const updateMovementShipping = async (id, data) => {
  const response = await axios.put(
    `${API}/products/movements/${id}/shipping`,
    data,
    {
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
    },
  );
  return response.data;
};

export const updateMovementReceiving = async (id, data) => {
  const response = await axios.put(
    `${API}/products/movements/${id}/receiving`,
    data,
    {
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
    },
  );
  return response.data;
};

export const deleteStockMovement = async (id) => {
  const response = await axios.delete(`${API}/products/movements/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// ─── Movement Comments ─────────────────────────────────

export const fetchMovementComments = async (movementId, params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page);
  if (params.page_size) searchParams.append("page_size", params.page_size);
  const response = await axios.get(
    `${API}/products/movements/${movementId}/comments?${searchParams.toString()}`,
    { headers: getAuthHeader() },
  );
  return response.data;
};

export const createMovementComment = async (movementId, data) => {
  const response = await axios.post(
    `${API}/products/movements/${movementId}/comments`,
    data,
    { headers: { ...getAuthHeader(), "Content-Type": "application/json" } },
  );
  return response.data;
};

// ─── Low Stock ─────────────────────────────────

export const fetchLowStockProducts = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page);
  if (params.page_size) searchParams.append("page_size", params.page_size);
  const response = await axios.get(
    `${API}/products/low-stock?${searchParams.toString()}`,
    { headers: getAuthHeader() },
  );
  return response.data;
};
