import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Dev server pinned to port 3000 to match the server's CLIENT_ORIGIN
// (see SERVER_PLAN.md §9). strictPort fails loudly instead of silently
// hopping to another port, which would break CORS + the refresh cookie.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    open: false,
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
});
