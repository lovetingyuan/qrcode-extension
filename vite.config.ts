import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const srcRoot = resolve(projectRoot, "src");

export default defineConfig({
  publicDir: resolve(projectRoot, "public"),
  plugins: [
    tailwindcss(),
    VitePWA({
      injectRegister: false,
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon.svg", "logo.png"],
      manifest: {
        id: "/",
        name: "QR Code Tool",
        short_name: "QR Tool",
        description:
          "Scan QR codes with your camera or images, and generate QR codes directly in the browser.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0b5d4c",
        theme_color: "#0b5d4c",
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": srcRoot,
      "~": srcRoot,
      "@@": srcRoot,
      "~~": srcRoot,
    },
  },
  build: {
    outDir: resolve(projectRoot, "dist"),
    emptyOutDir: true,
  },
});
