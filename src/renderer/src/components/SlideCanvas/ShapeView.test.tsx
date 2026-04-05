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

  it('stretches path geometry to fill the current transform bounds', () => {
    const master = makeMaster()
    const { container } = render(
      <ShapeView master={master} appearance={makeAppearance(master.id)} />
    )
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('preserveAspectRatio')).toBe('none')
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
    master.geometry = { type: 'rect' }
    master.content = { type: 'text', value: createTextContent('Shape text') }

    render(<ShapeView master={master} appearance={makeAppearance(master.id)} />)

    expect(screen.getByText('Shape')).toBeInTheDocument()
    expect(screen.getByText('text')).toBeInTheDocument()
  })

  it('renders rect shape text with geometry-aware line placement when not editing', () => {
    const master = makeMaster()
    master.geometry = { type: 'rect' }
    master.transform.width = 100
    master.transform.height = 72
    master.content = { type: 'text', value: createTextContent('HELLO WORLD AGAIN') }
    master.textStyle = {
      defaultState: { fontSize: 20, fontWeight: 400, color: '#ffffff' },
      namedStates: {}
    }

    render(<ShapeView master={master} appearance={makeAppearance(master.id)} />)

    expect(screen.getByText('HELLO').parentElement).toHaveStyle({ left: '10px', top: '0px' })
    expect(screen.getByText('WORLD').parentElement).toHaveStyle({ left: '10px', top: '24px' })
    expect(screen.getByText('AGAIN').parentElement).toHaveStyle({ left: '10px', top: '48px' })
  })

  it('renders ellipse shape text with inset upper line placement when not editing', () => {
    const master = makeMaster()
    master.geometry = { type: 'ellipse' }
    master.content = { type: 'text', value: createTextContent('ONE TWO THREE FOUR FIVE SIX SEVEN') }
    master.textStyle = {
      defaultState: { fontSize: 20, fontWeight: 400, color: '#ffffff' },
      namedStates: {}
    }

    render(<ShapeView master={master} appearance={makeAppearance(master.id)} />)

    expect(screen.getByText('TWO').parentElement).toHaveStyle({ top: '0px' })
    expect(screen.getByText('SIX').parentElement).toHaveStyle({ top: '48px' })
  })

  it('does not render unsupported path shape text without an explicit text region', () => {
    const master = makeMaster()
    master.content = { type: 'text', value: createTextContent('Path shape text') }
    master.textStyle = {
      defaultState: { fontSize: 20, fontWeight: 400, color: '#ffffff' },
      namedStates: {}
    }

    render(<ShapeView master={master} appearance={makeAppearance(master.id)} />)

    expect(screen.queryByText('Path shape text')).not.toBeInTheDocument()
  })

  it('renders path shape text inside an explicit text region in normal mode', () => {
    const master = makeMaster()
    master.geometry = {
      type: 'path',
      pathData: 'M 0 0 L 100 0 L 100 100 L 0 100 Z',
      baseWidth: 100,
      baseHeight: 100,
      textRegion: { x: 20, y: 10, width: 60, height: 50 }
    }
    master.transform.width = 200
    master.transform.height = 100
    master.content = { type: 'text', value: createTextContent('HELLO WORLD AGAIN') }
    master.textStyle = {
      defaultState: { fontSize: 20, fontWeight: 400, color: '#ffffff' },
      namedStates: {}
    }

    render(<ShapeView master={master} appearance={makeAppearance(master.id)} />)

    expect(screen.getByText('WORLD').parentElement).toHaveStyle({ left: '10px', top: '24px' })
    expect(screen.getByText('AGAIN').parentElement).toHaveStyle({ left: '10px', top: '24px' })
  })

  it('renders list prefixes and decorations inside supported path text regions', () => {
    const master = makeMaster()
    master.geometry = {
      type: 'path',
      pathData: 'M 0 0 L 100 0 L 100 100 L 0 100 Z',
      baseWidth: 100,
      baseHeight: 100,
      textRegion: { x: 20, y: 10, width: 60, height: 50 }
    }
    master.transform.width = 200
    master.transform.height = 100
    master.content = {
      type: 'text',
      value: {
        blocks: [
          {
            id: 'b1',
            list: { kind: 'bulleted' },
            runs: [
              { id: 'r1', text: 'Hello ', marks: [{ type: 'bold' }] },
              { id: 'r2', text: 'world', marks: [] }
            ]
          }
        ]
      }
    }
    master.textStyle = {
      defaultState: { fontSize: 20, fontWeight: 400, color: '#ffffff' },
      namedStates: {}
    }

    render(
      <ShapeView
        master={master}
        appearance={makeAppearance(master.id)}
        rendered={{
          master,
          appearance: makeAppearance(master.id),
          visible: true,
          opacity: 1,
          transform: 'translate(0px, 0px)',
          textShadow: null,
          strokeDashoffset: null,
          textDecorations: [
            {
              id: 'd1',
              kind: 'highlight',
              range: {
                start: { blockId: 'b1', runId: 'r2', offset: 0 },
                end: { blockId: 'b1', runId: 'r2', offset: 5 }
              }
            }
          ]
        }}
      />
    )

    expect(screen.getByText(/Hello/).style.fontWeight).toBe('700')
    expect(screen.getByText('world').style.backgroundColor).toBe('rgba(255, 230, 0, 0.45)')
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

    const textbox = screen.getByRole('textbox', { name: 'Edit text line' })
    await user.clear(textbox)
    await user.type(textbox, 'Ny shape tekst')

    expect(onEditContentChange).toHaveBeenCalled()
  })

  it('renders geometry-aware editing guides for rect shapes in edit mode', () => {
    const master = makeMaster()
    master.geometry = { type: 'rect' }
    master.transform.width = 100
    master.transform.height = 72
    master.content = { type: 'text', value: createTextContent('Shape text') }
    master.textStyle = {
      defaultState: { fontSize: 20, fontWeight: 400, color: '#ffffff' },
      namedStates: {}
    }

    const { container } = render(
      <ShapeView master={master} appearance={makeAppearance(master.id)} isEditing />
    )

    const guideLines = Array.from(container.querySelectorAll('div[aria-hidden="true"]'))
    expect(guideLines).toHaveLength(3)
    expect((guideLines[0] as HTMLDivElement).style.width).toBe('80px')
    expect((guideLines[1] as HTMLDivElement).style.top).toBe('24px')
  })

  it('renders one text editor per geometry-aware track for rect shapes in edit mode', () => {
    const master = makeMaster()
    master.geometry = { type: 'rect' }
    master.transform.width = 100
    master.transform.height = 72
    master.content = { type: 'text', value: createTextContent('HELLO WORLD AGAIN') }
    master.textStyle = {
      defaultState: { fontSize: 20, fontWeight: 400, color: '#ffffff' },
      namedStates: {}
    }

    render(<ShapeView master={master} appearance={makeAppearance(master.id)} isEditing />)

    expect(screen.getAllByRole('textbox', { name: 'Edit text line' })).toHaveLength(3)
  })

  it('renders inset editing guides for ellipse shapes in edit mode', () => {
    const master = makeMaster()
    master.geometry = { type: 'ellipse' }
    master.content = { type: 'text', value: createTextContent('Shape text') }
    master.textStyle = {
      defaultState: { fontSize: 20, fontWeight: 400, color: '#ffffff' },
      namedStates: {}
    }

    const { container } = render(
      <ShapeView master={master} appearance={makeAppearance(master.id)} isEditing />
    )

    const guideLines = Array.from(container.querySelectorAll('div[aria-hidden="true"]'))
    expect(guideLines.length).toBeGreaterThan(0)
    expect((guideLines[0] as HTMLDivElement).style.left).not.toBe('0px')
  })

  it('renders geometry-aware editing guides for path text regions in edit mode', () => {
    const master = makeMaster()
    master.geometry = {
      type: 'path',
      pathData: 'M 0 0 L 100 0 L 100 100 L 0 100 Z',
      baseWidth: 100,
      baseHeight: 100,
      textRegion: { x: 20, y: 10, width: 60, height: 50 }
    }
    master.transform.width = 200
    master.transform.height = 100
    master.content = { type: 'text', value: createTextContent('Shape text') }
    master.textStyle = {
      defaultState: { fontSize: 20, fontWeight: 400, color: '#ffffff' },
      namedStates: {}
    }

    render(<ShapeView master={master} appearance={makeAppearance(master.id)} isEditing />)

    const textboxes = screen.getAllByRole('textbox', { name: 'Edit text line' })
    expect(textboxes).toHaveLength(1)
    expect(textboxes[0]).toHaveStyle({ left: '0px', width: '180px' })
  })
})
