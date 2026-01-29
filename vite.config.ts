import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  base: "./", // Relative paths for Tauri compatibility
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  build: {
    target: ["es2021", "chrome100", "safari13"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
