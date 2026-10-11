import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:80",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/PROJECT_GIT/xeoo_auditor/backend/api"),
      },
    },
  },
});

