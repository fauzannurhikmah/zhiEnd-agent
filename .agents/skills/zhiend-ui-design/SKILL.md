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
> 1. **Universal Zero-Radius Policy (`rounded-none` / `border-radius: 0px !important`)**:
>    - Absolute 100% sharp 90-degree architectural corners across the ENTIRE application.
>    - ZERO rounded corners anywhere: all buttons (including primary CTA triggers `.btn-safety`), cards, modals, tabs, inputs, badges, and chips are strictly sharp rectangular `rounded-none`.
>    - Flat bold button surfaces: zero fake 3D bottom bevel borders (`border-b-2`), zero murky drop shadows — pure high-visibility Safety Orange (`#FF5500`) hardware switches.
> 2. **Neutral Input Focus Policy (Zero Ring / Zero Orange Halo)**:
>    - When any input, textarea, or mechanical well is focused or active, there must be NO ring, NO outline, and NO border color change to orange (`#FF5500`).
>    - The border strictly remains neutral `#D0CEC7` (`outline: none !important; box-shadow: none !important; border-color: #D0CEC7 !important; --tw-ring-color: transparent !important`).
> 3. **CAD Dot Grid & Subtle Background HUD Matrix ("Random Grid tapi Ada Keteraturan")**:
>    - Clean architectural concrete chassis (`#ECEAE5`) with a subtle 32px CAD dot matrix grid (`radial-gradient`), layered with sparse asymmetrical drafting rules (4.5%, 24%, 76%, 95.5% vertical columns), dedicated technical left rail (`✕`) and right rail (`◎`).
>    - Subtle futuristic retro-HUD background text: random technical specs, drafting notes, and telemetry registers placed horizontally and vertically (`writing-mode:vertical-lr`) at very low opacity (`text-[#8C9097]/25`, `pointer-events-none`) for atmospheric depth without distracting from chat content.
> 4. **Mini Pixel Robot Avatar Companion (`PixelRobotAvatarBuddy`)**:
>    - Chunky mini CRT monitor (36px x 28px) mounted right under each persona chat avatar.
>    - **Super-Expressive & Reactive States**:
>      - **Natural Blink**: Periodic eye-blink every 3.5–5s (`● ●` -> `─ ─` -> `● ●`).
>      - **Typing Reaction**: When user types in chat input, eyes look down towards the chat box (`▼ ▼`).
>      - **Loading / Thinking Reaction**: Confused expression (`? ~` / brain churning) while generating.
>      - **Hover Reaction**: Warm happy smile (`^ ^` with mini smile arc `⌣`).
>      - **Content & Mood Detection**: Dynamically reflects the tone of the message (playful/flirty `★ <`, hacker coding `■ ■`, success `★ ★`, error `✕ ✕`, curious `• ?`).
> 5. **Chat Box UX & Last User Prompt Editing**:
>    - The delete/purge button must NEVER be placed in the bottom chat input box next to DISPATCH (it belongs safely in the sub-header).
>    - The latest user message bubble features an inline `[EDIT PROMPT]` trigger allowing the user to edit their last prompt in-place and resubmit, which automatically clears the old response and regenerates an updated AI response.
> 3. **Technical Drafting Ornaments**:
>    - Orange solid corner registration squares (`■`) anchoring major module bays.
>    - Corner viewfinder reticle brackets (`┌ ┐` and `└ ┘`) framing telemetry and visualizer boxes.
>    - Drafting crosshair square boxes (`✕` / `+`).
>    - Dot-matrix array indicators (`::`) for technical status and sub-navigation.
> 4. **Retro-Futuristic CRT Robot Mascot**: Chunky hardware body with a warm glowing orange bevel and a deep dark CRT screen displaying **animated dot-matrix pixel eyes (`●  ●`)** that reactively track the user's cursor across the viewport.
> 5. **Retro-Futuristic Micro-Kinetics**:
>    - Stepped CRT channel reveal (`.animate-retro-channel`) on modal tab switches (`steps(4, end)` refresh).
>    - Mechanical unfold (`.animate-retro-dropdown`) on dropdown menus.
>    - Telemetry radar scanning (`.animate-radar-dot-1..5`), CRT scanline sweep (`.crt-scan-beam`), and phosphor block typewriter cursor (`.animate-retro-cursor` `█`) on streaming AI responses.
> 6. **Ultra-Wide Modular Block Typography**: Bold geometric modular letterforms for hero headers, paired with crisp monospaced technical stencils and clean sans-serif body text.
> 7. **Partner-Style Horizontal Macro Deck**: Clean architectural rectangular bays along the bottom of the dashboard for direct macro trigger execution.
>
> **Strict Bans**:
> - NO dark-mode black canvas backgrounds (`#000000`, `#08090C`, `#111111`).
> - NO rounded corners anywhere (`rounded-full`, `rounded-2xl`, `rounded-xl`, `rounded-lg`, `rounded-md`, `rounded-sm` are strictly banned; absolute 100% `rounded-none` across all buttons, cards, modals, tabs, and inputs).
> - NO focus ring or orange active border on inputs/textareas (focus border must stay neutral `#D0CEC7`).
> - NO generic 3 bouncing dots or static indicators for AI streaming loading.
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

All dialogs, alerts, and system prompts follow the **Cyber-Industrial Blueprint Grid** modal standard:
- **Universal Modals Inventory**:
  - `ProjectModal.svelte`: `:: WORKSPACE DIRECTORY // MATRIX`
  - `SettingsModal.svelte`: `:: SYSTEM CONFIGURATION // PREFERENCES`
  - `PersonaModal.svelte`: `:: AGENT PERSONA // MATRIX REGISTRY`
  - `PinModal.svelte`: `:: ACCESS AUTHENTICATION // PIN`
  - `ConfirmModal.svelte`: `:: PROTOCOL CONFIRMATION`
  - `NoticeModal.svelte`: `:: SYSTEM DISPATCH NOTICE`
  - `PushModal.svelte`: `:: GIT DEPLOYMENT // PUSH`
  - `Lightbox Modal`: `:: TELEMETRY ASSET // LIGHTBOX INSPECT`
- **Frame & Geometry**:
  - Backdrop: `bg-black/60 backdrop-blur-xs`
  - Modal Chassis: `bg-[#FCFCFA] border-2 border-[#D0CEC7] rounded-none shadow-2xl relative overflow-hidden`
  - 4 Corner Registration Marks (`.reg-dot`): Solid orange square marks (`■`) anchored at all four corners.
- **Header Seam**:
  - Milled putty band (`bg-[#E5E3DD] border-b border-[#D0CEC7] px-4 py-3 flex items-center justify-between font-tech`)
  - Prefix with technical dot-matrix identifier, rotating crosshair (`.crosshair-box`), and close trigger.
- **Segmented Navigation Bays with Stepped Channel Switch**:
  - In multi-tab modals (`ProjectModal`, `SettingsModal`, `PersonaModal`), tabs are styled as hardware channel selectors (`bg-[#E5E3DD] border-b border-[#D0CEC7] rounded-none`).
  - Active tab: `bg-[#FCFCFA] text-[#FF5500] border-t-2 border-t-[#FF5500] border-x border-x-[#D0CEC7] font-bold shadow-2xs`.
  - Tab transition kinetic: Wrapped in `{#key activeTab} <div class="animate-retro-channel">` executing a stepped 4-phase CRT channel refresh (`steps(4, end)`).
- **Button System**:
  - Primary CTA / Confirm: Flat Safety Orange capsule pill (`btn-safety` / `rounded-full px-5 py-2 text-white font-tech font-bold uppercase tracking-wider`).
  - Neutral / Tool / Cancel: Sharp tactile putty button (`btn-hardware` / `rounded-none border border-[#D0CEC7] bg-[#FCFCFA] hover:bg-[#ECEAE5] text-[#111315] font-tech font-bold uppercase tracking-wider`).
- **Telemetry Shells (`PushModal.svelte`)**:
  - Embedded console stream resides inside a recessed CRT Void well (`#101114`) with scanline pattern, displaying phosphor green/emerald log text.

---

## 7. Interactive Micro/Macro Animations & Tactile Kinetics

To make the retro-futuristic interface deeply tactile and alive without generic AI animations, use deliberate purposeful kinetics:

1. **Cursor Pupil Tracking (CRT Robot Mascot)**:
   - The robot mascot's dot-matrix eyes reactively track the user's cursor across the entire screen:
     - Vector offset: `dx = cursorX - monitorCenterX`, `dy = cursorY - monitorCenterY`.
     - Clamped pupil shift: translates up to ±8px horizontally and ±6px vertically.
     - Natural idle drift: Micro-floats gently when the cursor is stationary.
     - Direct hover reaction: Dilates or transforms into happy arcs (`◠  ◠`).
2. **Stepped CRT Channel Reveal (`.animate-retro-channel`)**:
   - Tab switching in modals (`SettingsModal`, `ProjectModal`, `PersonaModal`) does not cut abruptly or slide like a generic web app.
   - It performs a stepped phosphor re-draw in 4 distinct scanline stages (`steps(4, end)` at 0.18s), mimicking authentic CRT channel switching.
3. **Mechanical Dropdown Unfold (`.animate-retro-dropdown`)**:
   - Custom select popovers unfold vertically from the hardware anchor with a rapid mechanical clip-path wipe (`cubic-bezier(0.16, 1, 0.3, 1)` at 0.15s).
4. **Minimalist Retro-Futuristic Telemetry Stream Loader**:
   - Replaces generic 3 bouncing dots while avoiding cluttered animation stacks.
   - Restrained, industrial precision: sleek Alabaster well (`#FCFCFA` with 1px border `#D0CEC7`).
   - Laser Orange Diode: Single pulsing square mark `■` (`w-2 h-2 bg-[#FF5500] animate-pulse`).
   - Stencil Telemetry Status: `:: ANALYZING TELEMETRY & REASONING MATRIX` in crisp `JetBrains Mono`.
   - CRT Phosphor Cursor: Trailing typewriter block `█` pulsing via `.animate-retro-cursor` at `steps(1)`.
   - Hardware Stream Status: Minimalist green processing diode (`bg-emerald-500 animate-pulse`) + `PROCESSING`.
   - Strictly avoid piling up competing widgets (no disco VU meters or hazard stripes inside the loading well).
5. **Reactive 4-Bar Equalizer & Telemetry Activity Meter (Navbar)**:
   - Top navbar features a 4-bar hardware telemetry meter (`emerald`, `amber`, `safety orange`).
   - Dynamically dances with real-time computational activity during agent task execution (`isAgentBusy`), and shifts levels tactfully on mouse hover.
6. **Tactical Sidebar Switches with Live Status Diodes**:
   - Sidebar navigation buttons feature mechanical keyboard depression (`active:scale-[0.98] active:translate-y-0.5`).
   - Active tab features a softly pulsing green micro-LED diode (`bg-emerald-500 animate-pulse`) paired with the solid orange registration mark (`■`).
7. **Interactive Drafting Crosshair Reticles**:
   - Header and modal crosshairs (`.crosshair-box`) smoothly rotate 45° with tactile precision on hover (`hover:rotate-45 cursor-crosshair transition-transform duration-300`).
8. **Dynamic Reticle HUD Coordinates**:
   - The telemetry viewfinder tracks deck cursor coordinates in real time: `┌ RETICLE [042, 180] ┐`.
   - Subtle scanning light wave pulses across the viewfinder screen.
9. **Tactile Soundbank Bays**:
   - Bottom macro bays feature physical keyboard switch kinetics (`active:scale-[0.98] active:translate-y-0.5 active:bg-[#E5E3DD] transition-all`).
10. **Proportional Action Triggers & Navbar Rhythm**:
   - Navbar action triggers maintain strict vertical proportion (`h-8` / 32px height) across all items.
   - Primary deployment triggers (e.g. `Push to GitHub`) are styled with `.btn-safety rounded-full` at matching height, preserving visual balance.

---

## 8. Pre-Delivery Checklist

- [ ] Does the UI strictly embody the **Cyber-Industrial Blueprint Grid** aesthetic from the ChainGPT Labs reference?
- [ ] Are 1px architectural grid seams (`#D0CEC7`) cleanly partitioning all modules?
- [ ] Are corner registration dots (`■` orange squares) visible on all module bays and all 7 modals?
- [ ] Does the CRT robot mascot have an animated glowing bevel, reactive dot-matrix eyes, and **cursor pupil tracking**?
- [ ] Does the top navbar feature the reactive 4-bar activity equalizer meter?
- [ ] Do sidebar buttons possess tactile click depression and green pulsing LED diodes?
- [ ] Are all modals (`ProjectModal`, `SettingsModal`, `PersonaModal`, `PinModal`, `ConfirmModal`, `NoticeModal`, `PushModal`) styled with corner registration dots and 0% dark mode on outer chassis?
- [ ] Are action buttons (including navbar Push button) balanced and proportional at `h-8`?
- [ ] Is the 4-bay partner-style horizontal macro strip present on the dashboard?
- [ ] Is the canvas free of dark mode, neon purple/blue, and generic SaaS slop?
