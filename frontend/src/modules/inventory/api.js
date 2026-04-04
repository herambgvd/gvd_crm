import axios, { API, getAuthHeader } from "../../lib/axios";

// ─── Factory Orders ─────────────────────────────────

export const fetchFactoryOrders = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page);
  if (params.page_size) searchParams.append("page_size", params.page_size);
  if (params.status) searchParams.append("status", params.status);
  if (params.search) searchParams.append("search", params.search);
  if (params.factory_name)
    searchParams.append("factory_name", params.factory_name);
  if (params.sop_id) searchParams.append("sop_id", params.sop_id);
  if (params.current_state_id)
    searchParams.append("current_state_id", params.current_state_id);

  const response = await axios.get(
    `${API}/inventory/factory-orders?${searchParams.toString()}`,
    { headers: getAuthHeader() },
  );
  return response.data;
};

export const fetchFactoryOrder = async (id) => {
  const response = await axios.get(`${API}/inventory/factory-orders/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createFactoryOrder = async (data) => {
  const response = await axios.post(`${API}/inventory/factory-orders`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

export const updateFactoryOrder = async (id, data) => {
  const response = await axios.put(
    `${API}/inventory/factory-orders/${id}`,
    data,
    {
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
    },
  );
  return response.data;
};

export const submitFactoryOrder = async (id) => {
  const response = await axios.post(
    `${API}/inventory/factory-orders/${id}/submit`,
    {},
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

export const confirmFactoryOrder = async (id) => {
  const response = await axios.post(
    `${API}/inventory/factory-orders/${id}/confirm`,
    {},
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

export const cancelFactoryOrder = async (id) => {
  const response = await axios.post(
    `${API}/inventory/factory-orders/${id}/cancel`,
    {},
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

export const deleteFactoryOrder = async (id) => {
  const response = await axios.delete(`${API}/inventory/factory-orders/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// ─── In-Transit Inventory ─────────────────────────────────

export const fetchInTransitShipments = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page);
  if (params.page_size) searchParams.append("page_size", params.page_size);
  if (params.status) searchParams.append("status", params.status);
  if (params.search) searchParams.append("search", params.search);

  const response = await axios.get(
    `${API}/inventory/in-transit?${searchParams.toString()}`,
    { headers: getAuthHeader() },
  );
  return response.data;
};

export const fetchInTransitShipment = async (id) => {
  const response = await axios.get(`${API}/inventory/in-transit/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createInTransitShipment = async (data) => {
  const response = await axios.post(`${API}/inventory/in-transit`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

export const updateInTransitShipment = async (id, data) => {
  const response = await axios.put(`${API}/inventory/in-transit/${id}`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

export const deleteInTransitShipment = async (id) => {
  const response = await axios.delete(`${API}/inventory/in-transit/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const receiveInTransitShipment = async (id, data) => {
  const response = await axios.post(
    `${API}/inventory/in-transit/${id}/receive`,
    data,
    {
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
    },
  );
  return response.data;
};

// ─── Warehouse Stock (Uses Products Collection) ─────────────────────────────────

export const fetchInventorySummary = async () => {
  const response = await axios.get(`${API}/products/stock-summary`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchWarehouseStock = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page);
  if (params.page_size) searchParams.append("page_size", params.page_size);
  if (params.warehouse_location)
    searchParams.append("warehouse_location", params.warehouse_location);
  if (params.low_stock_only) searchParams.append("low_stock_only", "true");
  if (params.out_of_stock_only)
    searchParams.append("out_of_stock_only", "true");
  if (params.has_stock) searchParams.append("has_stock", "true");
  if (params.search) searchParams.append("search", params.search);

  const response = await axios.get(
    `${API}/products?${searchParams.toString()}`,
    { headers: getAuthHeader() },
  );
  return response.data;
};

export const fetchWarehouseStockById = async (id) => {
  const response = await axios.get(`${API}/products/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchWarehouseStockByProduct = async (productId) => {
  const response = await axios.get(`${API}/products/${productId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const updateWarehouseStock = async (id, data) => {
  const response = await axios.put(`${API}/products/${id}`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

export const transferStock = async (data) => {
  // data: { product_id, from_stock_type, to_stock_type, quantity, reason, notes }
  const response = await axios.post(`${API}/inventory/stock-transfer`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

export const partialReceiveShipment = async ({ id, data }) => {
  // data: { items: [{ product_id, quantity_received }], notes }
  const response = await axios.post(
    `${API}/inventory/in-transit/${id}/partial-receive`,
    data,
    {
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
    },
  );
  return response.data;
};

// ─── Stock Movements ─────────────────────────────────

export const fetchStockMovements = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page);
  if (params.page_size) searchParams.append("page_size", params.page_size);
  if (params.product_id) searchParams.append("product_id", params.product_id);
  if (params.movement_type)
    searchParams.append("movement_type", params.movement_type);
  if (params.reference_type)
    searchParams.append("reference_type", params.reference_type);
  if (params.search) searchParams.append("search", params.search);

  const response = await axios.get(
    `${API}/inventory/stock-movements?${searchParams.toString()}`,
    { headers: getAuthHeader() },
  );
  return response.data;
};

export const fetchStockMovement = async (id) => {
  const response = await axios.get(`${API}/inventory/stock-movements/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// ─── Demand Forecasts ─────────────────────────────────

export const fetchDemandForecasts = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page);
  if (params.page_size) searchParams.append("page_size", params.page_size);
  if (params.is_converted !== undefined)
    searchParams.append("is_converted", params.is_converted);
  if (params.product_id) searchParams.append("product_id", params.product_id);
  if (params.forecast_period)
    searchParams.append("forecast_period", params.forecast_period);

  const response = await axios.get(
    `${API}/inventory/demand-forecasts?${searchParams.toString()}`,
    { headers: getAuthHeader() },
  );
  return response.data;
};

export const fetchDemandForecast = async (id) => {
  const response = await axios.get(`${API}/inventory/demand-forecasts/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createDemandForecast = async (data) => {
  const response = await axios.post(`${API}/inventory/demand-forecasts`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

export const updateDemandForecast = async (id, data) => {
  const response = await axios.put(
    `${API}/inventory/demand-forecasts/${id}`,
    data,
    {
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
    },
  );
  return response.data;
};

export const convertForecastToOrder = async (id, data) => {
  const response = await axios.post(
    `${API}/inventory/demand-forecasts/${id}/convert`,
    data,
    {
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
    },
  );
  return response.data;
};

export const deleteDemandForecast = async (id) => {
  const response = await axios.delete(
    `${API}/inventory/demand-forecasts/${id}`,
    {
      headers: getAuthHeader(),
    },
  );
  return response.data;
};

// ─── RMA Records ─────────────────────────────────

export const fetchRmaRecords = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", params.page);
  if (params.page_size) searchParams.append("page_size", params.page_size);
  if (params.status) searchParams.append("status", params.status);
  if (params.entity_id) searchParams.append("entity_id", params.entity_id);
  if (params.assigned_to) searchParams.append("assigned_to", params.assigned_to);
  if (params.is_warranty !== undefined)
    searchParams.append("is_warranty", params.is_warranty);
  if (params.sop_id) searchParams.append("sop_id", params.sop_id);
  if (params.current_state_id)
    searchParams.append("current_state_id", params.current_state_id);

  const response = await axios.get(
    `${API}/inventory/rma?${searchParams.toString()}`,
    { headers: getAuthHeader() },
  );
  return response.data;
};

export const fetchRmaRecord = async (id) => {
  const response = await axios.get(`${API}/inventory/rma/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createRma = async (data) => {
  const response = await axios.post(`${API}/inventory/rma`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

export const updateRma = async (id, data) => {
  const response = await axios.put(`${API}/inventory/rma/${id}`, data, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
  });
  return response.data;
};

export const startRmaRepair = async (id) => {
  const response = await axios.post(
    `${API}/inventory/rma/${id}/start-repair`,
    {},
    { headers: getAuthHeader() },
  );
  return response.data;
};

export const completeRmaRepair = async (id, resolutionNotes) => {
  const params = resolutionNotes
    ? `?resolution_notes=${encodeURIComponent(resolutionNotes)}`
    : "";
  const response = await axios.post(
    `${API}/inventory/rma/${id}/complete-repair${params}`,
    {},
    { headers: getAuthHeader() },
  );
  return response.data;
};

export const returnRmaToStock = async (id, data) => {
  // data: { stock_type: "sales" | "demo", notes }
  const response = await axios.post(
    `${API}/inventory/rma/${id}/return-to-stock`,
    data,
    { headers: { ...getAuthHeader(), "Content-Type": "application/json" } },
  );
  return response.data;
};

export const returnRmaToCustomer = async (id, data) => {
  // data: { tracking_number, notes }
  const response = await axios.post(
    `${API}/inventory/rma/${id}/return-to-customer`,
    data,
    { headers: { ...getAuthHeader(), "Content-Type": "application/json" } },
  );
  return response.data;
};

export const scrapRmaItem = async (id, notes) => {
  const params = notes ? `?notes=${encodeURIComponent(notes)}` : "";
  const response = await axios.post(
    `${API}/inventory/rma/${id}/scrap${params}`,
    {},
    { headers: getAuthHeader() },
  );
  return response.data;
};

