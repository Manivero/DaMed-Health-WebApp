import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      // Сигнальный сервер WebRTC (T018) — тот же принцип, что и /api: без этого правила
      // Socket.io-клиент в dev-режиме стучался бы в сам Vite (5173), а не в backend (5000).
      // ws:true — обязателен для апгрейда до WebSocket-транспорта, не только long-polling.
      "/socket.io": {
        target: "http://localhost:5000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        // Vite 8 использует бандлер Rolldown, которому нужна функция вместо
        // объектной формы manualChunks (которую понимал только классический Rollup).
        // Группировка чанков ниже сохраняет исходный смысл: vendor / router / motion.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("node_modules/react-router-dom")) return "router";
          if (id.includes("node_modules/framer-motion")) return "motion";
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/")
          ) {
            return "vendor";
          }
        },
      },
    },
  },
});
