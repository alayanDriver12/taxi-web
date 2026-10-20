import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const here = p => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: here('./web'),
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss({ config: here('./tailwind.config.js') }), autoprefixer()] } },
  build: {
    outDir: here('./dist'),
    emptyOutDir: true,
    // Dos páginas: la web (index.html) y la guía de Sevilla para clientes (guia.html → /guia)
    rollupOptions: { input: { main: here('./web/index.html'), guia: here('./web/guia.html') } }
  },
  // `npm run dev:web` (con `npm run dev` en otra terminal): la API la sirve Express
  server: { proxy: { '/api': 'http://localhost:3000', '/uploads': 'http://localhost:3000' } }
});
