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
import type { FrameState } from '@shared/animation/types'
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
      addScaleAnimation: vi.fn(),
      addRotateAnimation: vi.fn(),
      updateAnimationNumericTo: vi.fn(),
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

  it('keeps base slide objects visible when a preview frame omits some appearances', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const master2 = createMsoMaster('shape')
    master2.transform = { x: 450, y: 100, width: 150, height: 120, rotation: 0 }
    master2.objectStyle = {
      defaultState: { fill: '#ff0000', stroke: 'none', strokeWidth: 0 },
      namedStates: {}
    }
    master2.geometry = { type: 'path', pathData: 'M 0 0 L 150 0 L 150 120 L 0 120 Z' }
    const appearance2 = createAppearance(master2.id, slideId)

    pres.mastersById[master2.id] = master2
    pres.appearancesById[appearance2.id] = appearance2
    pres.slidesById[slideId].appearanceIds.push(appearance2.id)

    mockStore(slideId, pres)

    const previewFrame: FrameState = {
      front: {
        slide: pres.slidesById[slideId],
        appearances: [
          {
            appearance: pres.appearancesById[pres.slidesById[slideId].appearanceIds[0]],
            master:
              pres.mastersById[
                pres.appearancesById[pres.slidesById[slideId].appearanceIds[0]].masterId
              ],
            visible: true,
            opacity: 1,
            transform: 'translate(100px, 0px)',
            textShadow: null,
            strokeDashoffset: null
          }
        ],
        colorConstantsById: pres.colorConstantsById,
        defaultBackground: pres.defaultBackground
      },
      behind: null,
      transition: null,
      msoAppearances: []
    }

    const { container } = render(<SlideCanvas previewFrame={previewFrame} />)
    expect(container.querySelectorAll('[data-testid="element-hitbox"]')).toHaveLength(2)
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
    expect(screen.getByRole('menuitem', { name: 'Scale' })).not.toBeDisabled()
    expect(screen.getByRole('menuitem', { name: 'Rotate' })).not.toBeDisabled()
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
        addScaleAnimation: vi.fn(),
        updateAnimationNumericTo: vi.fn(),
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
    expect(addMoveAnimation).toHaveBeenCalledWith(appearanceId, undefined)
  })

  it('adds a scale animation from the context menu', async () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const addScaleAnimation = vi.fn()

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
        addMoveAnimation: vi.fn(),
        addScaleAnimation,
        addRotateAnimation: vi.fn(),
        updateAnimationNumericTo: vi.fn(),
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
    await userEvent.click(screen.getByRole('menuitem', { name: 'Scale' }))

    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    expect(addScaleAnimation).toHaveBeenCalledWith(appearanceId, undefined)
  })

  it('adds a rotate animation from the context menu', async () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const addRotateAnimation = vi.fn()

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
        addMoveAnimation: vi.fn(),
        addScaleAnimation: vi.fn(),
        addRotateAnimation,
        updateAnimationNumericTo: vi.fn(),
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
    await userEvent.click(screen.getByRole('menuitem', { name: 'Rotate' }))

    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    expect(addRotateAnimation).toHaveBeenCalledWith(appearanceId, undefined)
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
        addScaleAnimation: vi.fn(),
        updateAnimationNumericTo: vi.fn(),
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

  it('keeps ghosts and guidelines anchored while preview playback moves the object', () => {
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

    const previewFrame: FrameState = {
      front: {
        slide: pres.slidesById[slideId],
        appearances: [
          {
            appearance: pres.appearancesById[appearanceId],
            master: pres.mastersById[pres.appearancesById[appearanceId].masterId],
            visible: true,
            opacity: 1,
            transform: 'translate(100px, 0px)',
            textShadow: null,
            strokeDashoffset: null
          }
        ],
        colorConstantsById: pres.colorConstantsById,
        defaultBackground: pres.defaultBackground
      },
      behind: null,
      transition: null,
      msoAppearances: []
    }

    mockStore(slideId, pres, [], 'move-1')
    render(<SlideCanvas previewFrame={previewFrame} />)

    expect(screen.getByTestId('animation-ghost')).toHaveStyle({ left: '140px', top: '180px' })
  })

  it('keeps move annotations visible when scrub preview shows a different slide', () => {
    const pres = makePresentation()
    const slide1Id = pres.slideOrder[0]
    const slide1AppearanceId = pres.slidesById[slide1Id].appearanceIds[0]
    const slide2 = createSlide()
    slide2.id = 'slide-2'
    const slide2Master = createMsoMaster('shape')
    slide2Master.transform = { x: 320, y: 120, width: 160, height: 100, rotation: 0 }
    slide2Master.objectStyle = {
      defaultState: { fill: '#ff0000', stroke: 'none', strokeWidth: 0 },
      namedStates: {}
    }
    slide2Master.geometry = { type: 'path', pathData: 'M 0 0 L 160 0 L 160 100 L 0 100 Z' }
    const slide2Appearance = createAppearance(slide2Master.id, slide2.id)
    slide2.appearanceIds = [slide2Appearance.id]

    pres.slideOrder = [slide1Id, slide2.id]
    pres.slidesById[slide2.id] = slide2
    pres.mastersById[slide2Master.id] = slide2Master
    pres.appearancesById[slide2Appearance.id] = slide2Appearance

    pres.slidesById[slide1Id].animationOrder = ['move-1']
    pres.appearancesById[slide1AppearanceId].animationIds = ['move-1']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId: slide1AppearanceId }
    }

    const previewFrame: FrameState = {
      front: {
        slide: slide2,
        appearances: [
          {
            appearance: slide2Appearance,
            master: slide2Master,
            visible: true,
            opacity: 1,
            transform: 'none',
            textShadow: null,
            strokeDashoffset: null
          }
        ],
        colorConstantsById: pres.colorConstantsById,
        defaultBackground: pres.defaultBackground
      },
      behind: null,
      transition: null,
      msoAppearances: []
    }

    mockStore(slide1Id, pres, [], 'move-1')
    render(<SlideCanvas previewFrame={previewFrame} />)

    expect(screen.getByTestId('animation-ghost')).toBeInTheDocument()
    expect(screen.getByTestId('animation-path')).toBeInTheDocument()
  })

  it('keeps move annotations visible while preview is over a slide transition', () => {
    const pres = makePresentation()
    const slide1Id = pres.slideOrder[0]
    const slide1 = pres.slidesById[slide1Id]
    const slide1AppearanceId = slide1.appearanceIds[0]
    const slide2 = createSlide()
    slide2.id = 'slide-2'
    const slide2Master = createMsoMaster('shape')
    slide2Master.transform = { x: 320, y: 120, width: 160, height: 100, rotation: 0 }
    slide2Master.objectStyle = {
      defaultState: { fill: '#ff0000', stroke: 'none', strokeWidth: 0 },
      namedStates: {}
    }
    slide2Master.geometry = { type: 'path', pathData: 'M 0 0 L 160 0 L 160 100 L 0 100 Z' }
    const slide2Appearance = createAppearance(slide2Master.id, slide2.id)
    slide2.appearanceIds = [slide2Appearance.id]

    pres.slideOrder = [slide1Id, slide2.id]
    pres.slidesById[slide2.id] = slide2
    pres.mastersById[slide2Master.id] = slide2Master
    pres.appearancesById[slide2Appearance.id] = slide2Appearance

    pres.slidesById[slide1Id].animationOrder = ['move-1']
    pres.appearancesById[slide1AppearanceId].animationIds = ['move-1']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 80 } },
      target: { kind: 'appearance', appearanceId: slide1AppearanceId }
    }

    const previewFrame: FrameState = {
      behind: {
        slide: slide1,
        appearances: [
          {
            appearance: pres.appearancesById[slide1AppearanceId],
            master: pres.mastersById[pres.appearancesById[slide1AppearanceId].masterId],
            visible: true,
            opacity: 1,
            transform: 'none',
            textShadow: null,
            strokeDashoffset: null
          }
        ],
        colorConstantsById: pres.colorConstantsById,
        defaultBackground: pres.defaultBackground
      },
      front: {
        slide: slide2,
        appearances: [
          {
            appearance: slide2Appearance,
            master: slide2Master,
            visible: true,
            opacity: 1,
            transform: 'none',
            textShadow: null,
            strokeDashoffset: null
          }
        ],
        colorConstantsById: pres.colorConstantsById,
        defaultBackground: pres.defaultBackground
      },
      transition: { kind: 'dissolve', progress: 0.5 },
      msoAppearances: []
    }

    mockStore(slide1Id, pres, [], 'move-1')
    render(<SlideCanvas previewFrame={previewFrame} />)

    expect(screen.getByTestId('animation-ghost')).toBeInTheDocument()
    expect(screen.getByTestId('animation-path')).toBeInTheDocument()
  })

  it('renders transition previews with behind, front, and mso content through the preview layer', () => {
    const pres = createPresentation()
    const slide1 = createSlide()
    slide1.id = 'slide-1'
    slide1.background = { color: '#111111' }
    const slide2 = createSlide()
    slide2.id = 'slide-2'
    slide2.background = { color: '#222222' }

    const behindMaster = createMsoMaster('shape')
    behindMaster.transform = { x: 50, y: 60, width: 120, height: 90, rotation: 0 }
    behindMaster.objectStyle = {
      defaultState: { fill: '#ff0000', stroke: 'none', strokeWidth: 0 },
      namedStates: {}
    }
    behindMaster.geometry = { type: 'path', pathData: 'M 0 0 L 120 0 L 120 90 L 0 90 Z' }
    const behindAppearance = createAppearance(behindMaster.id, slide1.id)
    slide1.appearanceIds = [behindAppearance.id]

    const frontMaster = createMsoMaster('shape')
    frontMaster.transform = { x: 220, y: 80, width: 120, height: 90, rotation: 0 }
    frontMaster.objectStyle = {
      defaultState: { fill: '#0000ff', stroke: 'none', strokeWidth: 0 },
      namedStates: {}
    }
    frontMaster.geometry = { type: 'path', pathData: 'M 0 0 L 120 0 L 120 90 L 0 90 Z' }
    const frontAppearance = createAppearance(frontMaster.id, slide2.id)
    slide2.appearanceIds = [frontAppearance.id]

    const msoMaster = createMsoMaster('shape')
    msoMaster.isMultiSlideObject = true
    msoMaster.transform = { x: 400, y: 120, width: 100, height: 70, rotation: 0 }
    msoMaster.objectStyle = {
      defaultState: { fill: '#00ff00', stroke: 'none', strokeWidth: 0 },
      namedStates: {}
    }
    msoMaster.geometry = { type: 'path', pathData: 'M 0 0 L 100 0 L 100 70 L 0 70 Z' }
    const msoAppearance = createAppearance(msoMaster.id, slide2.id)

    pres.slideOrder = [slide1.id, slide2.id]
    pres.slidesById[slide1.id] = slide1
    pres.slidesById[slide2.id] = slide2
    pres.mastersById[behindMaster.id] = behindMaster
    pres.mastersById[frontMaster.id] = frontMaster
    pres.mastersById[msoMaster.id] = msoMaster
    pres.appearancesById[behindAppearance.id] = behindAppearance
    pres.appearancesById[frontAppearance.id] = frontAppearance
    pres.appearancesById[msoAppearance.id] = msoAppearance

    mockStore(slide2.id, pres)

    const previewFrame: FrameState = {
      front: {
        slide: slide2,
        appearances: [
          {
            appearance: frontAppearance,
            master: frontMaster,
            visible: true,
            opacity: 1,
            transform: 'translate(0px, 0px)',
            textShadow: null,
            strokeDashoffset: null
          }
        ],
        colorConstantsById: pres.colorConstantsById,
        defaultBackground: pres.defaultBackground
      },
      behind: {
        slide: slide1,
        appearances: [
          {
            appearance: behindAppearance,
            master: behindMaster,
            visible: true,
            opacity: 1,
            transform: 'translate(0px, 0px)',
            textShadow: null,
            strokeDashoffset: null
          }
        ],
        colorConstantsById: pres.colorConstantsById,
        defaultBackground: pres.defaultBackground
      },
      transition: { kind: 'dissolve', progress: 0.5 },
      msoAppearances: [
        {
          appearance: msoAppearance,
          master: msoMaster,
          visible: true,
          opacity: 1,
          transform: 'translate(0px, 0px)',
          textShadow: null,
          strokeDashoffset: null
        }
      ]
    }

    const { container } = render(<SlideCanvas previewFrame={previewFrame} />)
    expect(container.querySelectorAll('[data-testid="element-hitbox"]')).toHaveLength(0)
    expect(container.querySelectorAll('path').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByTitle('Multi Slide Object')).toBeInTheDocument()
  })

  it('applies the same transition styling to object annotation layers as to their objects', () => {
    const pres = createPresentation()
    const slide1 = createSlide()
    slide1.id = 'slide-1'
    const slide2 = createSlide()
    slide2.id = 'slide-2'

    const behindMaster = createMsoMaster('shape')
    behindMaster.isMultiSlideObject = true
    behindMaster.transform = { x: 50, y: 60, width: 120, height: 90, rotation: 0 }
    behindMaster.objectStyle = {
      defaultState: { fill: '#ff0000', stroke: 'none', strokeWidth: 0 },
      namedStates: {}
    }
    behindMaster.geometry = { type: 'path', pathData: 'M 0 0 L 120 0 L 120 90 L 0 90 Z' }
    const behindAppearance = createAppearance(behindMaster.id, slide1.id)
    slide1.appearanceIds = [behindAppearance.id]

    const frontMaster = createMsoMaster('shape')
    frontMaster.isMultiSlideObject = true
    frontMaster.transform = { x: 220, y: 80, width: 120, height: 90, rotation: 0 }
    frontMaster.objectStyle = {
      defaultState: { fill: '#0000ff', stroke: 'none', strokeWidth: 0 },
      namedStates: {}
    }
    frontMaster.geometry = { type: 'path', pathData: 'M 0 0 L 120 0 L 120 90 L 0 90 Z' }
    const frontAppearance = createAppearance(frontMaster.id, slide2.id)
    slide2.appearanceIds = [frontAppearance.id]

    pres.slideOrder = [slide1.id, slide2.id]
    pres.slidesById[slide1.id] = slide1
    pres.slidesById[slide2.id] = slide2
    pres.mastersById[behindMaster.id] = behindMaster
    pres.mastersById[frontMaster.id] = frontMaster
    pres.appearancesById[behindAppearance.id] = behindAppearance
    pres.appearancesById[frontAppearance.id] = frontAppearance

    mockStore(slide2.id, pres)

    const previewFrame: FrameState = {
      front: {
        slide: slide2,
        appearances: [
          {
            appearance: frontAppearance,
            master: frontMaster,
            visible: true,
            opacity: 1,
            transform: 'translate(0px, 0px)',
            textShadow: null,
            strokeDashoffset: null
          }
        ],
        colorConstantsById: pres.colorConstantsById,
        defaultBackground: pres.defaultBackground
      },
      behind: {
        slide: slide1,
        appearances: [
          {
            appearance: behindAppearance,
            master: behindMaster,
            visible: true,
            opacity: 1,
            transform: 'translate(0px, 0px)',
            textShadow: null,
            strokeDashoffset: null
          }
        ],
        colorConstantsById: pres.colorConstantsById,
        defaultBackground: pres.defaultBackground
      },
      transition: { kind: 'dissolve', progress: 0.5 },
      msoAppearances: []
    }

    render(<SlideCanvas previewFrame={previewFrame} />)

    const annotationLayers = screen.getAllByTestId('object-annotation-layer')
    expect(annotationLayers[0]).toHaveStyle({ opacity: '0.5' })
    expect(annotationLayers[1]).toHaveStyle({ opacity: '0.5', transform: 'translateX(0)' })
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

  it('renders cumulative scale ghosts for ordered scale steps', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    pres.slidesById[slideId].animationOrder = ['scale-1', 'scale-2']
    pres.appearancesById[appearanceId].animationIds = ['scale-1', 'scale-2']
    pres.animationsById['scale-1'] = {
      id: 'scale-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'scale', to: 1.5 },
      target: { kind: 'appearance', appearanceId }
    }
    pres.animationsById['scale-2'] = {
      id: 'scale-2',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'scale', to: 0.5 },
      target: { kind: 'appearance', appearanceId }
    }

    mockStore(slideId, pres, [], 'scale-2')
    render(<SlideCanvas />)

    const ghosts = screen.getAllByTestId('animation-ghost')
    expect(ghosts).toHaveLength(2)
    expect(ghosts[0]).toHaveStyle({ left: '25px', top: '50px', width: '450px', height: '300px' })
    expect(ghosts[1]).toHaveStyle({
      left: '137.5px',
      top: '125px',
      width: '225px',
      height: '150px'
    })
    expect(screen.getByTestId('selection-indicator')).toBeInTheDocument()
  })

  it('stacks move ghosts above overlapping scale ghosts', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    pres.slidesById[slideId].animationOrder = ['move-1', 'scale-1']
    pres.appearancesById[appearanceId].animationIds = ['move-1', 'scale-1']
    pres.animationsById['move-1'] = {
      id: 'move-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 40, y: 30 } },
      target: { kind: 'appearance', appearanceId }
    }
    pres.animationsById['scale-1'] = {
      id: 'scale-1',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'scale', to: 1.5 },
      target: { kind: 'appearance', appearanceId }
    }

    mockStore(slideId, pres, [], 'scale-1')
    render(<SlideCanvas />)

    const ghosts = screen.getAllByTestId('animation-ghost')

    expect(ghosts[0]).toHaveStyle({ zIndex: '5' })
    expect(ghosts[1]).toHaveStyle({ zIndex: '4' })
    expect(screen.getByTestId('selection-indicator')).toHaveStyle({ zIndex: '7' })
  })

  it('commits selected scale ghost resize through updateAnimationNumericTo', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    const updateAnimationNumericTo = vi.fn()
    pres.slidesById[slideId].animationOrder = ['scale-1']
    pres.appearancesById[appearanceId].animationIds = ['scale-1']
    pres.animationsById['scale-1'] = {
      id: 'scale-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'scale', to: 1.5 },
      target: { kind: 'appearance', appearanceId }
    }

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document: pres,
        previewPatch: null,
        ui: { selectedSlideId: slideId, selectedElementIds: [], selectedAnimationId: 'scale-1' },
        moveElement: vi.fn(),
        selectElements: vi.fn(),
        selectAnimation: vi.fn(),
        setPreviewPatch: vi.fn(),
        updateObjectFill: vi.fn(),
        updateSlideBackgroundFill: vi.fn(),
        updateMasterTransform: vi.fn(),
        addMoveAnimation: vi.fn(),
        addScaleAnimation: vi.fn(),
        addRotateAnimation: vi.fn(),
        updateAnimationNumericTo,
        updateAnimationMoveDelta: vi.fn(),
        updateAnimationMovePath: vi.fn(),
        removeAnimation: vi.fn(),
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn()
      })
    })

    render(<SlideCanvas />)

    fireEvent.mouseDown(screen.getByTestId('selection-handle-br'), { clientX: 475, clientY: 350 })
    fireEvent.mouseMove(window, { clientX: 550, clientY: 400 })
    fireEvent.mouseUp(window, { clientX: 550, clientY: 400 })

    expect(updateAnimationNumericTo).toHaveBeenCalled()
    expect(updateAnimationNumericTo.mock.calls.at(-1)?.[0]).toBe('scale-1')
    expect(updateAnimationNumericTo.mock.calls.at(-1)?.[1]).toBeGreaterThan(1.5)
  })

  it('commits selected rotate ghost handle changes through updateAnimationNumericTo', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    const updateAnimationNumericTo = vi.fn()
    pres.slidesById[slideId].animationOrder = ['rotate-1']
    pres.appearancesById[appearanceId].animationIds = ['rotate-1']
    pres.animationsById['rotate-1'] = {
      id: 'rotate-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'rotate', to: 45 },
      target: { kind: 'appearance', appearanceId }
    }

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document: pres,
        previewPatch: null,
        ui: { selectedSlideId: slideId, selectedElementIds: [], selectedAnimationId: 'rotate-1' },
        moveElement: vi.fn(),
        selectElements: vi.fn(),
        selectAnimation: vi.fn(),
        setPreviewPatch: vi.fn(),
        updateObjectFill: vi.fn(),
        updateSlideBackgroundFill: vi.fn(),
        updateMasterTransform: vi.fn(),
        addMoveAnimation: vi.fn(),
        addScaleAnimation: vi.fn(),
        addRotateAnimation: vi.fn(),
        updateAnimationNumericTo,
        updateAnimationMoveDelta: vi.fn(),
        updateAnimationMovePath: vi.fn(),
        removeAnimation: vi.fn(),
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn()
      })
    })

    render(<SlideCanvas />)

    fireEvent.mouseDown(screen.getByTestId('selection-handle-rotation'), {
      clientX: 250,
      clientY: 118
    })
    fireEvent.mouseMove(window, { clientX: 350, clientY: 200 })
    fireEvent.mouseUp(window, { clientX: 350, clientY: 200 })

    expect(updateAnimationNumericTo).toHaveBeenCalled()
    expect(updateAnimationNumericTo.mock.calls.at(-1)?.[0]).toBe('rotate-1')
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

  it('renders dashed history and downstream segments as curves when those steps use move paths', () => {
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
      effect: {
        kind: 'action',
        type: 'move',
        delta: { x: 40, y: 80 },
        path: {
          points: [
            {
              id: 'start',
              position: { x: 0, y: 0 },
              type: 'sharp',
              outHandle: { x: 40, y: 0 }
            },
            {
              id: 'end',
              position: { x: 40, y: 80 },
              type: 'sharp',
              inHandle: { x: 40, y: 80 }
            }
          ]
        }
      },
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
      effect: {
        kind: 'action',
        type: 'move',
        delta: { x: -15, y: 30 },
        path: {
          points: [
            {
              id: 'start',
              position: { x: 0, y: 0 },
              type: 'sharp',
              outHandle: { x: 20, y: 30 }
            },
            {
              id: 'end',
              position: { x: -15, y: 30 },
              type: 'sharp',
              inHandle: { x: -5, y: 30 }
            }
          ]
        }
      },
      target: { kind: 'appearance', appearanceId }
    }

    mockStore(slideId, pres, [], 'move-2')
    const { container } = render(<SlideCanvas />)

    const paths = container.querySelectorAll('[data-testid="animation-path"]')
    expect(paths[0]?.tagName).toBe('path')
    expect(paths[0]?.getAttribute('d')).toContain('C')
    expect(paths[1]?.tagName).toBe('path')
    expect(paths[1]?.getAttribute('d')).toContain('C')
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

  it('moves the selected curved path endpoint with the dragged ghost preview', () => {
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
      effect: {
        kind: 'action',
        type: 'move',
        delta: { x: 40, y: 80 },
        path: {
          points: [
            { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
            {
              id: 'curve',
              position: { x: 30, y: 20 },
              type: 'smooth',
              inHandle: { x: 20, y: 10 },
              outHandle: { x: 35, y: 30 }
            },
            { id: 'end', position: { x: 40, y: 80 }, type: 'sharp' }
          ]
        }
      },
      target: { kind: 'appearance', appearanceId }
    }

    mockStore(slideId, pres, [], 'move-1')
    const { container } = render(<SlideCanvas />)

    const pointsBefore = container.querySelectorAll('[data-testid="animation-path-point"]')
    expect(pointsBefore[2]).toHaveAttribute('cx', '290')
    expect(pointsBefore[2]).toHaveAttribute('cy', '280')

    fireEvent.mouseDown(screen.getByTestId('animation-ghost'), { clientX: 140, clientY: 180 })
    fireEvent.mouseMove(window, { clientX: 160, clientY: 210 })

    const pointsAfter = container.querySelectorAll('[data-testid="animation-path-point"]')
    expect(pointsAfter[2]).toHaveAttribute('cx', '310')
    expect(pointsAfter[2]).toHaveAttribute('cy', '310')
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

  it('shows the insert point on segment hover and inserts a draggable smooth point on mouse down', async () => {
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
    expect(pathArg.points[1].type).toBe('smooth')
    expect(pathArg.points[1].position).toEqual({ x: 40, y: 50 })
    expect(pathArg.points[1].inHandle).toBeTruthy()
    expect(pathArg.points[1].outHandle).toBeTruthy()
  })

  it('inserts a new point at the curved insert indicator position', () => {
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
            { id: 'start', position: { x: 0, y: 0 }, type: 'sharp', outHandle: { x: 80, y: 0 } },
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

    fireEvent.mouseEnter(screen.getByTestId('animation-path-insert-hit-area'))
    const insertPoint = screen.getByTestId('animation-path-insert-point')
    fireEvent.mouseDown(insertPoint, { clientX: 300, clientY: 240 })
    fireEvent.mouseUp(window, { clientX: 300, clientY: 240 })

    expect(updateAnimationMovePath).toHaveBeenCalledTimes(1)
    const pathArg = updateAnimationMovePath.mock.calls[0][1]
    expect(pathArg.points[1].position.x).toBeCloseTo(47.54, 1)
    expect(pathArg.points[1].position.y).toBeCloseTo(24.52, 1)
  })

  it('inserts a new point at the indicator position for a later step in the move chain', () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    const updateAnimationMovePath = vi.fn()
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
        delta: { x: 20, y: 40 },
        path: {
          points: [
            { id: 'start', position: { x: 0, y: 0 }, type: 'sharp', outHandle: { x: 40, y: 0 } },
            { id: 'end', position: { x: 20, y: 40 }, type: 'sharp' }
          ]
        }
      },
      target: { kind: 'appearance', appearanceId }
    }

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document: pres,
        previewPatch: null,
        ui: { selectedSlideId: slideId, selectedElementIds: [], selectedAnimationId: 'move-2' },
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

    fireEvent.mouseEnter(screen.getByTestId('animation-path-insert-hit-area'))
    const insertPoint = screen.getByTestId('animation-path-insert-point')
    fireEvent.mouseDown(insertPoint, { clientX: 300, clientY: 240 })
    fireEvent.mouseUp(window, { clientX: 300, clientY: 240 })

    expect(updateAnimationMovePath).toHaveBeenCalledTimes(1)
    const pathArg = updateAnimationMovePath.mock.calls[0][1]
    expect(pathArg.points[1].position.x).toBeCloseTo(23.77, 1)
    expect(pathArg.points[1].position.y).toBeCloseTo(12.26, 1)
  })

  it('renders the insert point above ghosts so overlap still targets path insertion', () => {
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
      effect: {
        kind: 'action',
        type: 'move',
        delta: { x: 40, y: 80 },
        path: {
          points: [
            { id: 'p0', position: { x: 0, y: 0 }, type: 'sharp' },
            { id: 'p1', position: { x: 40, y: 80 }, type: 'sharp' }
          ]
        }
      },
      target: { kind: 'appearance', appearanceId }
    }

    mockStore(slideId, pres, [], 'move-1')
    render(<SlideCanvas />)

    fireEvent.mouseEnter(screen.getByTestId('animation-path-insert-hit-area'))

    expect(screen.getByLabelText('Move animation path overlay')).toHaveStyle({ zIndex: '6' })
    expect(screen.getByTestId('animation-ghost')).toHaveStyle({ zIndex: '5' })
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

  it('keeps the opposite handle aligned when dragging a smooth point handle', () => {
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
              type: 'smooth',
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
    const point = container.querySelectorAll('[data-testid="animation-path-point"]')[1]
    const pointX = Number(point?.getAttribute('cx'))
    const pointY = Number(point?.getAttribute('cy'))
    const inHandleX = Number(handlesAfter[0]?.getAttribute('cx'))
    const inHandleY = Number(handlesAfter[0]?.getAttribute('cy'))
    const outHandleX = Number(handlesAfter[1]?.getAttribute('cx'))
    const outHandleY = Number(handlesAfter[1]?.getAttribute('cy'))
    const inVectorX = inHandleX - pointX
    const inVectorY = inHandleY - pointY
    const outVectorX = outHandleX - pointX
    const outVectorY = outHandleY - pointY

    expect(outHandleX).toBe(300)
    expect(outHandleY).toBe(260)
    expect(inVectorX * outVectorY - inVectorY * outVectorX).toBeCloseTo(0, 6)
    expect(inVectorX * outVectorX + inVectorY * outVectorY).toBeLessThan(0)
    expect(Math.hypot(inVectorX, inVectorY)).toBeCloseTo(Math.hypot(-10, -10), 6)

    fireEvent.mouseUp(window, { clientX: 300, clientY: 260 })

    const pathArg = updateAnimationMovePath.mock.calls[0][1]
    expect(pathArg.points[0]).toMatchObject({
      id: 'start',
      position: { x: 0, y: 0 },
      type: 'sharp'
    })
    expect(pathArg.points[1].position).toEqual({ x: 20, y: 40 })
    expect(pathArg.points[1].type).toBe('smooth')
    expect(pathArg.points[1].outHandle).toEqual({ x: 50, y: 60 })
    expect(pathArg.points[1].inHandle?.x ?? 0).toBeCloseTo(8.233031891708958, 6)
    expect(pathArg.points[1].inHandle?.y ?? 0).toBeCloseTo(32.15535459447264, 6)
    expect(pathArg.points[2]).toMatchObject({
      id: 'end',
      position: { x: 40, y: 80 },
      type: 'sharp'
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
    await userEvent.click(screen.getByRole('menuitem', { name: 'Make Free Bezier Point' }))

    expect(updateAnimationMovePath).toHaveBeenCalled()
    const pathArg = updateAnimationMovePath.mock.calls.at(-1)?.[1]
    expect(pathArg.points[1].type).toBe('bezier')
    expect(pathArg.points[1].inHandle).toBeTruthy()
    expect(pathArg.points[1].outHandle).toBeTruthy()
  })

  it('converts a selected point to smooth from the point context menu', async () => {
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
    await userEvent.click(screen.getByRole('menuitem', { name: 'Make Smooth Point' }))

    const pathArg = updateAnimationMovePath.mock.calls.at(-1)?.[1]
    expect(pathArg.points[1]).toEqual({
      id: 'mid',
      position: { x: 20, y: 40 },
      type: 'smooth',
      inHandle: { x: 15, y: 30 },
      outHandle: { x: 25, y: 50 }
    })
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

  it('keeps a downstream path-backed segment connected to the next ghost during ghost drag preview', () => {
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
            { id: 'curve', position: { x: 10, y: -30 }, type: 'smooth' },
            { id: 'end', position: { x: 10, y: -20 }, type: 'sharp' }
          ]
        }
      },
      target: { kind: 'appearance', appearanceId }
    }

    mockStore(slideId, pres, [], 'move-1')
    const { container } = render(<SlideCanvas />)

    fireEvent.mouseDown(screen.getAllByTestId('animation-ghost')[0], { clientX: 140, clientY: 180 })
    fireEvent.mouseMove(window, { clientX: 160, clientY: 210 })

    const renderedPaths = container.querySelectorAll('[data-testid="animation-path"]')
    const downstreamPath = renderedPaths[0]
    expect(downstreamPath?.getAttribute('d')).toContain('300 260')
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
        addScaleAnimation: vi.fn(),
        updateAnimationNumericTo: vi.fn(),
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

  it('adds a scale animation from the ghost context menu', async () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    const addScaleAnimation = vi.fn()
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
        addScaleAnimation,
        updateAnimationNumericTo: vi.fn(),
        updateAnimationMoveDelta: vi.fn(),
        updateAnimationMovePath: vi.fn(),
        removeAnimation: vi.fn(),
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn()
      })
    })

    render(<SlideCanvas />)

    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByTestId('animation-ghost') })
    await userEvent.hover(screen.getByRole('menuitem', { name: 'Add animation' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Scale' }))

    expect(addScaleAnimation).toHaveBeenCalledWith(appearanceId, 'move-1')
  })

  it('adds a move animation after the current step from the ghost context menu', async () => {
    const pres = makePresentation()
    const slideId = pres.slideOrder[0]
    const appearanceId = pres.slidesById[slideId].appearanceIds[0]
    const addMoveAnimation = vi.fn()
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
        addMoveAnimation,
        addScaleAnimation: vi.fn(),
        updateAnimationNumericTo: vi.fn(),
        updateAnimationMoveDelta: vi.fn(),
        updateAnimationMovePath: vi.fn(),
        removeAnimation: vi.fn(),
        convertToMultiSlideObject: vi.fn(),
        convertToSingleAppearance: vi.fn()
      })
    })

    render(<SlideCanvas />)

    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByTestId('animation-ghost') })
    await userEvent.hover(screen.getByRole('menuitem', { name: 'Add animation' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Move' }))

    expect(addMoveAnimation).toHaveBeenCalledWith(appearanceId, 'move-1')
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
