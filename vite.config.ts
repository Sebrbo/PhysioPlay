import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({ base: './', plugins: [react(), VitePWA({
  registerType: 'prompt', injectRegister: 'auto',
  manifest: { name: 'PhysioPlay', short_name: 'PhysioPlay', description: 'Bouger · Jouer · Progresser', lang: 'fr', start_url: './', scope: './', display: 'standalone', theme_color: '#102c40', background_color: '#eef4f6', icons: [{src:'icon.svg', sizes:'any', type:'image/svg+xml', purpose:'any'}] },
  workbox: { globPatterns: ['**/*.{js,css,html,svg,wasm,task}'], maximumFileSizeToCacheInBytes: 15000000 }
})] });
