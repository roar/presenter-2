import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NumberInput } from './NumberInput'

describe('NumberInput', () => {
  it('formats the initial value to the requested decimal count', () => {
    render(<NumberInput aria-label="Delay" value={1} decimals={2} onCommit={vi.fn()} />)

    expect(screen.getByRole('textbox', { name: 'Delay' })).toHaveValue('1.00')
  })

  it('commits the parsed value on blur', async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn()

    render(<NumberInput aria-label="Delay" value={1} decimals={2} onCommit={onCommit} />)

    const input = screen.getByRole('textbox', { name: 'Delay' })
    await user.clear(input)
    await user.type(input, '2.5')
    await user.tab()

    expect(onCommit).toHaveBeenCalledWith(2.5)
    expect(input).toHaveValue('2.50')
  })

  it('restores the formatted previous value when input is invalid', async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn()

    render(<NumberInput aria-label="Delay" value={1.25} decimals={2} onCommit={onCommit} />)

    const input = screen.getByRole('textbox', { name: 'Delay' })
    await user.clear(input)
    await user.type(input, 'abc')
    await user.tab()

    expect(onCommit).not.toHaveBeenCalled()
    expect(input).toHaveValue('1.25')
  })
})
