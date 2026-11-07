---
name: zhiend-ui-design
description: "Distinctive UI/UX Design System for zhiEnd Agent. Opinionated 'Cyber-Industrial Blueprint & Modular Drafting Grid' (inspired by ChainGPT Labs & Teenage Engineering): off-white concrete chassis, 1px architectural drafting grid seams, safety laser orange accents, corner square registration marks (■), technical viewfinder brackets (┌ ┐ └ ┘), drafting crosshairs (✕), dot matrix arrays (::), geometric modular display typography, and a reactive CRT robot mascot with dot-matrix pixel eyes."
---

# zhiEnd Agent UI/UX Design System: Cyber-Industrial Blueprint Grid (CIB-Grid)

> [!IMPORTANT]
> **Core Aesthetic Identity**:
> zhiEnd Agent is designed as an **Architectural Cyber-Industrial Blueprint** combined with **Tactile Field Hardware** (ChainGPT Labs aesthetic meets Teenage Engineering precision).
>
> **Hallmark Traits**:
> 1. **Architectural Grid Matrix**: Continuous 1px hairline drafting grid seams dividing the entire interface into clean modular architectural cells.
> 2. **Technical Drafting Ornaments**:
>    - Orange solid corner registration squares (`■`) anchoring major module bays.
>    - Corner viewfinder reticle brackets (`┌ ┐` and `└ ┘`) framing telemetry and visualizer boxes.
>    - Drafting crosshair square boxes (`✕` / `+`).
>    - Dot-matrix array indicators (`::`) for technical status and sub-navigation.
> 3. **Retro-Futuristic CRT Robot Mascot**: Chunky chamfered hardware body with a warm glowing orange bevel and a deep dark CRT screen displaying **animated dot-matrix pixel eyes (`●  ●`)** that react to agent operational states.
> 4. **Ultra-Wide Modular Block Typography**: Bold geometric modular letterforms for hero headers, paired with crisp monospaced technical stencils and clean sans-serif body text.
> 5. **Partner-Style Horizontal Macro Deck**: Clean architectural rectangular bays along the bottom of the dashboard for direct macro trigger execution.
>
> **Strict Bans**:
> - NO dark-mode black canvas backgrounds (`#000000`, `#08090C`, `#111111`).
> - NO generic AI slop: centered 2x2 floating cards with blurry shadows, duplicate prompt boxes, or purple/indigo neon blobs.
> - NO single-word gradient clipping or rainbow glow text.

---

## 1. Color Palette: Drafting Blueprint & Laser Orange

| Token Name | Hex Code | Role & Real-World Material |
|---|---|---|
| `--canvas-concrete` | `#ECEAE5` | Base blueprint drafting ground, warm matte off-white concrete |
| `--grid-seam` | `#D0CEC7` | 1px architectural drafting rules & cell partition seams |
| `--grid-seam-dark` | `#A8A59C` | Active borders, focused structural joints |
| `--panel-alabaster` | `#FCFCFA` | Pure alabaster module interiors, message bays & input wells |
| `--panel-putty` | `#E5E3DD` | Machined putty decks, card beds, macro bays |
| `--laser-orange` | `#FF5500` | High-energy Safety Laser Orange — buttons, corner registration dots (`■`), active triggers |
| `--glow-amber` | `#FFAA00` | Warm electric amber — robot chassis bevel glow & warning badges |
| `--crt-void` | `#101114` | Deep charcoal CRT well for dot-matrix screens & viewfinder HUD boxes |
| `--ink-basalt` | `#111315` | High-contrast basalt black for headlines, labels, and primary text |
| `--stencil-slate` | `#60646C` | Milled technical metadata, sub-labels, and timestamps |

---

## 2. Architectural Blueprint Grid & Drafting Ornaments

### A. The Blueprint Grid Matrix
- Surfaces are partitioned into **distinct architectural cells** using 1px continuous borders (`border-[#D0CEC7]`).
- Rather than relying on blurry drop shadows, hierarchy and separation come from **clear structural line-work and modular cell boundaries**.

### B. Corner Registration Squares (`.reg-dot`)
- Anchor the four corners of prominent cards, modules, and hero bays:
  ```html
  <span class="absolute top-1.5 left-1.5 w-1.5 h-1.5 bg-[#FF5500]"></span>
  <span class="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF5500]"></span>
  <span class="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 bg-[#FF5500]"></span>
  <span class="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF5500]"></span>
  ```

### C. Technical Viewfinder Brackets (`.viewfinder-box`)
- Framing device for metrics, diagnostic feeds, and asset visualizers:
  - Corner HUD markers: `┌` (top-left), `┐` (top-right), `└` (bottom-left), `┘` (bottom-right).
  - Background: Deep CRT Void (`#101114`) or Alabaster (`#FCFCFA`).

### D. Drafting Crosshair Box (`.crosshair-box`)
- A square architectural marker (e.g. 28x28px or 32x32px) containing diagonal crosshair lines (`✕`) or intersection ticks, used in header and breadcrumb modules.

### E. Dot-Matrix Arrays (`::`)
- Used as technical prefixes for status tags and system labels:
  - `:: OUR ECOSYSTEM`
  - `:: SYS NOMINAL`
  - `:: CORE ENGINE`

---

## 3. Reactive CRT Robot Mascot & Pixel/Dot Art

The application features a signature hardware mascot located in the main cockpit:
- **Chassis**: Rounded square hardware monitor with matte chalk white body and a warm glowing orange/amber bevel frame.
- **Screen**: Deep charcoal CRT screen (`#101114`) with subtle scanline / pixel grid texture.
- **Reactive Dot-Matrix Eyes**:
  - **Idle / Nominal**: `●   ●` (Clean glowing circular pixel eyes with periodic eye-blink animation `-   -`).
  - **Thinking / Processing**: `▲   ▲` or cycling dots.
  - **Code Generation / Git**: `■   ■` or typing prompt `>   _`.
  - **Voice Listening**: `◉   ◉` with pulsing rings.
  - **Error / Alert**: `✖   ✖` with amber alert glow.

---

## 4. Typography Hierarchy & Retro-Futuristic Font System

The application relies on 5 deliberate, non-generic retro-futuristic font families loaded via Google Fonts:

| Class | Family | Style & Weight | Primary Use Case |
|---|---|---|---|
| `.font-display` | `Syne` | 800–900 Black | Giant modular headlines (`Z H I E N D   C O R E`), hero display typography |
| `.font-tech` | `Chakra Petch` | 700 Bold / Italic | Industrial navigation tabs, bay titles (`[01 // CODING]`), action keys |
| `.font-pixel` | `Silkscreen` | 700 Pixel | Authentic 8-bit dot-matrix status pills (`:: STATUS NOMINAL`), registration tags |
| `.font-grotesk` | `Space Grotesk` | 500 Medium / 700 Bold | Crisp, modern technical body copy, mission descriptions, prompts |
| `.font-stencil` | `JetBrains Mono` | 500 Medium / 700 Bold | System telemetry, coordinates (`COORD: 0x3888`), terminal streams, diffs |

> [!IMPORTANT]
> **Strict Font Rules**:
> - Never use default system fonts or standard sans-serif for display headings.
> - Display headlines must use `.font-display` (`Syne` 900) with wide tracking and uppercase modular letterforms.
> - Technical labels, pad numbers, and tabs must use `.font-tech` or `.font-stencil`.

---

## 5. Full-App Edge-to-Edge Architecture (No Floating Island Cards)

> [!CAUTION]
> **Anti-Pattern Warning**:
> Never wrap the blueprint matrix in an inner floating card with massive empty margins around it!
> The **entire application window** is the drafting board. Grid seams must touch the edges of the screen continuously.

1. **Continuous Edge-to-Edge Blueprint Grid**:
   - The root viewport (`main.blueprint-grid`) fills 100% of the available screen (`p-0`, `min-h-full`).
   - The top header (`h-12 border-b border-[#D0CEC7] bg-[#ECEAE5]`) directly connects with the main work area with zero gap.
   - The sidebar on the left (`w-64 border-r border-[#D0CEC7] bg-[#ECEAE5]`) shares the continuous 1px grid line with the workspace.
2. **Docked Hardware Console Deck**:
   - The prompt input bar is **never a floating bubble pill** hovering above content.
   - It is permanently docked to the bottom grid seam (`w-full bg-[#E5E3DD] border-t border-[#D0CEC7] p-2.5 sm:p-3`), with tactile parameter switches and a dedicated safety orange dispatch lever (`[ DISPATCH ⬆ ]`).
3. **Active Chat Transmission Logs**:
   - When messages exist, they continue the technical blueprint aesthetic:
     - User messages: Alabaster blocks (`bg-[#FCFCFA] border border-[#D0CEC7]`) with corner registration tick `■` and header `[■ USER TRANSMISSION]`.
     - Agent messages: Blueprint log panels (`bg-[#FCFCFA] border border-[#D0CEC7]`) with header `[:: AGENT DISPATCH // TX-3888]`.
     - Process / Reasoning: Collapsible hardware telemetry panels (`bg-[#E5E3DD] border border-[#D0CEC7]`).
4. **All Other Workspaces (Git, Remote, Files & Logs)**:
   - Must strictly inherit the same 1px grid seams (`#D0CEC7`), `#ECEAE5` canvas, and CRT screen readouts for terminal streams.

---

## 5. Dashboard Layout Architecture (Khusus Layouting Dashboard)

> [!IMPORTANT]
> The dashboard is not a standard chat window or SaaS card list. It is an **Architectural Blueprint Matrix** structured into 4 definitive zones:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [LOGO + ROBOT + ✕] │ [NAV: CHAT / GIT / REMOTE / LOGS] │ [:: SYS OK] │ [APPLY NOW]│
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ ┌───────────────────────────┬───────────────────────┬──────────────────────────┐ │
│ │ CELL 1: MISSION & HEADLINE│ CELL 2: CRT ROBOT     │ CELL 3: VIEWFINDER HUD   │ │
│ │                           │       MASCOT          │   ┌                  ┐   │ │
│ │ ■ ZHIEND LABS             │    ┌─────────────┐    │   │  [GIT TELEMETRY] │   │ │
│ │   Backing autonomous      │    │  ●       ●  │    │   │  BRANCH: MAIN    │   │ │
│ │   agent workflows.        │    └─────────────┘    │   └                  ┘   │ │
│ │ [ APPLY FOR RUN ]         │   [ONLINE // NOMINAL] │   COMMITS: +42 / -12     │ │
│ └───────────────────────────┴───────────────────────┴──────────────────────────┘ │
│                                                                                  │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ PARTNER-STYLE HORIZONTAL MACRO STRIP                                         │ │
│ │ ┌───────────────┬────────────────┬────────────────┬────────────────────────┐ │ │
│ │ │ 01 // AUDIT   │ 02 // RECON    │ 03 // DEBUG    │ 04 // SHIP & SYNC      │ │ │
│ │ └───────────────┴────────────────┴────────────────┴────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ RECESSED ALABASTER INPUT WELL (ALWAYS DOCKED AT BOTTOM CONSOLE)              │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

1. **Top Blueprint Header Matrix**:
   - Partitioned by 1px grid seams.
   - Contains branding, pixel robot mark, drafting crosshair box, view switcher, and Safety Laser Orange primary CTA button (`[ + NEW RUN ]`).
2. **Main Blueprint Cockpit (3-Column Architectural Grid)**:
   - **Cell 1**: Giant geometric modular title, mission brief, and orange pill action key.
   - **Cell 2**: The live reactive CRT Robot mascot with glowing orange bevel and dot-matrix eyes.
   - **Cell 3**: Viewfinder HUD box (`┌ ┐ └ ┘`) displaying workspace telemetry, active git branch, file stats, and commit telemetry.
3. **Horizontal Partner-Style Macro Bay**:
   - 4 rectangular architectural bays (identical to the Chainlink, TRON, BNB, OKX row in the reference).
   - High-contrast typography, pad step numbers (`01`, `02`, `03`, `04`), and instant click-to-dispatch execution.
4. **Docked Control Console**:
   - Solidly anchored at the bottom of the viewport with recessed alabaster input well (`#FCFCFA`), image chips, mic button, and laser orange trigger.

---

## 6. Universal Modal & Overlay Consistency (0% Dark Mode Tolerance)

- All modals (`ProjectModal`, `SettingsModal`, `PersonaModal`, etc.) follow the exact same blueprint matrix:
  - Backdrop: `bg-black/60 backdrop-blur-sm`
  - Modal Shell: `bg-[#FCFCFA] border border-[#D0CEC7] rounded-2xl shadow-2xl`
  - Header & Tab Bays: `bg-[#E5E3DD] border-b border-[#D0CEC7]`
  - Stencil Accent: `w-8 h-8 rounded-lg bg-[#FF5500] text-white font-bold`
  - Input Wells: `bg-[#FCFCFA] border border-[#D0CEC7] focus:border-[#FF5500]`
  - Corner Registration Dots: Orange square marks on modal panels.

---

## 7. Pre-Delivery Checklist

- [ ] Does the UI strictly embody the **Cyber-Industrial Blueprint Grid** aesthetic from the ChainGPT Labs reference?
- [ ] Are 1px architectural grid seams (`#D0CEC7`) cleanly partitioning all modules?
- [ ] Are corner registration dots (`■` orange squares) visible on key module bays?
- [ ] Does the CRT robot mascot have an animated glowing bevel and reactive dot-matrix eyes (`● ●`)?
- [ ] Is the 4-bay partner-style horizontal macro strip present on the dashboard?
- [ ] Is the canvas free of dark mode, neon purple/blue, and generic SaaS slop?
