import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ShapePickerPopup } from './ShapePickerPopup'

describe('ShapePickerPopup', () => {
  it('renders the popup', () => {
    render(<ShapePickerPopup onClose={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'Insert shape' })).toBeInTheDocument()
  })

  it('calls onClose when pressing Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ShapePickerPopup onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when clicking the backdrop', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ShapePickerPopup onClose={onClose} />)
    await user.click(screen.getByRole('presentation'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
