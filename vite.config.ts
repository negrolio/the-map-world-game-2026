import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const portFromEnv = process.env.PORT ? Number(process.env.PORT) : undefined
const devServerPort = portFromEnv && !Number.isNaN(portFromEnv) ? portFromEnv : 5173

/** GitHub Pages usa subpath; Vercel (`vercel dev` / deploy) sirve desde la raíz. */
const appBase = process.env.VERCEL === '1' ? '/' : '/the-map-world-game-2026/'

// https://vite.dev/config/
export default defineConfig({
  base: appBase,
  plugins: [react(), tailwindcss()],
  server: {
    // Escuchar en LAN (celular / otra PC en el mismo WiFi), no solo localhost
    host: true,
    // `vercel dev` asigna PORT; Vite debe escuchar ahí o falla la detección de puerto
    port: devServerPort,
    strictPort: portFromEnv !== undefined,
  },
})
