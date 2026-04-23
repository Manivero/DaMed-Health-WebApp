import apiClient from "./apiClient";

export const getMyProfile  = ()     => apiClient.get("/profile/me");
export const updateProfile = (data) => apiClient.put("/profile/me", data);
export const changePassword = (data) => apiClient.put("/profile/password", data);
export const getMyStats    = ()     => apiClient.get("/profile/stats");
