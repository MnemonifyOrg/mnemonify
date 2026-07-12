import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const CONTENT_SERVER = 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': CONTENT_SERVER,
      '/content': CONTENT_SERVER,
      '/assets': CONTENT_SERVER,
      '/uploads': CONTENT_SERVER,
      '/player': CONTENT_SERVER,
    },
  },
});
