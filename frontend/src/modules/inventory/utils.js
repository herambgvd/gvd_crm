/**
 * Inventory Module Utility Functions
 * Shared formatters and helpers to avoid code duplication
 */

/**
 * Format a date string to localized format
 * @param {string|Date} dateStr - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (dateStr, options = {}) => {
  if (!dateStr) return "-";
  const defaultOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  };
  return new Date(dateStr).toLocaleDateString("en-IN", defaultOptions);
};

/**
 * Format a date string with time
 * @param {string|Date} dateStr - Date to format
 * @returns {string} Formatted date-time string
 */
export const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: INR)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = "INR") => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

/**
 * Get currency symbol from currency code
 * @param {string} currency - Currency code (default: INR)
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (currency = "INR") => {
  const symbols = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    AUD: "A$",
    CAD: "C$",
    SGD: "S$",
    AED: "د.إ",
  };
  return symbols[currency] || currency;
};

/**
 * Format a number with Indian locale
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return "0";
  return new Intl.NumberFormat("en-IN").format(num);
};

/**
 * Build search params from object, filtering out empty values
 * @param {object} params - Parameters to convert
 * @returns {URLSearchParams} Search params object
 */
export const buildSearchParams = (params) => {
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
  return searchParams;
};

/**
 * Calculate total items from a list of items with quantities
 * @param {Array} items - Array of items with quantity field
 * @param {string} quantityField - Name of quantity field
 * @returns {number} Total quantity
 */
export const calculateTotalQuantity = (items, quantityField = "quantity") => {
  if (!Array.isArray(items)) return 0;
  return items.reduce(
    (sum, item) => sum + (Number(item[quantityField]) || 0),
    0,
  );
};

/**
 * Get relative time description (e.g., "2 days ago")
 * @param {string|Date} dateStr - Date to compare
 * @returns {string} Relative time string
 */
export const getRelativeTime = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

/**
 * Generate a unique client-side ID
 * @returns {string} Unique ID
 */
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Deep clone an object
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if a value is empty (null, undefined, empty string, empty array)
 * @param {any} value - Value to check
 * @returns {boolean} True if empty
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "object" && Object.keys(value).length === 0) return true;
  return false;
};
