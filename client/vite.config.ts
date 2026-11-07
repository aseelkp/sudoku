import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // In production the Node server serves both the app and /ws on one origin; mirror that in dev.
    proxy: { '/ws': { target: 'ws://localhost:8787', ws: true } },
  },
});
