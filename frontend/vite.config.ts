import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1', // Заставляем Vite слушать прямой IPv4 адрес
    port: 5173
  }
})