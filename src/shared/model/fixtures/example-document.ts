// Example document fixture — used for prototype rendering and unit tests.
// Typed against Document so TypeScript catches any model drift.

import type { Document } from '../types'

export const exampleDocument: Document = {
  id: 'doc-001',
  title: 'Example Presentation',
  ownerId: null,
  isPublished: false,
  createdAt: '2026-03-31T10:00:00Z',
  updatedAt: '2026-03-31T10:00:00Z',
  slides: [
    // --- Slide 1: title slide with an enter animation and an MSO logo ---
    {
      id: 'slide-001',
      children: [
        {
          kind: 'text',
          id: 'title-001',
          x: 200,
          y: 380,
          width: 1520,
          height: 200,
          rotation: 0,
          content: 'Welcome',
          fontSize: 120,
          fontWeight: 700,
          color: '#f0f0f0',
          align: 'center'
        },
        {
          kind: 'text',
          id: 'subtitle-001',
          x: 200,
          y: 600,
          width: 1520,
          height: 80,
          rotation: 0,
          content: 'A prototype presentation',
          fontSize: 40,
          fontWeight: 400,
          color: '#888888',
          align: 'center'
        },
        // MSO logo — appears on both slides, unaffected by transitions
        {
          kind: 'shape',
          id: 'logo-slide1',
          masterId: 'mso-logo',
          x: 60,
          y: 40,
          width: 80,
          height: 80,
          rotation: 0,
          pathData: 'M 0 0 L 80 0 L 80 80 L 0 80 Z',
          fill: { color: '#0a84ff', opacity: 1 },
          stroke: { color: 'transparent', width: 0, opacity: 0 }
        }
      ],
      cues: [
        // Title fades in on click
        {
          id: 'cue-001',
          kind: 'animation',
          trigger: 'on-click',
          loop: { kind: 'none' },
          animations: [
            {
              id: 'anim-001',
              targetId: 'title-001',
              offset: 0,
              duration: 0.6,
              easing: 'ease-out',
              effect: {
                kind: 'enter',
                animation: { type: 'fade', to: 1 }
              }
            },
            // Subtitle fades in 0.2s after title starts (parallel, delayed)
            {
              id: 'anim-002',
              targetId: 'subtitle-001',
              offset: 0.2,
              duration: 0.5,
              easing: 'ease-out',
              effect: {
                kind: 'enter',
                animation: { type: 'fade', to: 1 }
              }
            }
          ]
        },
        // Transition to slide 2 on next click
        {
          id: 'cue-002',
          kind: 'transition',
          trigger: 'on-click',
          slideTransition: {
            kind: 'fade',
            duration: 0.5,
            easing: 'ease-in-out'
          }
        }
      ]
    },

    // --- Slide 2: content slide with a move animation ---
    {
      id: 'slide-002',
      children: [
        {
          kind: 'text',
          id: 'heading-002',
          x: 200,
          y: 140,
          width: 1520,
          height: 120,
          rotation: 0,
          content: 'Key Points',
          fontSize: 80,
          fontWeight: 600,
          color: '#f0f0f0',
          align: 'left'
        },
        {
          kind: 'shape',
          id: 'card-002',
          x: 200,
          y: 320,
          width: 680,
          height: 400,
          rotation: 0,
          pathData: 'M 0 0 L 680 0 L 680 400 L 0 400 Z',
          fill: { color: '#2a2a2a', opacity: 1 },
          stroke: { color: '#3a3a3a', width: 1, opacity: 1 }
        },
        {
          kind: 'text',
          id: 'body-002',
          x: 240,
          y: 360,
          width: 600,
          height: 320,
          rotation: 0,
          content: 'DOM + CSS handles smooth animations, text shadows, and opacity transitions.',
          fontSize: 28,
          fontWeight: 400,
          color: '#f0f0f0',
          align: 'left'
        },
        // Same MSO logo — carries its position from slide 1; unaffected by the transition
        {
          kind: 'shape',
          id: 'logo-slide2',
          masterId: 'mso-logo',
          x: 60,
          y: 40,
          width: 80,
          height: 80,
          rotation: 0,
          pathData: 'M 0 0 L 80 0 L 80 80 L 0 80 Z',
          fill: { color: '#0a84ff', opacity: 1 },
          stroke: { color: 'transparent', width: 0, opacity: 0 }
        }
      ],
      cues: [
        // Card and body slide in from below on click — sequential
        {
          id: 'cue-003',
          kind: 'animation',
          trigger: 'on-click',
          loop: { kind: 'none' },
          animations: [
            {
              id: 'anim-003',
              targetId: 'card-002',
              offset: 0,
              duration: 0.4,
              easing: 'ease-out',
              effect: {
                kind: 'enter',
                animation: { type: 'move', fromOffset: { x: 0, y: 180 } }
              }
            },
            {
              id: 'anim-004',
              targetId: 'body-002',
              offset: 0.15,
              duration: 0.4,
              easing: 'ease-out',
              effect: {
                kind: 'enter',
                animation: { type: 'fade', to: 1 }
              }
            }
          ]
        }
      ]
    }
  ]
}
