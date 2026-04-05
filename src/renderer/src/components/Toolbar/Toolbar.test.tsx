import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nullAuthContext } from '../../../../shared/auth/types'
import { useDocumentStore } from '../../store/documentStore'
import { Toolbar } from './Toolbar'

vi.mock('../../store/documentStore')
const listMock = vi.fn()

vi.mock('../../repository/JsonFileRepository', () => ({
  JsonFileRepository: class {
    list = listMock
  }
}))

const newPresentationMock = vi.fn()
const insertElementMock = vi.fn()
const loadDocumentMock = vi.fn()
const updatePresentationTitleMock = vi.fn()
const openPreviewMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, 'presenterPreview', {
    configurable: true,
    value: {
      openPreview: openPreviewMock
    }
  })
  vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
    return selector({
      document: { id: 'pres-1', title: 'Deck A' },
      newPresentation: newPresentationMock,
      loadDocument: loadDocumentMock,
      updatePresentationTitle: updatePresentationTitleMock,
      insertElement: insertElementMock,
      ui: { selectedSlideId: 'slide-1' }
    })
  })
})

describe('Toolbar', () => {
  it('renders New Presentation button', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: 'New Presentation' })).toBeInTheDocument()
  })

  it('renders Insert Shape button', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: 'Insert Shape' })).toBeInTheDocument()
  })

  it('renders Insert Text button', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: 'Insert Text' })).toBeInTheDocument()
  })

  it('renders Open button', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
  })

  it('renders Preview button', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument()
  })

  it('shows the current presentation title in the toolbar', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: 'Deck A' })).toBeInTheDocument()
  })

  it('calls newPresentation when New Presentation is clicked', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    await user.click(screen.getByRole('button', { name: 'New Presentation' }))
    expect(newPresentationMock).toHaveBeenCalledOnce()
  })

  it('opens shape picker popup when Insert Shape is clicked', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    await user.click(screen.getByRole('button', { name: 'Insert Shape' }))
    expect(screen.getByRole('dialog', { name: 'Insert shape' })).toBeInTheDocument()
  })

  it('passes the shape library name to the inserted master', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    await user.click(screen.getByRole('button', { name: 'Insert Shape' }))
    await user.click(screen.getByRole('button', { name: 'Dog' }))

    expect(insertElementMock).toHaveBeenCalledWith(
      'slide-1',
      expect.objectContaining({ type: 'shape', name: 'Dog' })
    )
  })

  it('passes shape text regions from the library to inserted masters', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    await user.click(screen.getByRole('button', { name: 'Insert Shape' }))
    await user.click(screen.getByRole('button', { name: 'Balloon' }))

    expect(insertElementMock).toHaveBeenCalledWith(
      'slide-1',
      expect.objectContaining({
        type: 'shape',
        geometry: expect.objectContaining({
          type: 'path',
          textRegion: expect.objectContaining({
            x: expect.any(Number),
            y: expect.any(Number),
            width: expect.any(Number),
            height: expect.any(Number)
          })
        })
      })
    )
  })

  it('inserts a text master with default content when Insert Text is clicked', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    await user.click(screen.getByRole('button', { name: 'Insert Text' }))

    expect(insertElementMock).toHaveBeenCalledWith(
      'slide-1',
      expect.objectContaining({
        type: 'text',
        content: {
          type: 'text',
          value: expect.objectContaining({
            blocks: [
              expect.objectContaining({
                runs: [expect.objectContaining({ text: 'Text' })]
              })
            ]
          })
        }
      })
    )
  })

  it('opens presentation picker popup when Open is clicked', async () => {
    const user = userEvent.setup()
    listMock.mockResolvedValue([])

    render(<Toolbar />)

    await user.click(screen.getByRole('button', { name: 'Open' }))

    expect(screen.getByRole('dialog', { name: 'Open presentation' })).toBeInTheDocument()
  })

  it('loads a presentation when one is selected from the open popup', async () => {
    const user = userEvent.setup()
    listMock.mockResolvedValue([
      { id: 'pres-1', title: 'Deck A', updatedAt: '2024-01-01T00:00:00.000Z', isPublished: false }
    ])

    render(<Toolbar />)

    await user.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = await screen.findByRole('dialog', { name: 'Open presentation' })
    await user.click(within(dialog).getByRole('button', { name: /deck a/i }))

    expect(loadDocumentMock).toHaveBeenCalledWith(expect.anything(), 'pres-1', nullAuthContext)
  })

  it('opens the current presentation in the preview window', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    await user.click(screen.getByRole('button', { name: 'Preview' }))

    expect(openPreviewMock).toHaveBeenCalledWith({ id: 'pres-1', title: 'Deck A' })
  })

  it('lets the user edit the presentation title and commits on blur', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    await user.click(screen.getByRole('button', { name: 'Deck A' }))
    const input = screen.getByRole('textbox', { name: 'Presentation title' })
    await user.clear(input)
    await user.type(input, 'Quarterly Review')
    await user.tab()

    expect(updatePresentationTitleMock).toHaveBeenCalledWith('Quarterly Review')
  })

  it('does not commit the title while the field is still focused', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    await user.click(screen.getByRole('button', { name: 'Deck A' }))
    const input = screen.getByRole('textbox', { name: 'Presentation title' })
    await user.clear(input)
    await user.type(input, 'Quarterly Review')

    expect(updatePresentationTitleMock).not.toHaveBeenCalled()
  })

  it('closes shape picker popup when Escape is pressed', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    await user.click(screen.getByRole('button', { name: 'Insert Shape' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Insert shape' })).not.toBeInTheDocument()
  })
})
