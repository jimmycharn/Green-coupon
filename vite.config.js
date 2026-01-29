import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        basicSsl() // Enable HTTPS with self-signed certificate
    ],
    server: {
        host: true, // Enable network access
        port: 5173,
        https: true,
    }
})
