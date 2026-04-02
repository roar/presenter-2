import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SlideRenderer } from './SlideRenderer'
import { buildTimeline } from '@shared/animation/buildTimeline'
import { resolveFrame } from '@shared/animation/resolveFrame'
import type { Presentation, MsoMaster, Appearance, SlideTransition } from '@shared/model/types'
import {
  createPresentation,
  createSlide,
  createMsoMaster,
  createAppearance,
  createTextContent
} from '@shared/model/factories'

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function textMaster(id: string, text: string): MsoMaster {
  const m = createMsoMaster('text')
  m.id = id
  m.transform = { x: 100, y: 100, width: 400, height: 100, rotation: 0 }
  m.content = { type: 'text', value: createTextContent(text) }
  m.textStyle = { defaultState: { fontSize: 24, color: '#fff' }, namedStates: {} }
  return m
}

function singleSlide(
  appearances: Appearance[],
  masters: MsoMaster[],
  opts: { transition?: SlideTransition; transitionTriggerId?: string } = {}
): Presentation {
  const pres = createPresentation()
  const slide = createSlide()
  if (opts.transition) slide.transition = opts.transition
  if (opts.transitionTriggerId) slide.transitionTriggerId = opts.transitionTriggerId
  slide.appearanceIds = appearances.map((a) => a.id)
  for (const app of appearances) {
    app.slideId = slide.id
  }

  pres.slideOrder = [slide.id]
  pres.slidesById[slide.id] = slide
  for (const m of masters) pres.mastersById[m.id] = m
  for (const app of appearances) pres.appearancesById[app.id] = app
  return pres
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SlideRenderer', () => {
  it('renders text content from the front slide', () => {
    const master = textMaster('m1', 'Slide content')
    const app = createAppearance(master.id, 'slide')
    const pres = singleSlide([app], [master])
    const frame = resolveFrame(buildTimeline(pres, new Map()), 0)
    render(<SlideRenderer frame={frame} />)
    expect(screen.getByText('Slide content')).toBeDefined()
  })

  it('renders both behind and front slides during a transition', () => {
    // Build a two-slide presentation
    const pres = createPresentation()

    const m1 = textMaster('m1', 'Slide one')
    const app1 = createAppearance(m1.id, 's1')
    const slide1 = createSlide()
    slide1.id = 's1'
    app1.slideId = 's1'
    slide1.appearanceIds = [app1.id]
    slide1.transitionTriggerId = 'trans'
    slide1.transition = { kind: 'fade-through-color', duration: 1, easing: 'linear' }

    const m2 = textMaster('m2', 'Slide two')
    const app2 = createAppearance(m2.id, 's2')
    const slide2 = createSlide()
    slide2.id = 's2'
    app2.slideId = 's2'
    slide2.appearanceIds = [app2.id]

    pres.slideOrder = [slide1.id, slide2.id]
    pres.slidesById[slide1.id] = slide1
    pres.slidesById[slide2.id] = slide2
    pres.mastersById[m1.id] = m1
    pres.mastersById[m2.id] = m2
    pres.appearancesById[app1.id] = app1
    pres.appearancesById[app2.id] = app2

    const frame = resolveFrame(buildTimeline(pres, new Map([['trans', 0]])), 0.5)
    render(<SlideRenderer frame={frame} />)
    expect(screen.getByText('Slide one')).toBeDefined()
    expect(screen.getByText('Slide two')).toBeDefined()
  })

  it('renders MSO appearances (shared master across slides)', () => {
    const pres = createPresentation()
    const sharedMaster = textMaster('shared-m', 'Logo')

    const app1 = createAppearance(sharedMaster.id, 's1')
    const slide1 = createSlide()
    slide1.id = 's1'
    app1.slideId = 's1'
    slide1.appearanceIds = [app1.id]

    const app2 = createAppearance(sharedMaster.id, 's2')
    const slide2 = createSlide()
    slide2.id = 's2'
    app2.slideId = 's2'
    slide2.appearanceIds = [app2.id]

    pres.slideOrder = [slide1.id, slide2.id]
    pres.slidesById[slide1.id] = slide1
    pres.slidesById[slide2.id] = slide2
    pres.mastersById[sharedMaster.id] = sharedMaster
    pres.appearancesById[app1.id] = app1
    pres.appearancesById[app2.id] = app2

    const frame = resolveFrame(buildTimeline(pres, new Map()), 0)
    render(<SlideRenderer frame={frame} />)
    expect(screen.getByText('Logo')).toBeDefined()
  })
})
