import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../assets",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "src/main.jsx"),
      output: {
        format: "iife",
        entryFileNames: "main.js",
        assetFileNames: "[name][extname]"
      }
    }
  },
})
