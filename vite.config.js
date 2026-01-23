import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Finans - Controle Pessoal',
        short_name: 'Finans',
        description: 'Seu controle financeiro inteligente',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'https://api.iconify.design/lucide:wallet.svg?color=%237c3aed',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'https://api.iconify.design/lucide:wallet.svg?color=%237c3aed',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
})