import apiClient from "./apiClient";

export const getDoctors   = (params) => apiClient.get("/doctors", { params });
export const getDoctorById = (id)    => apiClient.get(`/doctors/${id}`);
