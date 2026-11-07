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
| **`zhiend-ui-design`** | Cyber-Industrial Blueprint Grid (CIB-Grid): matte off-white concrete chassis (#ECEAE5), 1px architectural drafting grid seams (#D0CEC7), laser orange accents (#FF5500), corner registration dots (■), viewfinder reticle brackets (┌ ┐ └ ┘), drafting crosshairs (✕), dot matrix arrays (::), and reactive CRT robot mascot with animated pixel eyes (● ●) | [`.agents/skills/zhiend-ui-design/SKILL.md`](file:///d:/Works/zhiEnd-agent/.agents/skills/zhiend-ui-design/SKILL.md) |

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

- **Design Philosophy**: Retro-Futuristic Cyber-Industrial Blueprint Grid (CIB-Grid) — edge-to-edge architectural drafting grid (inspired by ChainGPT Labs & Teenage Engineering). Strictly NO isolated floating cards with massive empty margins. 100% free of generic dark mode, zero blue/purple palettes, zero neon gradients, and zero AI-slop card kits.
- **Drafting Blueprint Palette**:
  - `--canvas-concrete`: `#ECEAE5` (Light Drafting Concrete / Warm Off-White ground)
  - `--grid-seam`: `#D0CEC7` (1px architectural drafting rules & continuous cell partition seams)
  - `--grid-seam-dark`: `#A8A59C` (Active borders, focused structural joints)
  - `--panel-alabaster`: `#FCFCFA` (Pure alabaster module interiors, message bays & input wells)
  - `--panel-putty`: `#E5E3DD` (Machined putty decks, card beds, macro bays, bottom hardware console)
  - `--laser-orange`: `#FF5500` (Safety Laser Orange — buttons, corner registration dots `■`, active triggers)
  - `--glow-amber`: `#FFAA00` (Warm electric amber — robot chassis bevel glow)
  - `--crt-void`: `#101114` (Deep charcoal CRT well for dot-matrix screens & viewfinder HUD boxes)
  - `--ink-basalt`: `#111315` (High-contrast basalt black for headlines, labels, and primary text)
  - `--stencil-slate`: `#60646C` (Technical stencil metadata, sub-labels, and timestamps)
- **Retro-Futuristic Typography Scale**:
  - `.font-display`: `Syne` 900 Black for giant modular headline letterforms (`Z H I E N D   C O R E`).
  - `.font-tech`: `Chakra Petch` 700 Bold for industrial navigation switches and soundbank bays.
  - `.font-pixel`: `Silkscreen` 700 for authentic 8-bit dot-matrix status pills (`:: STATUS NOMINAL`).
  - `.font-grotesk`: `Space Grotesk` for high-legibility retro-futuristic copy.
  - `.font-stencil`: `JetBrains Mono` for technical coordinates (`COORD: 0x3888`), terminal streams, diffs.
- **Drafting Ornaments & Assets**:
  - `.reg-dot`: 4x4px solid orange square registration dots (`■`) anchoring module corners.
  - `.viewfinder-box`: Technical reticle brackets (`┌ ┐` and `└ ┘`) framing metrics and telemetry.
  - `.crosshair-box`: Square drafting crosshair marker (`✕`) in header and breadcrumb modules.
  - Dot-matrix array indicators (`::`) prefixing technical section titles (`:: SYS NOMINAL`).
  - Reactive CRT Robot Mascot: Chamfered hardware body with glowing orange bevel and live animated dot-matrix pixel eyes (`● ●`).
  - Docked Hardware Console: Prompt input is permanently anchored to the bottom grid seam with tactile parameter keys and a safety orange dispatch lever.
- **Dashboard Layout Architecture**:
  - 1px architectural grid matrix dividing header, main cockpit, and bottom console.
  - 3-column hero cockpit (Mission/Headline, CRT Robot Mascot, Viewfinder HUD).
  - 4-bay partner-style horizontal macro strip (`[01 // AUDIT]`, `[02 // RECON]`, `[03 // DEBUG]`, `[04 // SHIP]`).
  - Permanently anchored recessed input well at the bottom.
- **Universal Modal Consistency**:
  - Every single modal (`ProjectModal`, `SettingsModal`, `PersonaModal`, `ConfirmModal`, `NoticeModal`, `PinModal`, `PushModal`), popover, and lightbox is 100% compliant with the `#FCFCFA` / `#ECEAE5` / `#D0CEC7` / `#FF5500` blueprint matrix.
  - Zero tolerance for dark mode (`bg-zinc-950`, `bg-zinc-900`, `indigo`, `violet`).
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
