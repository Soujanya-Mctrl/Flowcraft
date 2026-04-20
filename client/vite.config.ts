import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React ecosystem
          'vendor-react': ['react', 'react-dom', 'react-router-dom', 'recoil'],
          // Diagram rendering engines
          'vendor-mermaid': ['mermaid'],
          'vendor-cytoscape': ['cytoscape'],
          // Code editor
          'vendor-codemirror': ['@uiw/react-codemirror'],
          // Firebase
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // Utilities
          'vendor-utils': ['@panzoom/panzoom', 'dompurify', 'marked', 'uuid', 'prismjs'],
          // Animation
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
})
