import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ColorField } from './ColorField'

describe('ColorField', () => {
  it('shows the selected named color beside the value', () => {
    render(
      <ColorField
        label="Fill"
        color={{ kind: 'constant', colorId: 'color-1' }}
        colorConstants={[{ id: 'color-1', name: 'Primary', value: '#112233' }]}
      />
    )

    expect(screen.getAllByText('Primary')).toHaveLength(2)
    expect(screen.getByText('#112233')).toBeInTheDocument()
  })

  it('assigns a named color from the registry', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <ColorField
        label="Fill"
        color="#abcdef"
        colorConstants={[{ id: 'color-1', name: 'Primary', value: '#112233' }]}
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('button', { name: /custom/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Primary' }))

    expect(onChange).toHaveBeenCalledWith({ kind: 'constant', colorId: 'color-1' })
  })

  it('can name the current raw color and assign the created constant', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onNameColor = vi.fn().mockReturnValue('color-2')
    vi.spyOn(window, 'prompt').mockReturnValue('Accent')

    render(
      <ColorField
        label="Fill"
        color="#445566"
        colorConstants={[]}
        onChange={onChange}
        onNameColor={onNameColor}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Name Color' }))

    expect(onNameColor).toHaveBeenCalledWith('#445566', 'Accent')
    expect(onChange).toHaveBeenCalledWith({ kind: 'constant', colorId: 'color-2' })
  })
})
