import {defineConfig} from 'vite';

import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {'@': path.resolve(__dirname, 'src')},
    },
    server: {
        host: true,
        port: Number(process.env.CLIENT_CONTAINER_PORT ?? 5173),
        watch: {usePolling: true},
    },
    define: {
        // Pera Wallet i algosdk utilitzen el 'global' de Node.js - polifill per al navegador
        global: 'globalThis',
    },
});
