import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: resolve(projectRoot, 'entrypoints/popup'),
  publicDir: resolve(projectRoot, 'public'),
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      '@': projectRoot,
      '~': projectRoot,
      '@@': projectRoot,
      '~~': projectRoot,
    },
  },
  build: {
    outDir: resolve(projectRoot, 'dist'),
    emptyOutDir: true,
  },
});
