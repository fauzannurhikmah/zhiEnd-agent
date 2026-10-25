---
name: zhiend-standards
description: Coding guidelines, architecture conventions, TypeScript safety rules, Svelte 5 component patterns, Hono backend patterns, and Tailwind CSS v4 styling system for zhiEnd Agent.
---

# zhiEnd Agent Architecture & Coding Standards

This skill documents the engineering guidelines, design system, and coding standards for **zhiEnd Agent**. Every component, API endpoint, and module must strictly follow these principles to maintain modularity, clean code, high readability, type safety, and UI consistency.

---

## 1. Tech Stack Overview

- **Frontend**: Svelte 5 + Vite (SPA) + TypeScript
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + Lucide Icons + custom glassmorphism design tokens
- **Backend**: Hono (`@hono/node-server`) in TypeScript
- **Real-Time Communication**: WebSocket / Socket.io server-client bridge
- **AI Core**: Google Antigravity CLI (`agy.exe`) runner with stream-json parsing
- **Remote Integrations**:
  - WhatsApp: `@whiskeysockets/baileys` Multi-Device
  - Telegram: `telegraf` polling
  - Remote Tunnel: `localtunnel` / Cloudflare Quick Tunnel

---

## 2. Directory Structure

```
zhiEnd-agent/
├── .agents/
│   └── skills/
│       └── zhiend-standards/
│           └── SKILL.md
├── src/                          # Svelte 5 Frontend
│   ├── assets/                   # Static icons & logos
│   ├── components/               # Modular UI Components
│   │   ├── header/               # Header, Project Pill, Model Selector, Remote Badges
│   │   ├── chat/                 # Agent Chat Canvas, Streaming Message, Prompt Input, Quick Chips
│   │   ├── git/                  # Git Status, File List, Diff Viewer, Commit Box, Push Modal
│   │   ├── remote/               # WhatsApp QR Card, Telegram Bot Card, Public Tunnel Card
│   │   ├── settings/             # Comprehensive Settings Modal/Tab (All configurations adjustable via UI)
│   │   ├── explorer/             # File Tree Browser & Live Terminal Logs
│   │   └── common/               # GlassCard, Modal, Badge, Button, PinOverlay
│   ├── stores/                   # Svelte stores / state runes for agent, git, remote, config
│   ├── types/                    # Frontend TypeScript interfaces
│   ├── app.css                   # Tailwind CSS v4 entry (@import "tailwindcss")
│   ├── App.svelte                # Root Svelte component
│   └── main.ts                   # Frontend bootstrap
├── server/                       # Hono Backend in TypeScript
│   ├── index.ts                  # Server entry & static file serving
│   ├── config.ts                 # Config loader, persistence & updater
│   ├── types.ts                  # Shared TypeScript types & interfaces
│   ├── runner/
│   │   └── agentRunner.ts        # Antigravity CLI (agy.exe) executor & event emitter
│   ├── git/
│   │   └── gitManager.ts         # Git status, diff, stage, commit, push, branch
│   ├── tunnel/
│   │   └── tunnelManager.ts      # Local IP & Public Tunnel manager
│   ├── bots/
│   │   ├── telegramBot.ts        # Telegram bot controller
│   │   └── whatsappBot.ts        # WhatsApp Baileys controller
│   └── routes/                   # Modular Hono Routes
│       ├── configRoutes.ts
│       ├── projectRoutes.ts
│       ├── gitRoutes.ts
│       ├── agentRoutes.ts
│       ├── botRoutes.ts
│       └── tunnelRoutes.ts
├── data/
│   └── config.json               # Persistent configurations
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite config with Svelte 5 & Tailwind v4
└── package.json
```

---

## 3. TypeScript Guidelines

1. **Strict Type Safety**:
   - Every interface must be explicitly declared in `server/types.ts` or `src/types/`.
   - Never use `any` when a known type or generic union can be used.
   - Use `unknown` with type narrowing (`if (typeof ... === ...)` or Zod-like checks) for external payloads.
2. **Centralized Configuration Interface**:
   ```typescript
   export interface AppConfig {
     port: number;
     securityPin: string;
     activeProject: string;
     recentProjects: string[];
     antigravity: {
       cliPath: string;
       defaultModel: string;
       availableModels: { id: string; name: string }[];
     };
     telegram: {
       enabled: boolean;
       botToken: string;
       allowedUsers: string[];
     };
     whatsapp: {
       enabled: boolean;
       allowedNumbers: string[];
     };
     tunnel: {
       enabled: boolean;
       provider: string;
       subdomain: string;
       publicUrl: string;
     };
   }
   ```
3. **Promise-based Asynchronous Operations**:
   - Always return typed promises for all Git, Bot, and Agent executions (e.g. `Promise<GitStatus>`, `Promise<CommandResult>`).

---

## 4. Svelte 5 Conventions

1. **Use Svelte 5 Runes**:
   - Use `$state()` for reactive variables.
   - Use `$derived()` for computed state (e.g., staged files count, filtered models).
   - Use `$effect()` for DOM side-effects (e.g., auto-scrolling chat viewport, syntax highlighting).
2. **Props Definition**:
   - Define props using runes: `let { title, active = false }: { title: string; active?: boolean } = $props();`
3. **Modular Components**:
   - Keep components under 250 lines. Split large screens into subcomponents inside `src/components/`.

---

## 5. Hono Backend Conventions

1. **Modular Route Grouping**:
   - Group routes logically using `new Hono()`, then mount them in `server/index.ts`:
     ```typescript
     const app = new Hono();
     app.route('/api/config', configRoutes);
     app.route('/api/git', gitRoutes);
     app.route('/api/agent', agentRoutes);
     app.route('/api/bots', botRoutes);
     app.route('/api/tunnel', tunnelRoutes);
     ```
2. **Context & JSON Handling**:
   - Use `c.json({ success: true, data })` for consistent API envelopes.
   - Return appropriate HTTP status codes: `200` OK, `400` Bad Request, `401` Unauthorized (PIN required), `409` Conflict (Agent busy), `500` Internal Error.
3. **Security PIN Middleware**:
   - Protect all mutating `/api/*` endpoints with security PIN verification when a PIN is configured in settings.

---

## 6. UI & Tailwind CSS v4 Design Tokens

1. **Aesthetics & Palette**:
   - **Background Primary**: Deep Slate / Obsidian (`bg-slate-950` or `#090d16`).
   - **Background Cards / Glass**: `bg-slate-900/70 backdrop-blur-md border border-slate-800/80`.
   - **Accents**:
     - Indigo / Primary: `indigo-500` & `indigo-600`
     - Emerald / Success / Git Push: `emerald-500` & `emerald-600`
     - Violet / AI & Antigravity: `violet-500`
     - Sky / Links & Diff: `sky-400` & `sky-500`
     - Rose / Danger / Delete: `rose-500`
     - Amber / Warning / Git Modified: `amber-500`
2. **Typography**:
   - Primary: `font-sans` ('Inter', system-ui).
   - Code & Terminal: `font-mono` ('JetBrains Mono', 'Fira Code', monospace).
3. **Consistency**:
   - All interactive elements must have smooth hover and focus transitions (`transition-all duration-200`).
   - All modal dialogs must have a darkened, blurred backdrop (`backdrop-blur-sm bg-black/60`).
