import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Polling keeps hot reload reliable inside OneDrive-synced folders.
  server: { port: 5173, watch: { usePolling: true, interval: 300 } },
});
