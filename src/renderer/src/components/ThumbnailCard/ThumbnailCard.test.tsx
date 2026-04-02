import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ThumbnailCard } from './ThumbnailCard'

describe('ThumbnailCard', () => {
  it('renders the slide number', () => {
    render(<ThumbnailCard slideNumber={3} isSelected={false} onClick={vi.fn()} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('marks as current when selected', () => {
    render(<ThumbnailCard slideNumber={1} isSelected={true} onClick={vi.fn()} />)
    expect(screen.getByRole('button').getAttribute('aria-current')).toBe('true')
  })

  it('does not mark as current when not selected', () => {
    render(<ThumbnailCard slideNumber={1} isSelected={false} onClick={vi.fn()} />)
    expect(screen.getByRole('button').getAttribute('aria-current')).toBeNull()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ThumbnailCard slideNumber={1} isSelected={false} onClick={onClick} />)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
