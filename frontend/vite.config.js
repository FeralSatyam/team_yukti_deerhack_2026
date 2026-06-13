import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// During development the frontend talks to the orchestrator through a same-
// origin "/api" proxy. This sidesteps CORS and keeps the session cookie
// first-party regardless of which port Vite ends up on. Override the target
// with VITE_PROXY_TARGET if the backend runs elsewhere.
const API_TARGET = process.env.VITE_PROXY_TARGET || "http://localhost:5000";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
