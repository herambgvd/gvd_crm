import axios from "axios";

export const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
export const API = `${BACKEND_URL}/api/v1`;

export const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Axios instance with 30s timeout
export const api = axios.create({ baseURL: API, timeout: 30000 });

// Attach bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── 401 interceptor: silent refresh then retry once ──────────────────────────
let _refreshing = false;
let _refreshQueue = [];

const processQueue = (error, token = null) => {
  _refreshQueue.forEach((cb) => (error ? cb.reject(error) : cb.resolve(token)));
  _refreshQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (_refreshing) {
      return new Promise((resolve, reject) =>
        _refreshQueue.push({ resolve, reject })
      ).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    _refreshing = true;

    try {
      const refresh_token = localStorage.getItem("refresh_token");
      if (!refresh_token) throw new Error("No refresh token");

      const { data } = await axios.post(`${API}/auth/refresh`, { refresh_token });
      const newToken = data.access_token;
      localStorage.setItem("token", newToken);
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (err) {
      processQueue(err, null);
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
      return Promise.reject(err);
    } finally {
      _refreshing = false;
    }
  }
);

// Ensure API URLs end with trailing slash (FastAPI redirect_slashes compatibility)
axios.interceptors.request.use((config) => {
  if (config.url && config.url.includes("/api/v1")) {
    const [path, query] = config.url.split("?");
    if (!path.endsWith("/")) {
      config.url = path + "/" + (query ? `?${query}` : "");
    }
  }
  return config;
});

export default axios;
