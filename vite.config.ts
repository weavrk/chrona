import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/hrefs/chrona/' : '/',
  server: {
    port: 8002,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
}))

