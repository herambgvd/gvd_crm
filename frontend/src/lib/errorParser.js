export const parseApiError = (error, fallback = "An unexpected error occurred") => {
  if (!error) return fallback;

  // Axios error with response
  const data = error.response?.data;
  if (data) {
    if (typeof data === "string") return data;
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map(e => e.msg || e.message || String(e)).join(". ");
    }
    if (data.message) return data.message;
  }

  // Network error
  if (error.code === "ERR_NETWORK") return "Network error. Please check your connection.";
  if (error.code === "ECONNABORTED") return "Request timed out. Please try again.";

  return error.message || fallback;
};
