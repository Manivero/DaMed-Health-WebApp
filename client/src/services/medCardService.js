import apiClient from "./apiClient";

export const getMedFiles   = ()     => apiClient.get("/medcard/files");
export const uploadMedFile = (data) => apiClient.post("/medcard/upload", data, {
  headers: { "Content-Type": "multipart/form-data" },
});
export const deleteMedFile = (id)   => apiClient.delete(`/medcard/files/${id}`);
export const downloadUrl   = (id)   => `/api/medcard/files/${id}/download`;
