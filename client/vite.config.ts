import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: { usePolling: true },
  },
  define: {
    // Pera Wallet and algosdk use Node.js's `global` — polyfill it for the browser
    global: 'globalThis',
  },
});
