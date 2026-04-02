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

    expect(screen.getByText('Header').closest('[data-selected="true"]')).toHaveAttribute(
      'data-selected',
      'true'
    )
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <InfoCard header="Header" isSelected={false} onClick={onClick}>
        <div>Body</div>
      </InfoCard>
    )

    await user.click(screen.getByText('Body'))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('forwards context menu events when interactive', async () => {
    const user = userEvent.setup()
    const onContextMenu = vi.fn()

    render(
      <InfoCard header="Header" isSelected={false} onClick={vi.fn()} onContextMenu={onContextMenu}>
        <div>Body</div>
      </InfoCard>
    )

    await user.pointer({ keys: '[MouseRight]', target: screen.getByText('Body') })

    expect(onContextMenu).toHaveBeenCalledOnce()
  })

  it('renders a non-interactive wrapper when onClick is omitted', () => {
    render(
      <InfoCard header="Header" isSelected={false}>
        <div>Body</div>
      </InfoCard>
    )

    expect(screen.getByText('Header')).toBeInTheDocument()
  })
})
