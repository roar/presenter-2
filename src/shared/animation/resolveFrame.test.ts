import { describe, it, expect } from 'vitest'
import { resolveFrame } from './resolveFrame'
import { buildTimeline } from './buildTimeline'
import type { Slide, TextElement, ShapeElement, AnimationCue, TransitionCue } from '../model/types'
import type { PresentationTimeline } from './types'

// --- Fixture helpers ---

function textEl(id: string, extra: Partial<TextElement> = {}): TextElement {
  return {
    kind: 'text',
    id,
    x: 100,
    y: 100,
    width: 400,
    height: 100,
    rotation: 0,
    content: id,
    fontSize: 24,
    fontWeight: 400,
    color: '#fff',
    align: 'left',
    ...extra
  }
}

function shapeEl(id: string, extra: Partial<ShapeElement> = {}): ShapeElement {
  return {
    kind: 'shape',
    id,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    pathData: 'M 0 0 L 100 0 L 100 100 L 0 100 Z',
    fill: { color: '#fff', opacity: 1 },
    stroke: { color: 'transparent', width: 0, opacity: 0 },
    ...extra
  }
}

function fadeEnterCue(
  id: string,
  trigger: AnimationCue['trigger'],
  targetId: string,
  duration = 1
): AnimationCue {
  return {
    id,
    kind: 'animation',
    trigger,
    loop: { kind: 'none' },
    animations: [
      {
        id: `anim-${id}`,
        targetId,
        offset: 0,
        duration,
        easing: 'linear',
        effect: { kind: 'enter', animation: { type: 'fade', from: 0, to: 1 } }
      }
    ]
  }
}

function moveEnterCue(
  id: string,
  trigger: AnimationCue['trigger'],
  targetId: string
): AnimationCue {
  return {
    id,
    kind: 'animation',
    trigger,
    loop: { kind: 'none' },
    animations: [
      {
        id: `anim-${id}`,
        targetId,
        offset: 0,
        duration: 1,
        easing: 'linear',
        effect: {
          kind: 'enter',
          animation: { type: 'move', from: { x: 100, y: 200 }, to: { x: 100, y: 100 } }
        }
      }
    ]
  }
}

function transitionCue(
  id: string,
  trigger: TransitionCue['trigger'],
  duration = 0.5
): TransitionCue {
  return {
    id,
    kind: 'transition',
    trigger,
    slideTransition: { kind: 'fade', duration, easing: 'linear' }
  }
}

function slide(id: string, elements: TextElement[], cues: Slide['cues'] = []): Slide {
  return { id, children: elements, cues }
}

function timelineFromSlides(
  slides: Slide[],
  triggers: Record<string, number> = {}
): PresentationTimeline {
  return buildTimeline(slides, new Map(Object.entries(triggers)))
}

// --- Tests ---

describe('resolveFrame', () => {
  describe('element with no animations', () => {
    it('is visible with full opacity at any time', () => {
      const s = slide('s1', [textEl('el')])
      const timeline = timelineFromSlides([s])
      const frame = resolveFrame(timeline, 0)
      const el = frame.front.elements[0]
      expect(el.visible).toBe(true)
      expect(el.opacity).toBe(1)
    })
  })

  describe('enter animation (fade)', () => {
    it('element is hidden before the cue is triggered', () => {
      const s = slide('s1', [textEl('el')], [fadeEnterCue('c1', 'on-click', 'el')])
      const timeline = timelineFromSlides([s]) // c1 never triggered
      const frame = resolveFrame(timeline, 0)
      const el = frame.front.elements[0]
      expect(el.visible).toBe(false)
      expect(el.opacity).toBe(0)
    })

    it('element is partially visible mid-animation', () => {
      const s = slide('s1', [textEl('el')], [fadeEnterCue('c1', 'on-click', 'el', 1)])
      const timeline = timelineFromSlides([s], { c1: 0 })
      const frame = resolveFrame(timeline, 0.5) // halfway through 1s fade
      const el = frame.front.elements[0]
      expect(el.visible).toBe(true)
      expect(el.opacity).toBeCloseTo(0.5)
    })

    it('element is fully visible after animation completes', () => {
      const s = slide('s1', [textEl('el')], [fadeEnterCue('c1', 'on-click', 'el', 1)])
      const timeline = timelineFromSlides([s], { c1: 0 })
      const frame = resolveFrame(timeline, 2) // well after 1s
      const el = frame.front.elements[0]
      expect(el.visible).toBe(true)
      expect(el.opacity).toBe(1)
    })
  })

  describe('enter animation (move)', () => {
    it('element is at from-position before cue triggers (hidden)', () => {
      const s = slide(
        's1',
        [textEl('el', { x: 100, y: 100 })],
        [moveEnterCue('c1', 'on-click', 'el')]
      )
      const timeline = timelineFromSlides([s])
      const frame = resolveFrame(timeline, 0)
      const el = frame.front.elements[0]
      expect(el.visible).toBe(false)
    })

    it('interpolates position mid-animation', () => {
      const s = slide(
        's1',
        [textEl('el', { x: 100, y: 100 })],
        [moveEnterCue('c1', 'on-click', 'el')]
      )
      const timeline = timelineFromSlides([s], { c1: 0 })
      const frame = resolveFrame(timeline, 0.5) // halfway: y should be 150 → translate 50px down from base
      const el = frame.front.elements[0]
      expect(el.visible).toBe(true)
      // from {x:100, y:200} to {x:100, y:100}, at 50%: interp y = 150
      // delta from element.y (100) = +50
      expect(el.transform).toContain('translate(0px, 50px)')
    })

    it('has no residual transform after animation completes', () => {
      const s = slide(
        's1',
        [textEl('el', { x: 100, y: 100 })],
        [moveEnterCue('c1', 'on-click', 'el')]
      )
      const timeline = timelineFromSlides([s], { c1: 0 })
      const frame = resolveFrame(timeline, 2)
      const el = frame.front.elements[0]
      expect(el.transform).toContain('translate(0px, 0px)')
    })
  })

  describe('slide transitions', () => {
    it('has no transition when no TransitionCue has fired', () => {
      const s1 = slide('s1', [textEl('el')])
      const s2 = slide('s2', [textEl('el2')])
      const timeline = timelineFromSlides([s1, s2])
      const frame = resolveFrame(timeline, 0)
      expect(frame.transition).toBeNull()
      expect(frame.behind).toBeNull()
    })

    it('has transition in progress when time is within transition window', () => {
      const s1 = slide('s1', [], [transitionCue('tc', 'on-click', 0.5)])
      const s2 = slide('s2', [textEl('el2')])
      const timeline = timelineFromSlides([s1, s2], { tc: 0 })
      const frame = resolveFrame(timeline, 0.25) // halfway through 0.5s transition
      expect(frame.transition).not.toBeNull()
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(frame.transition!.progress).toBeCloseTo(0.5)
      expect(frame.behind).not.toBeNull()
      expect(frame.front.slide.id).toBe('s2')
    })

    it('transition is null after it completes', () => {
      const s1 = slide('s1', [], [transitionCue('tc', 'on-click', 0.5)])
      const s2 = slide('s2', [textEl('el2')])
      const timeline = timelineFromSlides([s1, s2], { tc: 0 })
      const frame = resolveFrame(timeline, 1)
      expect(frame.transition).toBeNull()
      expect(frame.behind).toBeNull()
      expect(frame.front.slide.id).toBe('s2')
    })
  })

  describe('line-draw animation', () => {
    function lineDrawCue(
      id: string,
      trigger: AnimationCue['trigger'],
      targetId: string,
      duration = 1
    ): AnimationCue {
      return {
        id,
        kind: 'animation',
        trigger,
        loop: { kind: 'none' },
        animations: [
          {
            id: `anim-${id}`,
            targetId,
            offset: 0,
            duration,
            easing: 'linear',
            effect: { kind: 'enter', animation: { type: 'line-draw' } }
          }
        ]
      }
    }

    it('strokeDashoffset is null for elements without a line-draw animation', () => {
      const s = slide('s1', [textEl('el')])
      const timeline = timelineFromSlides([s])
      const frame = resolveFrame(timeline, 0)
      expect(frame.front.elements[0].strokeDashoffset).toBeNull()
    })

    it('strokeDashoffset is 1 (hidden) before the cue fires', () => {
      const s = slide('s1', [shapeEl('line')], [lineDrawCue('c1', 'on-click', 'line')])
      const timeline = timelineFromSlides([s]) // c1 never triggered
      const frame = resolveFrame(timeline, 0)
      expect(frame.front.elements[0].strokeDashoffset).toBe(1)
    })

    it('opacity is 1 once the animation fires (not stuck at 0)', () => {
      const s = slide('s1', [shapeEl('line')], [lineDrawCue('c1', 'on-click', 'line', 1)])
      const timeline = timelineFromSlides([s], { c1: 0 })
      const frame = resolveFrame(timeline, 0.5)
      expect(frame.front.elements[0].opacity).toBe(1)
    })

    it('interpolates strokeDashoffset from 1 to 0 during animation', () => {
      const s = slide('s1', [shapeEl('line')], [lineDrawCue('c1', 'on-click', 'line', 1)])
      const timeline = timelineFromSlides([s], { c1: 0 })
      const frame = resolveFrame(timeline, 0.5)
      expect(frame.front.elements[0].strokeDashoffset).toBeCloseTo(0.5)
    })

    it('strokeDashoffset is 0 (fully drawn) after animation completes', () => {
      const s = slide('s1', [shapeEl('line')], [lineDrawCue('c1', 'on-click', 'line', 1)])
      const timeline = timelineFromSlides([s], { c1: 0 })
      const frame = resolveFrame(timeline, 2)
      expect(frame.front.elements[0].strokeDashoffset).toBe(0)
    })
  })

  describe('MSO elements', () => {
    it('places MSO elements in msoElements, not in slide elements', () => {
      const mso = shapeEl('logo', { masterId: 'mso-logo' })
      const regular = textEl('title')
      const s = slide('s1', [mso as unknown as TextElement, regular])
      const timeline = timelineFromSlides([s])
      const frame = resolveFrame(timeline, 0)
      expect(frame.msoElements).toHaveLength(1)
      expect(frame.msoElements[0].element.id).toBe('logo')
      expect(frame.front.elements).toHaveLength(1)
      expect(frame.front.elements[0].element.id).toBe('title')
    })
  })
})
