import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ShapeElementRenderer } from './ShapeElementRenderer'
import type { ShapeElement } from '@shared/model/types'
import type { RenderedElement } from '@shared/animation/types'

function makeElement(overrides: Partial<ShapeElement> = {}): ShapeElement {
  return {
    kind: 'shape',
    id: 'shape-1',
    x: 50,
    y: 50,
    width: 200,
    height: 100,
    rotation: 0,
    pathData: 'M 0 0 L 200 0 L 200 100 L 0 100 Z',
    fill: { color: '#0a84ff', opacity: 1 },
    stroke: { color: '#ffffff', width: 2, opacity: 1 },
    ...overrides
  }
}

function makeState(overrides: Partial<RenderedElement> = {}): RenderedElement {
  return {
    element: makeElement(),
    visible: true,
    opacity: 1,
    transform: 'translate(0px, 0px)',
    textShadow: null,
    ...overrides
  }
}

describe('ShapeElementRenderer', () => {
  it('renders an SVG with a path element', () => {
    const { container } = render(
      <ShapeElementRenderer element={makeElement()} state={makeState()} />
    )
    const svg = container.querySelector('svg')
    const path = container.querySelector('path')
    expect(svg).not.toBeNull()
    expect(path).not.toBeNull()
  })

  it('sets the path d attribute from pathData', () => {
    const { container } = render(
      <ShapeElementRenderer element={makeElement()} state={makeState()} />
    )
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const path = container.querySelector('path')!
    expect(path.getAttribute('d')).toBe('M 0 0 L 200 0 L 200 100 L 0 100 Z')
  })

  it('is hidden when state.visible is false', () => {
    const { container } = render(
      <ShapeElementRenderer element={makeElement()} state={makeState({ visible: false })} />
    )
    const svg = container.querySelector('svg') as SVGElement
    expect((svg as HTMLElement).style.visibility).toBe('hidden')
  })

  it('applies opacity from state', () => {
    const { container } = render(
      <ShapeElementRenderer element={makeElement()} state={makeState({ opacity: 0.6 })} />
    )
    const svg = container.querySelector('svg') as SVGElement
    expect((svg as HTMLElement).style.opacity).toBe('0.6')
  })
})
