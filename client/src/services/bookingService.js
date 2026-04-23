import apiClient from "./apiClient";

export const bookAppointment   = (data) => apiClient.post("/booking/confirm", data);
export const payAndBook        = (data) => apiClient.post("/booking/pay",     data);
export const getMyAppointments = ()     => apiClient.get("/booking/my");
export const cancelAppointment = (id)  => apiClient.delete(`/booking/${id}`);
