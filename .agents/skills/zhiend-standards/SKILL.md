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
| **`zhiend-ui-design`** | Teenage Engineering Industrial Field Instrument (TE-IFI): matte chalk bone chassis (#F4F3EE), putty concrete decks (#E9E7E0), pure alabaster wells (#FCFCFA), safety hazard orange triggers (#FF5500), physical mechanical buttons with inset/outset bevels, precision milled hairline seams, 0% dark mode tolerance across all modals, and anti-AI-slop instrument cockpit layouts | [`.agents/skills/zhiend-ui-design/SKILL.md`](file:///d:/Works/zhiEnd-agent/.agents/skills/zhiend-ui-design/SKILL.md) |

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

- **Design Philosophy**: Teenage Engineering Industrial Field Instrument (TE-IFI) — a physical precision hardware synthesizer aesthetic. 100% free of generic dark mode, zero blue/purple palettes, zero neon glows, and zero AI-slop card kits.
- **6-Tone Industrial Hardware Palette**:
  - `--chassis-bone`: `#F4F3EE` (Chalk Bone matte ground)
  - `--deck-putty`: `#E9E7E0` (Putty concrete decks & sidebars)
  - `--bed-magnesium`: `#DEDBD2` (Machined magnesium raised tabs)
  - `--well-alabaster`: `#FCFCFA` (Sunken alabaster input wells & message bays)
  - `--seam-milled`: `#C8C5BC` (1px mechanical precision rule)
  - `--safety-orange`: `#FF5500` (Tactile safety hazard orange primary switches)
  - `--hazard-mustard`: `#E5A91A` (Warning yellow caution indicators)
  - `--ink-basalt`: `#191B1D` (Deep basalt ink high-contrast typography)
  - `--stencil-grey`: `#5C6066` (Technical stencil data labels)
- **Component Tokens**:
  - `.hardware-panel`: Structural putty deck with milled hairline seam.
  - `.hardware-well`: Recessed alabaster bay with subtle mechanical inset bevel.
  - `.btn-hardware`: Tactile mechanical push-button with 2px physical bottom bevel.
  - `.btn-safety`: Vivid safety hazard orange (`#FF5500`) tactile switch.
  - `.bubble-user-hardware`: Alabaster bay with safety orange micro-tab.
  - `.bubble-agent-hardware`: Engineered putty deck with mechanical telemetry logger.
- **Universal Modal Consistency (0% Dark Mode Tolerance)**:
  - Every single modal (`ProjectModal`, `SettingsModal`, `PersonaModal`, `ConfirmModal`, `NoticeModal`, `PinModal`, `PushModal`), popover, and lightbox is 100% TE-IFI.
  - Zero tolerance for `bg-zinc-950`, `bg-zinc-900`, `border-indigo`, or `text-indigo`.
  - Structured as alabaster chassis (`#FCFCFA`) with putty concrete headers (`#E9E7E0`), safety orange stencils (`#FF5500`), and tactile action keys.
- **Instrument Cockpit Layout Architecture (Anti-AI-Slop Formations)**:
  - Ban on generic 2x2 SaaS card kits, centered hero clichés, and duplicate center prompt boxes.
  - Required Layout: Machined machine nameplate (`TX-3888`), EP-133 style 4-pad hardware macro soundbank matrix, real-time telemetry registers, and a permanently anchored bottom hardware control deck (`hardware-well`).
- **Typography & Voice**: Technical grotesque + monospace (DIN/Space Grotesk), pure sentence case, line lengths < 75 characters, authentic hardware labels (`Bay 01`, `Port :3888`).
- **Accessibility & Quality**: High WCAG AAA contrast (basalt on chalk bone), tactile `:active` press mechanics, zero emoji icons (100% Lucide SVG), and touch targets ≥ 44×44px.
