import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDocumentStore } from '../../store/documentStore'
import { createPresentation, createSlide } from '@shared/model/factories'
import type { Presentation, Slide } from '@shared/model/types'
import { EditorLayout } from './EditorLayout'

vi.mock('../../store/documentStore')

vi.mock('../Toolbar/Toolbar', () => ({ Toolbar: () => <div data-testid="toolbar" /> }))
vi.mock('../SlideCanvas/SlideCanvas', () => ({
  SlideCanvas: () => <div data-testid="canvas" />
}))

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
    return selector({ document, ui: { selectedSlideId }, addSlide, selectSlide })
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
})
