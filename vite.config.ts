import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// Relative base so the same build works at any path, e.g. https://<user>.github.io/plateful/.
export default defineConfig({
  base: "./",
  plugins: [preact()],
  // A new id per build names the offline cache, so every deploy refreshes it (see public/sw.js).
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
    sourcemap: false,
  },
  server: { port: 5173, strictPort: true },
});
