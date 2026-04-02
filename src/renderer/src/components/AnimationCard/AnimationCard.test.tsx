import { render, screen } from '@testing-library/react'
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
    render(<AnimationCard animation={makeAnimation()} isSelected={false} onClick={vi.fn()} />)

    expect(screen.getByText('Move')).toBeInTheDocument()
  })

  it('renders the general animation fields', () => {
    render(<AnimationCard animation={makeAnimation()} isSelected={false} onClick={vi.fn()} />)

    expect(screen.getByText('Trigger')).toBeInTheDocument()
    expect(screen.getByText('On click')).toBeInTheDocument()
    expect(screen.getByText('Delay')).toBeInTheDocument()
    expect(screen.getByText('0s')).toBeInTheDocument()
    expect(screen.getByText('Duration')).toBeInTheDocument()
    expect(screen.getByText('1s')).toBeInTheDocument()
    expect(screen.getByText('Easing')).toBeInTheDocument()
    expect(screen.getByText('cubic-bezier(0.645, 0.045, 0.355, 1)')).toBeInTheDocument()
  })

  it('passes selection state to the info card', () => {
    render(<AnimationCard animation={makeAnimation()} isSelected={true} onClick={vi.fn()} />)

    expect(screen.getByRole('button')).toHaveAttribute('aria-current', 'true')
  })
})
