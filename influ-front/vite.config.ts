import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Las librerías van aparte: el código del demo cambia, ellas no.
        // El marketplace (Fase 2) va en su propio archivo: Fase 1 carga sin él.
        manualChunks: (id) =>
          /node_modules\/(react|react-dom|react-router|react-router-dom|zustand|scheduler)\//.test(id) ? "react"
            : /node_modules\/(recharts|d3-|victory-vendor)/.test(id) ? "graficas"
              : id.includes("/src/market/") ? "marketplace" : undefined,
      },
    },
  },
  resolve: {
    alias: [{ find: "@", replacement: path.resolve(__dirname, "src") }],
  },
});
