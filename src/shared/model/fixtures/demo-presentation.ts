// Demo presentation — walks through every implemented feature.
// Each slide explains what it is demonstrating.
// Typed against Document so TypeScript catches any model drift.

import type { Document } from '../types'

// ── Shared constants ──────────────────────────────────────────────────────────

const DARK_BG = '#0d0d0d'
const SLIDE_BG = '#111111'
const TEXT_PRIMARY = '#f0f0f0'
const TEXT_MUTED = '#888888'
const ACCENT_BLUE = '#0a84ff'
const ACCENT_GREEN = '#30d158'
const ACCENT_RED = '#ff453a'
const ACCENT_YELLOW = '#ffd60a'
const ACCENT_PURPLE = '#bf5af2'

// Accent bar that spans the full slide width (top edge, 6 px tall)
const accentBar = (id: string) => ({
  kind: 'shape' as const,
  id,
  x: 0,
  y: 0,
  width: 1920,
  height: 6,
  rotation: 0,
  pathData: 'M 0 0 L 1920 0 L 1920 6 L 0 6 Z',
  fill: { color: ACCENT_BLUE, opacity: 1 },
  stroke: { color: 'transparent', width: 0, opacity: 0 }
})

// Logo MSO — a small blue square in the top-left corner, shared across all slides.
// masterId links each instance so the renderer treats it as a single object
// unaffected by slide transitions (it stays put while content changes beneath it).
const logoMso = (id: string) => ({
  kind: 'shape' as const,
  id,
  masterId: 'demo-logo-mso',
  x: 56,
  y: 24,
  width: 36,
  height: 36,
  rotation: 0,
  pathData: 'M 0 0 L 36 0 L 36 36 L 0 36 Z',
  fill: { color: ACCENT_BLUE, opacity: 1 },
  stroke: { color: 'transparent', width: 0, opacity: 0 }
})

// Simple solid rectangle helper
const rect = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  fillOpacity = 1,
  strokeColor = 'transparent',
  strokeWidth = 0
) => ({
  kind: 'shape' as const,
  id,
  x,
  y,
  width: w,
  height: h,
  rotation: 0,
  pathData: `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`,
  fill: { color: fill, opacity: fillOpacity },
  stroke: { color: strokeColor, width: strokeWidth, opacity: strokeWidth > 0 ? 1 : 0 }
})

// Simple bordered rectangle (filled + stroked)
const card = (id: string, x: number, y: number, w: number, h: number, fillColor: string) =>
  rect(id, x, y, w, h, fillColor, 0.15, fillColor, 2)

// Fade-in animation helper
const fadeIn = (id: string, targetId: string, offset: number, duration = 0.5) => ({
  id,
  targetId,
  offset,
  duration,
  easing: 'ease-out' as const,
  effect: { kind: 'build-in' as const, type: 'fade' as const, to: 1 }
})

export const demoPresentationDocument: Document = {
  id: 'demo-presentation-001',
  title: 'Presenter 2 — Feature Demo',
  ownerId: null,
  isPublished: false,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',

  slides: [
    // ── Slide 1: Cover ───────────────────────────────────────────────────────
    // Demonstrates: background colour, text elements, enter:fade animation,
    // staggered offsets within a single cue, fade slide transition.
    {
      id: 'demo-s1',
      background: DARK_BG,
      children: [
        accentBar('demo-s1-bar'),
        {
          kind: 'text',
          id: 'demo-s1-title',
          x: 120,
          y: 340,
          width: 1680,
          height: 200,
          rotation: 0,
          content: 'Presenter 2',
          fontSize: 128,
          fontWeight: 700,
          color: TEXT_PRIMARY,
          align: 'center'
        },
        {
          kind: 'text',
          id: 'demo-s1-sub',
          x: 120,
          y: 560,
          width: 1680,
          height: 80,
          rotation: 0,
          content: 'A tour of the features implemented so far',
          fontSize: 40,
          fontWeight: 400,
          color: TEXT_MUTED,
          align: 'center'
        },
        {
          kind: 'text',
          id: 'demo-s1-note',
          x: 120,
          y: 960,
          width: 1680,
          height: 60,
          rotation: 0,
          content: 'Click to advance →',
          fontSize: 24,
          fontWeight: 400,
          color: '#444444',
          align: 'center'
        },
        logoMso('demo-logo-s1')
      ],
      cues: [
        // Staggered fade-in: title first, subtitle 300 ms later
        {
          id: 'demo-s1-cue1',
          kind: 'animation',
          trigger: 'on-click',
          loop: { kind: 'none' },
          animations: [
            fadeIn('demo-s1-a1', 'demo-s1-title', 0, 0.8),
            fadeIn('demo-s1-a2', 'demo-s1-sub', 0.3, 0.6),
            fadeIn('demo-s1-a3', 'demo-s1-note', 0.7, 0.5)
          ]
        },
        {
          id: 'demo-s1-cue2',
          kind: 'transition',
          trigger: 'on-click',
          slideTransition: { kind: 'fade-through-color', duration: 0.6, easing: 'ease-in-out' }
        }
      ]
    },

    // ── Slide 2: Element Types ────────────────────────────────────────────────
    // Demonstrates: text elements, shape elements (rect + circle), image element
    // placeholder, sequential enter animations across multiple cue clicks.
    {
      id: 'demo-s2',
      background: SLIDE_BG,
      children: [
        {
          kind: 'text',
          id: 'demo-s2-h',
          x: 120,
          y: 80,
          width: 1680,
          height: 100,
          rotation: 0,
          content: 'Element Types',
          fontSize: 72,
          fontWeight: 700,
          color: TEXT_PRIMARY,
          align: 'left'
        },
        // ── text ──
        {
          kind: 'text',
          id: 'demo-s2-text-label',
          x: 140,
          y: 240,
          width: 440,
          height: 40,
          rotation: 0,
          content: 'text',
          fontSize: 26,
          fontWeight: 400,
          color: ACCENT_BLUE,
          align: 'left'
        },
        card('demo-s2-text-card', 120, 290, 480, 300, ACCENT_BLUE),
        {
          kind: 'text',
          id: 'demo-s2-text-ex',
          x: 148,
          y: 318,
          width: 424,
          height: 244,
          rotation: 0,
          content: 'Position, size,\nfont, color,\nalignment.',
          fontSize: 36,
          fontWeight: 400,
          color: TEXT_PRIMARY,
          align: 'left'
        },
        // ── shape ──
        {
          kind: 'text',
          id: 'demo-s2-shape-label',
          x: 740,
          y: 240,
          width: 440,
          height: 40,
          rotation: 0,
          content: 'shape',
          fontSize: 26,
          fontWeight: 400,
          color: ACCENT_GREEN,
          align: 'left'
        },
        card('demo-s2-shape-card', 720, 290, 480, 300, ACCENT_GREEN),
        // Rectangle inside the card
        rect('demo-s2-rect', 756, 330, 180, 120, ACCENT_GREEN, 0.3, ACCENT_GREEN, 2),
        // Circle inside the card (approximated with a bezier arc path)
        {
          kind: 'shape',
          id: 'demo-s2-circle',
          x: 970,
          y: 330,
          width: 120,
          height: 120,
          rotation: 0,
          pathData: 'M 60 0 A 60 60 0 1 1 59.9 0 Z',
          fill: { color: ACCENT_GREEN, opacity: 0.4 },
          stroke: { color: ACCENT_GREEN, width: 2, opacity: 1 }
        },
        {
          kind: 'text',
          id: 'demo-s2-shape-note',
          x: 748,
          y: 470,
          width: 424,
          height: 100,
          rotation: 0,
          content: 'SVG paths, fill,\nstroke.',
          fontSize: 28,
          fontWeight: 400,
          color: TEXT_PRIMARY,
          align: 'left'
        },
        // ── image ──
        {
          kind: 'text',
          id: 'demo-s2-image-label',
          x: 1340,
          y: 240,
          width: 440,
          height: 40,
          rotation: 0,
          content: 'image',
          fontSize: 26,
          fontWeight: 400,
          color: ACCENT_YELLOW,
          align: 'left'
        },
        card('demo-s2-image-card', 1320, 290, 480, 300, ACCENT_YELLOW),
        {
          kind: 'text',
          id: 'demo-s2-image-ex',
          x: 1348,
          y: 318,
          width: 424,
          height: 244,
          rotation: 0,
          content: 'src: URL\nobjectFit:\ncontain',
          fontSize: 36,
          fontWeight: 400,
          color: TEXT_PRIMARY,
          align: 'left'
        },
        // ── shared note ──
        {
          kind: 'text',
          id: 'demo-s2-note',
          x: 120,
          y: 660,
          width: 1680,
          height: 120,
          rotation: 0,
          content:
            'All elements share a common base: x, y, width, height, rotation. Each type adds its own properties on top.',
          fontSize: 30,
          fontWeight: 400,
          color: TEXT_MUTED,
          align: 'left'
        },
        logoMso('demo-logo-s2')
      ],
      cues: [
        // Click 1: text column appears
        {
          id: 'demo-s2-cue1',
          kind: 'animation',
          trigger: 'on-click',
          loop: { kind: 'none' },
          animations: [
            fadeIn('demo-s2-a1', 'demo-s2-text-label', 0, 0.4),
            fadeIn('demo-s2-a2', 'demo-s2-text-card', 0.05, 0.4),
            fadeIn('demo-s2-a3', 'demo-s2-text-ex', 0.1, 0.4)
          ]
        },
        // Click 2: shape column appears
        {
          id: 'demo-s2-cue2',
          kind: 'animation',
          trigger: 'on-click',
          loop: { kind: 'none' },
          animations: [
            fadeIn('demo-s2-a4', 'demo-s2-shape-label', 0, 0.4),
            fadeIn('demo-s2-a5', 'demo-s2-shape-card', 0.05, 0.4),
            fadeIn('demo-s2-a6', 'demo-s2-rect', 0.1, 0.4),
            fadeIn('demo-s2-a7', 'demo-s2-circle', 0.15, 0.4),
            fadeIn('demo-s2-a8', 'demo-s2-shape-note', 0.2, 0.4)
          ]
        },
        // Click 3: image column + note appear
        {
          id: 'demo-s2-cue3',
          kind: 'animation',
          trigger: 'on-click',
          loop: { kind: 'none' },
          animations: [
            fadeIn('demo-s2-a9', 'demo-s2-image-label', 0, 0.4),
            fadeIn('demo-s2-a10', 'demo-s2-image-card', 0.05, 0.4),
            fadeIn('demo-s2-a11', 'demo-s2-image-ex', 0.1, 0.4),
            fadeIn('demo-s2-a12', 'demo-s2-note', 0.3, 0.5)
          ]
        },
        {
          id: 'demo-s2-cue4',
          kind: 'transition',
          trigger: 'on-click',
          slideTransition: { kind: 'push', duration: 0.5, easing: 'ease-in-out' }
        }
      ]
    },

    // ── Slide 3: Animations ──────────────────────────────────────────────────
    // Demonstrates: enter:fade, enter:move, enter:scale, parallel animations in
    // one cue via offset, multiple cues within a single slide.
    {
      id: 'demo-s3',
      background: SLIDE_BG,
      children: [
        {
          kind: 'text',
          id: 'demo-s3-h',
          x: 120,
          y: 80,
          width: 1680,
          height: 100,
          rotation: 0,
          content: 'Animations',
          fontSize: 72,
          fontWeight: 700,
          color: TEXT_PRIMARY,
          align: 'left'
        },
        // ── fade column ──
        {
          kind: 'text',
          id: 'demo-s3-fade-label',
          x: 160,
          y: 230,
          width: 460,
          height: 44,
          rotation: 0,
          content: 'enter: fade',
          fontSize: 28,
          fontWeight: 400,
          color: TEXT_MUTED,
          align: 'center'
        },
        rect('demo-s3-fade-box', 210, 290, 360, 340, ACCENT_BLUE, 0.85),
        // ── move column ──
        {
          kind: 'text',
          id: 'demo-s3-move-label',
          x: 730,
          y: 230,
          width: 460,
          height: 44,
          rotation: 0,
          content: 'enter: move',
          fontSize: 28,
          fontWeight: 400,
          color: TEXT_MUTED,
          align: 'center'
        },
        rect('demo-s3-move-box', 780, 290, 360, 340, ACCENT_GREEN, 0.85),
        // ── scale column ──
        {
          kind: 'text',
          id: 'demo-s3-scale-label',
          x: 1300,
          y: 230,
          width: 460,
          height: 44,
          rotation: 0,
          content: 'enter: scale',
          fontSize: 28,
          fontWeight: 400,
          color: TEXT_MUTED,
          align: 'center'
        },
        // Circle for scale (more visually clear than a rectangle)
        {
          kind: 'shape',
          id: 'demo-s3-scale-box',
          x: 1350,
          y: 290,
          width: 360,
          height: 340,
          rotation: 0,
          pathData: 'M 180 0 A 180 170 0 1 1 179.9 0 Z',
          fill: { color: ACCENT_PURPLE, opacity: 0.85 },
          stroke: { color: 'transparent', width: 0, opacity: 0 }
        },
        // ── explanation ──
        {
          kind: 'text',
          id: 'demo-s3-exp',
          x: 120,
          y: 700,
          width: 1680,
          height: 200,
          rotation: 0,
          content:
            'Each cue holds one or more ScheduledAnimations with offset, duration, and easing. Multiple animations on different elements can run in parallel within the same cue.',
          fontSize: 28,
          fontWeight: 400,
          color: TEXT_MUTED,
          align: 'left'
        },
        logoMso('demo-logo-s3')
      ],
      cues: [
        // All three enter animations fire at once — different visual effects
        {
          id: 'demo-s3-cue1',
          kind: 'animation',
          trigger: 'on-click',
          loop: { kind: 'none' },
          animations: [
            // Fade: opacity 0 → 1
            fadeIn('demo-s3-a1', 'demo-s3-fade-box', 0, 0.8),
            // Move: slide in from below (from.y > to.y)
            {
              id: 'demo-s3-a2',
              targetId: 'demo-s3-move-box',
              offset: 0,
              duration: 0.6,
              easing: 'ease-out',
              effect: {
                kind: 'build-in',
                type: 'move',
                fromOffset: { x: 0, y: 410 }
              }
            },
            // Scale: size 0 → 1
            {
              id: 'demo-s3-a3',
              targetId: 'demo-s3-scale-box',
              offset: 0,
              duration: 0.6,
              easing: 'ease-out',
              effect: { kind: 'build-in', type: 'scale', to: 1 }
            }
          ]
        },
        {
          id: 'demo-s3-cue2',
          kind: 'animation',
          trigger: 'on-click',
          loop: { kind: 'none' },
          animations: [fadeIn('demo-s3-a4', 'demo-s3-exp', 0, 0.5)]
        },
        {
          id: 'demo-s3-cue3',
          kind: 'transition',
          trigger: 'on-click',
          slideTransition: { kind: 'fade-through-color', duration: 0.6, easing: 'ease-in-out' }
        }
      ]
    },

    // ── Slide 4: Easing ──────────────────────────────────────────────────────
    // Demonstrates: linear, ease-in, ease-out, ease-in-out easing presets.
    // All four boxes move identical distances in identical time — the difference
    // is purely in how they accelerate and decelerate.
    {
      id: 'demo-s4',
      background: SLIDE_BG,
      children: [
        {
          kind: 'text',
          id: 'demo-s4-h',
          x: 120,
          y: 80,
          width: 1680,
          height: 100,
          rotation: 0,
          content: 'Easing',
          fontSize: 72,
          fontWeight: 700,
          color: TEXT_PRIMARY,
          align: 'left'
        },
        // Row 1 — linear
        {
          kind: 'text',
          id: 'demo-s4-l1',
          x: 120,
          y: 240,
          width: 260,
          height: 50,
          rotation: 0,
          content: 'linear',
          fontSize: 28,
          fontWeight: 400,
          color: TEXT_MUTED,
          align: 'left'
        },
        rect('demo-s4-box1', 1700, 236, 100, 58, ACCENT_BLUE),
        // Row 2 — ease-in
        {
          kind: 'text',
          id: 'demo-s4-l2',
          x: 120,
          y: 400,
          width: 260,
          height: 50,
          rotation: 0,
          content: 'ease-in',
          fontSize: 28,
          fontWeight: 400,
          color: TEXT_MUTED,
          align: 'left'
        },
        rect('demo-s4-box2', 1700, 396, 100, 58, ACCENT_GREEN),
        // Row 3 — ease-out
        {
          kind: 'text',
          id: 'demo-s4-l3',
          x: 120,
          y: 560,
          width: 260,
          height: 50,
          rotation: 0,
          content: 'ease-out',
          fontSize: 28,
          fontWeight: 400,
          color: TEXT_MUTED,
          align: 'left'
        },
        rect('demo-s4-box3', 1700, 556, 100, 58, ACCENT_RED),
        // Row 4 — ease-in-out
        {
          kind: 'text',
          id: 'demo-s4-l4',
          x: 120,
          y: 720,
          width: 260,
          height: 50,
          rotation: 0,
          content: 'ease-in-out',
          fontSize: 28,
          fontWeight: 400,
          color: TEXT_MUTED,
          align: 'left'
        },
        rect('demo-s4-box4', 1700, 716, 100, 58, ACCENT_YELLOW),
        // Track lines (decorative — show the path the boxes travel)
        {
          kind: 'shape',
          id: 'demo-s4-track1',
          x: 400,
          y: 264,
          width: 1300,
          height: 2,
          rotation: 0,
          pathData: 'M 0 0 L 1300 0',
          fill: { color: 'transparent', opacity: 0 },
          stroke: { color: '#2a2a2a', width: 2, opacity: 1 }
        },
        {
          kind: 'shape',
          id: 'demo-s4-track2',
          x: 400,
          y: 424,
          width: 1300,
          height: 2,
          rotation: 0,
          pathData: 'M 0 0 L 1300 0',
          fill: { color: 'transparent', opacity: 0 },
          stroke: { color: '#2a2a2a', width: 2, opacity: 1 }
        },
        {
          kind: 'shape',
          id: 'demo-s4-track3',
          x: 400,
          y: 584,
          width: 1300,
          height: 2,
          rotation: 0,
          pathData: 'M 0 0 L 1300 0',
          fill: { color: 'transparent', opacity: 0 },
          stroke: { color: '#2a2a2a', width: 2, opacity: 1 }
        },
        {
          kind: 'shape',
          id: 'demo-s4-track4',
          x: 400,
          y: 744,
          width: 1300,
          height: 2,
          rotation: 0,
          pathData: 'M 0 0 L 1300 0',
          fill: { color: 'transparent', opacity: 0 },
          stroke: { color: '#2a2a2a', width: 2, opacity: 1 }
        },
        // Note about additional easing types
        {
          kind: 'text',
          id: 'demo-s4-note',
          x: 120,
          y: 890,
          width: 1680,
          height: 60,
          rotation: 0,
          content:
            'Also supported: cubic-bezier(x1, y1, x2, y2) · spring(mass, stiffness, damping, velocity)',
          fontSize: 24,
          fontWeight: 400,
          color: '#555555',
          align: 'center'
        },
        logoMso('demo-logo-s4')
      ],
      cues: [
        // All four boxes move left→right with the same duration but different easing
        {
          id: 'demo-s4-cue1',
          kind: 'animation',
          trigger: 'on-click',
          loop: { kind: 'none' },
          animations: [
            {
              id: 'demo-s4-a1',
              targetId: 'demo-s4-box1',
              offset: 0,
              duration: 1.8,
              easing: 'linear',
              effect: {
                kind: 'build-in',
                type: 'move',
                fromOffset: { x: -1300, y: 0 }
              }
            },
            {
              id: 'demo-s4-a2',
              targetId: 'demo-s4-box2',
              offset: 0,
              duration: 1.8,
              easing: 'ease-in',
              effect: {
                kind: 'build-in',
                type: 'move',
                fromOffset: { x: -1300, y: 0 }
              }
            },
            {
              id: 'demo-s4-a3',
              targetId: 'demo-s4-box3',
              offset: 0,
              duration: 1.8,
              easing: 'ease-out',
              effect: {
                kind: 'build-in',
                type: 'move',
                fromOffset: { x: -1300, y: 0 }
              }
            },
            {
              id: 'demo-s4-a4',
              targetId: 'demo-s4-box4',
              offset: 0,
              duration: 1.8,
              easing: 'ease-in-out',
              effect: {
                kind: 'build-in',
                type: 'move',
                fromOffset: { x: -1300, y: 0 }
              }
            }
          ]
        },
        {
          id: 'demo-s4-cue2',
          kind: 'transition',
          trigger: 'on-click',
          slideTransition: { kind: 'fade-through-color', duration: 0.6, easing: 'ease-in-out' }
        }
      ]
    },

    // ── Slide 5: Special Effects ─────────────────────────────────────────────
    // Demonstrates: property:text-shadow animation, property:line-draw animation,
    // grain texture overlay, curved SVG paths.
    {
      id: 'demo-s5',
      background: SLIDE_BG,
      grain: true,
      children: [
        {
          kind: 'text',
          id: 'demo-s5-h',
          x: 120,
          y: 80,
          width: 1680,
          height: 100,
          rotation: 0,
          content: 'Special Effects',
          fontSize: 72,
          fontWeight: 700,
          color: TEXT_PRIMARY,
          align: 'left'
        },
        // ── text-shadow ──
        {
          kind: 'text',
          id: 'demo-s5-shadow-label',
          x: 120,
          y: 240,
          width: 800,
          height: 40,
          rotation: 0,
          content: 'property: text-shadow',
          fontSize: 26,
          fontWeight: 400,
          color: ACCENT_BLUE,
          align: 'left'
        },
        {
          kind: 'text',
          id: 'demo-s5-shadow-text',
          x: 120,
          y: 290,
          width: 900,
          height: 160,
          rotation: 0,
          content: 'Shadow animates in',
          fontSize: 72,
          fontWeight: 700,
          color: TEXT_PRIMARY,
          align: 'left',
          // Starts with no shadow; animated to a glowing blue drop shadow
          textShadow: { offsetX: 0, offsetY: 0, blur: 0, color: 'rgba(10,132,255,0)' }
        },
        // ── line-draw ──
        {
          kind: 'text',
          id: 'demo-s5-linedraw-label',
          x: 120,
          y: 520,
          width: 800,
          height: 40,
          rotation: 0,
          content: 'property: line-draw',
          fontSize: 26,
          fontWeight: 400,
          color: ACCENT_GREEN,
          align: 'left'
        },
        // Straight horizontal line — drawn left to right
        {
          kind: 'shape',
          id: 'demo-s5-line',
          x: 120,
          y: 590,
          width: 1680,
          height: 6,
          rotation: 0,
          pathData: 'M 0 3 L 1680 3',
          fill: { color: 'transparent', opacity: 0 },
          stroke: { color: ACCENT_GREEN, width: 6, opacity: 1 }
        },
        // Curved path — drawn after the line
        {
          kind: 'shape',
          id: 'demo-s5-wave',
          x: 120,
          y: 650,
          width: 960,
          height: 200,
          rotation: 0,
          pathData: 'M 0 100 C 120 0, 240 200, 360 100 S 600 0, 720 100 S 840 200, 960 100',
          fill: { color: 'transparent', opacity: 0 },
          stroke: { color: ACCENT_PURPLE, width: 5, opacity: 1 }
        },
        // ── grain note ──
        {
          kind: 'text',
          id: 'demo-s5-grain-note',
          x: 1100,
          y: 660,
          width: 700,
          height: 160,
          rotation: 0,
          content: '← grain: true\nSubtle SVG noise\ntexture over the\nbackground.',
          fontSize: 26,
          fontWeight: 400,
          color: TEXT_MUTED,
          align: 'left'
        },
        logoMso('demo-logo-s5')
      ],
      cues: [
        // Click 1: text-shadow property animation
        {
          id: 'demo-s5-cue1',
          kind: 'animation',
          trigger: 'on-click',
          loop: { kind: 'none' },
          animations: [
            {
              id: 'demo-s5-a1',
              targetId: 'demo-s5-shadow-text',
              offset: 0,
              duration: 1.2,
              easing: 'ease-out',
              effect: {
                kind: 'action',
                type: 'text-shadow',
                to: { offsetX: 0, offsetY: 6, blur: 32, color: 'rgba(10,132,255,0.8)' }
              }
            }
          ]
        },
        // Click 2: line-draw animations (straight line first, wave after)
        {
          id: 'demo-s5-cue2',
          kind: 'animation',
          trigger: 'on-click',
          loop: { kind: 'none' },
          animations: [
            {
              id: 'demo-s5-a2',
              targetId: 'demo-s5-line',
              offset: 0,
              duration: 1.0,
              easing: 'ease-in-out',
              effect: { kind: 'action', type: 'line-draw' }
            },
            {
              id: 'demo-s5-a3',
              targetId: 'demo-s5-wave',
              offset: 0.4,
              duration: 1.4,
              easing: 'ease-out',
              effect: { kind: 'action', type: 'line-draw' }
            }
          ]
        },
        {
          id: 'demo-s5-cue3',
          kind: 'transition',
          trigger: 'on-click',
          slideTransition: { kind: 'fade-through-color', duration: 0.6, easing: 'ease-in-out' }
        }
      ]
    },

    // ── Slide 6: Slide Transitions ────────────────────────────────────────────
    // Demonstrates: the three slide transition kinds (cut, fade, push) and how
    // duration + easing apply to them. The next slide enters via push so you
    // can see it happen right after clicking past this one.
    {
      id: 'demo-s6',
      background: SLIDE_BG,
      children: [
        {
          kind: 'text',
          id: 'demo-s6-h',
          x: 120,
          y: 80,
          width: 1680,
          height: 100,
          rotation: 0,
          content: 'Slide Transitions',
          fontSize: 72,
          fontWeight: 700,
          color: TEXT_PRIMARY,
          align: 'left'
        },
        // ── cut ──
        card('demo-s6-cut-card', 120, 250, 540, 380, ACCENT_BLUE),
        {
          kind: 'text',
          id: 'demo-s6-cut-title',
          x: 148,
          y: 278,
          width: 484,
          height: 70,
          rotation: 0,
          content: 'cut',
          fontSize: 48,
          fontWeight: 700,
          color: ACCENT_BLUE,
          align: 'center'
        },
        {
          kind: 'text',
          id: 'demo-s6-cut-desc',
          x: 148,
          y: 360,
          width: 484,
          height: 240,
          rotation: 0,
          content: 'Instant — no\ninterpolation.\nDuration and\neasing ignored.',
          fontSize: 28,
          fontWeight: 400,
          color: TEXT_PRIMARY,
          align: 'center'
        },
        // ── fade ──
        card('demo-s6-fade-card', 690, 250, 540, 380, ACCENT_GREEN),
        {
          kind: 'text',
          id: 'demo-s6-fade-title',
          x: 718,
          y: 278,
          width: 484,
          height: 70,
          rotation: 0,
          content: 'fade',
          fontSize: 48,
          fontWeight: 700,
          color: ACCENT_GREEN,
          align: 'center'
        },
        {
          kind: 'text',
          id: 'demo-s6-fade-desc',
          x: 718,
          y: 360,
          width: 484,
          height: 240,
          rotation: 0,
          content: 'Crossfade between\noutgoing and\nincoming slides.\nEasing applies.',
          fontSize: 28,
          fontWeight: 400,
          color: TEXT_PRIMARY,
          align: 'center'
        },
        // ── push ──
        card('demo-s6-push-card', 1260, 250, 540, 380, ACCENT_RED),
        {
          kind: 'text',
          id: 'demo-s6-push-title',
          x: 1288,
          y: 278,
          width: 484,
          height: 70,
          rotation: 0,
          content: 'push',
          fontSize: 48,
          fontWeight: 700,
          color: ACCENT_RED,
          align: 'center'
        },
        {
          kind: 'text',
          id: 'demo-s6-push-desc',
          x: 1288,
          y: 360,
          width: 484,
          height: 240,
          rotation: 0,
          content: 'Incoming slide\ntranslates in from\nthe left. Easing\napplies.',
          fontSize: 28,
          fontWeight: 400,
          color: TEXT_PRIMARY,
          align: 'center'
        },
        {
          kind: 'text',
          id: 'demo-s6-note',
          x: 120,
          y: 710,
          width: 1680,
          height: 80,
          rotation: 0,
          content: 'The next slide uses push — watch it slide in from the left.',
          fontSize: 32,
          fontWeight: 400,
          color: TEXT_MUTED,
          align: 'center'
        },
        logoMso('demo-logo-s6')
      ],
      cues: [
        {
          id: 'demo-s6-cue1',
          kind: 'animation',
          trigger: 'on-click',
          loop: { kind: 'none' },
          animations: [
            fadeIn('demo-s6-a1', 'demo-s6-cut-card', 0, 0.4),
            fadeIn('demo-s6-a2', 'demo-s6-cut-title', 0.05, 0.4),
            fadeIn('demo-s6-a3', 'demo-s6-cut-desc', 0.1, 0.4),
            fadeIn('demo-s6-a4', 'demo-s6-fade-card', 0.2, 0.4),
            fadeIn('demo-s6-a5', 'demo-s6-fade-title', 0.25, 0.4),
            fadeIn('demo-s6-a6', 'demo-s6-fade-desc', 0.3, 0.4),
            fadeIn('demo-s6-a7', 'demo-s6-push-card', 0.4, 0.4),
            fadeIn('demo-s6-a8', 'demo-s6-push-title', 0.45, 0.4),
            fadeIn('demo-s6-a9', 'demo-s6-push-desc', 0.5, 0.4),
            fadeIn('demo-s6-a10', 'demo-s6-note', 0.65, 0.5)
          ]
        },
        // Push transition — next slide pushes in from the left
        {
          id: 'demo-s6-cue2',
          kind: 'transition',
          trigger: 'on-click',
          slideTransition: { kind: 'push', duration: 0.7, easing: 'ease-in-out' }
        }
      ]
    },

    // ── Slide 7: Master Slide Objects ─────────────────────────────────────────
    // Demonstrates: MSO — the blue square has been present on every slide, yet
    // it stays completely still during slide transitions. This is because it has
    // a masterId and is rendered above the transition layer.
    {
      id: 'demo-s7',
      background: DARK_BG,
      children: [
        {
          kind: 'text',
          id: 'demo-s7-h',
          x: 120,
          y: 80,
          width: 1680,
          height: 100,
          rotation: 0,
          content: 'Master Slide Objects (MSO)',
          fontSize: 72,
          fontWeight: 700,
          color: TEXT_PRIMARY,
          align: 'left'
        },
        {
          kind: 'text',
          id: 'demo-s7-p1',
          x: 120,
          y: 240,
          width: 1300,
          height: 140,
          rotation: 0,
          content:
            'The blue square in the top-left corner has appeared on every slide without being affected by any transition.',
          fontSize: 36,
          fontWeight: 400,
          color: TEXT_PRIMARY,
          align: 'left'
        },
        {
          kind: 'text',
          id: 'demo-s7-p2',
          x: 120,
          y: 410,
          width: 1300,
          height: 160,
          rotation: 0,
          content:
            'Each instance shares a masterId of "demo-logo-mso". The renderer lifts MSO elements above the transition layer — they stay put while the content changes beneath.',
          fontSize: 30,
          fontWeight: 400,
          color: TEXT_MUTED,
          align: 'left'
        },
        {
          kind: 'text',
          id: 'demo-s7-p3',
          x: 120,
          y: 600,
          width: 1300,
          height: 140,
          rotation: 0,
          content:
            'This makes MSOs ideal for persistent branding, slide numbers, or any element that should appear to live outside the slide stack.',
          fontSize: 30,
          fontWeight: 400,
          color: TEXT_MUTED,
          align: 'left'
        },
        // Arrow pointing at the logo
        {
          kind: 'shape',
          id: 'demo-s7-arrow',
          x: 110,
          y: 18,
          width: 80,
          height: 44,
          rotation: 0,
          // Arrow pointing left (toward the logo at x=56)
          pathData: 'M 80 22 L 24 0 L 36 22 L 24 44 Z',
          fill: { color: ACCENT_YELLOW, opacity: 0.9 },
          stroke: { color: 'transparent', width: 0, opacity: 0 }
        },
        {
          kind: 'text',
          id: 'demo-s7-arrow-label',
          x: 200,
          y: 20,
          width: 160,
          height: 40,
          rotation: 0,
          content: '← MSO',
          fontSize: 24,
          fontWeight: 700,
          color: ACCENT_YELLOW,
          align: 'left'
        },
        logoMso('demo-logo-s7')
      ],
      cues: [
        {
          id: 'demo-s7-cue1',
          kind: 'animation',
          trigger: 'on-click',
          loop: { kind: 'none' },
          animations: [
            fadeIn('demo-s7-a1', 'demo-s7-arrow', 0, 0.5),
            fadeIn('demo-s7-a2', 'demo-s7-arrow-label', 0.1, 0.4)
          ]
        },
        // Cut transition — instant, shows MSO staying perfectly still
        {
          id: 'demo-s7-cue2',
          kind: 'transition',
          trigger: 'on-click',
          slideTransition: { kind: 'cut', duration: 0, easing: 'linear' }
        }
      ]
    },

    // ── Slide 8: Summary ──────────────────────────────────────────────────────
    // The final slide — a plain list of everything demonstrated above.
    {
      id: 'demo-s8',
      background: DARK_BG,
      children: [
        accentBar('demo-s8-bar'),
        {
          kind: 'text',
          id: 'demo-s8-h',
          x: 120,
          y: 160,
          width: 1680,
          height: 160,
          rotation: 0,
          content: "What's implemented",
          fontSize: 96,
          fontWeight: 700,
          color: TEXT_PRIMARY,
          align: 'center'
        },
        {
          kind: 'text',
          id: 'demo-s8-col1',
          x: 280,
          y: 390,
          width: 620,
          height: 460,
          rotation: 0,
          content:
            'Document model\nThree element types\nenter: fade\nenter: move\nenter: scale\nexit animations\nproperty: text-shadow',
          fontSize: 32,
          fontWeight: 400,
          color: TEXT_MUTED,
          align: 'left'
        },
        {
          kind: 'text',
          id: 'demo-s8-col2',
          x: 1020,
          y: 390,
          width: 620,
          height: 460,
          rotation: 0,
          content:
            'property: line-draw\nEasing (6 types)\nTransitions: cut, fade, push\nGrain background\nMaster Slide Objects\nParallel cue animations\nUndo / redo',
          fontSize: 32,
          fontWeight: 400,
          color: TEXT_MUTED,
          align: 'left'
        },
        logoMso('demo-logo-s8')
      ],
      cues: [
        {
          id: 'demo-s8-cue1',
          kind: 'animation',
          trigger: 'on-click',
          loop: { kind: 'none' },
          animations: [
            fadeIn('demo-s8-a1', 'demo-s8-h', 0, 0.8),
            fadeIn('demo-s8-a2', 'demo-s8-col1', 0.3, 0.6),
            fadeIn('demo-s8-a3', 'demo-s8-col2', 0.5, 0.6)
          ]
        }
      ]
    }
  ]
}
