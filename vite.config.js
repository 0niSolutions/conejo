import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import adminApi from './admin-api.js'

export default defineConfig({
  plugins: [react(), tailwindcss(), adminApi()],
  build: {
    // Dos páginas: la web (/) y el panel (/admin/), cada una con su propio código.
    rollupOptions: {
      input: { main: 'index.html', admin: 'admin/index.html' },
    },
  },
})
