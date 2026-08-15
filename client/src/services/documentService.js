import apiClient from "./apiClient";

export const listDocuments = (params = {}) => apiClient.get("/documents", { params });

export const uploadDocument = (file, category) => {
  const formData = new FormData();
  formData.append("file", file);
  if (category) formData.append("category", category);
  return apiClient.post("/documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// responseType: "blob" — обязателен, иначе axios попытается распарсить бинарные данные как текст/JSON.
export const downloadDocument = (id) =>
  apiClient.get(`/documents/${id}/download`, { responseType: "blob" });

export const deleteDocument = (id) => apiClient.delete(`/documents/${id}`);
