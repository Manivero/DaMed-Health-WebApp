import apiClient from "./apiClient";

export const bookAppointment   = (data) => apiClient.post("/booking/confirm", data);
export const payAndBook        = (data) => apiClient.post("/booking/pay",     data);
export const getMyAppointments = ()     => apiClient.get("/booking/my");
export const getDoctorAppointments = () => apiClient.get("/booking/doctor/my");
export const cancelAppointment = (id)  => apiClient.delete(`/booking/${id}`);
export const verifyPaymentSession = (sessionId) =>
  apiClient.get(`/booking/verify/${encodeURIComponent(sessionId)}`);
