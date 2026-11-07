---
name: zhiend-standards
description: Master engineering and design standards hub for zhiEnd Agent. Connects Software Architecture standards (zhiend-architecture) and UI/UX Design System standards (zhiend-ui-design).
---

# zhiEnd Agent — Master Standards & Guidelines Hub

This skill is the central index and entry point for all engineering, architecture, and design system standards in **zhiEnd Agent**. 

The standards are modularly split into two specialized skills:

| Dedicated Skill | Focus & Scope | Location |
|-----------------|---------------|----------|
| **`zhiend-architecture`** | Backend & Frontend Architecture, Svelte 5 Runes, TypeScript strict safety, Hono API routes, PIN security, Workspace scanning (`D:\Works`), Media pipelines, and Public Tunnels | [`.agents/skills/zhiend-architecture/SKILL.md`](file:///d:/Works/zhiEnd-agent/.agents/skills/zhiend-architecture/SKILL.md) |
| **`zhiend-ui-design`** | Cold Carbon Precision Design System: carbon obsidian chassis (#08090C), razor-sharp electric cyan telemetry (#00E5FF), hairline structural partitions, disciplined Inter & JetBrains Mono typography, and mobile-first ergonomics | [`.agents/skills/zhiend-ui-design/SKILL.md`](file:///d:/Works/zhiEnd-agent/.agents/skills/zhiend-ui-design/SKILL.md) |

---

## 1. Architecture Quick Reference (`zhiend-architecture`)

- **Tech Stack**: Svelte 5 (SPA) + Hono (`@hono/node-server`) + TypeScript + Socket.io + Google Antigravity CLI (`agy.exe`).
- **Workspace Root**: Default root `D:\Works`, recursive auto-scan depth 2, default project target `D:\Works\<project-name>`.
- **Svelte 5 Runes**: Always use `$state()`, `$derived()`, `$props()`, and `$effect()`. Never use Svelte 3/4 legacy stores or `$:`.
- **Dialogs & Alerts**: Strict prohibition of `window.alert()` / `confirm()`. Use Universal Dialog Service (`dialog.svelte.ts`).
- **API Security**: Security PIN middleware on mutating `/api/*` endpoints with structured JSON envelopes (`{ success, data/error }`).
- **Static Assets**: All public assets stored in `public/` (URL-safe kebab-case), served with proper binary MIME types before catch-all SPA routes.
- **Media Gateway**: Inline visual cards via `/api/media/file`, click-to-zoom Lightbox modal, and direct photo delivery to WhatsApp/Telegram bots.

---

## 2. UI/UX Design Quick Reference (`zhiend-ui-design`)

- **Design Philosophy**: Cold Carbon Precision — an authentic mission-grade engineering instrument. Zero generic purple SaaS gradients, zero decorative rainbow disco blobs, and zero single-word gradient text tells.
- **5-Tone Carbon Palette**:
  - `--canvas-carbon`: `#08090C` (Cold graphite carbon base)
  - `--deck-surface`: `#101216` (Structural deck and panels)
  - `--raised-bed`: `#161920` (Tactile controls and inputs)
  - `--hairline-rule`: `#222630` (1px precision partition rule)
  - `--signal-cyan`: `#00E5FF` (Laser-cut electric cyan telemetry signal)
- **Component Tokens**:
  - `.carbon-panel`: Structural milled graphite surface with hairline border.
  - `.carbon-input`: Recessed tactile input dock with cold cyan focus indicator.
  - `.btn-telemetry`: High-contrast electric cyan action trigger with tactile press feedback.
  - `.btn-tool`: Subdued secondary tactile button.
  - `.bubble-user`: Deep cyan-tinted carbon card (`#0c1a24` with hairline border), eliminating generic purple gradient bubbles.
  - `.bubble-agent`: Milled graphite deck card (`#101216`).
- **Typography & Voice**: Sentence case throughout (no ALL-CAPS eyebrows), line lengths < 75 characters, active verbs ("Kirim", "Simpan"), plain functional signposting.
- **Accessibility & Quality**: Visible `:focus-visible` rings, reduced motion support, zero emoji icons (100% Lucide SVG), and touch targets ≥ 44×44px.
