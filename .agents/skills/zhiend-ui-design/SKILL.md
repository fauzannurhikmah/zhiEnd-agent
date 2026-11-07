---
name: zhiend-ui-design
description: "Distinctive UI/UX Design System for zhiEnd Agent. Opinionated 'Teenage Engineering Industrial Field Instrument' (TE-IFI) design identity: matte chalk bone chassis, putty concrete decks, tactile safety hazard orange switches, physical mechanical buttons with inset/outset bevels, precision milled seams, and zero generic AI slop."
---

# zhiEnd Agent UI/UX Design System: Industrial Field Instrument (TE-IFI)

> [!IMPORTANT]
> **Core Aesthetic Mandate**: zhiEnd Agent is NOT a generic software dashboard or dark-mode AI chatbot. It is a **physical precision instrument** — inspired by Teenage Engineering (OP-1, EP-133 K.O. II, TP-7), Dieter Rams' Braun hardware, and high-end laboratory synthesizers.
>
> **Strict Bans**:
> - NO dark mode black canvases (`#000000`, `#08090C`, `#111111`)
> - NO blue, cyan, indigo, or purple color palettes
> - NO neon glowing drop shadows or decorative aurora blobs
> - NO single-word gradient headlines or text clippings
> - NO generic floating SaaS card kits with `rgba(0,0,0,0.1)` blurry shadows
> - NO tracked-out uppercase marketing fluff

---

## 1. 6-Tone Industrial Hardware Palette

All surfaces are tactile, physical, and grounded in real-world milled materials:

```
[#F4F3EE] Chalk Bone Chassis     ── Ground workspace, matte body
[#E9E7E0] Putty Concrete Deck    ── Structural panels, sidebars, decks
[#DEDBD2] Machined Magnesium     ── Raised beds, active tabs, floating plates
[#FCFCFA] Pure Alabaster         ── Recessed input wells, message bays
[#C8C5BC] Milled Hairline Seam   ── 1px structural mechanical joints
[#FF5500] Safety Hazard Orange   ── Tactile primary action keys & active telemetry
[#E5A91A] Warning Mustard Yellow ── Caution indicators, active process runs
[#191B1D] Deep Basalt Ink        ── High-contrast typography & labels
[#5C6066] Milled Stencil Grey    ── Secondary technical data & timestamps
```

---

## 2. Physical Component Engineering

### A. Mechanical Tactile Buttons (`.btn-hardware`, `.btn-safety`)
- **Physics**: Real mechanical push-button feedback.
- **Normal State**: Crisp milled border (`#C8C5BC`), physical 2px bottom shadow / bevel (`border-b-2 border-b-[#A8A59C]`), flat matte finish.
- **Pressed State (`:active`)**: Translates down `1px` (`active:translate-y-[1px]`), bottom bevel collapses to `1px`.
- **Primary Switch (`.btn-safety`)**: Vivid Safety Hazard Orange (`#FF5500`), white bold technical text, high tactile contrast.

### B. Recessed Machined Wells (`.hardware-well`)
- Inputs, textareas, and code blocks sit in **sunken mechanical wells** rather than floating cards.
- Background: `#FCFCFA` (Alabaster).
- Border: `1px solid #C8C5BC` with subtle physical inset shading (`shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]`).

### C. Structural Panels (`.hardware-panel`)
- Background: `#E9E7E0` (Putty Concrete).
- Seams: 1px continuous hairline rules in `#C8C5BC`.
- Zero blurry floating shadows. Depth comes from physical milled rules and mechanical elevation.

### D. Chat Bubbles: Hardware Bays
- **User Bubble (`.bubble-user-hardware`)**: `#FCFCFA` Alabaster plate, framed by a 2px Safety Hazard Orange left-indicator groove, basalt ink text.
- **Agent Bubble (`.bubble-agent-hardware`)**: Engineered `#E9E7E0` Putty deck, milled hairline border `#C8C5BC`, structured accordion steps mimicking laboratory oscilloscope loggers.

---

## 3. Typography & Technical Stenciling

- **Font Personality**: Technical grotesque and industrial monospace (Geist / DIN / Space Grotesk / Space Mono).
- **Scale**:
  - Hero Headline: 24px–28px, Bold / ExtraBold, Deep Basalt Ink (`#191B1D`), pure sentence case.
  - Section Headings: 13px–14px, Bold, `#191B1D`.
  - Body Text: 13px, Regular, `#191B1D`, line-height 1.6, line length < 75 characters.
  - Stencil Labels: 10px–11px, Monospace, `#5C6066`, clean technical labeling.
- **Rules**:
  - Never accent a single word with gradient or italic decoration.
  - No fake ALL-CAPS tracked eyebrows. Use authentic hardware labels: `Bay 01`, `Port :3888`, `Rev 2.4`.

---

## 4. Universal Modal & Overlay Consistency Mandate (0% Dark Mode Tolerance)

> [!CAUTION]
> **Zero Tolerance Rule**: Inconsistency across views or popping up a dark-mode modal inside a physical hardware instrument immediately destroys user trust.
> - **Every single modal** (`ProjectModal`, `SettingsModal`, `PersonaModal`, `ConfirmModal`, `NoticeModal`, `PinModal`, `PushModal`) MUST be 100% TE-IFI.
> - **Strictly Banned in Any Modal/Dropdown/Overlay**:
>   - `bg-zinc-950`, `bg-zinc-900`, `bg-black/80`, `bg-slate-900`
>   - `border-white/*`, `border-zinc-800`
>   - `text-indigo-*`, `bg-indigo-*`, `border-indigo-*`, `violet-*`
> - **Standard Modal Engineering Pattern**:
>   - **Backdrop**: `fixed inset-0 bg-black/60 backdrop-blur-sm z-50`
>   - **Chassis Body**: `bg-[#FCFCFA] border border-[#C8C5BC] rounded-2xl shadow-2xl text-[#191B1D]`
>   - **Chassis Header & Tab Bar**: `bg-[#E9E7E0] border-b border-[#C8C5BC]`
>   - **Header Stencil Badge**: `w-8 h-8 rounded-lg bg-[#FF5500] text-white flex items-center justify-center font-bold shadow-xs`
>   - **Active Navigation Tab**: `border-[#FF5500] text-[#FF5500] font-bold`
>   - **Form Fields & Inputs**: `bg-[#FCFCFA] border border-[#C8C5BC] focus:border-[#FF5500] text-[#191B1D] font-mono rounded-xl shadow-xs`
>   - **Action Triggers**: `.btn-safety` for primary/save, `.btn-hardware` for secondary/cancel.

---

## 5. Instrument Cockpit Layout Architecture (Anti-AI-Slop Formations)

> [!IMPORTANT]
> **Banishing the "Cursor/ChatGPT Clone" Layout**:
> Generic AI tools reuse the same cliché template: big centered greeting text + duplicate center input box + 2x2 floating cards with blurry shadows. This is forbidden in zhiEnd Agent.

### A. The Master Instrument Cockpit
Instead of conversational SaaS fluff, the main workspace is structured as a **hardware instrument console**:
1. **Physical Machine Nameplate & Telemetry Register**:
   - Milled plate: `zhiEnd FIELD INSTRUMENT // TX-3888 // REV 2.4`
   - Real-time diagnostic indicators: pulsing safety hazard orange LED (`#FF5500`), live bus nominal status, active workspace indicator.
2. **Hardware Macro Soundbank Matrix (EP-133 / OP-1 Parameter Bay)**:
   - Formatted as physical sequencer trigger keys (`PAD 01 // AUDIT`, `PAD 02 // EXPLORE`, `PAD 03 // DEBUG`, `PAD 04 // SHIP`).
   - Tactile physics: Inset top highlight (`inset_0_1px_2px_rgba(255,255,255,0.7)`), 2px mechanical bottom edge (`0_2px_0_#C8C5BC`), and active press displacement (`active:translate-y-0.5`).
3. **Diagnostic Strip & Command Stencils**:
   - Fast terminal commands (`!code`, `!git`, `!push`, `!persona`) and physical hardware hotkeys (`Ctrl + Enter TO FIRE`).
4. **Permanently Anchored Hardware Control Deck**:
   - The primary input console is docked consistently at the bottom of the viewport at all times (whether 0 messages or 100 messages). No jumping layouts, no duplicate center prompt boxes.

---

## 6. Pre-Delivery Physical Instrument Checklist

- [ ] Is the canvas 100% free of dark mode and neon glows?
- [ ] Are all modals (`ProjectModal`, `SettingsModal`, `PersonaModal`, etc.) 100% consistent with the `#FCFCFA` / `#E9E7E0` / `#C8C5BC` / `#FF5500` hardware palette?
- [ ] Are blue, purple, and indigo completely banished from every file and modal?
- [ ] Are all buttons tactile with physical bevels and press mechanics (`.btn-safety`, `.btn-hardware`)?
- [ ] Do input fields feel like recessed hardware bins (`.hardware-well`)?
- [ ] Is the layout free of generic SaaS 2x2 card fluff, using the authentic Instrument Cockpit formation?
- [ ] Does the application look and feel like an unmistakable Teenage Engineering industrial field instrument?
