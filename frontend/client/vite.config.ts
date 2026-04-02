import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    proxy: {
      "/api": "http://127.0.0.1:5000",
      "/collab": {
        target: "ws://127.0.0.1:4444",
        ws: true,
        rewrite: (path) => path.replace(/^\/collab/, ""),
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("react-markdown") || id.includes("remark-") || id.includes("rehype-") || id.includes("highlight.js")) {
            return "markdown-vendor";
          }

          if (
            id.includes("/antd/") ||
            id.includes("@ant-design") ||
            id.includes("/rc-") ||
            id.includes("/@rc-component/")
          ) {
            return "antd-vendor";
          }

          if (id.includes("react-router") || id.includes("@tanstack/react-query")) {
            return "app-vendor";
          }
        },
      },
    },
  },
});

