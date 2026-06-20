import apiClient from "./apiClient";
import axios from "axios";

export const login    = (data) => apiClient.post("/auth/login",    data);
export const register = (data) => apiClient.post("/auth/register", data);
export const refresh  = () =>
  axios.post("/api/auth/refresh", null, { withCredentials: true });
