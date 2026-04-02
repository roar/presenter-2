import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DropdownMenu } from './DropdownMenu'

describe('DropdownMenu', () => {
  it('renders the selected option label in the trigger', () => {
    render(
      <DropdownMenu
        value="on-click"
        options={[
          { value: 'on-click', label: 'On click' },
          { value: 'after-previous', label: 'After previous' }
        ]}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /on click/i })).toBeInTheDocument()
  })

  it('shows options when the trigger is clicked', async () => {
    const user = userEvent.setup()

    render(
      <DropdownMenu
        value="on-click"
        options={[
          { value: 'on-click', label: 'On click' },
          { value: 'after-previous', label: 'After previous' }
        ]}
        onChange={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: /on click/i }))

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'After previous' })).toBeInTheDocument()
  })

  it('calls onChange when an option is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <DropdownMenu
        value="on-click"
        options={[
          { value: 'on-click', label: 'On click' },
          { value: 'after-previous', label: 'After previous' }
        ]}
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('button', { name: /on click/i }))
    await user.click(screen.getByRole('menuitem', { name: 'After previous' }))

    expect(onChange).toHaveBeenCalledWith('after-previous')
  })
})
