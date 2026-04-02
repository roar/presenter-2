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
import type { Presentation, Slide, TargetedAnimation } from '@shared/model/types'
import { EditorLayout } from './EditorLayout'

// Keep selectPatchedPresentation as the real function so the two-tier memoization works.
// Only mock the hook itself.
vi.mock('../../store/documentStore', async () => {
  const actual = await vi.importActual('../../store/documentStore')
  return { ...actual, useDocumentStore: vi.fn() }
})

vi.mock('../Toolbar/Toolbar', () => ({ Toolbar: () => <div data-testid="toolbar" /> }))
vi.mock('../SlideCanvas/SlideCanvas', () => ({
  SlideCanvas: () => <div data-testid="canvas" />
}))
vi.mock('../../../../viewer/src/components/SlideRenderer/SlideRenderer', () => ({
  SlideRenderer: ({
    frame
  }: {
    frame: { front: { slide: { id: string }; appearances: Array<{ transform: string }> } }
  }) => (
    <div data-testid="slide-renderer">
      {frame.front.slide.id}:
      {frame.front.appearances.map((appearance) => appearance.transform).join('|')}
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
const selectSlide = vi.fn()

function mockStore(document: Presentation | null, selectedSlideId: string | null = null): void {
  vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
    return selector({
      document,
      previewPatch: null,
      ui: { selectedSlideId, selectedElementIds: [] },
      addSlide,
      selectSlide,
      setPreviewPatch: vi.fn(),
      copyElement: vi.fn(),
      pasteElement: vi.fn(),
      updateAnimationTrigger: vi.fn(),
      updateAnimationOffset: vi.fn(),
      updateAnimationDuration: vi.fn(),
      updateAnimationEasing: vi.fn(),
      updateAnimationNumericTo: vi.fn(),
      updateAnimationMoveDelta: vi.fn()
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

  it('renders a thumbnail for each slide', () => {
    const s1 = createSlide()
    const s2 = createSlide()
    mockStore(makePresentation(s1, s2))
    render(<EditorLayout />)
    expect(screen.getAllByRole('button', { name: /^\d+$/ })).toHaveLength(2)
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

    expect(screen.getByText('Slides')).toBeInTheDocument()
    expect(screen.getByText('Animation')).toBeInTheDocument()
    expect(screen.getByText('Objects')).toBeInTheDocument()
    expect(screen.getByText('SlideEditor')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByText('Video')).toBeInTheDocument()
    expect(screen.getByText('Properties')).toBeInTheDocument()
    expect(screen.getByText('Timeline')).toBeInTheDocument()
    expect(slideEditorPanel).toHaveAttribute('data-selected-slide-id', slide.id)
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
        ui: { selectedSlideId: slide.id, selectedElementIds: [] },
        addSlide,
        selectSlide,
        setPreviewPatch: vi.fn(),
        copyElement: vi.fn(),
        pasteElement: vi.fn(),
        updateAnimationTrigger: vi.fn(),
        updateAnimationOffset: vi.fn(),
        updateAnimationDuration: vi.fn(),
        updateAnimationEasing: vi.fn(),
        updateAnimationNumericTo: vi.fn(),
        updateAnimationMoveDelta: vi.fn()
      })
    })

    render(<EditorLayout />)

    expect(screen.getAllByText('Move: Airplane')).not.toHaveLength(0)
    expect(screen.getByText('On click')).toBeInTheDocument()
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
    expect(screen.queryByTestId('slide-renderer')).not.toBeInTheDocument()

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

    expect(screen.queryByTestId('canvas')).not.toBeInTheDocument()
    expect(screen.getByTestId('slide-renderer')).toHaveTextContent(
      /translate\(100px, 0px\)|translate\(99\.9+px, 0px\)/
    )
  })
})
