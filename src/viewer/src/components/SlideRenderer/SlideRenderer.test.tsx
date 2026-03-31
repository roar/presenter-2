import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SlideRenderer } from './SlideRenderer'
import { buildTimeline } from '@shared/animation/buildTimeline'
import { resolveFrame } from '@shared/animation/resolveFrame'
import type { Slide, TextElement } from '@shared/model/types'

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

function textEl(id: string, content: string): TextElement {
  return {
    kind: 'text',
    id,
    x: 100,
    y: 100,
    width: 400,
    height: 100,
    rotation: 0,
    content,
    fontSize: 24,
    fontWeight: 400,
    color: '#fff',
    align: 'left'
  }
}

function slide(id: string, elements: TextElement[], cues: Slide['cues'] = []): Slide {
  return { id, children: elements, cues }
}

describe('SlideRenderer', () => {
  it('renders text content from the front slide', () => {
    const s = slide('s1', [textEl('el', 'Slide content')])
    const timeline = buildTimeline([s], new Map())
    const frame = resolveFrame(timeline, 0)
    render(<SlideRenderer frame={frame} />)
    expect(screen.getByText('Slide content')).toBeDefined()
  })

  it('renders both behind and front slides during a transition', () => {
    const s1 = slide('s1', [textEl('el1', 'Slide one')])
    const s2 = slide('s2', [textEl('el2', 'Slide two')], [])
    // Build: s1 → transition → s2
    const allSlides = [
      {
        ...s1,
        cues: [
          {
            id: 'tc',
            kind: 'transition' as const,
            trigger: 'on-click' as const,
            slideTransition: { kind: 'fade' as const, duration: 1, easing: 'linear' as const }
          }
        ]
      },
      s2
    ]
    const timeline = buildTimeline(allSlides, new Map([['tc', 0]]))
    const frame = resolveFrame(timeline, 0.5) // mid-transition
    render(<SlideRenderer frame={frame} />)
    expect(screen.getByText('Slide one')).toBeDefined()
    expect(screen.getByText('Slide two')).toBeDefined()
  })

  it('renders MSO elements', () => {
    const mso: TextElement = { ...textEl('logo', 'Logo'), masterId: 'mso-logo' }
    const s = slide('s1', [mso])
    const timeline = buildTimeline([s], new Map())
    const frame = resolveFrame(timeline, 0)
    render(<SlideRenderer frame={frame} />)
    expect(screen.getByText('Logo')).toBeDefined()
  })
})
