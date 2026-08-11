import apiClient from "./apiClient";
import axios from "axios";

export const login    = (data) => apiClient.post("/auth/login",    data);
export const register = (data) => apiClient.post("/auth/register", data);
export const refresh  = () =>
  axios.post("/api/auth/refresh", null, { withCredentials: true });

export const forgotPassword = (email) =>
  apiClient.post("/auth/forgot-password", { email });
export const resetPassword  = (email, token, password) =>
  apiClient.post("/auth/reset-password", { email, token, password });
