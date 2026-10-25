---
name: zhiend-standards
description: Coding guidelines, architecture conventions, TypeScript safety rules, Svelte 5 component patterns, Hono backend patterns, Tailwind CSS v4 styling system, and Cinematic Minimalist UI hierarchy for zhiEnd Agent.
---

# zhiEnd Agent Architecture & Coding Standards

This skill documents the engineering guidelines, design system, and coding standards for **zhiEnd Agent**. Every component, API endpoint, and module must strictly follow these principles to maintain modularity, clean code, high readability, type safety, and UI consistency.

---

## 1. Tech Stack Overview

- **Frontend**: Svelte 5 + Vite (SPA) + TypeScript
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + Lucide Icons + Cinematic Minimalist design tokens
- **Backend**: Hono (`@hono/node-server`) in TypeScript
- **Real-Time Communication**: WebSocket / Socket.io server-client bridge
- **AI Core**: Google Antigravity CLI (`agy.exe`) runner with stream-json parsing
- **Remote Integrations**:
  - WhatsApp: `@whiskeysockets/baileys` Multi-Device
  - Telegram: `telegraf` polling
  - Remote Tunnel: `localtunnel` / Cloudflare Quick Tunnel

---

## 2. Project Directory & Workspace Standards

1. **Default Works Directory**:
   - The default project workspace root is `D:\Works`.
   - The system must automatically scan all projects and subdirectories inside `D:\Works` up to depth 2 (detecting Git repos, `package.json`, or root project folders).
   - When creating a new project via UI, the default target path must be `D:\Works\<project-name>`, automatically creating the directory and initializing git if requested.
   - Manual path input must always remain available for directories outside drive `D:\`.

---

## 3. UI Design System & Strict Color Hierarchy (Cinematic Minimalist)

To avoid dull, monochrome looks while preventing random or inconsistent colors, all UI elements must adhere to this hierarchy:

### A. Color Hierarchy Tokens

1. **Primary (Brand & Main Actions)**:
   - **Gradient**: `from-indigo-500 via-indigo-600 to-violet-600`
   - **Text Accent**: `text-indigo-400` / `text-violet-400`
   - **Glow / Shadow**: `shadow-lg shadow-indigo-500/20`
   - **Usage**: Primary CTA buttons (Send, Push to GitHub, Create Project), active indicators, brand logo icon, focused borders.

2. **Secondary (Surfaces & Structural Elements)**:
   - **Canvas Background**: Deep Midnight Obsidian (`#08090d` / `bg-zinc-950`) with an ambient radial lighting mesh (`radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.12), transparent 70%)`).
   - **Cards & Panels**: Glass panels with subtle backdrop blur: `bg-zinc-900/60 backdrop-blur-xl border border-white/[0.07] hover:border-white/[0.14]`.
   - **Secondary Buttons**: `bg-zinc-800/60 hover:bg-zinc-700/70 border border-zinc-700/50 text-zinc-200`.

3. **Tertiary (Supporting Text & Dividers)**:
   - **Labels / Hints**: `text-zinc-400` and `text-zinc-500 font-mono`.
   - **Borders & Dividers**: `border-zinc-800/60`.

4. **Semantic Status Colors (Strict)**:
   - **Success / Clean / Synced**: Emerald (`text-emerald-400`, `bg-emerald-500/10`, `border-emerald-500/25`).
   - **In-Progress / Busy / Untracked**: Amber (`text-amber-400`, `bg-amber-500/10`, `border-amber-500/25`).
   - **Danger / Destructive / Cancel**: Rose (`text-rose-400`, `bg-rose-500/10`, `border-rose-500/25`).
   - **Info / Branch / Remote Link**: Sky (`text-sky-400`, `bg-sky-500/10`, `border-sky-500/25`).

### B. Cinematic Aesthetics Rules
- **Hero Headlines**: Use gradient text clipping `bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent font-bold`.
- **Card Ambient Elevation**: Use subtle gradient borders and inset highlights rather than flat gray rectangles.
- **Action Buttons**: Important primary action buttons must have a cinematic gradient fill with active press animations (`active:scale-95 transition-all`).

---

## 4. TypeScript & Architecture Guidelines

1. **Strict Type Safety**:
   - Declare explicit types in `server/types.ts` and `src/types/index.ts`. No untyped objects or implicit `any`.
2. **Svelte 5 Runes**:
   - Use `$state()` for reactive data.
   - Use `$derived()` for computed values.
   - Use `$effect()` for DOM side-effects.
3. **Hono Route Organization**:
   - Modular routes, JSON envelope consistency, and security PIN validation middleware on `/api/*`.
