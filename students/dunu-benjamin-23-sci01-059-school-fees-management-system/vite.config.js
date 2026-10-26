import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const api = 'http://localhost:4000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Same-origin proxy, so the session cookie stays SameSite=Strict and first-party.
    proxy: {
      '/api': { target: api, changeOrigin: false },
      '/sandbox-gateway': { target: api, changeOrigin: false },
    },
  },
})
