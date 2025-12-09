import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3055,
    host: '0.0.0.0',
    strictPort: true
  },
  preview: {
    port: 3055,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: ['testshop.pp.slavy.space', 'localhost', '127.0.0.1']
  }
})
