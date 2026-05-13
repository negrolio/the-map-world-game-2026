import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/the-map-world-game-2026/',
  plugins: [react(), tailwindcss()],
  server: {
    // Escuchar en LAN (celular / otra PC en el mismo WiFi), no solo localhost
    host: true,
  },
})
