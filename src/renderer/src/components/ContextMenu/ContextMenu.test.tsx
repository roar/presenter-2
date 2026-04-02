import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ContextMenu } from './ContextMenu'

describe('ContextMenu', () => {
  it('renders a menu at the given position', () => {
    render(<ContextMenu x={100} y={200} onClose={vi.fn()} />)
    const menu = screen.getByRole('menu')
    expect(menu).toBeInTheDocument()
    expect(menu).toHaveStyle({ left: '100px', top: '200px' })
  })

  it('renders children inside the menu', () => {
    render(
      <ContextMenu x={0} y={0} onClose={vi.fn()}>
        <button>Delete</button>
      </ContextMenu>
    )
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('calls onClose when pressing Escape', async () => {
    const onClose = vi.fn()
    render(<ContextMenu x={0} y={0} onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when clicking outside the menu', async () => {
    const onClose = vi.fn()
    const { container } = render(<ContextMenu x={0} y={0} onClose={onClose} />)
    const backdrop = container.querySelector('[data-testid="context-menu-backdrop"]') as HTMLElement
    await userEvent.pointer({ keys: '[MouseLeft>]', target: backdrop })
    expect(onClose).toHaveBeenCalledOnce()
  })
})
