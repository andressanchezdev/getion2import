import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // pruebas (npm test): solo lógica (helpers, selectors, hooks); jsdom da un navegador simulado para los hooks
  // ojo: los tests viven junto al archivo que prueban (nombre.test.ts) y no se tocan global2/ ni features2/
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['src/global2/**', 'src/features2/**', 'node_modules/**'],
  },
})
