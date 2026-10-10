import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Build natijasi — bitta HTML fayl (JS va CSS ichida), uni ikki marta bosib ochish mumkin
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  base: './',
  server: { port: 5180 },
})
