import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SlideTransition } from '@shared/model/types'
import { SlideTransitionCard } from './SlideTransitionCard'

function makeTransition(overrides?: Partial<SlideTransition>): SlideTransition {
  return {
    kind: 'fade-through-color',
    duration: 0.5,
    easing: 'ease-in-out',
    ...overrides
  }
}

describe('SlideTransitionCard', () => {
  it('renders the general transition fields', () => {
    render(<SlideTransitionCard trigger="on-click" transition={makeTransition()} />)

    expect(screen.getByText('Transition')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'On click' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Transition duration' })).toHaveValue('0.50')
    expect(screen.getByRole('button', { name: 'Ease in out' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fade' })).toBeInTheDocument()
  })

  it('uses the default transition values when none are stored yet', () => {
    render(<SlideTransitionCard trigger="none" />)

    expect(screen.getByRole('button', { name: 'None' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Transition duration' })).toHaveValue('0.50')
    expect(screen.getByRole('button', { name: 'Ease in out' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fade' })).toBeInTheDocument()
  })

  it('reports trigger changes', async () => {
    const user = userEvent.setup()
    const onTriggerChange = vi.fn()

    render(
      <SlideTransitionCard
        trigger="none"
        transition={makeTransition()}
        onTriggerChange={onTriggerChange}
      />
    )

    await user.click(screen.getByRole('button', { name: 'None' }))
    await user.click(screen.getByRole('menuitem', { name: 'On click' }))

    expect(onTriggerChange).toHaveBeenCalledWith('on-click')
  })

  it('reports duration changes on blur', async () => {
    const user = userEvent.setup()
    const onDurationChange = vi.fn()

    render(
      <SlideTransitionCard
        trigger="on-click"
        transition={makeTransition()}
        onDurationChange={onDurationChange}
      />
    )

    const input = screen.getByRole('textbox', { name: 'Transition duration' })
    await user.clear(input)
    await user.type(input, '1.25')
    await user.tab()

    expect(onDurationChange).toHaveBeenCalledWith(1.25)
  })

  it('reports easing and kind changes', async () => {
    const user = userEvent.setup()
    const onEasingChange = vi.fn()
    const onKindChange = vi.fn()

    render(
      <SlideTransitionCard
        trigger="on-click"
        transition={makeTransition()}
        onEasingChange={onEasingChange}
        onKindChange={onKindChange}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Fade' }))
    await user.click(screen.getByRole('menuitem', { name: 'Dissolve' }))
    await user.click(screen.getByRole('button', { name: 'Ease in out' }))
    await user.click(screen.getByRole('menuitem', { name: 'Ease out' }))

    expect(onKindChange).toHaveBeenCalledWith('dissolve')
    expect(onEasingChange).toHaveBeenCalledWith('ease-out')
  })

  it('renders the custom easing editor for curve easing', () => {
    render(
      <SlideTransitionCard
        trigger="on-click"
        transition={{
          ...makeTransition(),
          easing: {
            kind: 'curve',
            points: [
              { x: 0, y: 0, kind: 'corner' },
              { x: 1, y: 1, kind: 'corner' }
            ]
          }
        }}
      />
    )

    expect(screen.getByLabelText('Custom easing curve')).toBeInTheDocument()
  })
})
