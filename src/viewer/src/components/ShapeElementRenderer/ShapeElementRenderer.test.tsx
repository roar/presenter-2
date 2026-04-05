import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ShapeElementRenderer } from './ShapeElementRenderer'
import type { RenderedAppearance } from '@shared/animation/types'
import type { MsoMaster } from '@shared/model/types'
import { createAppearance, createMsoMaster, createTextContent } from '@shared/model/factories'

function makeMaster(): MsoMaster {
  const m = createMsoMaster('shape')
  m.transform = { x: 50, y: 50, width: 200, height: 100, rotation: 0 }
  m.objectStyle = {
    defaultState: { fill: '#0a84ff', stroke: '#ffffff', strokeWidth: 2 },
    namedStates: {}
  }
  m.geometry = {
    type: 'path',
    pathData: 'M 0 0 L 200 0 L 200 100 L 0 100 Z',
    baseWidth: 200,
    baseHeight: 100
  }
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
    const path = container.querySelector('path')
    expect(path).not.toBeNull()
    expect(path.getAttribute('d')).toBe('M 0 0 L 200 0 L 200 100 L 0 100 Z')
  })

  it('uses the geometry base size as the SVG viewBox', () => {
    const { container } = render(<ShapeElementRenderer rendered={makeRendered()} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg.getAttribute('viewBox')).toBe('0 0 200 100')
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

  it('applies animation translation before rotation around the element center', () => {
    const master = makeMaster()
    master.transform.rotation = 45

    const { container } = render(
      <ShapeElementRenderer
        rendered={makeRendered({ master, transform: 'translate(30px, 40px)' })}
      />
    )
    const svg = container.querySelector('svg') as HTMLElement

    expect(svg.style.transform).toBe('translate(30px, 40px) rotate(45deg)')
    expect(svg.style.transformOrigin).toBe('center center')
  })

  it('applies strokeDashoffset and pathLength when set', () => {
    const { container } = render(
      <ShapeElementRenderer rendered={makeRendered({ strokeDashoffset: 0.4 })} />
    )
    const path = container.querySelector('path')
    expect(path).not.toBeNull()
    expect(path.getAttribute('stroke-dasharray')).toBe('1')
    expect(path.getAttribute('stroke-dashoffset')).toBe('0.4')
    expect(path.getAttribute('pathLength')).toBe('1')
  })

  it('does not set strokeDasharray when strokeDashoffset is null', () => {
    const { container } = render(
      <ShapeElementRenderer rendered={makeRendered({ strokeDashoffset: null })} />
    )
    const path = container.querySelector('path')
    expect(path).not.toBeNull()
    expect(path.getAttribute('stroke-dasharray')).toBeNull()
  })

  it('renders a grain overlay when grain is enabled on the fill', () => {
    const master = makeMaster()
    master.objectStyle.defaultState.grain = {
      enabled: true,
      intensity: 0.6,
      scale: 0.7,
      seed: 3,
      blendMode: 'overlay'
    }

    const { container, getByTestId } = render(
      <ShapeElementRenderer rendered={makeRendered({ master })} />
    )

    expect(container.querySelector('filter')).not.toBeNull()
    expect(getByTestId('shape-grain-overlay')).toBeInTheDocument()
  })

  it('renders a linear gradient fill definition for gradient fills', () => {
    const master = makeMaster()
    master.objectStyle.defaultState.fill = {
      kind: 'linear-gradient',
      rotation: 30,
      x1: 0.1,
      y1: 0.2,
      x2: 0.9,
      y2: 0.8,
      stops: [
        { offset: 0, color: '#ff0000' },
        { offset: 1, color: '#0000ff' }
      ]
    }

    const { container } = render(<ShapeElementRenderer rendered={makeRendered({ master })} />)
    const gradient = container.querySelector('linearGradient')
    const path = container.querySelector('path')
    const stops = container.querySelectorAll('stop')

    expect(gradient).not.toBeNull()
    expect(gradient?.getAttribute('x1')).toBe('0.1')
    expect(gradient?.getAttribute('y1')).toBe('0.2')
    expect(gradient?.getAttribute('x2')).toBe('0.9')
    expect(gradient?.getAttribute('y2')).toBe('0.8')
    expect(stops).toHaveLength(2)
    expect(stops[0]?.getAttribute('stop-color')).toBe('#ff0000')
    expect(stops[1]?.getAttribute('stop-color')).toBe('#0000ff')
    expect(path?.getAttribute('fill')).toMatch(/^url\(#/)
  })

  it('renders a radial gradient definition for circular fills', () => {
    const master = makeMaster()
    master.objectStyle.defaultState.fill = {
      kind: 'radial-gradient',
      centerX: 50,
      centerY: 50,
      radius: 50,
      stops: [
        { offset: 0, color: '#ff0000' },
        { offset: 1, color: '#0000ff' }
      ]
    }

    const { container } = render(<ShapeElementRenderer rendered={makeRendered({ master })} />)
    const gradient = container.querySelector('radialGradient')
    expect(gradient).not.toBeNull()
    expect(gradient?.getAttribute('cx')).toBe('50%')
    expect(gradient?.getAttribute('cy')).toBe('50%')
    expect(gradient?.getAttribute('r')).toBe('50%')
  })

  it('renders text content inside the shape when the shape carries text content', () => {
    const master = makeMaster()
    master.content = { type: 'text', value: createTextContent('Viewer shape text') }

    const { getByText } = render(<ShapeElementRenderer rendered={makeRendered({ master })} />)

    expect(getByText('Viewer shape text')).toBeInTheDocument()
  })
})
