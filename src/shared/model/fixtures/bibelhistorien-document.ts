// "Bibelhistorien i åtte deler" — single-slide sample presentation.
// Starts with background only. On click, the title and subtitle fade in
// while moving downward to their target positions over 3 seconds.

import type { Document } from '../types'

const BG = 'radial-gradient(ellipse at 50% 40%, #d2c4ae 0%, #b0a08a 50%, #8a7a65 100%)'
const TEXT_COLOR = '#f0ebe0'
const FONT = 'Georgia, "Times New Roman", serif'
const SHADOW = { offsetX: 2, offsetY: 4, blur: 14, color: 'rgba(0, 0, 0, 0.5)' }

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
        }
      ],
      cues: [
        {
          id: 'cue-b1',
          kind: 'animation',
          trigger: 'on-click',
          loop: { kind: 'none' },
          animations: [
            // Title: fade in
            {
              id: 'anim-b1',
              targetId: 'title-b1',
              offset: 0,
              duration: 3,
              easing: 'ease-out',
              effect: { kind: 'enter', animation: { type: 'fade', from: 0, to: 1 } }
            },
            // Title: move down from 100px above target
            {
              id: 'anim-b2',
              targetId: 'title-b1',
              offset: 0,
              duration: 3,
              easing: 'ease-out',
              effect: {
                kind: 'enter',
                animation: { type: 'move', from: { x: 160, y: 240 }, to: { x: 160, y: 340 } }
              }
            },
            // Subtitle: fade in
            {
              id: 'anim-b3',
              targetId: 'subtitle-b1',
              offset: 0,
              duration: 3,
              easing: 'ease-out',
              effect: { kind: 'enter', animation: { type: 'fade', from: 0, to: 1 } }
            },
            // Subtitle: move down from 100px above target
            {
              id: 'anim-b4',
              targetId: 'subtitle-b1',
              offset: 0,
              duration: 3,
              easing: 'ease-out',
              effect: {
                kind: 'enter',
                animation: { type: 'move', from: { x: 160, y: 448 }, to: { x: 160, y: 548 } }
              }
            }
          ]
        }
      ]
    }
  ]
}
