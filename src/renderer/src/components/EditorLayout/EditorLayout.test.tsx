import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDocumentStore } from '../../store/documentStore'
import { createPresentation, createSlide } from '@shared/model/factories'
import type { Presentation, Slide } from '@shared/model/types'
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
      pasteElement: vi.fn()
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
})
