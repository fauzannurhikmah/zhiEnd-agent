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
- **Universal Zero-Radius Policy (`rounded-none` / `border-radius: 0px !important`)**:
  - Absolute 100% sharp 90-degree architectural corners across the ENTIRE application.
  - Zero rounded corners anywhere: all buttons (including primary CTA triggers `.btn-safety`), cards, modals, tabs, inputs, badges, and chips are strictly sharp rectangular `rounded-none`.
  - Pure flat tactile surfaces: zero fake 3D bottom bevel borders (`border-b-2`), zero murky drop shadows.
- **Neutral Input Focus Policy (Zero Ring / Zero Orange Halo)**:
  - When any input, textarea, or mechanical well is focused or active, there must be NO ring, NO outline, and NO border color change to orange (`#FF5500`). Border strictly remains neutral `#D0CEC7`.
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
- **Asymmetric CAD Ground ("Random Grid tapi Ada Keteraturan")**:
  - Large architectural layout bands (navbar row, hero headline row, partner strip row, asymmetric columns) on warm off-white concrete chassis (`#ECEAE5`).
  - Prohibits dense repetitive 24px polka-dot wallpaper or 120px graph paper tiles.
  - Employs sparse asymmetrical drafting rules (4.5%, 24%, 76%, 95.5% vertical columns), dedicated left technical rail (`✕`), right rail (`◎`), and corner square marks (`■`).
- **Chat UX & Prompt Revision**:
  - The delete/purge button must NEVER be in the bottom input bar next to DISPATCH (it is safely kept in the sub-header).
  - The last user chat bubble features an inline `[EDIT PROMPT]` mode, enabling prompt updates and automated AI response regeneration.
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
- **Universal Modal Consistency (0% Dark Mode Tolerance)**:
  - Every single modal (`ProjectModal`, `SettingsModal`, `PersonaModal`, `ConfirmModal`, `NoticeModal`, `PinModal`, `PushModal`), popover, and lightbox is 100% compliant with the `#FCFCFA` / `#ECEAE5` / `#D0CEC7` / `#FF5500` blueprint matrix.
  - Zero tolerance for dark mode (`bg-zinc-950`, `bg-zinc-900`, `indigo`, `violet`).
  - Stepped CRT Channel Switching (`.animate-retro-channel`): In multi-tab modals, tabs switch using authentic 4-phase CRT scanline refreshes (`steps(4, end)`).
  - Mechanical Dropdown Unfolds (`.animate-retro-dropdown`): Popovers unfold from top with rapid mechanical clip-path sweeps.
  - 4 corner registration marks `■` (`.reg-dot`), sharp 90° corners (`rounded-none`), top drafting seams (`:: PROTOCOL CONFIRMATION`), alabaster ground (`#FCFCFA`), and putty headers (`#E5E3DD`).
  - Terminal streams (`PushModal`) reside strictly inside a recessed CRT Void well (`#101114`) with green phosphor readout.
- **Interactive Micro/Macro Kinetics & Cursor Eye Tracking**:
  - CRT Robot Mascot Pupil Tracking: Reactively computes cursor vector to translate pupils smoothly across the screen, with idle micro-drift and direct hover happy arc state (`◠  ◠`).
  - Stepped CRT Channel Switching (`.animate-retro-channel`): Modal tab transitions execute a stepped phosphor wipe.
  - Mechanical Dropdown Popovers (`.animate-retro-dropdown`): Custom selects unfold smoothly with mechanical precision.
  - Minimalist Retro-Futuristic AI Loading: Restrained, industrial precision — single pulsing laser orange diode (`■`), clean JetBrains Mono text `:: ANALYZING TELEMETRY & REASONING MATRIX`, blinking phosphor typewriter block cursor (`█` via `.animate-retro-cursor`), and green processing LED diode in a sleek Alabaster well (`#FCFCFA`). Strictly avoids cluttered animation stacks.
  - Interactive Reticle & HUD Coordinates: Dynamic cursor coordinate tracking (`┌ RETICLE [042, 180] ┐`), rotating drafting crosshairs (`hover:rotate-45 cursor-crosshair`), and tactile soundbank pad clicks (`active:scale-[0.98] active:translate-y-0.5`).
  - Balanced Action Triggers: Strict vertical proportion (`h-8` / 32px height) for navbar buttons and Git Push triggers (`.btn-safety rounded-none`).
- **Typography & Voice**: Technical grotesque + monospace (Syne 900 display, Chakra Petch tech, Silkscreen pixel, Space Grotesk body, JetBrains Mono stencil), line lengths < 75 characters.
- **Accessibility & Quality**: High WCAG AAA contrast (basalt on chalk bone), tactile `:active` press mechanics, zero emoji icons (100% Lucide SVG), and touch targets ≥ 44×44px.
