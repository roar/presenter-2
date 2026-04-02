import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OpenPresentationPopup } from './OpenPresentationPopup'

describe('OpenPresentationPopup', () => {
  it('renders listed presentations', async () => {
    render(
      <OpenPresentationPopup
        presentations={Promise.resolve([
          {
            id: 'pres-1',
            title: 'Deck A',
            updatedAt: '2024-01-01T00:00:00.000Z',
            isPublished: false
          }
        ])}
        onClose={vi.fn()}
        onOpen={vi.fn()}
      />
    )

    expect(await screen.findByRole('button', { name: /deck a/i })).toBeInTheDocument()
  })

  it('calls onOpen and onClose when a presentation is clicked', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    const onClose = vi.fn()

    render(
      <OpenPresentationPopup
        presentations={Promise.resolve([
          {
            id: 'pres-1',
            title: 'Deck A',
            updatedAt: '2024-01-01T00:00:00.000Z',
            isPublished: false
          }
        ])}
        onClose={onClose}
        onOpen={onOpen}
      />
    )

    await user.click(await screen.findByRole('button', { name: /deck a/i }))

    expect(onOpen).toHaveBeenCalledWith('pres-1')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <OpenPresentationPopup
        presentations={Promise.resolve([])}
        onClose={onClose}
        onOpen={vi.fn()}
      />
    )

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders an empty state when there are no presentations', async () => {
    render(
      <OpenPresentationPopup
        presentations={Promise.resolve([])}
        onClose={vi.fn()}
        onOpen={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('No presentations found.')).toBeInTheDocument()
    })
  })
})
