import { describe, it, expect } from 'vitest'
import { resolveFrame } from './resolveFrame'
import { buildTimeline } from './buildTimeline'
import type {
  Presentation,
  Slide,
  MsoMaster,
  Appearance,
  TargetedAnimation,
  TextShadow
} from '../model/types'
import { createPresentation, createSlide, createAppearance } from '../model/factories'

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function textMaster(id: string): MsoMaster {
  return {
    id,
    type: 'text',
    transform: { x: 100, y: 100, width: 400, height: 100, rotation: 0 },
    objectStyle: { defaultState: {}, namedStates: {} },
    textStyle: { defaultState: { fontSize: 24, color: '#fff' }, namedStates: {} },
    content: {
      type: 'text',
      value: { blocks: [{ id: 'b1', runs: [{ id: 'r1', text: 'hello', marks: [] }] }] }
    },
    version: 0
  }
}

function shapeMaster(id: string): MsoMaster {
  return {
    id,
    type: 'shape',
    transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0 },
    objectStyle: {
      defaultState: { fill: '#fff', stroke: 'transparent', strokeWidth: 0 },
      namedStates: {}
    },
    content: { type: 'none' },
    geometry: { type: 'path', pathData: 'M 0 0 L 100 0 L 100 100 L 0 100 Z' },
    version: 0
  }
}

function makeAppearance(
  masterId: string,
  slideId: string,
  initialVisibility: Appearance['initialVisibility'] = 'visible'
): Appearance {
  const app = createAppearance(masterId, slideId)
  app.initialVisibility = initialVisibility
  return app
}

function makeAnim(
  id: string,
  appearanceId: string,
  trigger: TargetedAnimation['trigger'],
  effect: TargetedAnimation['effect'],
  duration = 1,
  offset = 0
): TargetedAnimation {
  return {
    id,
    trigger,
    offset,
    duration,
    easing: 'linear',
    loop: { kind: 'none' },
    effect,
    target: { kind: 'appearance', appearanceId }
  }
}

function singleSlidePresentation(
  appearance: Appearance,
  master: MsoMaster,
  animations: TargetedAnimation[] = [],
  slideOpts: Partial<Pick<Slide, 'transition' | 'transitionTriggerId'>> = {}
): Presentation {
  const pres = createPresentation()
  const slide = createSlide()
  appearance.slideId = slide.id
  slide.appearanceIds = [appearance.id]
  slide.animationOrder = animations.map((a) => a.id)
  if (slideOpts.transition) slide.transition = slideOpts.transition
  if (slideOpts.transitionTriggerId) slide.transitionTriggerId = slideOpts.transitionTriggerId

  pres.slideOrder = [slide.id]
  pres.slidesById[slide.id] = slide
  pres.mastersById[master.id] = master
  pres.appearancesById[appearance.id] = appearance
  for (const anim of animations) pres.animationsById[anim.id] = anim
  return pres
}

function timeline(pres: Presentation, triggers: Record<string, number> = {}) {
  return buildTimeline(pres, new Map(Object.entries(triggers)))
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('resolveFrame', () => {
  describe('appearance with no animations', () => {
    it('is visible with full opacity at any time', () => {
      const master = textMaster('m1')
      const app = makeAppearance(master.id, 'slide')
      const pres = singleSlidePresentation(app, master)
      const frame = resolveFrame(timeline(pres), 0)
      const ra = frame.front.appearances[0]
      expect(ra.visible).toBe(true)
      expect(ra.opacity).toBe(1)
    })
  })

  describe('build-in (fade)', () => {
    it('appearance is hidden before the animation is triggered', () => {
      const master = textMaster('m1')
      const app = makeAppearance(master.id, 'slide', 'hidden')
      const anim = makeAnim('a1', app.id, 'on-click', { kind: 'build-in', type: 'fade', to: 1 })
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres), 0) // a1 never triggered
      const ra = frame.front.appearances[0]
      expect(ra.visible).toBe(false)
      expect(ra.opacity).toBe(0)
    })

    it('appearance is partially visible mid-animation', () => {
      const master = textMaster('m1')
      const app = makeAppearance(master.id, 'slide', 'hidden')
      const anim = makeAnim('a1', app.id, 'on-click', { kind: 'build-in', type: 'fade', to: 1 }, 1)
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres, { a1: 0 }), 0.5)
      expect(frame.front.appearances[0].opacity).toBeCloseTo(0.5)
    })

    it('appearance is fully visible after animation completes', () => {
      const master = textMaster('m1')
      const app = makeAppearance(master.id, 'slide', 'hidden')
      const anim = makeAnim('a1', app.id, 'on-click', { kind: 'build-in', type: 'fade', to: 1 }, 1)
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres, { a1: 0 }), 2)
      expect(frame.front.appearances[0].visible).toBe(true)
      expect(frame.front.appearances[0].opacity).toBe(1)
    })
  })

  describe('build-in (move)', () => {
    it('appearance is hidden before the animation is triggered', () => {
      const master = textMaster('m1')
      const app = makeAppearance(master.id, 'slide', 'hidden')
      const anim = makeAnim('a1', app.id, 'on-click', {
        kind: 'build-in',
        type: 'move',
        delta: { x: 0, y: 100 }
      })
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres), 0)
      expect(frame.front.appearances[0].visible).toBe(false)
    })

    it('interpolates position mid-animation', () => {
      const master = textMaster('m1')
      const app = makeAppearance(master.id, 'slide', 'hidden')
      const anim = makeAnim(
        'a1',
        app.id,
        'on-click',
        { kind: 'build-in', type: 'move', delta: { x: 0, y: 100 } },
        1
      )
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres, { a1: 0 }), 0.5)
      expect(frame.front.appearances[0].transform).toContain('translate(0px, 50px)')
    })

    it('has no residual transform after animation completes', () => {
      const master = textMaster('m1')
      const app = makeAppearance(master.id, 'slide', 'hidden')
      const anim = makeAnim(
        'a1',
        app.id,
        'on-click',
        { kind: 'build-in', type: 'move', delta: { x: 0, y: 100 } },
        1
      )
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres, { a1: 0 }), 2)
      expect(frame.front.appearances[0].transform).toContain('translate(0px, 0px)')
    })
  })

  describe('build-in (scale)', () => {
    it('appearance is hidden before the animation is triggered', () => {
      const master = textMaster('m1')
      const app = makeAppearance(master.id, 'slide', 'hidden')
      const anim = makeAnim('a1', app.id, 'on-click', { kind: 'build-in', type: 'scale', to: 1 })
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres), 0)
      expect(frame.front.appearances[0].visible).toBe(false)
    })

    it('transform contains scale at midpoint', () => {
      const master = textMaster('m1')
      const app = makeAppearance(master.id, 'slide', 'hidden')
      const anim = makeAnim('a1', app.id, 'on-click', { kind: 'build-in', type: 'scale', to: 1 }, 1)
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres, { a1: 0 }), 0.5)
      expect(frame.front.appearances[0].transform).toContain('scale(0.5)')
    })

    it('scale is 1 after animation completes', () => {
      const master = textMaster('m1')
      const app = makeAppearance(master.id, 'slide', 'hidden')
      const anim = makeAnim('a1', app.id, 'on-click', { kind: 'build-in', type: 'scale', to: 1 }, 1)
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres, { a1: 0 }), 2)
      expect(frame.front.appearances[0].transform).toContain('scale(1)')
    })
  })

  describe('action (move)', () => {
    it('interpolates toward the stored delta during the animation', () => {
      const master = textMaster('m1')
      const app = makeAppearance(master.id, 'slide')
      const anim = makeAnim(
        'a1',
        app.id,
        'on-click',
        { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
        1
      )
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres, { a1: 0 }), 0.5)
      expect(frame.front.appearances[0].transform).toContain('translate(20px, 40px)')
    })

    it('retains the delta after the animation completes', () => {
      const master = textMaster('m1')
      const app = makeAppearance(master.id, 'slide')
      const anim = makeAnim(
        'a1',
        app.id,
        'on-click',
        { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
        1
      )
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres, { a1: 0 }), 2)
      expect(frame.front.appearances[0].transform).toContain('translate(40px, 80px)')
    })

    it('supports legacy move animations stored with fromOffset', () => {
      const master = textMaster('m1')
      const app = makeAppearance(master.id, 'slide')
      const anim = makeAnim(
        'a1',
        app.id,
        'on-click',
        {
          kind: 'action',
          type: 'move',
          fromOffset: { x: 40, y: 80 }
        } as TargetedAnimation['effect'],
        1
      )
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres, { a1: 0 }), 2)
      expect(frame.front.appearances[0].transform).toContain('translate(40px, 80px)')
    })
  })

  describe('line-draw (build-in)', () => {
    it('strokeDashoffset is null for appearances without a line-draw animation', () => {
      const master = textMaster('m1')
      const app = makeAppearance(master.id, 'slide')
      const pres = singleSlidePresentation(app, master)
      const frame = resolveFrame(timeline(pres), 0)
      expect(frame.front.appearances[0].strokeDashoffset).toBeNull()
    })

    it('strokeDashoffset is 1 (hidden) before the animation fires', () => {
      const master = shapeMaster('m1')
      const app = makeAppearance(master.id, 'slide', 'hidden')
      const anim = makeAnim('a1', app.id, 'on-click', { kind: 'build-in', type: 'line-draw' })
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres), 0)
      expect(frame.front.appearances[0].strokeDashoffset).toBe(1)
    })

    it('opacity is 1 once the animation fires', () => {
      const master = shapeMaster('m1')
      const app = makeAppearance(master.id, 'slide', 'hidden')
      const anim = makeAnim('a1', app.id, 'on-click', { kind: 'build-in', type: 'line-draw' }, 1)
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres, { a1: 0 }), 0.5)
      expect(frame.front.appearances[0].opacity).toBe(1)
    })

    it('interpolates strokeDashoffset from 1 to 0 during animation', () => {
      const master = shapeMaster('m1')
      const app = makeAppearance(master.id, 'slide', 'hidden')
      const anim = makeAnim('a1', app.id, 'on-click', { kind: 'build-in', type: 'line-draw' }, 1)
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres, { a1: 0 }), 0.5)
      expect(frame.front.appearances[0].strokeDashoffset).toBeCloseTo(0.5)
    })

    it('strokeDashoffset is 0 after animation completes', () => {
      const master = shapeMaster('m1')
      const app = makeAppearance(master.id, 'slide', 'hidden')
      const anim = makeAnim('a1', app.id, 'on-click', { kind: 'build-in', type: 'line-draw' }, 1)
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres, { a1: 0 }), 2)
      expect(frame.front.appearances[0].strokeDashoffset).toBe(0)
    })
  })

  describe('action (line-draw)', () => {
    it('appearance is visible before cue triggers (action — not a build-in)', () => {
      const master = shapeMaster('m1')
      const app = makeAppearance(master.id, 'slide')
      const anim = makeAnim('a1', app.id, 'on-click', { kind: 'action', type: 'line-draw' })
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres), 0)
      expect(frame.front.appearances[0].visible).toBe(true)
    })

    it('strokeDashoffset is 1 before the animation fires', () => {
      const master = shapeMaster('m1')
      const app = makeAppearance(master.id, 'slide')
      const anim = makeAnim('a1', app.id, 'on-click', { kind: 'action', type: 'line-draw' })
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres), 0)
      expect(frame.front.appearances[0].strokeDashoffset).toBe(1)
    })

    it('interpolates strokeDashoffset from 1 to 0 during animation', () => {
      const master = shapeMaster('m1')
      const app = makeAppearance(master.id, 'slide')
      const anim = makeAnim('a1', app.id, 'on-click', { kind: 'action', type: 'line-draw' }, 1)
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres, { a1: 0 }), 0.5)
      expect(frame.front.appearances[0].strokeDashoffset).toBeCloseTo(0.5)
    })

    it('strokeDashoffset is 0 after animation completes', () => {
      const master = shapeMaster('m1')
      const app = makeAppearance(master.id, 'slide')
      const anim = makeAnim('a1', app.id, 'on-click', { kind: 'action', type: 'line-draw' }, 1)
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres, { a1: 0 }), 2)
      expect(frame.front.appearances[0].strokeDashoffset).toBe(0)
    })
  })

  describe('action (text-shadow)', () => {
    const shadowTo: TextShadow = { offsetX: 4, offsetY: 8, blur: 20, color: 'rgba(0, 0, 0, 1)' }

    it('textShadow is null before animation triggers', () => {
      const master = textMaster('m1')
      const app = makeAppearance(master.id, 'slide')
      const anim = makeAnim('a1', app.id, 'on-click', {
        kind: 'action',
        type: 'text-shadow',
        to: shadowTo
      })
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres), 0)
      expect(frame.front.appearances[0].textShadow).toBeNull()
    })

    it('appearance is visible before cue triggers (action — not a build-in)', () => {
      const master = textMaster('m1')
      const app = makeAppearance(master.id, 'slide')
      const anim = makeAnim('a1', app.id, 'on-click', {
        kind: 'action',
        type: 'text-shadow',
        to: shadowTo
      })
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres), 0)
      expect(frame.front.appearances[0].visible).toBe(true)
    })

    it('interpolates numeric shadow properties at midpoint', () => {
      const master = textMaster('m1')
      const app = makeAppearance(master.id, 'slide')
      const anim = makeAnim(
        'a1',
        app.id,
        'on-click',
        { kind: 'action', type: 'text-shadow', to: shadowTo },
        1
      )
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres, { a1: 0 }), 0.5)
      const shadow = frame.front.appearances[0].textShadow
      expect(shadow).not.toBeNull()
      expect(shadow!.offsetX).toBeCloseTo(2)
      expect(shadow!.offsetY).toBeCloseTo(4)
      expect(shadow!.blur).toBeCloseTo(10)
    })

    it('textShadow is at final values after completion', () => {
      const master = textMaster('m1')
      const app = makeAppearance(master.id, 'slide')
      const anim = makeAnim(
        'a1',
        app.id,
        'on-click',
        { kind: 'action', type: 'text-shadow', to: shadowTo },
        1
      )
      const pres = singleSlidePresentation(app, master, [anim])
      const frame = resolveFrame(timeline(pres, { a1: 0 }), 2)
      expect(frame.front.appearances[0].textShadow).toEqual(shadowTo)
    })
  })

  describe('slide transitions', () => {
    function twoSlidePresentation(): { pres: Presentation; slide1Id: string; slide2Id: string } {
      const pres = createPresentation()

      const m1 = textMaster('m1')
      const app1 = makeAppearance(m1.id, 's1')
      const slide1 = createSlide()
      slide1.id = 's1'
      app1.slideId = 's1'
      slide1.appearanceIds = [app1.id]
      slide1.animationOrder = []
      slide1.transitionTriggerId = 'trans-1'
      slide1.transition = { kind: 'fade-through-color', duration: 0.5, easing: 'linear' }

      const m2 = textMaster('m2')
      const app2 = makeAppearance(m2.id, 's2')
      const slide2 = createSlide()
      slide2.id = 's2'
      app2.slideId = 's2'
      slide2.appearanceIds = [app2.id]
      slide2.animationOrder = []

      pres.slideOrder = [slide1.id, slide2.id]
      pres.slidesById[slide1.id] = slide1
      pres.slidesById[slide2.id] = slide2
      pres.mastersById[m1.id] = m1
      pres.mastersById[m2.id] = m2
      pres.appearancesById[app1.id] = app1
      pres.appearancesById[app2.id] = app2

      return { pres, slide1Id: slide1.id, slide2Id: slide2.id }
    }

    it('has no transition when no transition has been triggered', () => {
      const { pres } = twoSlidePresentation()
      const frame = resolveFrame(buildTimeline(pres, new Map()), 0)
      expect(frame.transition).toBeNull()
      expect(frame.behind).toBeNull()
    })

    it('has transition in progress when time is within transition window', () => {
      const { pres, slide2Id } = twoSlidePresentation()
      const frame = resolveFrame(buildTimeline(pres, new Map([['trans-1', 0]])), 0.25)
      expect(frame.transition).not.toBeNull()
      expect(frame.transition!.progress).toBeCloseTo(0.5)
      expect(frame.behind).not.toBeNull()
      expect(frame.front.slide.id).toBe(slide2Id)
    })

    it('transition is null after it completes', () => {
      const { pres, slide2Id } = twoSlidePresentation()
      const frame = resolveFrame(buildTimeline(pres, new Map([['trans-1', 0]])), 1)
      expect(frame.transition).toBeNull()
      expect(frame.behind).toBeNull()
      expect(frame.front.slide.id).toBe(slide2Id)
    })
  })

  describe('MSO appearances', () => {
    it('places appearances whose master is shared across slides in msoAppearances', () => {
      const pres = createPresentation()
      const sharedMaster = shapeMaster('shared-m')

      const app1 = makeAppearance(sharedMaster.id, 's1')
      const s1 = createSlide()
      s1.id = 's1'
      app1.slideId = 's1'
      s1.appearanceIds = [app1.id]

      const app2 = makeAppearance(sharedMaster.id, 's2')
      const s2 = createSlide()
      s2.id = 's2'
      app2.slideId = 's2'
      s2.appearanceIds = [app2.id]

      pres.slideOrder = [s1.id, s2.id]
      pres.slidesById[s1.id] = s1
      pres.slidesById[s2.id] = s2
      pres.mastersById[sharedMaster.id] = sharedMaster
      pres.appearancesById[app1.id] = app1
      pres.appearancesById[app2.id] = app2

      const frame = resolveFrame(buildTimeline(pres, new Map()), 0)
      expect(frame.msoAppearances).toHaveLength(1)
      expect(frame.msoAppearances[0].appearance.id).toBe(app1.id)
      expect(frame.front.appearances).toHaveLength(0)
    })
  })
})
