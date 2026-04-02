import { render, screen } from '@testing-library/react'
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
})
