import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  clearScreen: false,
  root: "src",
  base: "./", // Relative paths for Tauri compatibility
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "../dist",
    emptyDir: true,
    target: ["es2021", "chrome100", "safari13"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/index.html"),
        config: resolve(__dirname, "src/config.html"),
      },
    },
  },
  publicDir: "../public",
});
