import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/trackit/',
  build: {
    rollupOptions: {
      output: {
        // Split vendor chunks so the app code is smaller
        manualChunks: {
          'vendor-react':   ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Smaller chunks = faster parse on low-end devices
    chunkSizeWarningLimit: 400,
  },
  // Pre-bundle deps for faster dev cold start
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js'],
  },
});
