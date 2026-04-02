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
    effect: { kind: 'action', type: 'move', delta: { x: 0, y: 100 } },
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

  it('renders the animation-specific To value for move effects', () => {
    render(<AnimationCard animation={makeAnimation()} isSelected={false} />)

    expect(screen.getByText('To')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Move delta X' })).toHaveValue('0.00')
    expect(screen.getByRole('textbox', { name: 'Move delta Y' })).toHaveValue('100.00')
  })

  it('renders the animation-specific To value for scale effects', () => {
    render(
      <AnimationCard
        animation={makeAnimation({ effect: { kind: 'action', type: 'scale', to: 1.5 } })}
        isSelected={false}
      />
    )

    expect(screen.getByRole('textbox', { name: 'To value' })).toHaveValue('1.50')
  })

  it('renders a number input for numeric To values and reports changes on blur', async () => {
    const user = userEvent.setup()
    const onNumericToChange = vi.fn()

    render(
      <AnimationCard
        animation={makeAnimation({ effect: { kind: 'action', type: 'scale', to: 1.5 } })}
        isSelected={false}
        onNumericToChange={onNumericToChange}
      />
    )

    const input = screen.getByRole('textbox', { name: 'To value' })
    expect(input).toHaveValue('1.50')

    await user.clear(input)
    await user.type(input, '2.25')
    await user.tab()

    expect(onNumericToChange).toHaveBeenCalledWith(2.25)
  })

  it('reports move delta changes on blur', async () => {
    const user = userEvent.setup()
    const onMoveDeltaChange = vi.fn()

    render(
      <AnimationCard
        animation={makeAnimation()}
        isSelected={false}
        onMoveDeltaChange={onMoveDeltaChange}
      />
    )

    const xInput = screen.getByRole('textbox', { name: 'Move delta X' })
    await user.clear(xInput)
    await user.type(xInput, '42')
    await user.tab()

    const yInput = screen.getByRole('textbox', { name: 'Move delta Y' })
    await user.clear(yInput)
    await user.type(yInput, '84')
    await user.tab()

    expect(onMoveDeltaChange).toHaveBeenNthCalledWith(1, { x: 42, y: 100 })
    expect(onMoveDeltaChange).toHaveBeenNthCalledWith(2, { x: 0, y: 84 })
  })

  it('supports legacy move animations stored with fromOffset', () => {
    render(
      <AnimationCard
        animation={makeAnimation({
          effect: { kind: 'action', type: 'move', fromOffset: { x: 12, y: 34 } } as never
        })}
        isSelected={false}
      />
    )

    expect(screen.getByRole('textbox', { name: 'Move delta X' })).toHaveValue('12.00')
    expect(screen.getByRole('textbox', { name: 'Move delta Y' })).toHaveValue('34.00')
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
