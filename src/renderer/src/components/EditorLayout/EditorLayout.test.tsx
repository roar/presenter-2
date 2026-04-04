import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDocumentStore } from '../../store/documentStore'
import {
  createAppearance,
  createMsoMaster,
  createPresentation,
  createSlide
} from '@shared/model/factories'
import type { Presentation, Slide, TargetedAnimation } from '@shared/model/types'
import { EditorLayout } from './EditorLayout'

// Keep selectPatchedPresentation as the real function so the two-tier memoization works.
// Only mock the hook itself.
vi.mock('../../store/documentStore', async () => {
  const actual = await vi.importActual('../../store/documentStore')
  return { ...actual, useDocumentStore: vi.fn() }
})

vi.mock('@shared/model/grainCanvas', () => ({
  buildGrainBackgroundImage: () => '',
  getGrainBackgroundSize: () => '100% 100%'
}))

vi.mock('../Toolbar/Toolbar', () => ({ Toolbar: () => <div data-testid="toolbar" /> }))
vi.mock('../SlideCanvas/SlideCanvas', () => ({
  SlideCanvas: ({
    previewFrame
  }: {
    previewFrame?: {
      front: { slide: { id: string }; appearances: Array<{ transform: string }> }
      behind?: { slide: { id: string } } | null
      transition?: unknown
    } | null
  }) => (
    <div data-testid="canvas">
      {previewFrame
        ? `${previewFrame.behind ? `${previewFrame.behind.slide.id}->` : ''}${previewFrame.front.slide.id}:${previewFrame.front.appearances
            .map((appearance) => appearance.transform)
            .join('|')}${previewFrame.transition ? ':transition' : ''}`
        : 'static'}
    </div>
  )
}))

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

function makePresentation(...slides: Slide[]): Presentation {
  const pres = createPresentation()
  for (const slide of slides) {
    pres.slidesById[slide.id] = slide
    pres.slideOrder.push(slide.id)
  }
  return pres
}

const addSlide = vi.fn()
const removeSlide = vi.fn()
const selectSlide = vi.fn()
const selectElements = vi.fn()
const selectAnimation = vi.fn()

function mockStore(document: Presentation | null, selectedSlideId: string | null = null): void {
  vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
    return selector({
      document,
      previewPatch: null,
      ui: { selectedSlideId, selectedElementIds: [], selectedAnimationId: null },
      addSlide,
      removeSlide,
      selectSlide,
      selectElements,
      selectAnimation,
      setPreviewPatch: vi.fn(),
      copyElement: vi.fn(),
      pasteElement: vi.fn(),
      updateAnimationTrigger: vi.fn(),
      updateAnimationOffset: vi.fn(),
      updateAnimationDuration: vi.fn(),
      updateAnimationEasing: vi.fn(),
      updateAnimationNumericTo: vi.fn(),
      updateAnimationMoveDelta: vi.fn(),
      updateSlideTransitionTrigger: vi.fn(),
      updateSlideTransitionDuration: vi.fn(),
      updateSlideTransitionEasing: vi.fn(),
      updateSlideTransitionKind: vi.fn(),
      addColorConstant: vi.fn(),
      nameColorConstant: vi.fn(),
      updateColorConstantName: vi.fn(),
      updateColorConstantValue: vi.fn(),
      deleteColorConstant: vi.fn(),
      updateSlideBackgroundColor: vi.fn(),
      updateSlideBackgroundFill: vi.fn(),
      updateSlideBackgroundGrain: vi.fn(),
      updatePresentationDefaultBackgroundFill: vi.fn(),
      updatePresentationDefaultBackgroundGrain: vi.fn(),
      updateMasterTransform: vi.fn(),
      updateObjectFill: vi.fn(),
      updateObjectGrain: vi.fn(),
      updateObjectStroke: vi.fn(),
      updateTextColor: vi.fn(),
      updateTextShadowColor: vi.fn()
    })
  })
}

describe('EditorLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore(createPresentation())
  })

  it('renders a "New Slide" button', () => {
    render(<EditorLayout />)
    expect(screen.getByRole('button', { name: /new slide/i })).toBeInTheDocument()
  })

  it('calls addSlide with a new slide when "New Slide" is clicked', async () => {
    const user = userEvent.setup()
    render(<EditorLayout />)
    await user.click(screen.getByRole('button', { name: /new slide/i }))
    expect(addSlide).toHaveBeenCalledOnce()
    expect(addSlide).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String) }))
  })

  it('removes a slide from the thumbnail context menu', async () => {
    const user = userEvent.setup()
    const slide = createSlide()
    mockStore(makePresentation(slide), slide.id)

    render(<EditorLayout />)

    const slidesPanel = screen.getByTestId('slides-panel')
    await user.pointer({
      keys: '[MouseRight]',
      target: within(slidesPanel).getAllByText('1')[0]
    })
    await user.click(screen.getByRole('menuitem', { name: 'Delete slide' }))

    expect(removeSlide).toHaveBeenCalledWith(slide.id)
  })

  it('renders a thumbnail for each slide', () => {
    const s1 = createSlide()
    const s2 = createSlide()
    mockStore(makePresentation(s1, s2))
    render(<EditorLayout />)
    expect(within(screen.getByTestId('slides-panel')).getAllByText(/^\d+$/)).toHaveLength(2)
  })

  it('renders the requested panel layout', () => {
    const slide = createSlide()
    mockStore(makePresentation(slide), slide.id)

    render(<EditorLayout />)

    const slidesPanel = screen.getByTestId('slides-panel')
    const animationPanel = screen.getByTestId('animation-panel')
    const objectsPanel = screen.getByTestId('objects-panel')
    const slideEditorPanel = screen.getByTestId('slide-editor-panel')
    const notesPanel = screen.getByTestId('notes-panel')
    const videoPanel = screen.getByTestId('video-panel')
    const propertiesPanel = screen.getByTestId('properties-panel')
    const timelinePanel = screen.getByTestId('timeline-panel')

    expect(within(slidesPanel).getByRole('heading', { name: 'Slides' })).toBeInTheDocument()
    expect(within(animationPanel).getByRole('heading', { name: 'Animation' })).toBeInTheDocument()
    expect(within(objectsPanel).getByRole('heading', { name: 'Objects' })).toBeInTheDocument()
    expect(
      within(slideEditorPanel).getByRole('heading', { name: 'SlideEditor' })
    ).toBeInTheDocument()
    expect(within(notesPanel).getByRole('heading', { name: 'Notes' })).toBeInTheDocument()
    expect(within(videoPanel).getByRole('heading', { name: 'Video' })).toBeInTheDocument()
    expect(within(propertiesPanel).getByRole('heading', { name: 'Properties' })).toBeInTheDocument()
    expect(within(timelinePanel).getByRole('heading', { name: 'Timeline' })).toBeInTheDocument()
    expect(slideEditorPanel).toHaveAttribute('data-selected-slide-id', slide.id)
    expect(slidesPanel).toHaveAttribute('data-scrollable', 'true')
    expect(animationPanel).toHaveAttribute('data-scrollable', 'true')
    expect(objectsPanel).toHaveAttribute('data-scrollable', 'true')
    expect(propertiesPanel).toHaveAttribute('data-scrollable', 'true')
    expect(slideEditorPanel).not.toHaveAttribute('data-scrollable')
    expect(notesPanel).not.toHaveAttribute('data-scrollable')
    expect(videoPanel).not.toHaveAttribute('data-scrollable')
    expect(timelinePanel).not.toHaveAttribute('data-scrollable')
    expect(
      slidesPanel.compareDocumentPosition(animationPanel) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(
      animationPanel.compareDocumentPosition(objectsPanel) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(
      objectsPanel.compareDocumentPosition(slideEditorPanel) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(
      slideEditorPanel.compareDocumentPosition(propertiesPanel) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(
      slideEditorPanel.compareDocumentPosition(notesPanel) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(notesPanel.compareDocumentPosition(videoPanel) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(
      propertiesPanel.compareDocumentPosition(timelinePanel) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('collapses and restores a side panel using its header control and rail', async () => {
    const user = userEvent.setup()
    const slide = createSlide()
    mockStore(makePresentation(slide), slide.id)

    render(<EditorLayout />)

    await user.click(screen.getByRole('button', { name: 'Collapse Slides panel' }))

    expect(screen.queryByTestId('slides-panel')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expand Slides panel' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Expand Slides panel' }))

    expect(screen.getByTestId('slides-panel')).toBeInTheDocument()
  })

  it('toggles focus canvas mode and restores panels', async () => {
    const user = userEvent.setup()
    const slide = createSlide()
    mockStore(makePresentation(slide), slide.id)

    render(<EditorLayout />)

    await user.click(screen.getByRole('button', { name: 'Focus canvas' }))

    expect(screen.queryByTestId('slides-panel')).not.toBeInTheDocument()
    expect(screen.queryByTestId('animation-panel')).not.toBeInTheDocument()
    expect(screen.queryByTestId('objects-panel')).not.toBeInTheDocument()
    expect(screen.queryByTestId('properties-panel')).not.toBeInTheDocument()
    expect(screen.queryByTestId('timeline-panel')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Restore panels' }))

    expect(screen.getByTestId('slides-panel')).toBeInTheDocument()
    expect(screen.getByTestId('properties-panel')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-panel')).toBeInTheDocument()
  })

  it('renders animation cards for the selected slide', () => {
    const slide = createSlide()
    const master = createMsoMaster('shape')
    master.name = 'Airplane'
    const appearance = createAppearance(master.id, slide.id)
    const animation: TargetedAnimation = {
      id: 'anim-1',
      trigger: 'on-click' as const,
      offset: 0,
      duration: 1,
      easing: { kind: 'cubic-bezier' as const, x1: 0.645, y1: 0.045, x2: 0.355, y2: 1 },
      loop: { kind: 'none' as const },
      effect: { kind: 'action' as const, type: 'move' as const, delta: { x: 0, y: 100 } },
      target: { kind: 'appearance' as const, appearanceId: appearance.id }
    }

    slide.appearanceIds = [appearance.id]
    slide.animationOrder = [animation.id]

    const document = {
      ...makePresentation(slide),
      slideOrder: [slide.id],
      slidesById: { [slide.id]: slide },
      mastersById: { [master.id]: master },
      appearancesById: { [appearance.id]: appearance },
      animationsById: { [animation.id]: animation }
    }

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document,
        previewPatch: null,
        ui: { selectedSlideId: slide.id, selectedElementIds: [], selectedAnimationId: null },
        addSlide,
        selectSlide,
        selectElements,
        selectAnimation,
        setPreviewPatch: vi.fn(),
        copyElement: vi.fn(),
        pasteElement: vi.fn(),
        updateAnimationTrigger: vi.fn(),
        updateAnimationOffset: vi.fn(),
        updateAnimationDuration: vi.fn(),
        updateAnimationEasing: vi.fn(),
        updateAnimationNumericTo: vi.fn(),
        updateAnimationMoveDelta: vi.fn(),
        updateSlideTransitionTrigger: vi.fn(),
        updateSlideTransitionDuration: vi.fn(),
        updateSlideTransitionEasing: vi.fn(),
        updateSlideTransitionKind: vi.fn(),
        addColorConstant: vi.fn(),
        nameColorConstant: vi.fn(),
        updateColorConstantName: vi.fn(),
        updateColorConstantValue: vi.fn(),
        deleteColorConstant: vi.fn(),
        updateSlideBackgroundColor: vi.fn(),
        updateSlideBackgroundFill: vi.fn(),
        updateSlideBackgroundGrain: vi.fn(),
        updatePresentationDefaultBackgroundFill: vi.fn(),
        updatePresentationDefaultBackgroundGrain: vi.fn(),
        updateMasterTransform: vi.fn(),
        updateObjectFill: vi.fn(),
        updateObjectStroke: vi.fn(),
        updateTextColor: vi.fn(),
        updateTextShadowColor: vi.fn()
      })
    })

    render(<EditorLayout />)

    expect(screen.getAllByText('Move: Airplane')).not.toHaveLength(0)
    expect(screen.getByText('On click')).toBeInTheDocument()
  })

  it('shows patched transform values in the properties panel while dragging', () => {
    const slide = createSlide()
    const master = createMsoMaster('shape')
    master.transform = { x: 100, y: 200, width: 120, height: 80, rotation: 0 }
    const appearance = createAppearance(master.id, slide.id)
    slide.appearanceIds = [appearance.id]

    const document = {
      ...makePresentation(slide),
      slideOrder: [slide.id],
      slidesById: { [slide.id]: slide },
      mastersById: { [master.id]: master },
      appearancesById: { [appearance.id]: appearance }
    }

    vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
      return selector({
        document,
        previewPatch: {
          masterId: master.id,
          transform: { ...master.transform, x: 180, y: 260 }
        },
        ui: {
          selectedSlideId: slide.id,
          selectedElementIds: [master.id],
          selectedAnimationId: null
        },
        addSlide,
        removeSlide,
        selectSlide,
        selectElements,
        selectAnimation,
        setPreviewPatch: vi.fn(),
        copyElement: vi.fn(),
        pasteElement: vi.fn(),
        updateAnimationTrigger: vi.fn(),
        updateAnimationOffset: vi.fn(),
        updateAnimationDuration: vi.fn(),
        updateAnimationEasing: vi.fn(),
        updateAnimationNumericTo: vi.fn(),
        updateAnimationMoveDelta: vi.fn(),
        updateSlideTransitionTrigger: vi.fn(),
        updateSlideTransitionDuration: vi.fn(),
        updateSlideTransitionEasing: vi.fn(),
        updateSlideTransitionKind: vi.fn(),
        addColorConstant: vi.fn(),
        nameColorConstant: vi.fn(),
        updateColorConstantName: vi.fn(),
        updateColorConstantValue: vi.fn(),
        deleteColorConstant: vi.fn(),
        updateSlideBackgroundColor: vi.fn(),
        updateSlideBackgroundFill: vi.fn(),
        updateSlideBackgroundGrain: vi.fn(),
        updatePresentationDefaultBackgroundFill: vi.fn(),
        updatePresentationDefaultBackgroundGrain: vi.fn(),
        updateMasterTransform: vi.fn(),
        updateObjectFill: vi.fn(),
        updateObjectStroke: vi.fn(),
        updateTextColor: vi.fn(),
        updateTextShadowColor: vi.fn()
      })
    })

    render(<EditorLayout />)

    expect(screen.getByRole('textbox', { name: 'Transform x' })).toHaveValue('180')
    expect(screen.getByRole('textbox', { name: 'Transform y' })).toHaveValue('260')
  })

  it('renders the single-slide timeline for the selected slide', () => {
    const slide = createSlide()
    const master = createMsoMaster('shape')
    master.name = 'Airplane'
    const appearance = createAppearance(master.id, slide.id)
    const animation: TargetedAnimation = {
      id: 'anim-1',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 100, y: 0 } },
      target: { kind: 'appearance', appearanceId: appearance.id }
    }

    slide.appearanceIds = [appearance.id]
    slide.animationOrder = [animation.id]

    const document = {
      ...makePresentation(slide),
      mastersById: { [master.id]: master },
      appearancesById: { [appearance.id]: appearance },
      animationsById: { [animation.id]: animation }
    }

    mockStore(document, slide.id)
    render(<EditorLayout />)

    expect(screen.getByRole('button', { name: 'Play timeline' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show all slides timeline' })).toBeInTheDocument()
    expect(screen.getByText('Autoplay')).toBeInTheDocument()
    expect(screen.getByLabelText('Move: Airplane')).toBeInTheDocument()
  })

  it('renders the selected slide objects in the objects panel and selects them on click', async () => {
    const user = userEvent.setup()
    const slide = createSlide()
    const master1 = createMsoMaster('shape')
    master1.name = 'Airplane'
    master1.transform = { x: 10, y: 20, width: 100, height: 80, rotation: 0 }
    const master2 = createMsoMaster('text')
    master2.content = {
      type: 'text',
      value: { blocks: [{ id: 'b1', runs: [{ id: 'r1', text: 'Title', marks: [] }] }] }
    }
    master2.textStyle = { defaultState: { fontSize: 24, color: '#fff' }, namedStates: {} }
    master2.transform = { x: 50, y: 60, width: 200, height: 50, rotation: 0 }
    const appearance1 = createAppearance(master1.id, slide.id)
    const appearance2 = createAppearance(master2.id, slide.id)

    slide.appearanceIds = [appearance1.id, appearance2.id]

    const document = {
      ...makePresentation(slide),
      mastersById: { [master1.id]: master1, [master2.id]: master2 },
      appearancesById: { [appearance1.id]: appearance1, [appearance2.id]: appearance2 }
    }

    mockStore(document, slide.id)
    render(<EditorLayout />)

    expect(screen.getAllByText('Airplane').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Title').length).toBeGreaterThan(0)
    expect(screen.getByRole('img', { name: 'Airplane preview' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Title preview' })).toBeInTheDocument()

    await user.click(screen.getAllByText('Airplane')[0])

    expect(selectElements).toHaveBeenCalledWith([master1.id])
  })

  it('toggles to the all-slides timeline using the same timeline component', async () => {
    const user = userEvent.setup()
    const slide1 = createSlide()
    const slide2 = createSlide()
    const master1 = createMsoMaster('shape')
    const master2 = createMsoMaster('shape')
    master1.name = 'Airplane'
    master2.name = 'Balloon'
    const appearance1 = createAppearance(master1.id, slide1.id)
    const appearance2 = createAppearance(master2.id, slide2.id)
    const animation1: TargetedAnimation = {
      id: 'anim-1',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 100, y: 0 } },
      target: { kind: 'appearance', appearanceId: appearance1.id }
    }
    const animation2: TargetedAnimation = {
      id: 'anim-2',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 200, y: 0 } },
      target: { kind: 'appearance', appearanceId: appearance2.id }
    }

    slide1.appearanceIds = [appearance1.id]
    slide1.animationOrder = [animation1.id]
    slide2.appearanceIds = [appearance2.id]
    slide2.animationOrder = [animation2.id]

    const document = {
      ...makePresentation(slide1, slide2),
      mastersById: { [master1.id]: master1, [master2.id]: master2 },
      appearancesById: { [appearance1.id]: appearance1, [appearance2.id]: appearance2 },
      animationsById: { [animation1.id]: animation1, [animation2.id]: animation2 }
    }

    mockStore(document, slide1.id)
    render(<EditorLayout />)

    await user.click(screen.getByRole('button', { name: 'Show all slides timeline' }))

    expect(screen.getByRole('button', { name: 'Show selected slide timeline' })).toBeInTheDocument()
    expect(screen.getByText('Slide 1')).toBeInTheDocument()
    expect(screen.getByText('Slide 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Move: Airplane')).toBeInTheDocument()
    expect(screen.getByLabelText('Move: Balloon')).toBeInTheDocument()
  })

  it('swaps the timeline contents when the selected slide changes', () => {
    const slide1 = createSlide()
    const slide2 = createSlide()
    const master = createMsoMaster('shape')
    master.name = 'Airplane'
    const appearance = createAppearance(master.id, slide1.id)
    const animation: TargetedAnimation = {
      id: 'anim-1',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 100, y: 0 } },
      target: { kind: 'appearance', appearanceId: appearance.id }
    }

    slide1.appearanceIds = [appearance.id]
    slide1.animationOrder = [animation.id]

    const document = {
      ...makePresentation(slide1, slide2),
      mastersById: { [master.id]: master },
      appearancesById: { [appearance.id]: appearance },
      animationsById: { [animation.id]: animation }
    }

    mockStore(document, slide1.id)
    const { rerender } = render(<EditorLayout />)

    expect(screen.getByText('Autoplay')).toBeInTheDocument()

    mockStore(document, slide2.id)
    rerender(<EditorLayout />)

    expect(screen.queryByText('Autoplay')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Move: Airplane')).not.toBeInTheDocument()
  })

  it('updates the slide editor preview when the timeline is scrubbed', async () => {
    const user = userEvent.setup()
    const slide = createSlide()
    const master = createMsoMaster('shape')
    master.name = 'Airplane'
    const appearance = createAppearance(master.id, slide.id)
    const animation: TargetedAnimation = {
      id: 'anim-1',
      trigger: 'on-click',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 100, y: 0 } },
      target: { kind: 'appearance', appearanceId: appearance.id }
    }

    slide.appearanceIds = [appearance.id]
    slide.animationOrder = [animation.id]

    const document = {
      ...makePresentation(slide),
      mastersById: { [master.id]: master },
      appearancesById: { [appearance.id]: appearance },
      animationsById: { [animation.id]: animation }
    }

    mockStore(document, slide.id)
    render(<EditorLayout />)

    expect(screen.getByTestId('canvas')).toBeInTheDocument()
    expect(screen.getByTestId('canvas')).toHaveTextContent('static')

    const timelineRoot = screen.getByTestId('timeline-root')
    Object.defineProperty(timelineRoot, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 100,
        y: 0,
        width: 300,
        height: 80,
        top: 0,
        left: 100,
        right: 400,
        bottom: 80,
        toJSON: () => ({})
      })
    })

    await user.click(screen.getByRole('button', { name: 'Enable scrub mode' }))
    fireEvent.mouseMove(timelineRoot, { clientX: 400, clientY: 40 })

    expect(screen.getByTestId('canvas')).toHaveTextContent(
      /translate\(100px, 0px\)|translate\(99\.9+px, 0px\)/
    )
  })

  it('previews the active slide when scrubbing the all-slides timeline', async () => {
    const user = userEvent.setup()
    const slide1 = createSlide()
    const slide2 = createSlide()
    const master1 = createMsoMaster('shape')
    const master2 = createMsoMaster('shape')
    const appearance1 = createAppearance(master1.id, slide1.id)
    const appearance2 = createAppearance(master2.id, slide2.id)
    const animation1: TargetedAnimation = {
      id: 'anim-1',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 100, y: 0 } },
      target: { kind: 'appearance', appearanceId: appearance1.id }
    }
    const animation2: TargetedAnimation = {
      id: 'anim-2',
      trigger: 'after-previous',
      offset: 0,
      duration: 1,
      easing: 'linear',
      loop: { kind: 'none' },
      effect: { kind: 'action', type: 'move', delta: { x: 200, y: 0 } },
      target: { kind: 'appearance', appearanceId: appearance2.id }
    }

    slide1.appearanceIds = [appearance1.id]
    slide1.animationOrder = [animation1.id]
    slide2.appearanceIds = [appearance2.id]
    slide2.animationOrder = [animation2.id]

    const document = {
      ...makePresentation(slide1, slide2),
      mastersById: { [master1.id]: master1, [master2.id]: master2 },
      appearancesById: { [appearance1.id]: appearance1, [appearance2.id]: appearance2 },
      animationsById: { [animation1.id]: animation1, [animation2.id]: animation2 }
    }

    mockStore(document, slide1.id)
    render(<EditorLayout />)

    const timelineRoot = screen.getByTestId('timeline-root')
    Object.defineProperty(timelineRoot, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 100,
        y: 0,
        width: 300,
        height: 80,
        top: 0,
        left: 100,
        right: 400,
        bottom: 80,
        toJSON: () => ({})
      })
    })

    await user.click(screen.getByRole('button', { name: 'Show all slides timeline' }))
    await user.click(screen.getByRole('button', { name: 'Enable scrub mode' }))
    fireEvent.mouseMove(timelineRoot, { clientX: 399, clientY: 40 })

    expect(screen.getByTestId('canvas')).toHaveTextContent(slide2.id)
  })

  it('passes transition preview data through the canvas during all-slides scrubbing', async () => {
    const user = userEvent.setup()
    const slide1 = createSlide()
    const slide2 = createSlide()
    const master1 = createMsoMaster('shape')
    const master2 = createMsoMaster('shape')
    const appearance1 = createAppearance(master1.id, slide1.id)
    const appearance2 = createAppearance(master2.id, slide2.id)

    slide1.appearanceIds = [appearance1.id]
    slide1.transitionTriggerId = 'trans'
    slide1.transition = { kind: 'dissolve', duration: 1, easing: 'linear' }
    slide2.appearanceIds = [appearance2.id]

    const document = {
      ...makePresentation(slide1, slide2),
      mastersById: { [master1.id]: master1, [master2.id]: master2 },
      appearancesById: { [appearance1.id]: appearance1, [appearance2.id]: appearance2 },
      animationsById: {}
    }

    mockStore(document, slide2.id)
    render(<EditorLayout />)

    const timelineRoot = screen.getByTestId('timeline-root')
    Object.defineProperty(timelineRoot, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 100,
        y: 0,
        width: 300,
        height: 80,
        top: 0,
        left: 100,
        right: 400,
        bottom: 80,
        toJSON: () => ({})
      })
    })

    await user.click(screen.getByRole('button', { name: 'Show all slides timeline' }))
    await user.click(screen.getByRole('button', { name: 'Enable scrub mode' }))
    fireEvent.mouseMove(timelineRoot, { clientX: 340, clientY: 40 })

    expect(screen.getByTestId('canvas')).toHaveTextContent(':transition')
  })
})
