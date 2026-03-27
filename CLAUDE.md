# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WXT-based browser extension for QR code scanning and generation. Currently in early stage — built from the WXT starter template with the core QR features to be implemented.

## Commands

```bash
# Development (hot-reload)
npm run dev            # Chrome/Edge
npm run dev:firefox    # Firefox

# Build
npm run build          # Chrome/Edge
npm run build:firefox  # Firefox

# Package for distribution
npm run zip            # Chrome/Edge
npm run zip:firefox    # Firefox

# Type checking
npm run compile
```

## Architecture

This project follows the [WXT framework](https://wxt.dev/) conventions:

- **`entrypoints/`** — Each file/folder becomes a browser extension entry point. WXT auto-generates the manifest from these.
  - `background.ts` — Background service worker (`defineBackground()`)
  - `content.ts` — Content script injected into pages (`defineContentScript()`)
  - `popup/` — Browser action popup UI (HTML + TS + CSS)
- **`components/`** — Shared reusable components
- **`public/`** — Static assets copied as-is (icons, etc.)
- **`assets/`** — Assets processed by the bundler

## WXT Specifics

- Auto-imports are enabled — `browser`, `defineBackground()`, `defineContentScript()`, `storage`, and UI helpers (`createShadowRootUi`, `createIntegratedUi`, `createIframeUi`) are globally available without imports.
- Path aliases: `@/`, `~/`, `@@/`, `~~/` all resolve to the project root.
- Manifest is generated automatically — do not create `manifest.json` manually. Configure manifest fields in `wxt.config.ts`.
- Build output goes to `.output/` (gitignored).
- The `.wxt/` directory contains generated types and config — do not edit manually.

## Tech Stack

- TypeScript (strict mode) with ESNext target
- WXT (Vite-based build system)
- Vanilla TS (no UI framework currently)
- Multi-browser: Chrome/Edge default, Firefox via `:firefox` script variants

## The rule that must be followed

- A notification must pop up every time a task is completed or user intervention is required. To display the notification, simply execute the following command: `toast -Text "Codex", "notification content"`. There is no need to wait for this command to finish.
