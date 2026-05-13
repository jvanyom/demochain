import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
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
