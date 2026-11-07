---
name: zhiend-ui-design
description: "Distinctive UI/UX Design System for zhiEnd Agent. Opinionated 'Cold Carbon Precision' design identity: carbon obsidian chassis, electric cyan telemetry accents, disciplined typography scale, structural hairline partitioning, and zero generic SaaS clichés."
---

# zhiEnd Agent — UI/UX Design System: Cold Carbon Precision

*Authored from the studio perspective: deliberate, opinionated, non-templated visual identity built strictly for autonomous engineering tools and technical command consoles.*

---

## 1. Design Point of View & Subject Grounding

Most AI tools look identical: either a warm cream serif document interface or a dark purple/indigo SaaS dashboard with rainbow gradient washes, uniform rounded cards, and tracked-out uppercase eyebrows.

**zhiEnd Agent rejects these templates.**

### The Subject Matter
zhiEnd Agent is a mission-grade engineering instrument. It reads raw disk sectors, compiles codebases, branches git repositories, runs terminal daemons, and bridges communications across WhatsApp, Telegram, and public tunnels.

### The Visual Vernacular: Cold Carbon Precision
The design takes inspiration from **precision laboratory telemetry, Dieter Rams industrial audio consoles, and terminal instruments**:
- **Chassis**: Matte cold carbon obsidian (`#08090C`). Light-absorbing, zero purple tint, high contrast.
- **Signal**: Razor-sharp Electric Cyan (`#00E5FF`) telemetry light. Used strictly for active signals, focused cursors, and primary execution triggers.
- **Structure**: Hairline geometric partitions (`1px solid rgba(255, 255, 255, 0.08)`) that delineate real functional boundaries.
- **Hierarchy**: Boldness is spent in **one place**—the active command interaction and execution timeline. Everything around it remains quiet, disciplined, and utilitarian.

---

## 2. Token System: The 5-Tone Carbon Palette

Never use random color pickers or decorative rainbow gradients. All color choices must map to this deliberate palette:

```
┌─────────────────┬───────────┬────────────────────────────────────────────────────────┐
│ Token Name      │ Hex / CSS │ Role & Semantic Usage                                  │
├─────────────────┼───────────┼────────────────────────────────────────────────────────┤
│ --canvas-carbon │ #08090C   │ Base viewport chassis; deep cold obsidian              │
│ --deck-surface  │ #101216   │ Structural panels, sidebar deck, agent bubble cards    │
│ --raised-bed    │ #161920   │ Interactive controls, active inputs, modal containers  │
│ --hairline-rule │ #222630   │ 1px precision boundary rules & structural dividers     │
│ --signal-cyan   │ #00E5FF   │ Primary telemetry signal: active buttons, focus rings  │
└─────────────────┴───────────┴────────────────────────────────────────────────────────┘
```

### Supporting Telemetry Signals (Strictly Semantic)
- **Signal Emerald (`#10B981`)**: Connected remote status, nominal git clean state, verified test run.
- **Signal Amber (`#F59E0B`)**: Staged changes, waiting QR scan, active background build task.
- **Signal Rose (`#F43F5E`)**: Build error, fatal exception, destructive confirmation prompt.
- **Signal Sky (`#38BDF8`)**: Git branch indicator, network link.

---

## 3. Typographic Discipline & Rules

Typography carries the quiet authority of an engineering tool.

### Type Families
1. **Primary Interface**: **`Inter`**
   - Letter-spacing: `-0.015em` to `-0.025em` for titles.
   - Weights: strictly **400 (regular)**, **500 (medium)**, and **600 (semibold)**. Avoid aggressive 800/900 black weights.
2. **Tabular & Code**: **`JetBrains Mono`**
   - Used for code blocks, terminal logs, file paths, git hashes, and numerical counters.

### Typographic Prohibitions (Anti-Tells)
- ❌ **NO Single-Word Gradient Clipping**: Never put one word in a headline in a different color or gradient clip. Write confident, uniform headlines in crisp `#F1F3F7`.
- ❌ **NO ALL-CAPS Eyebrows**: Never prepend headlines with `WORKSPACE // 01` or `SYSTEM STATUS`. Use clean sentence case labels (`Status sistem`, `Sesi aktif`).
- ❌ **NO Middle-Dot Strings**: Avoid artificial meta separators like `Project · Branch · Commit`. Use real visual hierarchy (chips, brackets, or clear spacing).
- ❌ **Line Length Constraint**: Body copy must not exceed **75 characters per line** for optimal reading fatigue during long coding sessions.

---

## 4. Layout Architecture & Structural Wireframe

The interface is structured as an **instrument console** with clear visual boundaries:

```
┌──────────────────────┬────────────────────────────────────────────────────────┐
│ BRAND & REPO DECK    │ HEADER BREADCRUMB & INSTRUMENT CONTROLS               │
├──────────────────────┼────────────────────────────────────────────────────────┤
│                      │                                                        │
│ [Workspace Selector] │   CENTRAL TELEMETRY VIEWPORT                           │
│                      │   - Clean view / Chat stream                           │
│ [Nav: AI / Git /     │   - Stepped reasoning timeline                         │
│       Remote / Logs] │   - Tool execution cards                               │
│                      │                                                        │
│ [Session History &   │                                                        │
│  Instant Filter]     │                                                        │
│                      ├────────────────────────────────────────────────────────┤
│                      │ FLOATING COMMAND DOCK                                  │
│                      │ [ Input prompt textarea ] [ Attachment ] [ Kirim (CTA) ]│
├──────────────────────┴────────────────────────────────────────────────────────┤
│ MOBILE BOTTOM DOCK (< md: Thumb-Zone Nav: AI | Git | Remote | Files)          │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Layout Principles
- **Left Deck (`w-64`)**: Milled graphite finish (`#101216`), vertical divider `1px solid #222630`.
- **Center Telemetry Viewport**: Ample breathing room, centered content container (`max-w-3xl`) ensuring lines stay within readable line-length boundaries.
- **Command Input Dock**: Sits docked at the viewport bottom (`sticky bottom-0 z-20`) with subtle 1px specular top highlight. Never feels like a random disconnected floating balloon.

---

## 5. Component Patterns & Class Hierarchy (`src/app.css`)

### 1. The Carbon Panel (`.carbon-panel`)
Replaces generic blurred cards with precision milled graphite panels:
```css
.carbon-panel {
  background: #101216;
  border: 1px solid #222630;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.5);
}
```

### 2. The Carbon Control & Input (`.carbon-input`)
Recessed tactile input bed with cold cyan focus indicator:
```css
.carbon-input {
  background: #0b0d11;
  border: 1px solid #222630;
  color: #f1f3f7;
}
.carbon-input:focus,
.carbon-input:focus-within {
  border-color: #00e5ff;
  box-shadow: 0 0 0 1px #00e5ff, 0 0 16px -2px rgba(0, 229, 255, 0.25);
}
```

### 3. Primary Telemetry Action Button (`.btn-telemetry`)
Opinionated, high-contrast action button. No purple gradient wash; crisp cold cyan with active tactile press:
```css
.btn-telemetry {
  background: #00e5ff;
  color: #04060a;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 10px rgba(0, 229, 255, 0.35);
  transition: all 0.15s ease;
}
.btn-telemetry:hover {
  background: #33ebff;
  box-shadow: 0 4px 16px rgba(0, 229, 255, 0.5);
}
.btn-telemetry:active {
  transform: scale(0.97);
}
```

### 4. Secondary Tool Button (`.btn-tool`)
Tactile recessed button for secondary triggers:
```css
.btn-tool {
  background: #161920;
  border: 1px solid #222630;
  color: #d1d5db;
}
.btn-tool:hover {
  background: #1c202a;
  border-color: #323846;
  color: #ffffff;
}
```

### 5. Chat Bubbles
- **User Bubble (`.bubble-user`)**:
  - Background: `#0c1a24`
  - Border: `1px solid rgba(0, 229, 255, 0.35)`
  - Text: `#f1f5f9`
  - Eliminates the generic SaaS purple gradient!
- **Agent Bubble (`.bubble-agent`)**:
  - Background: `#101216`
  - Border: `1px solid #222630`
  - Text: `#e2e8f0`

---

## 6. Writing in Design & Voice Guidelines

Words are functional instruments, not sales copy:
- **Active Verbs**: Use "Kirim", "Simpan", "Hentikan", "Muat ulang", "Salin". Avoid vague labels like "Submit" or "Lanjutkan".
- **Plain Sentence Case**: Write "Pengaturan sistem", not "PENGATURAN SISTEM" or "System Settings // Preferences".
- **Error States as Direction**: Never say "Oops, terjadi kesalahan!". Say exactly what happened and how to resolve it: "PIN tidak cocok. Periksa kembali PIN Anda di Pengaturan."
- **Empty States as Invitations**: Don't display empty marketing filler. Present immediate, high-value prompt triggers that start work immediately.

---

## 7. Pre-Delivery Quality Checklist

Before shipping any UI revision, verify:
- [ ] No purple / indigo gradient washes on buttons or cards.
- [ ] No single-word gradient clipping in headlines.
- [ ] No ALL-CAPS eyebrow labels.
- [ ] Palette adheres to the 5 Core Carbon tones (`#08090C`, `#101216`, `#161920`, `#222630`, `#00E5FF`).
- [ ] Line lengths constrained to < 75 characters.
- [ ] Focus rings visible on keyboard tab (`:focus-visible`).
- [ ] Reduced motion `@media (prefers-reduced-motion: reduce)` respected.
- [ ] Tested at mobile (375px), tablet (768px), and wide desktop (1440px).
