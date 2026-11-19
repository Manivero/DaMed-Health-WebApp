import axios from "axios";
import { getAccessToken, saveAuth, logout } from "../utils/auth";

const apiClient = axios.create({ baseURL: "/api", withCredentials: true });

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

    // 401 на /auth/login — не истёкшая сессия, а неверные учётные данные: пользователю надо показать сообщение
    // сервера. Раньше такой 401 уходил в обновление токена; оно проваливалось (у гостя нет refresh-cookie), и
    // перехватчик делал logout() + window.location.href = "/login" — страница молча перезагружалась, а
    // пользователь не видел, что пароль неверный.
    const isLoginRequest = original.url?.includes("/auth/login");
    if (error.response?.status === 401 && !original._retry && !original.url?.includes("/auth/refresh") && !isLoginRequest) {
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
        // refreshToken не передаётся явно — браузер сам приложит httpOnly
        // cookie благодаря withCredentials: true.
        const res = await axios.post("/api/auth/refresh", null, { withCredentials: true });
        const { accessToken } = res.data;
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        saveAuth({ ...stored, accessToken });
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
