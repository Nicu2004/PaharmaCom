import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import path from "path"

const origin = { Origin: 'http://localhost:5173' };

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
   server: {
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true, headers: origin },
      '/clinic-api': {
        target: 'http://localhost:3000', changeOrigin: true, headers: origin,
        rewrite: (p) => p.replace(/^\/clinic-api/, ''),
      },
      '/ai': {
        target: 'http://localhost:8000', changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ai/, ''),
      },
    },
  }
})
