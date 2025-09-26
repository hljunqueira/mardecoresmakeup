import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: "react",
      include: "**/*.{jsx,tsx}",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "apps", "web", "src"),
      "@shared": path.resolve(process.cwd(), "packages", "shared"),
      "@assets": path.resolve(process.cwd(), "attached_assets"),
    },
  },
  root: path.resolve(process.cwd(), "apps", "web"),
  build: {
    outDir: "../../dist/public",
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
});
