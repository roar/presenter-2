import type {
  Presentation,
  Slide,
  MsoMaster,
  Appearance,
  TextContent,
  AnimationGroupTemplate,
  MasterId,
  SlideId
} from './types'

export function createPresentation(): Presentation {
  return {
    id: crypto.randomUUID(),
    title: 'Untitled Presentation',
    colorConstantsById: {},
    slideOrder: [],
    slidesById: {},
    mastersById: {},
    appearancesById: {},
    animationsById: {},
    animationGroupTemplatesById: {},
    textDecorationsById: {},
    revision: 0,
    ownerId: null,
    isPublished: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

export function createSlide(): Slide {
  return {
    id: crypto.randomUUID(),
    appearanceIds: [],
    animationOrder: [],
    background: {}
  }
}

export function createMsoMaster(type: MsoMaster['type']): MsoMaster {
  return {
    id: crypto.randomUUID(),
    type,
    transform: { x: 0, y: 0, width: 0, height: 0, rotation: 0 },
    objectStyle: { defaultState: {}, namedStates: {} },
    content: { type: 'none' },
    version: 0
  }
}

export function createAppearance(masterId: MasterId, slideId: SlideId): Appearance {
  return {
    id: crypto.randomUUID(),
    masterId,
    slideId,
    animationIds: [],
    zIndex: 0,
    initialVisibility: 'visible',
    version: 0
  }
}

export function createAnimationGroupTemplate(name: string): AnimationGroupTemplate {
  return {
    id: crypto.randomUUID(),
    name,
    slots: [],
    members: []
  }
}

export function createTextContent(plain: string): TextContent {
  return {
    blocks: [
      {
        id: crypto.randomUUID(),
        runs: [
          {
            id: crypto.randomUUID(),
            text: plain,
            marks: []
          }
        ]
      }
    ]
  }
}
