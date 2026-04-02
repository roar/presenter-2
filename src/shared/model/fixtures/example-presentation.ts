// Example presentation fixture — used as the viewer fallback and for development.
// Two slides demonstrating fade/move build-in animations and a slide transition.

import type { Presentation, TargetedAnimation } from '../types'

const DARK_BG = '#111111'
const TEXT_PRIMARY = '#f0f0f0'
const TEXT_MUTED = '#888888'
const ACCENT_BLUE = '#0a84ff'

// ─── IDs ──────────────────────────────────────────────────────────────────────

const M_TITLE = 'm-title'
const M_SUBTITLE = 'm-subtitle'
const M_LOGO = 'm-logo'
const M_HEADING = 'm-heading'
const M_CARD = 'm-card'
const M_BODY = 'm-body'

const APP_S1_TITLE = 'app-s1-title'
const APP_S1_SUBTITLE = 'app-s1-subtitle'
const APP_S1_LOGO = 'app-s1-logo'
const APP_S2_HEADING = 'app-s2-heading'
const APP_S2_CARD = 'app-s2-card'
const APP_S2_BODY = 'app-s2-body'
const APP_S2_LOGO = 'app-s2-logo'

const SLIDE_1 = 'slide-1'
const SLIDE_2 = 'slide-2'

const ANIM_TITLE_FADE = 'anim-title-fade'
const ANIM_SUBTITLE_FADE = 'anim-subtitle-fade'
const ANIM_CARD_MOVE = 'anim-card-move'
const ANIM_BODY_FADE = 'anim-body-fade'
const TRANS_TRIGGER_1 = 'trans-1'

// ─── Animations ───────────────────────────────────────────────────────────────

const animations: TargetedAnimation[] = [
  {
    id: ANIM_TITLE_FADE,
    trigger: 'on-click',
    offset: 0,
    duration: 0.6,
    easing: 'ease-out',
    loop: { kind: 'none' },
    effect: { kind: 'build-in', type: 'fade', to: 1 },
    target: { kind: 'appearance', appearanceId: APP_S1_TITLE }
  },
  {
    id: ANIM_SUBTITLE_FADE,
    trigger: 'with-previous',
    offset: 0.2,
    duration: 0.5,
    easing: 'ease-out',
    loop: { kind: 'none' },
    effect: { kind: 'build-in', type: 'fade', to: 1 },
    target: { kind: 'appearance', appearanceId: APP_S1_SUBTITLE }
  },
  {
    id: ANIM_CARD_MOVE,
    trigger: 'on-click',
    offset: 0,
    duration: 0.4,
    easing: 'ease-out',
    loop: { kind: 'none' },
    effect: { kind: 'build-in', type: 'move', delta: { x: 0, y: 180 } },
    target: { kind: 'appearance', appearanceId: APP_S2_CARD }
  },
  {
    id: ANIM_BODY_FADE,
    trigger: 'with-previous',
    offset: 0.15,
    duration: 0.4,
    easing: 'ease-out',
    loop: { kind: 'none' },
    effect: { kind: 'build-in', type: 'fade', to: 1 },
    target: { kind: 'appearance', appearanceId: APP_S2_BODY }
  }
]

// ─── Presentation ─────────────────────────────────────────────────────────────

export const examplePresentation: Presentation = {
  id: 'example-pres-001',
  title: 'Example Presentation',
  ownerId: null,
  isPublished: false,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
  revision: 0,

  slideOrder: [SLIDE_1, SLIDE_2],

  slidesById: {
    [SLIDE_1]: {
      id: SLIDE_1,
      appearanceIds: [APP_S1_TITLE, APP_S1_SUBTITLE, APP_S1_LOGO],
      animationOrder: [ANIM_TITLE_FADE, ANIM_SUBTITLE_FADE],
      transitionTriggerId: TRANS_TRIGGER_1,
      transition: { kind: 'fade-through-color', duration: 0.5, easing: 'ease-in-out' },
      background: { color: DARK_BG }
    },
    [SLIDE_2]: {
      id: SLIDE_2,
      appearanceIds: [APP_S2_HEADING, APP_S2_CARD, APP_S2_BODY, APP_S2_LOGO],
      animationOrder: [ANIM_CARD_MOVE, ANIM_BODY_FADE],
      background: { color: '#0d0d0d' }
    }
  },

  mastersById: {
    [M_TITLE]: {
      id: M_TITLE,
      type: 'text',
      transform: { x: 200, y: 380, width: 1520, height: 200, rotation: 0 },
      objectStyle: { defaultState: {}, namedStates: {} },
      textStyle: {
        defaultState: { fontSize: 120, fontWeight: 700, color: TEXT_PRIMARY },
        namedStates: {}
      },
      content: {
        type: 'text',
        value: {
          blocks: [{ id: 'b-title', runs: [{ id: 'r-title', text: 'Welcome', marks: [] }] }]
        }
      },
      version: 0
    },
    [M_SUBTITLE]: {
      id: M_SUBTITLE,
      type: 'text',
      transform: { x: 200, y: 600, width: 1520, height: 80, rotation: 0 },
      objectStyle: { defaultState: {}, namedStates: {} },
      textStyle: {
        defaultState: { fontSize: 40, fontWeight: 400, color: TEXT_MUTED },
        namedStates: {}
      },
      content: {
        type: 'text',
        value: {
          blocks: [
            {
              id: 'b-sub',
              runs: [{ id: 'r-sub', text: 'A prototype presentation', marks: [] }]
            }
          ]
        }
      },
      version: 0
    },
    [M_LOGO]: {
      id: M_LOGO,
      type: 'shape',
      transform: { x: 60, y: 40, width: 80, height: 80, rotation: 0 },
      objectStyle: {
        defaultState: { fill: ACCENT_BLUE, stroke: 'transparent', strokeWidth: 0 },
        namedStates: {}
      },
      content: { type: 'none' },
      geometry: { type: 'path', pathData: 'M 0 0 L 80 0 L 80 80 L 0 80 Z' },
      version: 0
    },
    [M_HEADING]: {
      id: M_HEADING,
      type: 'text',
      transform: { x: 200, y: 140, width: 1520, height: 120, rotation: 0 },
      objectStyle: { defaultState: {}, namedStates: {} },
      textStyle: {
        defaultState: { fontSize: 80, fontWeight: 600, color: TEXT_PRIMARY },
        namedStates: {}
      },
      content: {
        type: 'text',
        value: {
          blocks: [{ id: 'b-h', runs: [{ id: 'r-h', text: 'Key Points', marks: [] }] }]
        }
      },
      version: 0
    },
    [M_CARD]: {
      id: M_CARD,
      type: 'shape',
      transform: { x: 200, y: 320, width: 680, height: 400, rotation: 0 },
      objectStyle: {
        defaultState: { fill: '#2a2a2a', stroke: '#3a3a3a', strokeWidth: 1 },
        namedStates: {}
      },
      content: { type: 'none' },
      geometry: { type: 'rect' },
      version: 0
    },
    [M_BODY]: {
      id: M_BODY,
      type: 'text',
      transform: { x: 240, y: 360, width: 600, height: 320, rotation: 0 },
      objectStyle: { defaultState: {}, namedStates: {} },
      textStyle: {
        defaultState: { fontSize: 28, fontWeight: 400, color: TEXT_PRIMARY },
        namedStates: {}
      },
      content: {
        type: 'text',
        value: {
          blocks: [
            {
              id: 'b-body',
              runs: [
                {
                  id: 'r-body',
                  text: 'DOM + CSS handles smooth animations, text shadows, and opacity transitions.',
                  marks: []
                }
              ]
            }
          ]
        }
      },
      version: 0
    }
  },

  appearancesById: {
    [APP_S1_TITLE]: {
      id: APP_S1_TITLE,
      masterId: M_TITLE,
      slideId: SLIDE_1,
      animationIds: [ANIM_TITLE_FADE],
      zIndex: 1,
      initialVisibility: 'hidden',
      version: 0
    },
    [APP_S1_SUBTITLE]: {
      id: APP_S1_SUBTITLE,
      masterId: M_SUBTITLE,
      slideId: SLIDE_1,
      animationIds: [ANIM_SUBTITLE_FADE],
      zIndex: 2,
      initialVisibility: 'hidden',
      version: 0
    },
    [APP_S1_LOGO]: {
      id: APP_S1_LOGO,
      masterId: M_LOGO,
      slideId: SLIDE_1,
      animationIds: [],
      zIndex: 10,
      initialVisibility: 'visible',
      version: 0
    },
    [APP_S2_HEADING]: {
      id: APP_S2_HEADING,
      masterId: M_HEADING,
      slideId: SLIDE_2,
      animationIds: [],
      zIndex: 1,
      initialVisibility: 'visible',
      version: 0
    },
    [APP_S2_CARD]: {
      id: APP_S2_CARD,
      masterId: M_CARD,
      slideId: SLIDE_2,
      animationIds: [ANIM_CARD_MOVE],
      zIndex: 2,
      initialVisibility: 'hidden',
      version: 0
    },
    [APP_S2_BODY]: {
      id: APP_S2_BODY,
      masterId: M_BODY,
      slideId: SLIDE_2,
      animationIds: [ANIM_BODY_FADE],
      zIndex: 3,
      initialVisibility: 'hidden',
      version: 0
    },
    [APP_S2_LOGO]: {
      id: APP_S2_LOGO,
      masterId: M_LOGO,
      slideId: SLIDE_2,
      animationIds: [],
      zIndex: 10,
      initialVisibility: 'visible',
      version: 0
    }
  },

  animationsById: Object.fromEntries(animations.map((a) => [a.id, a])),
  animationGroupTemplatesById: {},
  textDecorationsById: {}
}
