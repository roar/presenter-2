import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Tabs } from './Tabs'

describe('Tabs', () => {
  it('renders the provided tabs and marks the selected tab', () => {
    render(
      <Tabs
        value="properties"
        tabs={[
          { value: 'properties', label: 'Properties' },
          { value: 'text', label: 'Text' }
        ]}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByRole('tab', { name: 'Properties' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Text' })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onChange when another tab is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <Tabs
        value="properties"
        tabs={[
          { value: 'properties', label: 'Properties' },
          { value: 'text', label: 'Text' }
        ]}
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('tab', { name: 'Text' }))

    expect(onChange).toHaveBeenCalledWith('text')
  })
})
