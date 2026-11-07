---
name: zhiend-architecture
description: Software architecture conventions, tech stack specs, TypeScript safety rules, Svelte 5 runes patterns, Hono backend routes, security PIN middleware, workspace standards, and media pipelines for zhiEnd Agent.
---

# zhiEnd Agent — Software Architecture & Engineering Standards

This skill documents the engineering guidelines, system architecture, TypeScript conventions, backend patterns, and data flow standards for **zhiEnd Agent**. Every component, module, API route, and server process must strictly follow these principles to guarantee high modularity, rock-solid type safety, security, and developer ergonomics.

---

## 1. Tech Stack Overview & Module Responsibilities

The application is structured as a full-stack local/remote AI agent platform:

- **Frontend (SPA)**:
  - Framework: **Svelte 5** (`$state`, `$derived`, `$props`, `$effect` runes)
  - Bundler: **Vite** with `@sveltejs/vite-plugin-svelte`
  - Language: **TypeScript** (strict mode)
  - State Architecture: Unified client services (`api.ts`, `dialog.svelte.ts`, `markdown.ts`)
- **Backend (Server & Daemon)**:
  - Framework: **Hono** running on `@hono/node-server`
  - Language: **TypeScript** with `tsx` / compiled Node.js runtime
  - Real-Time Communication: **WebSocket & Socket.io** bidirectional event bridge (`agent:stream`, `terminal:log`, `status:change`)
  - AI Engine: Google Antigravity CLI (`agy.exe`) runner with streaming JSON parser
- **Remote Hub & Tunnel Integrations**:
  - WhatsApp: `@whiskeysockets/baileys` Multi-Device socket connection
  - Telegram: `telegraf` polling bot engine
  - Internet Tunnel: `localtunnel` / Cloudflare Quick Tunnel provider

---

## 2. Project Directory & Workspace Standards

1. **Default Root Directory (`D:\Works`)**:
   - The default workspace root for all repositories and code projects is **`D:\Works`**.
   - The backend system automatically scans all subdirectories inside `D:\Works` up to **depth 2**, detecting Git repositories (`.git`), `package.json`, or root folders.
   - When creating a new project via the UI, the default target path must be `D:\Works\<project-name>`. The server must automatically create the folder and run `git init` if requested.
   - Manual path input must always remain available for external directories outside drive `D:\`.

2. **Hierarchical Tree Patterns**:
   - Folders and workspaces must be organized hierarchically: parent folders (e.g., `D:\Works\Parent`) with child subfolders (`├── child-a`, `└── child-b`), both individually selectable as active workspaces.
   - Switching workspace updates `config.activeProject` and triggers an automatic git status & file tree refresh.

---

## 3. TypeScript & Svelte 5 Coding Standards

### A. Strict Type Safety
- **No Untyped Objects**: All interfaces and types must be explicitly declared in:
  - Backend: `server/types.ts`
  - Frontend: `src/types/index.ts`
- **Zero Implicit `any`**: Functions, event handlers, and API payloads must have explicit type annotations.

### B. Svelte 5 Runes Standard Patterns
Always use modern Svelte 5 runes. Never use legacy Svelte 3/4 syntax (`let` variables as reactive state, `$:`, or `writable` stores for local component state):

1. **Reactive State**:
   ```svelte
   <script lang="ts">
     let isLoading = $state(false);
     let searchQuery = $state('');
   </script>
   ```
2. **Computed / Derived Values**:
   ```svelte
   <script lang="ts">
     let filteredItems = $derived(() => {
       if (!searchQuery.trim()) return items;
       return items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
     });
   </script>
   ```
3. **Component Props**:
   ```svelte
   <script lang="ts">
     let {
       title,
       isOpen = false,
       onClose
     }: {
       title: string;
       isOpen?: boolean;
       onClose: () => void;
     } = $props();
   </script>
   ```
4. **DOM Side Effects**:
   ```svelte
   <script lang="ts">
     $effect(() => {
       if (isOpen && inputElement) {
         inputElement.focus();
       }
     });
   </script>
   ```

### C. Custom Dialogs & Universal Dialog Service
- **STRICT PROHIBITION OF NATIVE BROWSER DIALOGS**:
  - **NEVER** use `window.alert()`, `confirm()`, or `prompt()`. They break the immersive design, block the main browser thread, and degrade UX.
- **Universal Dialog Service (`src/services/dialog.svelte.ts`)**:
  - Always use `dialog.showConfirm(...)` paired with `ConfirmModal.svelte`.
  - Always use `dialog.showSuccess(...)`, `dialog.showError(...)`, `dialog.showWarning(...)`, or `dialog.showInfo(...)` paired with `NoticeModal.svelte`.

### D. No Native OS `<select>` Dropdowns
- Never use ugly native OS `<select>` / `<option>` elements.
- Always implement custom floating popover dropdowns with glassmorphism (`backdrop-blur-2xl`), badge pills, active indicators, keyboard navigation, and click-outside dismissal.

---

## 4. Hono Server & API Route Architecture

1. **Modular Routes (`server/routes/`)**:
   - `server/routes/agent.ts`: Task execution, cancelation, CLI streaming, session logs.
   - `server/routes/git.ts`: Git status, diff, stage, unstage, commit, push, pull.
   - `server/routes/config.ts`: System config, persona management, API keys.
   - `server/routes/remote.ts`: WhatsApp Baileys socket, Telegram bot, tunnel controls.
   - `server/routes/media.ts`: Secure local image & artifact streaming gateway.

2. **Consistent JSON Envelopes**:
   All endpoints must return structured JSON envelopes:
   ```ts
   // Success
   return c.json({ success: true, data: result });
   // Error
   return c.json({ success: false, error: errorMessage }, status || 400);
   ```

3. **Security PIN Middleware**:
   - When a Security PIN is configured in `config.securityPin`, all mutating `/api/*` endpoints (except auth verification `/api/auth/verify`) must validate the `X-Security-Pin` header or cookie.
   - Unauthorized requests must return `401 Unauthorized` with `{ success: false, error: 'Unauthorized: Security PIN required' }`.

4. **Process Tree Lifecycle**:
   - Child processes spawned by the agent (e.g. `agy.exe`, `npm run dev`) must be tracked by PID.
   - On cancelation or restart, processes must be cleanly terminated using `tree-kill` to prevent orphaned background processes on Windows.

---

## 5. Static Asset & Media Integrity over Public Tunnels & Proxies

When the web application is accessed via **Public Tunnel** (e.g. `localtunnel`, Cloudflare Tunnel) or reverse proxies:

1. **Store Assets in `public/` (Not Just `dist/`)**:
   - All images, logos, favicons, and fonts **MUST** reside in `public/` (e.g. `public/img/logo.png`, `public/favicon.ico`).
   - Because `vite build` has `emptyOutDir: true`, any assets placed solely in `dist/` will be wiped during build. Placing them in `public/` ensures Vite automatically copies them into `dist/`.

2. **URL-Safe Kebab-Case Naming**:
   - Always use lowercase alphanumeric and hyphenated names: `zhiend-logo.png`, `favicon.png`.
   - Never use spaces or non-ASCII characters in asset filenames, as internet reverse proxies frequently fail to rewrite encoded spaces (`%20`).

3. **Backend Static Middleware Before Catch-All Route**:
   - The backend server must serve all binary static assets (`/img/*`, `/favicon.ico`, `/assets/*`, `/uploads/*`) with correct binary MIME headers (`image/png`, `image/x-icon`, etc.) **BEFORE** reaching the SPA catch-all route `app.get('*')`.
   - Never let an image request fall through to `index.html` (text/html), which causes broken image icons in browsers.

4. **Multi-Network Validation**:
   - Verify that assets render properly across:
     1. Localhost (`http://localhost:3888`)
     2. LAN Wi-Fi IP (`http://192.168.x.x:3888`)
     3. Public Tunnel (`https://zhiend-agent.loca.lt`)

---

## 6. AI Image Generation & Media Gateway Standards

When the AI generates or displays images (mockups, concept art, generated assets):

1. **Inline Visual Card (No Raw `file:///` Paths)**:
   - Modern browsers block the `file:///` protocol from HTTP/HTTPS contexts (`Not allowed to load local resource`).
   - All generated images must be rendered as interactive visual cards inside the chat bubble.

2. **Media Gateway Endpoint (`/api/media/file`)**:
   - The server provides `/api/media/file?path=${encodeURIComponent(filePath)}` which securely validates the path and streams the image with the appropriate MIME type (`image/png`, `image/jpeg`, `image/webp`).
   - For downloads, the query parameter `&download=1` triggers `Content-Disposition: attachment; filename="..."`.

3. **Ergonomic Visual Presentation & Lightbox Modal**:
   - In chat bubbles, render clean frameless image thumbnails without clunky footer download buttons.
   - Clicking an image opens the high-resolution **Lightbox Modal** (`role="dialog"`), providing zoom and a centered, clean download button.

4. **Remote Bot Integration (Telegram & WhatsApp)**:
   - When AI generates images, Telegram and WhatsApp bots must detect the file and send the **ACTUAL PHOTO** (`ctx.replyWithPhoto` or Baileys `sendMessage: { image: buffer }`) directly to the user's mobile chat.
   - Strip internal markdown paths (`![caption](file:///...)`) from bot messages for a clean mobile messaging experience.

5. **Separation of User vs AI Images**:
   - User-uploaded attachments reside in `task.images`.
   - AI-generated images reside in `task.generatedImages`.
   - Never mix the two arrays to prevent duplicate bubbles or phantom re-uploads.

