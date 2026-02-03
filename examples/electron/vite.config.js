import { defineConfig } from 'vite';
import pulsePlugin from '../../loader/vite-plugin.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [pulsePlugin()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html')
    }
  },
  resolve: {
    alias: {
      'pulse-js-framework': resolve(__dirname, '../..')
    }
  },
  server: {
    port: 5173
  }
});
