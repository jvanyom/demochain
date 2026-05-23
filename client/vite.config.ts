import path from 'path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: { '@': path.resolve(__dirname, 'src') }
	},
	server: {
		host: true,
		port: Number(process.env['CLIENT_CONTAINER_PORT'] ?? 5173),
		watch: { usePolling: true }
	},
	define: {
		// Pera Wallet i algosdk utilitzen el 'global' de Node.js - polifill per al navegador
		global: 'globalThis'
	}
})
