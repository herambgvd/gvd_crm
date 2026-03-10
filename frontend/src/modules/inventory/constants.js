/**
 * Inventory Module Constants
 * Shared status configurations and enums
 */

// ─── Factory Order Status ─────────────────────────────────
export const FACTORY_ORDER_STATUS = {
  draft: { label: "Draft", variant: "secondary", color: "gray" },
  submitted: { label: "Submitted", variant: "default", color: "blue" },
  confirmed: { label: "Confirmed", variant: "outline", color: "indigo" },
  partially_shipped: {
    label: "Partially Shipped",
    variant: "default",
    color: "cyan",
  },
  shipped: { label: "Shipped", variant: "default", color: "teal" },
  partially_received: {
    label: "Partially Received",
    variant: "default",
    color: "green",
  },
  received: { label: "Received", variant: "success", color: "green" },
  cancelled: { label: "Cancelled", variant: "destructive", color: "red" },
};

// ─── In-Transit Status ─────────────────────────────────
export const IN_TRANSIT_STATUS = {
  pending_pickup: { label: "Pending Pickup", variant: "secondary", color: "gray" },
  in_transit: { label: "In Transit", variant: "default", color: "blue" },
  customs_hold: { label: "Customs Hold", variant: "warning", color: "yellow" },
  out_for_delivery: {
    label: "Out for Delivery",
    variant: "default",
    color: "cyan",
  },
  delivered: { label: "Delivered", variant: "success", color: "green" },
  exception: { label: "Exception", variant: "destructive", color: "red" },
};

// ─── Stock Type ─────────────────────────────────
export const STOCK_TYPE = {
  demo: {
    label: "Demo Stock",
    variant: "secondary",
    color: "bg-purple-500",
    textColor: "text-purple-600",
  },
  sales: {
    label: "Sales Stock",
    variant: "success",
    color: "bg-green-500",
    textColor: "text-green-600",
  },
  rma: {
    label: "RMA Stock",
    variant: "warning",
    color: "bg-orange-500",
    textColor: "text-orange-600",
  },
};

// ─── Stock Movement Type ─────────────────────────────────
export const MOVEMENT_TYPE = {
  goods_received: { label: "Goods Received", color: "text-green-500", variant: "success" },
  rma_received: { label: "RMA Received", color: "text-blue-500", variant: "default" },
  sold: { label: "Sold", color: "text-red-500", variant: "destructive" },
  scrapped: { label: "Scrapped", color: "text-gray-500", variant: "secondary" },
  lost: { label: "Lost", color: "text-red-500", variant: "destructive" },
  rma_returned_to_customer: { label: "Returned to Customer", color: "text-purple-500", variant: "secondary" },
  demo_issued: { label: "Demo Issued", color: "text-cyan-500", variant: "default" },
  demo_returned: { label: "Demo Returned", color: "text-teal-500", variant: "outline" },
  rma_to_sales: { label: "RMA → Sales", color: "text-green-500", variant: "success" },
  rma_scrapped: { label: "RMA Scrapped", color: "text-gray-500", variant: "secondary" },
  adjustment_in: { label: "Adjustment (+)", color: "text-green-500", variant: "outline" },
  adjustment_out: { label: "Adjustment (-)", color: "text-red-500", variant: "outline" },
  stock_take: { label: "Stock Take", color: "text-blue-500", variant: "default" },
};

// ─── RMA Status ─────────────────────────────────
export const RMA_STATUS = {
  received: { label: "Received", variant: "secondary", color: "gray" },
  under_review: {
    label: "Under Review",
    variant: "default",
    color: "blue",
  },
  repairing: { label: "Repairing", variant: "warning", color: "yellow" },
  repaired: { label: "Repaired", variant: "success", color: "green" },
  returned_to_customer: {
    label: "Returned to Customer",
    variant: "success",
    color: "green",
  },
  returned_to_stock: { label: "Returned to Stock", variant: "success", color: "green" },
  scrapped: { label: "Scrapped", variant: "destructive", color: "red" },
};

// ─── Query Keys (for consistent cache management) ─────────────────────────────────
export const QUERY_KEYS = {
  // Lists
  factoryOrders: "factoryOrders",
  inTransitInventory: "inTransitInventory",
  warehouseStock: "warehouseStock",
  stockMovements: "stockMovements",
  demandForecasts: "demandForecasts",
  rmaRecords: "rmaRecords",

  // Summary
  inventorySummary: "inventorySummary",
  stockSummary: "stockSummary",

  // Details (functions for parameterized keys)
  factoryOrderDetail: (id) => ["factoryOrderDetail", id],
  inTransitDetail: (id) => ["inTransitDetail", id],
  warehouseStockDetail: (id) => ["warehouseStockDetail", id],
  productStock: (productId) => ["productStock", productId],
  demandForecastDetail: (id) => ["demandForecastDetail", id],
  rmaDetail: (id) => ["rmaDetail", id],
};

// ─── Stale Time Configuration (in milliseconds) ─────────────────────────────────
export const STALE_TIME = {
  list: 30000, // 30 seconds for list views
  detail: 60000, // 1 minute for detail views
  summary: 60000, // 1 minute for summary/dashboard data
  static: 300000, // 5 minutes for rarely changing data
};

// ─── Pagination Defaults ─────────────────────────────────
export const PAGINATION = {
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100],
};

// ─── Helper Functions ─────────────────────────────────

/**
 * Get status config with fallback
 * @param {object} statusMap - Status configuration map
 * @param {string} status - Status key
 * @returns {object} Status config object
 */
export const getStatusConfig = (statusMap, status) => {
  return (
    statusMap[status] || { label: status, variant: "secondary", color: "gray" }
  );
};

/**
 * Get status options for select dropdown
 * @param {object} statusMap - Status configuration map
 * @param {boolean} includeAll - Include "All" option
 * @returns {Array} Array of { value, label } objects
 */
export const getStatusOptions = (statusMap, includeAll = true) => {
  const options = Object.entries(statusMap).map(([value, config]) => ({
    value,
    label: config.label,
  }));

  if (includeAll) {
    return [{ value: "all", label: "All Statuses" }, ...options];
  }
  return options;
};
