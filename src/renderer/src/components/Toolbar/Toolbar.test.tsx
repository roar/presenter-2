import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Toolbar } from './Toolbar'

describe('Toolbar', () => {
  it('renders New Presentation button', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: 'New Presentation' })).toBeInTheDocument()
  })

  it('renders Insert Shape button', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: 'Insert Shape' })).toBeInTheDocument()
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
