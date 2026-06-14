import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // The largest chunk (@atproto/api) is loaded on demand, not on first paint,
    // so the default 500 kB warning would be a false alarm.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split large, stable vendor libraries into their own chunks so they
        // cache independently of app code and download in parallel.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          atproto: ['@atproto/api'],
          icons: [
            '@fortawesome/fontawesome-svg-core',
            '@fortawesome/free-brands-svg-icons',
            '@fortawesome/free-solid-svg-icons',
            '@fortawesome/react-fontawesome',
          ],
        },
      },
    },
  },
})
