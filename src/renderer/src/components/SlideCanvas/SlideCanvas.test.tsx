import { fireEvent, render, screen } from '@testing-library/react'
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
      updateObjectFill: vi.fn(),
      addMoveAnimation: vi.fn(),
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

  it('shows add animation submenu items in the context menu', async () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    mockStore(slideId, pres)

    render(<SlideCanvas />)

    const hitbox = screen.getByTestId('element-hitbox')
    await userEvent.pointer({ keys: '[MouseRight]', target: hitbox })
    await userEvent.hover(screen.getByRole('menuitem', { name: 'Add animation' }))

    expect(screen.getByRole('menuitem', { name: 'Move' })).not.toBeDisabled()
    expect(screen.getByRole('menuitem', { name: 'Scale' })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: 'Rotate' })).toBeDisabled()
  })

  it('adds a move animation from the context menu', async () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const addMoveAnimation = vi.fn()

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document: pres,
        previewPatch: null,
        ui: { selectedSlideId: slideId, selectedElementIds: [] },
        moveElement: vi.fn(),
        selectElements: vi.fn(),
        setPreviewPatch: vi.fn(),
        updateObjectFill: vi.fn(),
        addMoveAnimation,
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn()
      })
    })

    render(<SlideCanvas />)

    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByTestId('element-hitbox') })
    await userEvent.hover(screen.getByRole('menuitem', { name: 'Add animation' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Move' }))

    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    expect(addMoveAnimation).toHaveBeenCalledWith(appearanceId)
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

  it('shows a gradient angle overlay for a selected linear gradient shape', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const master = Object.values(pres.mastersById)[0]
    master.objectStyle.defaultState.fill = {
      kind: 'linear-gradient',
      rotation: 90,
      x1: 0.5,
      y1: 0,
      x2: 0.5,
      y2: 1,
      stops: [
        { offset: 0, color: '#111111' },
        { offset: 1, color: '#eeeeee' }
      ]
    }

    mockStore(slideId, pres, [master.id])
    render(<SlideCanvas />)

    expect(screen.getByLabelText('Gradient angle overlay')).toBeInTheDocument()
  })

  it('renders the gradient overlay above the element hitbox so its handles can be dragged', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const master = Object.values(pres.mastersById)[0]
    master.objectStyle.defaultState.fill = {
      kind: 'linear-gradient',
      rotation: 90,
      x1: 0.5,
      y1: 0,
      x2: 0.5,
      y2: 1,
      stops: [
        { offset: 0, color: '#111111' },
        { offset: 1, color: '#eeeeee' }
      ]
    }

    mockStore(slideId, pres, [master.id])
    render(<SlideCanvas />)

    expect(screen.getByLabelText('Gradient angle overlay')).toHaveStyle({ zIndex: '2' })
    expect(screen.getByTestId('element-hitbox')).toHaveStyle({ zIndex: '1' })
  })

  it('previews and commits gradient angle changes from the canvas overlay', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const master = Object.values(pres.mastersById)[0]
    master.objectStyle.defaultState.fill = {
      kind: 'linear-gradient',
      rotation: 90,
      x1: 0.5,
      y1: 0,
      x2: 0.5,
      y2: 1,
      stops: [
        { offset: 0, color: '#111111' },
        { offset: 1, color: '#eeeeee' }
      ]
    }

    const setPreviewPatch = vi.fn()
    const updateObjectFill = vi.fn()

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document: pres,
        previewPatch: null,
        ui: { selectedSlideId: slideId, selectedElementIds: [master.id] },
        moveElement: vi.fn(),
        selectElements: vi.fn(),
        setPreviewPatch,
        addMoveAnimation: vi.fn(),
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn(),
        updateObjectFill
      })
    })

    render(<SlideCanvas />)

    const handles = screen.getByLabelText('Gradient angle overlay').querySelectorAll('circle')
    fireEvent.mouseDown(handles[1] as SVGCircleElement, { clientX: 250, clientY: 300 })
    fireEvent.mouseMove(window, { clientX: 400, clientY: 200 })
    fireEvent.mouseUp(window, { clientX: 400, clientY: 200 })

    expect(setPreviewPatch).toHaveBeenNthCalledWith(1, {
      masterId: master.id,
      fill: {
        kind: 'linear-gradient',
        rotation: 45,
        x1: 0.5,
        y1: 0,
        x2: 1,
        y2: 0.5,
        stops: [
          { offset: 0, color: '#111111' },
          { offset: 1, color: '#eeeeee' }
        ]
      }
    })
    expect(updateObjectFill).toHaveBeenCalledWith(master.id, {
      kind: 'linear-gradient',
      rotation: 45,
      x1: 0.5,
      y1: 0,
      x2: 1,
      y2: 0.5,
      stops: [
        { offset: 0, color: '#111111' },
        { offset: 1, color: '#eeeeee' }
      ]
    })
    expect(setPreviewPatch).toHaveBeenLastCalledWith(null)
  })

  it('renders MSO appearances at their propagated entry position on downstream slides', () => {
    const pres = createPresentation()
    const slide1 = createSlide()
    const slide2 = createSlide()
    const master = createMsoMaster('shape')
    master.transform = { x: 100, y: 100, width: 300, height: 200, rotation: 0 }
    master.objectStyle = {
      defaultState: { fill: '#0000ff', stroke: 'none', strokeWidth: 0 },
      namedStates: {}
    }
    master.geometry = { type: 'path', pathData: 'M 0 0 L 300 0 L 300 200 L 0 200 Z' }

    const appearance1 = createAppearance(master.id, slide1.id)
    const appearance2 = createAppearance(master.id, slide2.id)

    slide1.appearanceIds = [appearance1.id]
    slide1.animationOrder = ['move-1']
    slide2.appearanceIds = [appearance2.id]

    pres.slideOrder = [slide1.id, slide2.id]
    pres.slidesById[slide1.id] = slide1
    pres.slidesById[slide2.id] = slide2
    pres.mastersById[master.id] = master
    pres.appearancesById[appearance1.id] = appearance1
    pres.appearancesById[appearance2.id] = appearance2
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId: appearance1.id }
    }

    mockStore(slide2.id, pres)
    render(<SlideCanvas />)

    expect(screen.getByTestId('element-hitbox')).toHaveStyle({
      left: '140px',
      top: '180px'
    })
  })
})
