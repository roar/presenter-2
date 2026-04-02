// "Bibelhistorien i åtte deler" — single-slide sample presentation.
// Starts with background only. On click, title + subtitle fade in while
// moving downward, and a line draws under "åtte" simultaneously.

import type { Document } from '../types'

const BG = 'radial-gradient(ellipse at 50% 40%, #d2c4ae 0%, #b0a08a 50%, #8a7a65 100%)'
const TEXT_COLOR = '#f0ebe0'
const FONT = 'Georgia, "Times New Roman", serif'
const SHADOW = { offsetX: 2, offsetY: 4, blur: 14, color: 'rgba(0, 0, 0, 0.5)' }

// Estimated position of "åtte" inside the centered subtitle:
// Georgia bold 100px, "i åtte deler" ≈ 590px wide, centered in 1600px at x=160
// text starts at slide x≈665; "i " ≈ 53px → "åtte" starts at ≈718, width ≈246
// Baseline at subtitle.y(548) + ~82px = 630; underline 8px below = 638
const UNDERLINE_X = 714
const UNDERLINE_Y = 640
const UNDERLINE_W = 250

export const bibelhistorienDocument: Document = {
  id: 'doc-bibel-001',
  title: 'Bibelhistorien i åtte deler',
  ownerId: null,
  isPublished: false,
  createdAt: '2026-03-31T10:00:00Z',
  updatedAt: '2026-03-31T10:00:00Z',
  slides: [
    {
      id: 'slide-b1',
      background: BG,
      grain: true,
      children: [
        {
          kind: 'text',
          id: 'title-b1',
          x: 160,
          y: 340,
          width: 1600,
          height: 190,
          rotation: 0,
          content: 'Bibelhistorien',
          fontSize: 148,
          fontWeight: 700,
          fontFamily: FONT,
          color: TEXT_COLOR,
          align: 'center',
          textShadow: SHADOW
        },
        {
          kind: 'text',
          id: 'subtitle-b1',
          x: 160,
          y: 548,
          width: 1600,
          height: 120,
          rotation: 0,
          content: 'i åtte deler',
          fontSize: 100,
          fontWeight: 700,
          fontFamily: FONT,
          color: TEXT_COLOR,
          align: 'center',
          textShadow: SHADOW
        },
        {
          kind: 'shape',
          id: 'underline-b1',
          x: UNDERLINE_X,
          y: UNDERLINE_Y,
          width: UNDERLINE_W,
          height: 4,
          rotation: 0,
          pathData: `M 0 0 L ${UNDERLINE_W} 0`,
          fill: { color: 'none', opacity: 0 },
          stroke: { color: TEXT_COLOR, width: 3, opacity: 0.85 }
        }
      ],
      cues: [
        {
          id: 'cue-b1',
          kind: 'animation',
          trigger: 'on-click',
          loop: { kind: 'none' },
          animations: [
            // Title: fade in + move down
            {
              id: 'anim-b1',
              targetId: 'title-b1',
              offset: 0,
              duration: 3,
              easing: 'ease-out',
              effect: { kind: 'build-in', type: 'fade', to: 1 }
            },
            {
              id: 'anim-b2',
              targetId: 'title-b1',
              offset: 0,
              duration: 3,
              easing: 'ease-out',
              effect: {
                kind: 'build-in',
                type: 'move',
                fromOffset: { x: 0, y: -100 }
              }
            },
            // Subtitle: fade in + move down
            {
              id: 'anim-b3',
              targetId: 'subtitle-b1',
              offset: 0,
              duration: 3,
              easing: 'ease-out',
              effect: { kind: 'build-in', type: 'fade', to: 1 }
            },
            {
              id: 'anim-b4',
              targetId: 'subtitle-b1',
              offset: 0,
              duration: 3,
              easing: 'ease-out',
              effect: {
                kind: 'build-in',
                type: 'move',
                fromOffset: { x: 0, y: -100 }
              }
            },
            // Underline: draw in + move down with subtitle (simultaneously)
            {
              id: 'anim-b5',
              targetId: 'underline-b1',
              offset: 0,
              duration: 3,
              easing: 'ease-out',
              effect: { kind: 'build-in', type: 'line-draw' }
            },
            {
              id: 'anim-b6',
              targetId: 'underline-b1',
              offset: 0,
              duration: 3,
              easing: 'ease-out',
              effect: {
                kind: 'build-in',
                type: 'move',
                fromOffset: { x: 0, y: -100 }
              }
            }
          ]
        }
      ]
    }
  ]
}
