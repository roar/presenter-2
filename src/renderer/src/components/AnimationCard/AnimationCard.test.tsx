import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { TargetedAnimation } from '@shared/model/types'
import { AnimationCard } from './AnimationCard'

function makeAnimation(overrides?: Partial<TargetedAnimation>): TargetedAnimation {
  return {
    id: 'anim-1',
    trigger: 'on-click',
    offset: 0,
    duration: 1,
    easing: { kind: 'cubic-bezier', x1: 0.645, y1: 0.045, x2: 0.355, y2: 1 },
    loop: { kind: 'none' },
    effect: { kind: 'action', type: 'move', fromOffset: { x: 0, y: 100 } },
    target: { kind: 'appearance', appearanceId: 'appearance-1' },
    ...overrides
  }
}

describe('AnimationCard', () => {
  it('renders the effect type as the header', () => {
    render(<AnimationCard animation={makeAnimation()} isSelected={false} />)

    expect(screen.getByText('Move')).toBeInTheDocument()
  })

  it('renders the general animation fields', () => {
    render(<AnimationCard animation={makeAnimation()} isSelected={false} />)

    expect(screen.getByText('Trigger')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /on click/i })).toBeInTheDocument()
    expect(screen.getByText('Delay')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Delay' })).toHaveValue('0.00')
    expect(screen.getByText('Duration')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Duration' })).toHaveValue('1.00')
    expect(screen.getByText('Easing')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /custom/i })).toBeInTheDocument()
  })

  it('passes selection state to the info card', () => {
    render(<AnimationCard animation={makeAnimation()} isSelected={true} />)

    expect(screen.getByText('Move').closest('[data-selected="true"]')).toHaveAttribute(
      'data-selected',
      'true'
    )
  })

  it('renders the trigger as a dropdown and reports changes', async () => {
    const user = userEvent.setup()
    const onTriggerChange = vi.fn()

    render(
      <AnimationCard
        animation={makeAnimation()}
        isSelected={false}
        onTriggerChange={onTriggerChange}
      />
    )

    await user.click(screen.getByRole('button', { name: /on click/i }))
    await user.click(screen.getByRole('menuitem', { name: 'After previous' }))

    expect(onTriggerChange).toHaveBeenCalledWith('after-previous')
  })

  it('commits delay and duration changes on blur', async () => {
    const user = userEvent.setup()
    const onOffsetChange = vi.fn()
    const onDurationChange = vi.fn()

    render(
      <AnimationCard
        animation={makeAnimation()}
        isSelected={false}
        onOffsetChange={onOffsetChange}
        onDurationChange={onDurationChange}
      />
    )

    const delayInput = screen.getByRole('textbox', { name: 'Delay' })
    await user.clear(delayInput)
    await user.type(delayInput, '1.5')
    await user.tab()

    const durationInput = screen.getByRole('textbox', { name: 'Duration' })
    await user.clear(durationInput)
    await user.type(durationInput, '2.25')
    await user.tab()

    expect(onOffsetChange).toHaveBeenCalledWith(1.5)
    expect(onDurationChange).toHaveBeenCalledWith(2.25)
  })

  it('renders easing as a dropdown and reports preset changes', async () => {
    const user = userEvent.setup()
    const onEasingChange = vi.fn()

    render(
      <AnimationCard
        animation={makeAnimation({ easing: 'linear' })}
        isSelected={false}
        onEasingChange={onEasingChange}
      />
    )

    await user.click(screen.getByRole('button', { name: /linear/i }))
    await user.click(screen.getByRole('menuitem', { name: 'Ease out' }))

    expect(onEasingChange).toHaveBeenCalledWith('ease-out')
  })
})
