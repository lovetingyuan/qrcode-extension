import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    permissions: ['activeTab', 'clipboardWrite', 'storage'],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  webExt: {
    startUrls: ['https://tingyuan.in'],
  },
})
