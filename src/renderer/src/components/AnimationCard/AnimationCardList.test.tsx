import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { TargetedAnimation } from '@shared/model/types'
import { AnimationCardList } from './AnimationCardList'

function makeAnimation(id: string, name: string): TargetedAnimation {
  return {
    id,
    trigger: 'on-click',
    offset: 0,
    duration: 1,
    easing: 'linear',
    loop: { kind: 'none' },
    effect: { kind: 'action', type: 'move', delta: { x: 0, y: 100 } },
    target: { kind: 'appearance', appearanceId: name }
  }
}

describe('AnimationCardList', () => {
  it('reorders cards when one card is dropped on another', () => {
    const onMoveAnimation = vi.fn()
    const animations = [makeAnimation('anim-1', 'one'), makeAnimation('anim-2', 'two')]

    render(
      <AnimationCardList
        slideId="slide-1"
        animations={animations}
        selectedAnimationId={null}
        getObjectName={(animation) => animation.target.appearanceId}
        onSelect={vi.fn()}
        onMoveAnimation={onMoveAnimation}
        onTriggerChange={vi.fn()}
        onOffsetChange={vi.fn()}
        onDurationChange={vi.fn()}
        onEasingChange={vi.fn()}
        onNumericToChange={vi.fn()}
        onMoveDeltaChange={vi.fn()}
      />
    )

    fireEvent.dragStart(screen.getByTestId('animation-card-item-anim-1'))
    fireEvent.dragOver(screen.getByTestId('animation-card-item-anim-2'))
    fireEvent.drop(screen.getByTestId('animation-card-item-anim-2'))

    expect(onMoveAnimation).toHaveBeenCalledWith(0, 1)
  })

  it('marks on-click cards after the first as group starts', () => {
    const animations = [
      makeAnimation('anim-1', 'one'),
      makeAnimation('anim-2', 'two'),
      { ...makeAnimation('anim-3', 'three'), trigger: 'with-previous' as const },
      makeAnimation('anim-4', 'four')
    ]

    render(
      <AnimationCardList
        slideId="slide-1"
        animations={animations}
        selectedAnimationId={null}
        getObjectName={(animation) => animation.target.appearanceId}
        onSelect={vi.fn()}
        onMoveAnimation={vi.fn()}
        onTriggerChange={vi.fn()}
        onOffsetChange={vi.fn()}
        onDurationChange={vi.fn()}
        onEasingChange={vi.fn()}
        onNumericToChange={vi.fn()}
        onMoveDeltaChange={vi.fn()}
      />
    )

    expect(screen.getByTestId('animation-card-item-anim-1')).not.toHaveAttribute('data-group-start')
    expect(screen.getByTestId('animation-card-item-anim-2')).toHaveAttribute(
      'data-group-start',
      'true'
    )
    expect(screen.getByTestId('animation-card-item-anim-3')).not.toHaveAttribute('data-group-start')
    expect(screen.getByTestId('animation-card-item-anim-4')).toHaveAttribute(
      'data-group-start',
      'true'
    )
  })

  it('labels continuation rows by trigger type', () => {
    const animations = [
      makeAnimation('anim-1', 'one'),
      { ...makeAnimation('anim-2', 'two'), trigger: 'with-previous' as const },
      { ...makeAnimation('anim-3', 'three'), trigger: 'after-previous' as const }
    ]

    render(
      <AnimationCardList
        slideId="slide-1"
        animations={animations}
        selectedAnimationId={null}
        getObjectName={(animation) => animation.target.appearanceId}
        onSelect={vi.fn()}
        onMoveAnimation={vi.fn()}
        onTriggerChange={vi.fn()}
        onOffsetChange={vi.fn()}
        onDurationChange={vi.fn()}
        onEasingChange={vi.fn()}
        onNumericToChange={vi.fn()}
        onMoveDeltaChange={vi.fn()}
      />
    )

    expect(screen.getByTestId('animation-card-item-anim-2')).toHaveAttribute(
      'data-trigger',
      'with-previous'
    )
    expect(screen.getByTestId('animation-card-item-anim-3')).toHaveAttribute(
      'data-trigger',
      'after-previous'
    )
  })
})
