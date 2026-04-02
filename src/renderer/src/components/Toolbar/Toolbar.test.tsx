import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDocumentStore } from '../../store/documentStore'
import { Toolbar } from './Toolbar'

vi.mock('../../store/documentStore')

const newPresentationMock = vi.fn()
const insertElementMock = vi.fn()

beforeEach(() => {
  vi.mocked(useDocumentStore).mockImplementation((selector: (s: unknown) => unknown) => {
    return selector({
      newPresentation: newPresentationMock,
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

  it('closes shape picker popup when Escape is pressed', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    await user.click(screen.getByRole('button', { name: 'Insert Shape' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Insert shape' })).not.toBeInTheDocument()
  })
})
