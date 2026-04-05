import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createAppearance, createMsoMaster, createTextContent } from '@shared/model/factories'
import type { Appearance, MsoMaster } from '@shared/model/types'
import { ShapeView } from './ShapeView'

function makeMaster(overrides: Partial<MsoMaster> = {}): MsoMaster {
  const m = createMsoMaster('shape')
  m.transform = { x: 50, y: 50, width: 200, height: 100, rotation: 0 }
  m.objectStyle = {
    defaultState: { fill: '#ff0000', stroke: '#000000', strokeWidth: 2, opacity: 1 },
    namedStates: {}
  }
  m.geometry = { type: 'path', pathData: 'M 0 0 L 200 0 L 200 100 L 0 100 Z' }
  return { ...m, ...overrides }
}

function makeAppearance(masterId: string, overrides: Partial<Appearance> = {}): Appearance {
  return { ...createAppearance(masterId, 'slide-1'), ...overrides }
}

describe('ShapeView', () => {
  it('renders an SVG element', () => {
    const master = makeMaster()
    const { container } = render(
      <ShapeView master={master} appearance={makeAppearance(master.id)} />
    )
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders a path for path geometry', () => {
    const master = makeMaster()
    const { container } = render(
      <ShapeView master={master} appearance={makeAppearance(master.id)} />
    )
    const path = container.querySelector('path')
    expect(path).not.toBeNull()
    expect((path as SVGPathElement).getAttribute('d')).toBe('M 0 0 L 200 0 L 200 100 L 0 100 Z')
  })

  it('renders a rect for rect geometry', () => {
    const master = makeMaster({ geometry: { type: 'rect' } })
    const { container } = render(
      <ShapeView master={master} appearance={makeAppearance(master.id)} />
    )
    expect(container.querySelector('rect')).not.toBeNull()
    expect(container.querySelector('path')).toBeNull()
  })

  it('renders an ellipse for ellipse geometry', () => {
    const master = makeMaster({ geometry: { type: 'ellipse' } })
    const { container } = render(
      <ShapeView master={master} appearance={makeAppearance(master.id)} />
    )
    expect(container.querySelector('ellipse')).not.toBeNull()
    expect(container.querySelector('path')).toBeNull()
  })

  it('applies fill and stroke from objectStyle', () => {
    const master = makeMaster()
    const { container } = render(
      <ShapeView master={master} appearance={makeAppearance(master.id)} />
    )
    const path = container.querySelector('path')
    expect(path).not.toBeNull()
    expect(path.getAttribute('fill')).toBe('#ff0000')
    expect(path.getAttribute('stroke')).toBe('#000000')
  })

  it('applies opacity from objectStyle', () => {
    const master = makeMaster()
    master.objectStyle.defaultState.opacity = 0.5
    const { container } = render(
      <ShapeView master={master} appearance={makeAppearance(master.id)} />
    )
    const svg = container.querySelector('svg') as HTMLElement
    expect(svg.style.opacity).toBe('0.5')
  })

  it('is hidden when initialVisibility is hidden', () => {
    const master = makeMaster()
    const appearance = makeAppearance(master.id, { initialVisibility: 'hidden' })
    const { container } = render(<ShapeView master={master} appearance={appearance} />)
    const svg = container.querySelector('svg') as HTMLElement
    expect(svg.style.visibility).toBe('hidden')
  })

  it('is visible when initialVisibility is visible', () => {
    const master = makeMaster()
    const appearance = makeAppearance(master.id, { initialVisibility: 'visible' })
    const { container } = render(<ShapeView master={master} appearance={appearance} />)
    const svg = container.querySelector('svg') as HTMLElement
    expect(svg.style.visibility).toBe('visible')
  })

  it('renders a grain overlay when grain is enabled', () => {
    const master = makeMaster()
    master.objectStyle.defaultState.grain = {
      enabled: true,
      intensity: 0.5,
      scale: 0.6,
      seed: 2,
      blendMode: 'overlay'
    }
    const { container, getByTestId } = render(
      <ShapeView master={master} appearance={makeAppearance(master.id)} />
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

    const { container } = render(
      <ShapeView master={master} appearance={makeAppearance(master.id)} />
    )
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

    const { container } = render(
      <ShapeView master={master} appearance={makeAppearance(master.id)} />
    )
    const gradient = container.querySelector('radialGradient')
    expect(gradient).not.toBeNull()
    expect(gradient?.getAttribute('cx')).toBe('50%')
    expect(gradient?.getAttribute('cy')).toBe('50%')
    expect(gradient?.getAttribute('r')).toBe('50%')
  })

  it('renders text content inside a shape when the shape carries text content', () => {
    const master = makeMaster()
    master.content = { type: 'text', value: createTextContent('Shape text') }

    render(<ShapeView master={master} appearance={makeAppearance(master.id)} />)

    expect(screen.getByText('Shape text')).toBeInTheDocument()
  })

  it('renders a textbox overlay in edit mode for shape text', async () => {
    const user = userEvent.setup()
    const master = makeMaster()
    master.content = { type: 'text', value: createTextContent('Shape text') }
    const onEditContentChange = vi.fn()

    render(
      <ShapeView
        master={master}
        appearance={makeAppearance(master.id)}
        isEditing
        contentOverride={createTextContent('Draft shape')}
        onEditContentChange={onEditContentChange}
      />
    )

    const textbox = screen.getByRole('textbox', { name: 'Edit text' })
    await user.clear(textbox)
    await user.type(textbox, 'Ny shape tekst')

    expect(onEditContentChange).toHaveBeenCalled()
  })
})
