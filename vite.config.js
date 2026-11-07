import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'github-pages' ? '/Senior-Citizen/' : '/',
}))
