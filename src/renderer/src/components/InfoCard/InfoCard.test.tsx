import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InfoCard } from './InfoCard'

describe('InfoCard', () => {
  it('renders the header line', () => {
    render(
      <InfoCard header="Header" isSelected={false} onClick={vi.fn()}>
        <div>Body</div>
      </InfoCard>
    )

    expect(screen.getByText('Header')).toBeInTheDocument()
  })

  it('renders the children inside the card', () => {
    render(
      <InfoCard header="Header" isSelected={false} onClick={vi.fn()}>
        <div>Body</div>
      </InfoCard>
    )

    expect(screen.getByText('Body')).toBeInTheDocument()
  })

  it('marks as current when selected', () => {
    render(
      <InfoCard header="Header" isSelected={true} onClick={vi.fn()}>
        <div>Body</div>
      </InfoCard>
    )

    expect(screen.getByRole('button')).toHaveAttribute('aria-current', 'true')
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <InfoCard header="Header" isSelected={false} onClick={onClick}>
        <div>Body</div>
      </InfoCard>
    )

    await user.click(screen.getByRole('button'))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders a non-interactive wrapper when onClick is omitted', () => {
    render(
      <InfoCard header="Header" isSelected={false}>
        <div>Body</div>
      </InfoCard>
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Header')).toBeInTheDocument()
  })
})
