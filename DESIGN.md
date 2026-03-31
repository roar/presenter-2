# Design System

Inspired by Apple Keynote: content-first, chrome-minimal, precise and calm.
The presentation canvas always takes center stage. UI elements recede when not in use.

## Principles

- **Content-first** — the slide/canvas is the hero; UI chrome is subordinate
- **Calm precision** — no visual noise, generous whitespace, deliberate hierarchy
- **Dark mode first** — light mode is a variant, not the default
- **Flat with purpose** — depth only where it communicates layering (panels over canvas, modals over panels)
- **System-native feel** — use system font, respect OS conventions

---

## Colors

### Dark mode (default)

| Token            | Value     | Usage                                  |
|------------------|-----------|----------------------------------------|
| `--bg`           | `#1e1e1e` | App background, canvas surround        |
| `--bg-panel`     | `#2a2a2a` | Sidebars, inspector, toolbar           |
| `--bg-elevated`  | `#333333` | Popovers, dropdown menus               |
| `--border`       | `#3a3a3a` | Dividers, panel edges                  |
| `--border-strong`| `#505050` | Active/focused borders                 |
| `--text`         | `#f0f0f0` | Primary text                           |
| `--text-dim`     | `#888888` | Labels, hints, secondary text          |
| `--text-disabled`| `#555555` | Disabled state text                    |
| `--accent`       | `#0a84ff` | Selection, active state, primary CTA   |
| `--accent-dim`   | `#0a84ff26`| Selection highlight on canvas         |
| `--danger`       | `#ff453a` | Destructive actions                    |
| `--canvas`       | `#141414` | The area surrounding slides            |

### Light mode

| Token            | Value     | Usage                                  |
|------------------|-----------|----------------------------------------|
| `--bg`           | `#f0f0f0` | App background                         |
| `--bg-panel`     | `#ffffff` | Sidebars, inspector, toolbar           |
| `--bg-elevated`  | `#ffffff` | Popovers, dropdowns                    |
| `--border`       | `#d0d0d0` | Dividers                               |
| `--border-strong`| `#a0a0a0` | Active/focused borders                 |
| `--text`         | `#1a1a1a` | Primary text                           |
| `--text-dim`     | `#888888` | Secondary text                         |
| `--text-disabled`| `#bbbbbb` | Disabled                               |
| `--accent`       | `#007aff` | Selection, primary CTA                 |
| `--accent-dim`   | `#007aff1a`| Selection highlight                   |
| `--danger`       | `#ff3b30` | Destructive actions                    |
| `--canvas`       | `#e0e0e0` | Slide surround                         |

---

## Typography

- **Font:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif`
- **Monospace:** `"SF Mono", "Menlo", monospace`

| Role          | Size | Weight | Usage                        |
|---------------|------|--------|------------------------------|
| `label-xs`    | 11px | 400    | Toolbar labels, status bar   |
| `label-sm`    | 12px | 400    | Inspector labels, hints      |
| `body`        | 13px | 400    | Panel content, menus         |
| `body-medium` | 13px | 500    | Emphasized body              |
| `heading-sm`  | 14px | 600    | Section headers in inspector |
| `heading`     | 16px | 600    | Panel titles, dialog headings|
| `title`       | 20px | 600    | Window/page titles           |

- **Line height:** 1.4 body, 1.2 headings
- **Letter spacing:** 0 default; `-0.01em` for headings

---

## Spacing

Base unit: **4px**. Always use multiples — no arbitrary values.

| Token  | Value | Usage                          |
|--------|-------|--------------------------------|
| `xs`   | 4px   | Icon padding, tight gaps       |
| `sm`   | 8px   | Component internal padding     |
| `md`   | 12px  | Default gap between elements   |
| `lg`   | 16px  | Panel section padding          |
| `xl`   | 24px  | Between major sections         |
| `2xl`  | 32px  | Large layout gaps              |

---

## Layout

Keynote-style three-column shell:

```
┌─────────────┬──────────────────────────┬───────────────┐
│ Slide       │                          │  Inspector /  │
│ Navigator   │       Canvas             │  Format Panel │
│ (left)      │                          │  (right)      │
│  200px      │       flex-1             │   260px       │
└─────────────┴──────────────────────────┴───────────────┘
                   Toolbar (top, full width)
                   Status bar (bottom, full width)
```

- Panels are collapsible; canvas expands to fill the space
- Toolbar height: 44px
- Status bar height: 24px
- Panel widths are resizable with a drag handle

---

## Elevation & Depth

| Layer         | Treatment                                   |
|---------------|---------------------------------------------|
| App background| Flat, no shadow                             |
| Panels        | `1px solid var(--border)` only, no shadow   |
| Popovers      | `box-shadow: 0 4px 16px rgba(0,0,0,0.4)`    |
| Modals        | `box-shadow: 0 8px 32px rgba(0,0,0,0.5)` + backdrop blur |
| Canvas slides | `box-shadow: 0 2px 12px rgba(0,0,0,0.5)`    |

No decorative shadows on panels or buttons.

---

## Border radius

| Element              | Radius  |
|----------------------|---------|
| Buttons (default)    | 6px     |
| Inputs               | 6px     |
| Popovers / dropdowns | 8px     |
| Modals               | 12px    |
| Toolbar buttons      | 5px     |
| Tags / badges        | 4px     |
| Pills / toggles      | 9999px  |

---

## Components

### Toolbar

- Height: 44px, full width, `--bg-panel` background
- Icon-only buttons by default; icon + label for primary actions
- Button size: 28×28px, radius 5px
- Active state: `--accent` tint background (`--accent-dim`)
- Dividers: `1px solid var(--border)` between groups

### Buttons

- **Primary:** `--accent` background, white text, 6px radius, 28px height
- **Secondary:** transparent background, `--border` border, `--text` color
- **Ghost:** no border, no background — hover reveals `--bg-elevated`
- **Destructive:** `--danger` color on ghost/secondary; only `--danger` bg on confirm dialogs
- Disabled: 40% opacity, not interactive
- No box shadows on buttons

### Inputs & Fields

- Height: 28px (single line), 6px radius
- Border: `1px solid var(--border)`, focus: `1px solid var(--accent)`
- Background: `--bg` (darker than panel — recessed look)
- No focus ring glow — border color change only
- Label above the input, 11px, `--text-dim`

### Inspector / Format Panel

- Sections separated by `1px solid var(--border)` dividers
- Section headers: 11px uppercase, `--text-dim`, letter-spacing 0.05em
- Controls in a 2-column grid where possible (label left, control right)
- Padding: 12px horizontal, 10px vertical per section

### Slide Navigator (left panel)

- Slide thumbnails with 4px border radius
- Selected slide: `2px solid var(--accent)` outline
- Hover: subtle `--bg-elevated` background

### Popovers & Dropdowns

- `--bg-elevated` background, 8px radius, border `1px solid var(--border)`
- `box-shadow: 0 4px 16px rgba(0,0,0,0.4)`
- Menu item height: 28px, 12px horizontal padding
- Hover: `--accent-dim` background
- Keyboard-navigable

### Modals / Dialogs

- Max width: 480px (small), 640px (medium), 800px (large)
- Backdrop: `rgba(0,0,0,0.5)` + `backdrop-filter: blur(4px)`
- 12px radius, padding 24px
- Close button top-right, ghost style

---

## Icons

- **Library:** [Lucide](https://lucide.dev) — closest to SF Symbols in style
- **Size:** 16px inline text, 18px toolbar, 20px standalone/empty states
- **Stroke width:** 1.5px
- Icons are never filled; always outline/stroke style

---

## Rendering technology

**Decision: DOM + CSS.** Evaluated against Canvas and WebGL; DOM wins for this use case.

### Why not Canvas

Canvas has no retained scene graph — every interaction (hit testing, selection, cursor changes) must be tracked manually. Text layout, wrapping, and accessibility must be reimplemented from scratch. The editor overlay (selection handles, drag targets) cannot share components with the renderer. A full migration from DOM to Canvas is a rewrite of the entire render layer.

### Why not WebGL

Only justified for GPU-accelerated 3D or very high frame-rate effects. Text rendering requires SDF fonts or texture atlases. Adds massive infrastructure overhead for a slide app.

### DOM capabilities that cover our needs

| Need | DOM/CSS approach |
|---|---|
| Smooth transforms (position, scale, rotation) | `transform` + `transition` — GPU composited |
| Opacity animation | `opacity` + `transition` — GPU composited |
| Text shadows | `text-shadow` with `transition`; animate from zero-spread to avoid `none` interpolation issue |
| Slide transitions | CSS `@keyframes` or Web Animations API |
| Thumbnails | CSS `scale` transform on the renderer component — same code, no second render path |
| PDF/print export | `window.print()` or Puppeteer against the same DOM |

### Performance rules

Only animate GPU-composited properties at high frequency: `transform` and `opacity`. For `text-shadow` on heavily animated elements, fake it with a `::after` pseudo-element using `filter: blur()` and animate `opacity` on that instead — avoids repaint.

### Escape hatch

If a specific slide element requires pixel-level control (e.g. a particle effect, generative background), that element alone can use a `<canvas>` tag. The slide renderer remains DOM-based; Canvas is opt-in per element, not a wholesale replacement.

---

## Motion

- **Micro-interactions** (hover, press): 100ms ease-out
- **Panel open/close:** 180ms ease-in-out
- **Modal enter:** 200ms ease-out, slight scale from 0.97 → 1
- **Slide transitions in navigator:** 150ms
- No bounce, no spring — Keynote's UI motion is restrained
- Respect `prefers-reduced-motion`: disable all transitions when set

---

## Do / Don't

| Do | Don't |
|----|-------|
| Use the spacing scale (multiples of 4px) | Use arbitrary px values like 7px, 11px, 15px |
| Use `--text-dim` for secondary labels | Use a lighter font weight as a substitute for color hierarchy |
| Use border-only for secondary/ghost buttons | Add box-shadows to buttons or panels |
| Keep the canvas area visually quiet | Add decorative gradients or patterns behind slides |
| Use `--accent` only for selection and primary CTAs | Use `--accent` as a general highlight or decoration color |
| Collapse chrome when in presentation/focus mode | Keep sidebars visible when the user is presenting |
| Use system font stack | Import a custom font — the native feel matters |
