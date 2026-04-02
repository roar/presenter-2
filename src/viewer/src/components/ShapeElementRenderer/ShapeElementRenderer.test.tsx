import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ShapeElementRenderer } from './ShapeElementRenderer'
import type { RenderedAppearance } from '@shared/animation/types'
import type { MsoMaster } from '@shared/model/types'
import { createAppearance, createMsoMaster } from '@shared/model/factories'

function makeMaster(): MsoMaster {
  const m = createMsoMaster('shape')
  m.transform = { x: 50, y: 50, width: 200, height: 100, rotation: 0 }
  m.objectStyle = {
    defaultState: { fill: '#0a84ff', stroke: '#ffffff', strokeWidth: 2 },
    namedStates: {}
  }
  m.geometry = { type: 'path', pathData: 'M 0 0 L 200 0 L 200 100 L 0 100 Z' }
  return m
}

function makeRendered(overrides: Partial<RenderedAppearance> = {}): RenderedAppearance {
  const master = makeMaster()
  return {
    master,
    appearance: createAppearance(master.id, 'slide-1'),
    visible: true,
    opacity: 1,
    transform: 'translate(0px, 0px)',
    textShadow: null,
    strokeDashoffset: null,
    ...overrides
  }
}

describe('ShapeElementRenderer', () => {
  it('renders an SVG with a path element', () => {
    const { container } = render(<ShapeElementRenderer rendered={makeRendered()} />)
    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.querySelector('path')).not.toBeNull()
  })

  it('sets the path d attribute', () => {
    const { container } = render(<ShapeElementRenderer rendered={makeRendered()} />)
    const path = container.querySelector('path')!
    expect(path.getAttribute('d')).toBe('M 0 0 L 200 0 L 200 100 L 0 100 Z')
  })

  it('is hidden when visible is false', () => {
    const { container } = render(
      <ShapeElementRenderer rendered={makeRendered({ visible: false })} />
    )
    const svg = container.querySelector('svg') as HTMLElement
    expect(svg.style.visibility).toBe('hidden')
  })

  it('applies opacity', () => {
    const { container } = render(<ShapeElementRenderer rendered={makeRendered({ opacity: 0.6 })} />)
    const svg = container.querySelector('svg') as HTMLElement
    expect(svg.style.opacity).toBe('0.6')
  })

  it('applies strokeDashoffset and pathLength when set', () => {
    const { container } = render(
      <ShapeElementRenderer rendered={makeRendered({ strokeDashoffset: 0.4 })} />
    )
    const path = container.querySelector('path')!
    expect(path.getAttribute('stroke-dasharray')).toBe('1')
    expect(path.getAttribute('stroke-dashoffset')).toBe('0.4')
    expect(path.getAttribute('pathLength')).toBe('1')
  })

  it('does not set strokeDasharray when strokeDashoffset is null', () => {
    const { container } = render(
      <ShapeElementRenderer rendered={makeRendered({ strokeDashoffset: null })} />
    )
    const path = container.querySelector('path')!
    expect(path.getAttribute('stroke-dasharray')).toBeNull()
  })
})
