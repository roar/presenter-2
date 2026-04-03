import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('renders an accessible checkbox and reports checked changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<Checkbox checked={false} label="Keep ratio" onChange={onChange} />)

    await user.click(screen.getByRole('checkbox', { name: 'Keep ratio' }))

    expect(onChange).toHaveBeenCalledWith(true)
  })
})
