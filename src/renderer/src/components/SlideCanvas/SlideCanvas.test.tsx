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
  selectedElementIds: string[] = [],
  selectedAnimationId: string | null = null
): void {
  vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
    return selector({
      document,
      previewPatch: null,
      ui: { selectedSlideId, selectedElementIds, selectedAnimationId },
      moveElement: vi.fn(),
      selectElements: vi.fn(),
      selectAnimation: vi.fn(),
      setPreviewPatch: vi.fn(),
      updateObjectFill: vi.fn(),
      updateSlideBackgroundFill: vi.fn(),
      updateMasterTransform: vi.fn(),
      addMoveAnimation: vi.fn(),
      updateAnimationMoveDelta: vi.fn(),
      updateAnimationMovePath: vi.fn(),
      removeAnimation: vi.fn(),
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
        ui: { selectedSlideId: slideId, selectedElementIds: [], selectedAnimationId: null },
        moveElement: vi.fn(),
        selectElements: vi.fn(),
        selectAnimation: vi.fn(),
        setPreviewPatch: vi.fn(),
        updateObjectFill: vi.fn(),
        updateSlideBackgroundFill: vi.fn(),
        updateMasterTransform: vi.fn(),
        addMoveAnimation,
        updateAnimationMoveDelta: vi.fn(),
        updateAnimationMovePath: vi.fn(),
        removeAnimation: vi.fn(),
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

  it('does not clear selection when clicking the gradient overlay of a selected shape', () => {
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

    const selectElements = vi.fn()
    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document: pres,
        previewPatch: null,
        ui: {
          selectedSlideId: slideId,
          selectedElementIds: [master.id],
          selectedAnimationId: null
        },
        moveElement: vi.fn(),
        selectElements,
        selectAnimation: vi.fn(),
        setPreviewPatch: vi.fn(),
        updateObjectFill: vi.fn(),
        updateSlideBackgroundFill: vi.fn(),
        updateMasterTransform: vi.fn(),
        addMoveAnimation: vi.fn(),
        updateAnimationMoveDelta: vi.fn(),
        updateAnimationMovePath: vi.fn(),
        removeAnimation: vi.fn(),
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn()
      })
    })

    render(<SlideCanvas />)

    fireEvent.click(screen.getByLabelText('Gradient angle overlay'))

    expect(selectElements).not.toHaveBeenCalledWith([])
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
        ui: {
          selectedSlideId: slideId,
          selectedElementIds: [master.id],
          selectedAnimationId: null
        },
        moveElement: vi.fn(),
        selectElements: vi.fn(),
        selectAnimation: vi.fn(),
        setPreviewPatch,
        addMoveAnimation: vi.fn(),
        updateAnimationMoveDelta: vi.fn(),
        updateAnimationMovePath: vi.fn(),
        removeAnimation: vi.fn(),
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn(),
        updateObjectFill,
        updateSlideBackgroundFill: vi.fn(),
        updateMasterTransform: vi.fn()
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

  it('renders a move animation ghost and path for the selected animation', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    pres.slidesById[slideId].animationOrder = ['move-1']
    pres.appearancesById[appearanceId].animationIds = ['move-1']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId }
    }

    mockStore(slideId, pres, [], 'move-1')
    render(<SlideCanvas />)

    expect(screen.getByTestId('animation-ghost')).toHaveStyle({ left: '140px', top: '180px' })
    expect(screen.getByTestId('animation-path')).toBeInTheDocument()
  })

  it('renders the ghost using the original object geometry', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    pres.slidesById[slideId].animationOrder = ['move-1']
    pres.appearancesById[appearanceId].animationIds = ['move-1']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId }
    }

    mockStore(slideId, pres, [], 'move-1')
    const { container } = render(<SlideCanvas />)

    const ghost = screen.getByTestId('animation-ghost')
    expect(ghost.querySelector('svg')).not.toBeNull()
    expect(container.querySelectorAll('path').length).toBeGreaterThan(1)
  })

  it('renders one move ghost per step and only the selected path with earlier dashed history', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    pres.slidesById[slideId].animationOrder = ['move-1', 'move-2']
    pres.appearancesById[appearanceId].animationIds = ['move-1', 'move-2']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId }
    }
    pres.animationsById['move-2'] = {
      id: 'move-2',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 10, y: -20 } },
      target: { kind: 'appearance', appearanceId }
    }

    mockStore(slideId, pres, [], 'move-2')
    render(<SlideCanvas />)

    const ghosts = screen.getAllByTestId('animation-ghost')
    const paths = screen.getAllByTestId('animation-path')

    expect(ghosts).toHaveLength(2)
    expect(paths).toHaveLength(2)
    expect(ghosts[0]).toHaveStyle({ left: '140px', top: '180px' })
    expect(ghosts[1]).toHaveStyle({ left: '150px', top: '160px' })
  })

  it('renders downstream path segments after the selected step as dashed continuation', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    pres.slidesById[slideId].animationOrder = ['move-1', 'move-2', 'move-3']
    pres.appearancesById[appearanceId].animationIds = ['move-1', 'move-2', 'move-3']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId }
    }
    pres.animationsById['move-2'] = {
      id: 'move-2',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 10, y: -20 } },
      target: { kind: 'appearance', appearanceId }
    }
    pres.animationsById['move-3'] = {
      id: 'move-3',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: -15, y: 30 } },
      target: { kind: 'appearance', appearanceId }
    }

    mockStore(slideId, pres, [], 'move-2')
    render(<SlideCanvas />)

    expect(screen.getAllByTestId('animation-path')).toHaveLength(3)
  })

  it('highlights the selected ghost and its incoming path segment', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    pres.slidesById[slideId].animationOrder = ['move-1', 'move-2']
    pres.appearancesById[appearanceId].animationIds = ['move-1', 'move-2']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId }
    }
    pres.animationsById['move-2'] = {
      id: 'move-2',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 10, y: -20 } },
      target: { kind: 'appearance', appearanceId }
    }

    mockStore(slideId, pres, [], 'move-2')
    render(<SlideCanvas />)

    const ghosts = screen.getAllByTestId('animation-ghost')
    const paths = screen.getAllByTestId('animation-path')

    expect(ghosts[0].getAttribute('class')).not.toMatch(/animationGhostSelected/)
    expect(paths[0].getAttribute('class')).not.toMatch(/animationPathSelected/)
    expect(ghosts[1].getAttribute('class')).toMatch(/animationGhostSelected/)
    expect(paths[1].getAttribute('class')).toMatch(/animationPathSelected/)
  })

  it('renders active path points and bezier handles for the selected move step only', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    pres.slidesById[slideId].animationOrder = ['move-1', 'move-2']
    pres.appearancesById[appearanceId].animationIds = ['move-1', 'move-2']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId }
    }
    pres.animationsById['move-2'] = {
      id: 'move-2',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: {
        kind: 'action',
        type: 'move',
        delta: { x: 10, y: -20 },
        path: {
          points: [
            { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
            {
              id: 'mid',
              position: { x: 35, y: -10 },
              type: 'bezier',
              inHandle: { x: 20, y: 10 },
              outHandle: { x: 45, y: -20 }
            },
            { id: 'end', position: { x: 10, y: -20 }, type: 'sharp' }
          ]
        }
      },
      target: { kind: 'appearance', appearanceId }
    }

    mockStore(slideId, pres, [], 'move-2')
    render(<SlideCanvas />)

    expect(screen.getAllByTestId('animation-path-point')).toHaveLength(3)
    expect(screen.getAllByTestId('animation-path-handle')).toHaveLength(2)
    expect(screen.getAllByTestId('animation-path-handle-line')).toHaveLength(2)
  })

  it('selects the animation when clicking the move ghost or path', async () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    const selectAnimation = vi.fn()
    pres.slidesById[slideId].animationOrder = ['move-1']
    pres.appearancesById[appearanceId].animationIds = ['move-1']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId }
    }

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document: pres,
        previewPatch: null,
        ui: { selectedSlideId: slideId, selectedElementIds: [], selectedAnimationId: 'move-1' },
        moveElement: vi.fn(),
        selectElements: vi.fn(),
        selectAnimation,
        setPreviewPatch: vi.fn(),
        updateObjectFill: vi.fn(),
        updateSlideBackgroundFill: vi.fn(),
        updateMasterTransform: vi.fn(),
        addMoveAnimation: vi.fn(),
        updateAnimationMoveDelta: vi.fn(),
        updateAnimationMovePath: vi.fn(),
        removeAnimation: vi.fn(),
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn()
      })
    })

    render(<SlideCanvas />)

    await userEvent.click(screen.getByTestId('animation-ghost'))
    await userEvent.click(screen.getByLabelText('Move animation path'))

    expect(selectAnimation).toHaveBeenCalledWith('move-1')
  })

  it('selects the matching move step when clicking an earlier history path segment', async () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    const selectAnimation = vi.fn()
    pres.slidesById[slideId].animationOrder = ['move-1', 'move-2']
    pres.appearancesById[appearanceId].animationIds = ['move-1', 'move-2']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId }
    }
    pres.animationsById['move-2'] = {
      id: 'move-2',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 10, y: -20 } },
      target: { kind: 'appearance', appearanceId }
    }

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document: pres,
        previewPatch: null,
        ui: { selectedSlideId: slideId, selectedElementIds: [], selectedAnimationId: 'move-2' },
        moveElement: vi.fn(),
        selectElements: vi.fn(),
        selectAnimation,
        setPreviewPatch: vi.fn(),
        updateObjectFill: vi.fn(),
        updateSlideBackgroundFill: vi.fn(),
        updateMasterTransform: vi.fn(),
        addMoveAnimation: vi.fn(),
        updateAnimationMoveDelta: vi.fn(),
        updateAnimationMovePath: vi.fn(),
        removeAnimation: vi.fn(),
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn()
      })
    })

    render(<SlideCanvas />)

    await userEvent.click(screen.getAllByTestId('animation-path')[0])

    expect(selectAnimation).toHaveBeenCalledWith('move-1')
  })

  it('updates the move delta when dragging the ghost', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    const updateAnimationMoveDelta = vi.fn()
    pres.slidesById[slideId].animationOrder = ['move-1']
    pres.appearancesById[appearanceId].animationIds = ['move-1']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId }
    }

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document: pres,
        previewPatch: null,
        ui: { selectedSlideId: slideId, selectedElementIds: [], selectedAnimationId: 'move-1' },
        moveElement: vi.fn(),
        selectElements: vi.fn(),
        selectAnimation: vi.fn(),
        setPreviewPatch: vi.fn(),
        updateObjectFill: vi.fn(),
        updateSlideBackgroundFill: vi.fn(),
        updateMasterTransform: vi.fn(),
        addMoveAnimation: vi.fn(),
        updateAnimationMoveDelta,
        removeAnimation: vi.fn(),
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn()
      })
    })

    render(<SlideCanvas />)

    fireEvent.mouseDown(screen.getByTestId('animation-ghost'), { clientX: 140, clientY: 180 })
    fireEvent.mouseMove(window, { clientX: 160, clientY: 210 })
    fireEvent.mouseUp(window, { clientX: 160, clientY: 210 })

    expect(updateAnimationMoveDelta).toHaveBeenCalledWith('move-1', { x: 60, y: 110 })
  })

  it('keeps downstream ghost positions fixed while dragging an earlier move step', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    pres.slidesById[slideId].animationOrder = ['move-1', 'move-2']
    pres.appearancesById[appearanceId].animationIds = ['move-1', 'move-2']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId }
    }
    pres.animationsById['move-2'] = {
      id: 'move-2',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 10, y: -20 } },
      target: { kind: 'appearance', appearanceId }
    }

    mockStore(slideId, pres, [], 'move-1')
    render(<SlideCanvas />)

    const ghosts = screen.getAllByTestId('animation-ghost')
    fireEvent.mouseDown(ghosts[0], { clientX: 140, clientY: 180 })
    fireEvent.mouseMove(window, { clientX: 160, clientY: 210 })

    const updatedGhosts = screen.getAllByTestId('animation-ghost')
    expect(updatedGhosts[0]).toHaveStyle({ left: '160px', top: '210px' })
    expect(updatedGhosts[1]).toHaveStyle({ left: '150px', top: '160px' })
  })

  it('moves the selected path points with the dragged ghost preview', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    pres.slidesById[slideId].animationOrder = ['move-1']
    pres.appearancesById[appearanceId].animationIds = ['move-1']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId }
    }

    mockStore(slideId, pres, [], 'move-1')
    const { container } = render(<SlideCanvas />)

    const pointsBefore = container.querySelectorAll('[data-testid="animation-path-point"]')
    expect(pointsBefore[1]).toHaveAttribute('cx', '290')
    expect(pointsBefore[1]).toHaveAttribute('cy', '280')

    fireEvent.mouseDown(screen.getByTestId('animation-ghost'), { clientX: 140, clientY: 180 })
    fireEvent.mouseMove(window, { clientX: 160, clientY: 210 })

    const pointsAfter = container.querySelectorAll('[data-testid="animation-path-point"]')
    expect(pointsAfter[1]).toHaveAttribute('cx', '310')
    expect(pointsAfter[1]).toHaveAttribute('cy', '310')
  })

  it('previews and commits an active path anchor drag through move path updates', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    const updateAnimationMovePath = vi.fn()
    pres.slidesById[slideId].animationOrder = ['move-1']
    pres.appearancesById[appearanceId].animationIds = ['move-1']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId }
    }

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document: pres,
        previewPatch: null,
        ui: { selectedSlideId: slideId, selectedElementIds: [], selectedAnimationId: 'move-1' },
        moveElement: vi.fn(),
        selectElements: vi.fn(),
        selectAnimation: vi.fn(),
        setPreviewPatch: vi.fn(),
        updateObjectFill: vi.fn(),
        updateSlideBackgroundFill: vi.fn(),
        updateMasterTransform: vi.fn(),
        addMoveAnimation: vi.fn(),
        updateAnimationMoveDelta: vi.fn(),
        updateAnimationMovePath,
        removeAnimation: vi.fn(),
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn()
      })
    })

    const { container } = render(<SlideCanvas />)

    const pointsBefore = container.querySelectorAll('[data-testid="animation-path-point"]')
    fireEvent.mouseDown(pointsBefore[1] as SVGCircleElement, { clientX: 290, clientY: 280 })
    fireEvent.mouseMove(window, { clientX: 310, clientY: 310 })

    const pointsAfter = container.querySelectorAll('[data-testid="animation-path-point"]')
    expect(pointsAfter[1]).toHaveAttribute('cx', '310')
    expect(pointsAfter[1]).toHaveAttribute('cy', '310')

    fireEvent.mouseUp(window, { clientX: 310, clientY: 310 })

    expect(updateAnimationMovePath).toHaveBeenCalledWith('move-1', {
      points: [
        { id: 'move-1:start', position: { x: 0, y: 0 }, type: 'sharp' },
        { id: 'move-1:end', position: { x: 60, y: 110 }, type: 'sharp' }
      ]
    })
  })

  it('shows the insert point on segment hover and inserts a draggable bezier point on mouse down', async () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    const updateAnimationMovePath = vi.fn()
    pres.slidesById[slideId].animationOrder = ['move-1']
    pres.appearancesById[appearanceId].animationIds = ['move-1']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId }
    }

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document: pres,
        previewPatch: null,
        ui: { selectedSlideId: slideId, selectedElementIds: [], selectedAnimationId: 'move-1' },
        moveElement: vi.fn(),
        selectElements: vi.fn(),
        selectAnimation: vi.fn(),
        setPreviewPatch: vi.fn(),
        updateObjectFill: vi.fn(),
        updateSlideBackgroundFill: vi.fn(),
        updateMasterTransform: vi.fn(),
        addMoveAnimation: vi.fn(),
        updateAnimationMoveDelta: vi.fn(),
        updateAnimationMovePath,
        removeAnimation: vi.fn(),
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn()
      })
    })

    const { container } = render(<SlideCanvas />)

    expect(screen.queryByTestId('animation-path-insert-point')).toBeNull()

    fireEvent.mouseEnter(screen.getByTestId('animation-path-insert-hit-area'))
    const insertPoint = screen.getByTestId('animation-path-insert-point')
    fireEvent.mouseDown(insertPoint, { clientX: 270, clientY: 240 })
    fireEvent.mouseMove(window, { clientX: 290, clientY: 250 })

    const pointsAfter = container.querySelectorAll('[data-testid="animation-path-point"]')
    expect(pointsAfter).toHaveLength(3)
    expect(pointsAfter[1]).toHaveAttribute('cx', '290')
    expect(pointsAfter[1]).toHaveAttribute('cy', '250')

    fireEvent.mouseUp(window, { clientX: 290, clientY: 250 })

    expect(updateAnimationMovePath).toHaveBeenCalledTimes(1)
    const pathArg = updateAnimationMovePath.mock.calls[0][1]
    expect(pathArg.points).toHaveLength(3)
    expect(pathArg.points[1].type).toBe('bezier')
    expect(pathArg.points[1].position).toEqual({ x: 40, y: 50 })
    expect(pathArg.points[1].inHandle).toBeTruthy()
    expect(pathArg.points[1].outHandle).toBeTruthy()
  })

  it('previews and commits a bezier handle drag through move path updates', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    const updateAnimationMovePath = vi.fn()
    pres.slidesById[slideId].animationOrder = ['move-1']
    pres.appearancesById[appearanceId].animationIds = ['move-1']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: {
        kind: 'action',
        type: 'move',
        delta: { x: 40, y: 80 },
        path: {
          points: [
            { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
            {
              id: 'mid',
              position: { x: 20, y: 40 },
              type: 'bezier',
              inHandle: { x: 10, y: 30 },
              outHandle: { x: 30, y: 50 }
            },
            { id: 'end', position: { x: 40, y: 80 }, type: 'sharp' }
          ]
        }
      },
      target: { kind: 'appearance', appearanceId }
    }

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document: pres,
        previewPatch: null,
        ui: { selectedSlideId: slideId, selectedElementIds: [], selectedAnimationId: 'move-1' },
        moveElement: vi.fn(),
        selectElements: vi.fn(),
        selectAnimation: vi.fn(),
        setPreviewPatch: vi.fn(),
        updateObjectFill: vi.fn(),
        updateSlideBackgroundFill: vi.fn(),
        updateMasterTransform: vi.fn(),
        addMoveAnimation: vi.fn(),
        updateAnimationMoveDelta: vi.fn(),
        updateAnimationMovePath,
        removeAnimation: vi.fn(),
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn()
      })
    })

    const { container } = render(<SlideCanvas />)

    const handlesBefore = container.querySelectorAll('[data-testid="animation-path-handle"]')
    fireEvent.mouseDown(handlesBefore[1] as SVGCircleElement, { clientX: 280, clientY: 250 })
    fireEvent.mouseMove(window, { clientX: 300, clientY: 260 })

    const handlesAfter = container.querySelectorAll('[data-testid="animation-path-handle"]')
    expect(handlesAfter[1]).toHaveAttribute('cx', '300')
    expect(handlesAfter[1]).toHaveAttribute('cy', '260')

    fireEvent.mouseUp(window, { clientX: 300, clientY: 260 })

    expect(updateAnimationMovePath).toHaveBeenCalledWith('move-1', {
      points: [
        { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
        {
          id: 'mid',
          position: { x: 20, y: 40 },
          type: 'bezier',
          inHandle: { x: 10, y: 30 },
          outHandle: { x: 50, y: 60 }
        },
        { id: 'end', position: { x: 40, y: 80 }, type: 'sharp' }
      ]
    })
  })

  it('converts a selected point to sharp from the point context menu', async () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    const updateAnimationMovePath = vi.fn()
    pres.slidesById[slideId].animationOrder = ['move-1']
    pres.appearancesById[appearanceId].animationIds = ['move-1']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: {
        kind: 'action',
        type: 'move',
        delta: { x: 40, y: 80 },
        path: {
          points: [
            { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
            {
              id: 'mid',
              position: { x: 20, y: 40 },
              type: 'bezier',
              inHandle: { x: 10, y: 30 },
              outHandle: { x: 30, y: 50 }
            },
            { id: 'end', position: { x: 40, y: 80 }, type: 'sharp' }
          ]
        }
      },
      target: { kind: 'appearance', appearanceId }
    }

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document: pres,
        previewPatch: null,
        ui: { selectedSlideId: slideId, selectedElementIds: [], selectedAnimationId: 'move-1' },
        moveElement: vi.fn(),
        selectElements: vi.fn(),
        selectAnimation: vi.fn(),
        setPreviewPatch: vi.fn(),
        updateObjectFill: vi.fn(),
        updateSlideBackgroundFill: vi.fn(),
        updateMasterTransform: vi.fn(),
        addMoveAnimation: vi.fn(),
        updateAnimationMoveDelta: vi.fn(),
        updateAnimationMovePath,
        removeAnimation: vi.fn(),
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn()
      })
    })

    render(<SlideCanvas />)

    await userEvent.pointer({
      keys: '[MouseRight]',
      target: screen.getAllByTestId('animation-path-point')[1]
    })
    await userEvent.click(screen.getByRole('menuitem', { name: 'Make Sharp Point' }))

    expect(updateAnimationMovePath).toHaveBeenCalledWith('move-1', {
      points: [
        { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
        {
          id: 'mid',
          position: { x: 20, y: 40 },
          type: 'sharp',
          inHandle: undefined,
          outHandle: undefined
        },
        { id: 'end', position: { x: 40, y: 80 }, type: 'sharp' }
      ]
    })
  })

  it('converts a selected point to bezier from the point context menu', async () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    const updateAnimationMovePath = vi.fn()
    pres.slidesById[slideId].animationOrder = ['move-1']
    pres.appearancesById[appearanceId].animationIds = ['move-1']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: {
        kind: 'action',
        type: 'move',
        delta: { x: 40, y: 80 },
        path: {
          points: [
            { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
            { id: 'mid', position: { x: 20, y: 40 }, type: 'sharp' },
            { id: 'end', position: { x: 40, y: 80 }, type: 'sharp' }
          ]
        }
      },
      target: { kind: 'appearance', appearanceId }
    }

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document: pres,
        previewPatch: null,
        ui: { selectedSlideId: slideId, selectedElementIds: [], selectedAnimationId: 'move-1' },
        moveElement: vi.fn(),
        selectElements: vi.fn(),
        selectAnimation: vi.fn(),
        setPreviewPatch: vi.fn(),
        updateObjectFill: vi.fn(),
        updateSlideBackgroundFill: vi.fn(),
        updateMasterTransform: vi.fn(),
        addMoveAnimation: vi.fn(),
        updateAnimationMoveDelta: vi.fn(),
        updateAnimationMovePath,
        removeAnimation: vi.fn(),
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn()
      })
    })

    render(<SlideCanvas />)

    await userEvent.pointer({
      keys: '[MouseRight]',
      target: screen.getAllByTestId('animation-path-point')[1]
    })
    await userEvent.click(screen.getByRole('menuitem', { name: 'Make Bezier Point' }))

    expect(updateAnimationMovePath).toHaveBeenCalled()
    const pathArg = updateAnimationMovePath.mock.calls.at(-1)?.[1]
    expect(pathArg.points[1].type).toBe('bezier')
    expect(pathArg.points[1].inHandle).toBeTruthy()
    expect(pathArg.points[1].outHandle).toBeTruthy()
  })

  it('deletes an interior point from the point context menu', async () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    const updateAnimationMovePath = vi.fn()
    pres.slidesById[slideId].animationOrder = ['move-1']
    pres.appearancesById[appearanceId].animationIds = ['move-1']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: {
        kind: 'action',
        type: 'move',
        delta: { x: 40, y: 80 },
        path: {
          points: [
            { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
            { id: 'mid', position: { x: 20, y: 40 }, type: 'sharp' },
            { id: 'end', position: { x: 40, y: 80 }, type: 'sharp' }
          ]
        }
      },
      target: { kind: 'appearance', appearanceId }
    }

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document: pres,
        previewPatch: null,
        ui: { selectedSlideId: slideId, selectedElementIds: [], selectedAnimationId: 'move-1' },
        moveElement: vi.fn(),
        selectElements: vi.fn(),
        selectAnimation: vi.fn(),
        setPreviewPatch: vi.fn(),
        updateObjectFill: vi.fn(),
        updateSlideBackgroundFill: vi.fn(),
        updateMasterTransform: vi.fn(),
        addMoveAnimation: vi.fn(),
        updateAnimationMoveDelta: vi.fn(),
        updateAnimationMovePath,
        removeAnimation: vi.fn(),
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn()
      })
    })

    render(<SlideCanvas />)

    await userEvent.pointer({
      keys: '[MouseRight]',
      target: screen.getAllByTestId('animation-path-point')[1]
    })
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete Point' }))

    expect(updateAnimationMovePath).toHaveBeenCalledWith('move-1', {
      points: [
        { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
        { id: 'end', position: { x: 40, y: 80 }, type: 'sharp' }
      ]
    })
  })

  it('keeps later ghosts fixed when dragging a middle move step', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    pres.slidesById[slideId].animationOrder = ['move-1', 'move-2', 'move-3']
    pres.appearancesById[appearanceId].animationIds = ['move-1', 'move-2', 'move-3']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId }
    }
    pres.animationsById['move-2'] = {
      id: 'move-2',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 10, y: -20 } },
      target: { kind: 'appearance', appearanceId }
    }
    pres.animationsById['move-3'] = {
      id: 'move-3',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: -15, y: 30 } },
      target: { kind: 'appearance', appearanceId }
    }

    mockStore(slideId, pres, [], 'move-2')
    render(<SlideCanvas />)

    const ghosts = screen.getAllByTestId('animation-ghost')
    fireEvent.mouseDown(ghosts[1], { clientX: 150, clientY: 160 })
    fireEvent.mouseMove(window, { clientX: 170, clientY: 190 })

    const updatedGhosts = screen.getAllByTestId('animation-ghost')
    expect(updatedGhosts[0]).toHaveStyle({ left: '140px', top: '180px' })
    expect(updatedGhosts[1]).toHaveStyle({ left: '170px', top: '190px' })
    expect(updatedGhosts[2]).toHaveStyle({ left: '135px', top: '190px' })
  })

  it('updates the dragged move delta and compensates the following move step on mouse up', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    const updateAnimationMoveDelta = vi.fn()
    pres.slidesById[slideId].animationOrder = ['move-1', 'move-2']
    pres.appearancesById[appearanceId].animationIds = ['move-1', 'move-2']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId }
    }
    pres.animationsById['move-2'] = {
      id: 'move-2',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 10, y: -20 } },
      target: { kind: 'appearance', appearanceId }
    }

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document: pres,
        previewPatch: null,
        ui: { selectedSlideId: slideId, selectedElementIds: [], selectedAnimationId: 'move-1' },
        moveElement: vi.fn(),
        selectElements: vi.fn(),
        selectAnimation: vi.fn(),
        setPreviewPatch: vi.fn(),
        updateObjectFill: vi.fn(),
        updateSlideBackgroundFill: vi.fn(),
        updateMasterTransform: vi.fn(),
        addMoveAnimation: vi.fn(),
        updateAnimationMoveDelta,
        removeAnimation: vi.fn(),
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn()
      })
    })

    render(<SlideCanvas />)

    fireEvent.mouseDown(screen.getAllByTestId('animation-ghost')[0], { clientX: 140, clientY: 180 })
    fireEvent.mouseMove(window, { clientX: 160, clientY: 210 })
    fireEvent.mouseUp(window, { clientX: 160, clientY: 210 })

    expect(updateAnimationMoveDelta).toHaveBeenNthCalledWith(1, 'move-1', { x: 60, y: 110 })
    expect(updateAnimationMoveDelta).toHaveBeenNthCalledWith(2, 'move-2', { x: -10, y: -50 })
  })

  it('allows moving the base object while animation ghosts are visible', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    const moveElement = vi.fn()
    pres.slidesById[slideId].animationOrder = ['move-1', 'move-2']
    pres.appearancesById[appearanceId].animationIds = ['move-1', 'move-2']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId }
    }
    pres.animationsById['move-2'] = {
      id: 'move-2',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 10, y: -20 } },
      target: { kind: 'appearance', appearanceId }
    }

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document: pres,
        previewPatch: null,
        ui: { selectedSlideId: slideId, selectedElementIds: [], selectedAnimationId: 'move-1' },
        moveElement,
        selectElements: vi.fn(),
        selectAnimation: vi.fn(),
        setPreviewPatch: vi.fn(),
        updateObjectFill: vi.fn(),
        updateSlideBackgroundFill: vi.fn(),
        updateMasterTransform: vi.fn(),
        addMoveAnimation: vi.fn(),
        updateAnimationMoveDelta: vi.fn(),
        updateAnimationMovePath: vi.fn(),
        removeAnimation: vi.fn(),
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn()
      })
    })

    render(<SlideCanvas />)

    fireEvent.mouseDown(screen.getByTestId('element-hitbox'), { clientX: 100, clientY: 100 })
    fireEvent.mouseMove(window, { clientX: 130, clientY: 145 })
    fireEvent.mouseUp(window, { clientX: 130, clientY: 145 })

    expect(moveElement).toHaveBeenCalledWith(expect.any(String), 130, 145)
  })

  it('deletes the selected animation from the ghost context menu', async () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    const removeAnimation = vi.fn()
    pres.slidesById[slideId].animationOrder = ['move-1']
    pres.appearancesById[appearanceId].animationIds = ['move-1']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId }
    }

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document: pres,
        previewPatch: null,
        ui: { selectedSlideId: slideId, selectedElementIds: [], selectedAnimationId: 'move-1' },
        moveElement: vi.fn(),
        selectElements: vi.fn(),
        selectAnimation: vi.fn(),
        setPreviewPatch: vi.fn(),
        updateObjectFill: vi.fn(),
        updateSlideBackgroundFill: vi.fn(),
        updateMasterTransform: vi.fn(),
        addMoveAnimation: vi.fn(),
        updateAnimationMoveDelta: vi.fn(),
        removeAnimation,
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn()
      })
    })

    render(<SlideCanvas />)

    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByTestId('animation-ghost') })
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete animation' }))

    expect(removeAnimation).toHaveBeenCalledWith('move-1')
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
