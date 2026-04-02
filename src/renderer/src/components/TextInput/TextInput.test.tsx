import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TextInput } from './TextInput'

describe('TextInput', () => {
  it('renders an input element', () => {
    render(<TextInput aria-label="Search" />)
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument()
  })

  it('forwards value and onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TextInput aria-label="Search" value="" onChange={onChange} />)
    await user.type(screen.getByRole('textbox'), 'hello')
    expect(onChange).toHaveBeenCalled()
  })

  it('forwards placeholder', () => {
    render(<TextInput aria-label="Search" placeholder="Search shapes" />)
    expect(screen.getByPlaceholderText('Search shapes')).toBeInTheDocument()
  })

  it('merges className with internal styles', () => {
    const { container } = render(<TextInput aria-label="Search" className="extra" />)
    expect(container.querySelector('input')?.className).toContain('extra')
  })
})
