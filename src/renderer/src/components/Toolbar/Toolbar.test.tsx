import { render, screen } from '@testing-library/react'
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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
    return selector({
      newPresentation: newPresentationMock,
      loadDocument: loadDocumentMock,
      insertElement: insertElementMock,
      ui: { selectedSlideId: null }
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

  it('renders Open button', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
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
    await user.click(await screen.findByRole('button', { name: /deck a/i }))

    expect(loadDocumentMock).toHaveBeenCalledWith(expect.anything(), 'pres-1', nullAuthContext)
  })

  it('closes shape picker popup when Escape is pressed', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    await user.click(screen.getByRole('button', { name: 'Insert Shape' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Insert shape' })).not.toBeInTheDocument()
  })
})
