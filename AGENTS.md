# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Vite-based web app for QR code scanning and generation. The app runs entirely in the browser and can be deployed as a static site to Cloudflare.

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview

# Type checking
npm run compile

# Deploy static assets to Cloudflare
npm run deploy
```

## Architecture

This project follows standard Vite conventions:

- **`src/`** — Main web application source
  - `main.ts` — App bootstrap and UI behavior
  - `templates.ts` — HTML template rendering
  - `style.css` — Tailwind and app-specific styles
  - `components/` — QR generation and scanning logic
  - `utils/` — i18n, storage, and browser helpers
- **`public/`** — Static assets copied as-is (icons, etc.)
- **`assets/`** — Repository assets such as screenshots
- **`wrangler.jsonc`** — Cloudflare static deployment config for `dist/`

## Tech Stack

- TypeScript (strict mode) with ESNext target
- Vite
- Vanilla TS (no JS framework currently)
- CSS & UI, using tailwindcss and daisyui which is a UI library based on tailwindcss
- Cloudflare Wrangler for static deployment
