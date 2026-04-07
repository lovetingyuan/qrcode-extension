import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const srcRoot = resolve(projectRoot, 'src');

export default defineConfig({
  publicDir: resolve(projectRoot, 'public'),
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      '@': srcRoot,
      '~': srcRoot,
      '@@': srcRoot,
      '~~': srcRoot,
    },
  },
  build: {
    outDir: resolve(projectRoot, 'dist'),
    emptyOutDir: true,
  },
});
