import axios from "axios";
import { getAccessToken, getRefreshToken, saveAuth, logout } from "../utils/auth";

const apiClient = axios.create({ baseURL: "/api" });

// Attach access token
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) =>
    error ? prom.reject(error) : prom.resolve(token)
  );
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) { logout(); window.location.href = "/login"; return Promise.reject(error); }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post("/api/auth/refresh", { refreshToken });
        const { accessToken } = res.data;
        // Patch stored auth preserving other fields
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        saveAuth({ ...stored, accessToken, refreshToken });
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch (err) {
        processQueue(err, null);
        logout();
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
