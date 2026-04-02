import { describe, it, expect } from 'vitest'
import { buildTimeline } from './buildTimeline'
import type {
  Presentation,
  Slide,
  MsoMaster,
  Appearance,
  TargetedAnimation,
  SlideTransition,
  AnimationId
} from '../model/types'
import {
  createPresentation,
  createSlide,
  createMsoMaster,
  createAppearance
} from '../model/factories'

// ─── Minimal fixture helpers ──────────────────────────────────────────────────

function fadeAnim(
  id: AnimationId,
  appearanceId: string,
  trigger: TargetedAnimation['trigger'],
  duration = 1
): TargetedAnimation {
  return {
    id,
    trigger,
    offset: 0,
    duration,
    easing: 'linear',
    loop: { kind: 'none' },
    effect: { kind: 'build-in', type: 'fade', to: 1 },
    target: { kind: 'appearance', appearanceId }
  }
}

function makeSlideWithAnims(
  anims: TargetedAnimation[],
  opts: { transition?: SlideTransition; transitionTriggerId?: string } = {}
): { slide: Slide; master: MsoMaster; appearance: Appearance } {
  const master = createMsoMaster('text')
  const appearance = createAppearance(master.id, 'placeholder')
  const slide = createSlide()
  appearance.slideId = slide.id
  slide.appearanceIds = [appearance.id]
  slide.animationOrder = anims.map((a) => a.id)
  if (opts.transition) slide.transition = opts.transition
  if (opts.transitionTriggerId) slide.transitionTriggerId = opts.transitionTriggerId
  return { slide, master, appearance }
}

function makePresentationFrom(
  slideFixtures: { slide: Slide; master: MsoMaster; appearance: Appearance }[],
  animations: TargetedAnimation[]
): Presentation {
  const pres = createPresentation()
  for (const { slide, master, appearance } of slideFixtures) {
    pres.slideOrder.push(slide.id)
    pres.slidesById[slide.id] = slide
    pres.mastersById[master.id] = master
    pres.appearancesById[appearance.id] = appearance
  }
  for (const anim of animations) {
    pres.animationsById[anim.id] = anim
  }
  return pres
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildTimeline', () => {
  describe('on-click animations', () => {
    it('schedules an on-click animation at its trigger time', () => {
      const { slide, master, appearance } = makeSlideWithAnims([
        fadeAnim('a1', 'app-1', 'on-click', 1)
      ])
      appearance.id = 'app-1'
      const anim = fadeAnim('a1', 'app-1', 'on-click', 1)
      const pres = makePresentationFrom([{ slide, master, appearance }], [anim])
      const { scheduledAnimations } = buildTimeline(pres, new Map([['a1', 5]]))
      expect(scheduledAnimations).toHaveLength(1)
      expect(scheduledAnimations[0].startTime).toBe(5)
      expect(scheduledAnimations[0].endTime).toBe(6)
    })

    it('stops scheduling when an on-click animation has no trigger time', () => {
      const { slide, master, appearance } = makeSlideWithAnims([
        fadeAnim('a1', 'app-1', 'on-click', 1),
        fadeAnim('a2', 'app-1', 'on-click', 1)
      ])
      appearance.id = 'app-1'
      const pres = makePresentationFrom(
        [{ slide, master, appearance }],
        [fadeAnim('a1', 'app-1', 'on-click', 1), fadeAnim('a2', 'app-1', 'on-click', 1)]
      )
      const { scheduledAnimations } = buildTimeline(pres, new Map())
      expect(scheduledAnimations).toHaveLength(0)
    })

    it('stops at the first untriggered on-click even if later ones have trigger times', () => {
      const { slide, master, appearance } = makeSlideWithAnims([
        fadeAnim('a1', 'app-1', 'on-click'),
        fadeAnim('a2', 'app-1', 'on-click')
      ])
      appearance.id = 'app-1'
      const pres = makePresentationFrom(
        [{ slide, master, appearance }],
        [fadeAnim('a1', 'app-1', 'on-click'), fadeAnim('a2', 'app-1', 'on-click')]
      )
      const { scheduledAnimations } = buildTimeline(pres, new Map([['a2', 10]])) // a1 not triggered
      expect(scheduledAnimations).toHaveLength(0)
    })
  })

  describe('after-previous', () => {
    it('starts immediately after the preceding animation ends', () => {
      const { slide, master, appearance } = makeSlideWithAnims([
        fadeAnim('a1', 'app-1', 'on-click', 1),
        fadeAnim('a2', 'app-1', 'after-previous', 2)
      ])
      appearance.id = 'app-1'
      const pres = makePresentationFrom(
        [{ slide, master, appearance }],
        [fadeAnim('a1', 'app-1', 'on-click', 1), fadeAnim('a2', 'app-1', 'after-previous', 2)]
      )
      const { scheduledAnimations } = buildTimeline(pres, new Map([['a1', 0]]))
      expect(scheduledAnimations[1].startTime).toBe(1) // a1 endTime = 0 + 1
      expect(scheduledAnimations[1].endTime).toBe(3)
    })
  })

  describe('with-previous', () => {
    it('starts at the same trigger time as the preceding animation', () => {
      const { slide, master, appearance } = makeSlideWithAnims([
        fadeAnim('a1', 'app-1', 'on-click', 1),
        fadeAnim('a2', 'app-1', 'with-previous', 2)
      ])
      appearance.id = 'app-1'
      const pres = makePresentationFrom(
        [{ slide, master, appearance }],
        [fadeAnim('a1', 'app-1', 'on-click', 1), fadeAnim('a2', 'app-1', 'with-previous', 2)]
      )
      const { scheduledAnimations } = buildTimeline(pres, new Map([['a1', 5]]))
      expect(scheduledAnimations[1].startTime).toBe(5) // same trigger as a1
    })
  })

  describe('offset', () => {
    it('adds the animation offset to the trigger time', () => {
      const anim: TargetedAnimation = {
        id: 'a1',
        trigger: 'on-click',
        offset: 0.3,
        duration: 0.5,
        easing: 'linear',
        loop: { kind: 'none' },
        effect: { kind: 'build-in', type: 'fade', to: 1 },
        target: { kind: 'appearance', appearanceId: 'app-1' }
      }
      const { slide, master, appearance } = makeSlideWithAnims([anim])
      appearance.id = 'app-1'
      const pres = makePresentationFrom([{ slide, master, appearance }], [anim])
      const { scheduledAnimations } = buildTimeline(pres, new Map([['a1', 2]]))
      expect(scheduledAnimations[0].startTime).toBe(2.3)
      expect(scheduledAnimations[0].endTime).toBeCloseTo(2.8)
    })
  })

  describe('transitions', () => {
    it('schedules a transition when transitionTriggerId is in triggerTimes', () => {
      const transition: SlideTransition = {
        kind: 'fade-through-color',
        duration: 0.5,
        easing: 'linear'
      }
      const { slide, master, appearance } = makeSlideWithAnims([], {
        transition,
        transitionTriggerId: 'trans-s1'
      })
      const pres = makePresentationFrom([{ slide, master, appearance }], [])
      const { scheduledTransitions } = buildTimeline(pres, new Map([['trans-s1', 2]]))
      expect(scheduledTransitions).toHaveLength(1)
      expect(scheduledTransitions[0].startTime).toBe(2)
      expect(scheduledTransitions[0].endTime).toBe(2.5)
    })

    it('does not schedule a transition when transitionTriggerId is absent from triggerTimes', () => {
      const transition: SlideTransition = {
        kind: 'fade-through-color',
        duration: 0.5,
        easing: 'linear'
      }
      const { slide, master, appearance } = makeSlideWithAnims([], {
        transition,
        transitionTriggerId: 'trans-s1'
      })
      const pres = makePresentationFrom([{ slide, master, appearance }], [])
      const { scheduledTransitions } = buildTimeline(pres, new Map())
      expect(scheduledTransitions).toHaveLength(0)
    })
  })

  describe('multiple slides', () => {
    it('schedules animations from multiple slides independently', () => {
      const m1 = createMsoMaster('text')
      const app1 = createAppearance(m1.id, 's1')
      const s1 = createSlide()
      s1.id = 's1'
      app1.slideId = 's1'
      s1.appearanceIds = [app1.id]
      s1.animationOrder = ['a1']

      const m2 = createMsoMaster('text')
      const app2 = createAppearance(m2.id, 's2')
      const s2 = createSlide()
      s2.id = 's2'
      app2.slideId = 's2'
      s2.appearanceIds = [app2.id]
      s2.animationOrder = ['a2']

      const a1 = fadeAnim('a1', app1.id, 'on-click', 1)
      const a2 = fadeAnim('a2', app2.id, 'on-click', 1)

      const pres = makePresentationFrom(
        [
          { slide: s1, master: m1, appearance: app1 },
          { slide: s2, master: m2, appearance: app2 }
        ],
        [a1, a2]
      )
      const { scheduledAnimations } = buildTimeline(
        pres,
        new Map([
          ['a1', 0],
          ['a2', 5]
        ])
      )
      expect(scheduledAnimations).toHaveLength(2)
      expect(scheduledAnimations[0].animationId).toBe('a1')
      expect(scheduledAnimations[1].animationId).toBe('a2')
    })
  })
})
