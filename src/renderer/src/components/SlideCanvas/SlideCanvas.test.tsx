import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDocumentStore } from '../../store/documentStore'
import {
  createAppearance,
  createMsoMaster,
  createPresentation,
  createSlide
} from '@shared/model/factories'
import type { Presentation } from '@shared/model/types'
import { SlideCanvas } from './SlideCanvas'

vi.mock('../../store/documentStore', async () => {
  const actual = await vi.importActual('../../store/documentStore')
  return { ...actual, useDocumentStore: vi.fn() }
})

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

function makePresentation(): Presentation {
  const pres = createPresentation()
  const slide = createSlide()
  slide.background = { color: '#1a1a2e' }

  const master = createMsoMaster('shape')
  master.transform = { x: 100, y: 100, width: 300, height: 200, rotation: 0 }
  master.objectStyle = {
    defaultState: { fill: '#0000ff', stroke: 'none', strokeWidth: 0 },
    namedStates: {}
  }
  master.geometry = { type: 'path', pathData: 'M 0 0 L 300 0 L 300 200 L 0 200 Z' }

  const appearance = createAppearance(master.id, slide.id)

  slide.appearanceIds = [appearance.id]
  pres.slideOrder = [slide.id]
  pres.slidesById[slide.id] = slide
  pres.mastersById[master.id] = master
  pres.appearancesById[appearance.id] = appearance

  return pres
}

function mockStore(
  selectedSlideId: string | null,
  document: Presentation | null,
  selectedElementIds: string[] = []
): void {
  vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
    return selector({
      document,
      previewPatch: null,
      ui: { selectedSlideId, selectedElementIds },
      moveElement: vi.fn(),
      selectElements: vi.fn(),
      setPreviewPatch: vi.fn(),
      convertToMultiSlideObject: vi.fn(),
      convertToSingleAppearance: vi.fn()
    })
  })
}

describe('SlideCanvas', () => {
  beforeEach(() => {
    mockStore(null, null)
  })

  it('renders the canvas container', () => {
    const { container } = render(<SlideCanvas />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders nothing when no slide is selected', () => {
    mockStore(null, makePresentation())
    const { container } = render(<SlideCanvas />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('renders slide background color', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    mockStore(slideId, pres)
    const { container } = render(<SlideCanvas />)
    const slideEl = container.querySelector('[data-testid="slide"]') as HTMLElement
    expect(slideEl).not.toBeNull()
    expect(slideEl.style.backgroundColor).toBe('rgb(26, 26, 46)')
  })

  it('renders a shape for each appearance on the selected slide', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    mockStore(slideId, pres)
    const { container } = render(<SlideCanvas />)
    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.querySelector('path')).not.toBeNull()
  })

  it('renders no shapes when slide has no appearances', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    pres.slidesById[slideId].appearanceIds = []
    mockStore(slideId, pres)
    const { container } = render(<SlideCanvas />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('shows context menu when right-clicking an element', async () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    mockStore(slideId, pres)
    render(<SlideCanvas />)
    const hitbox = screen.getByTestId('element-hitbox')
    await userEvent.pointer({ keys: '[MouseRight]', target: hitbox })
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('dismisses context menu when pressing Escape', async () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    mockStore(slideId, pres)
    render(<SlideCanvas />)
    const hitbox = screen.getByTestId('element-hitbox')
    await userEvent.pointer({ keys: '[MouseRight]', target: hitbox })
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('shows selection indicator when element is selected', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const masterId = Object.keys(pres.mastersById)[0]
    mockStore(slideId, pres, [masterId])
    render(<SlideCanvas />)
    expect(screen.getByTestId('selection-indicator')).toBeInTheDocument()
  })

  it('does not show selection indicator when element is not selected', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    mockStore(slideId, pres, [])
    render(<SlideCanvas />)
    expect(screen.queryByTestId('selection-indicator')).not.toBeInTheDocument()
  })
})
