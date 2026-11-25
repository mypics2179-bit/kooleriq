---
name: Glacier Telemetry
colors:
  surface: '#0b1229'
  surface-dim: '#0b1229'
  surface-bright: '#323851'
  surface-container-lowest: '#060d24'
  surface-container-low: '#141a32'
  surface-container: '#181e36'
  surface-container-high: '#222941'
  surface-container-highest: '#2d344c'
  on-surface: '#dce1ff'
  on-surface-variant: '#bac9cc'
  inverse-surface: '#dce1ff'
  inverse-on-surface: '#292f48'
  outline: '#849396'
  outline-variant: '#3b494c'
  surface-tint: '#00daf3'
  primary: '#c3f5ff'
  on-primary: '#00363d'
  primary-container: '#00e5ff'
  on-primary-container: '#00626e'
  inverse-primary: '#006875'
  secondary: '#b8c5f2'
  on-secondary: '#212f53'
  secondary-container: '#38466b'
  on-secondary-container: '#a6b4df'
  tertiary: '#a8ffd2'
  on-tertiary: '#003824'
  tertiary-container: '#5be9ad'
  on-tertiary-container: '#006645'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#9cf0ff'
  primary-fixed-dim: '#00daf3'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#004f58'
  secondary-fixed: '#dae2ff'
  secondary-fixed-dim: '#b8c5f2'
  on-secondary-fixed: '#0a1a3d'
  on-secondary-fixed-variant: '#38466b'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0b1229'
  on-background: '#dce1ff'
  surface-variant: '#2d344c'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  telemetry-lg:
    fontFamily: JetBrains Mono
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.03em
  telemetry-md:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
  telemetry-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system delivers an operational, mission-critical mobile telemetry experience tailored for retail store managers, route drivers, and merchandisers working on convenience store and gas station sales floors. The aesthetic merges tactile cold-chain industrialism with hyper-precise AI diagnostics. 

The aesthetic is characterized by high-contrast ambient darkness punctuated by luminous cryogenic accents. Visual surfaces evoke frosted glass cooler doors, chill-mist condensation, and industrial refrigeration interfaces. The UI prioritizes single-thumb field utility: glanceable stock metrics, clear spatial planogram heatmaps, and high-legibility telemetry under harsh fluorescent canopy lighting.

## Colors
The color architecture reflects a high-tech refrigerated environment, grounded in deep sub-zero navy hues to reduce eye strain in refrigerated vaults and dark store aisles, while electric cyan spotlights active AI recommendations.

- **Primary (`#00E5FF` - Electric Cool Cyan):** Used for primary interactive triggers, AI detection bounding boxes, active shelf indicators, and key operational signals.
- **Secondary (`#101F42` - Glacier Navy Surface):** Structural canvas container for telemetry cards, drawer sheets, and elevation layers above base canvas.
- **Tertiary (`#10B981` - Crisp Emerald):** Dedicated to positive revenue gains, planogram compliance confirmation, optimal stock status, and lift percentages.
- **Neutral Base (`#0A1128` - Deep Glacier Canvas):** The foundational ambient ground for the entire mobile experience.
- **Signal Warnings:** `#FF9F1C` (Amber) signals sub-optimal stock and re-order thresholds; `#FF5A5F` (Crimson Chill) indicates out-of-stock, planogram violations, and cooler temperature faults.
- **Brand Badges:** Pre-allocated chromatic chips for high-velocity beverage brands (Coke `#E41E2B`, Red Bull `#0C2340`, Monster `#5AC500`, Celsius `#FF6A39`) rendered as compact indicators against dark backgrounds.

## Typography
The system employs a tripartite typographical hierarchy engineered for operational velocity:

1. **Display & Section Titles (Plus Jakarta Sans):** Geometric and contemporary with open apertures, providing structural warmth and quick scanning on mobile viewports.
2. **Body & Microcopy (Inter):** Highly legible across varied viewing angles and device sizes during aisle audits.
3. **Telemetry & Metrics (JetBrains Mono):** Monospaced numeric rendering for inventory counts, facing percentages, shelf positions (e.g., `S3-F12`), temperatures, and currency gains. This prevents tabular jitter during real-time camera scanning updates.

## Layout & Spacing
Designed around a dense, high-utility 4-column mobile grid system expanding to 8 columns on retail handhelds and tablets. 

- **Outer Margins:** Fixed at `1rem` (16px) on mobile viewports to maximize visual payload for cooler shelf schematics.
- **Rhythm:** Spacing strictly adheres to a 4px/8px incremental rhythm. Compact vertical gaps (`space-xs` and `space-sm`) group related SKU metadata, while larger increments (`space-lg`, `space-xl`) separate discrete shelf tiers and physical door units.
- **Touch Target Rules:** All touch targets maintain a minimum dimension of 44x44px to accommodate gloved or wet-hand operation in chilled environments.

## Elevation & Depth
Visual hierarchy relies on frosted luminous depth, avoiding heavy flat drop-shadows in favor of cold-light dissipation and surface illumination:

- **Level 0 (Canvas Base):** Solid Deep Glacier Navy (`#0A1128`).
- **Level 1 (Static Cards / Planogram Shelves):** Dark Glacier Navy (`#101F42`) bordered with a 1px frost outline: `rgba(255, 255, 255, 0.08)`.
- **Level 2 (Interactive Modules / Scanned Facings):** Translucent sub-zero container (`rgba(16, 31, 66, 0.75)`) layered over a `backdrop-filter: blur(12px)` and bordered by `rgba(0, 229, 255, 0.25)`.
- **Level 3 (Modal Sheets / Floating Actions / Camera HUD):** Elevated frost panel (`rgba(16, 31, 66, 0.90)`) with an outer ambient cyan glow: `0px 8px 32px rgba(0, 229, 255, 0.12)` and a crisp rim highlight: `inset 0px 1px 0px rgba(255, 255, 255, 0.20)`.

## Shapes
The design system adopts a soft, precision-tooled corner radius (`roundedness: 1`). 

- Default elements (buttons, inputs, telemetry chips) utilize `0.25rem` (4px).
- Surface containers and planogram door representations utilize `0.5rem` (8px).
- Bottom sheets, scan viewports, and primary modal cards utilize `0.75rem` (12px).
- Brand-specific tags and live AI status pips are styled as tight pill shapes to visually differentiate SKU metadata from physical shelf architecture.

## Components

### Buttons
- **Primary Action (AI Optimize, Submit Restock):** Solid Electric Cool Cyan background (`#00E5FF`) with deep navy typography (`#0A1128`), weight 600. Active states trigger an inner glow.
- **Secondary (Scan Shelves, Filter Doors):** Translucent Navy surface (`rgba(0, 229, 255, 0.08)`) with a 1px border (`#00E5FF`) and cyan text.
- **Destructive/Alert:** Deep red base with a vibrant crimson border (`#FF5A5F`) and crisp white typography.

### Planogram Cards & Facing Chips
- **Shelf Facing Slot:** Rectangular visual container styled with subtle inner borders denoting product depth. 
- **Out-of-Stock Slot:** Ghost outline dashed with Alert Amber (`#FF9F1C`) or Crimson (`#FF5A5F`), holding a centered monospaced `+RESTOCK` callout.
- **AI Recommendation Overlay:** Crisp emerald outline (`#10B981`) with a floating micro-badge displaying projected lift (e.g., `+18% REV`).

### Brand & Status Badges
- **Beverage Brand Chips:** Micro-badges with a 2px left border accent carrying the signature brand hex (e.g., `#5AC500` for Monster) set against a dark neutral backing (`rgba(255, 255, 255, 0.06)`).
- **Telemetry Indicators:** Pill badges pairing a JetBrains Mono value with a colored pulsing dot (green for optimal capacity, amber for under 20% stock).

### Input Fields & Search Bars
- Background set to `rgba(16, 31, 66, 0.60)` with a 1px frost outline (`rgba(255, 255, 255, 0.12)`). Focused inputs transition border color to Electric Cool Cyan (`#00E5FF`) with a subtle `0 0 8px rgba(0, 229, 255, 0.3)` glow.

### Mobile Bottom Navigation
- Anchored floating bar with a 12px blur backdrop (`rgba(10, 17, 40, 0.85)`), top frosted border (`rgba(255, 255, 255, 0.10)`), and five touch points: Planogram, Audit (Camera), AI Insights, Inventory, and Settings.
- The central AI Camera audit button is elevated, circled with an Electric Cyan illuminated halo.