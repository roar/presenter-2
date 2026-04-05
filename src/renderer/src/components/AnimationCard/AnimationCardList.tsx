import React, { useState } from 'react'
import type { Easing, Position, SlideId, TargetedAnimation } from '@shared/model/types'
import { AnimationCard } from './AnimationCard'
import styles from './AnimationCardList.module.css'

interface AnimationCardListProps {
  slideId: SlideId
  animations: TargetedAnimation[]
  selectedAnimationId: string | null
  getObjectName(animation: TargetedAnimation): string
  onSelect(animationId: string): void
  onMoveAnimation(fromIndex: number, toIndex: number): void
  onTriggerChange(animationId: string, trigger: TargetedAnimation['trigger']): void
  onOffsetChange(animationId: string, offset: number): void
  onDurationChange(animationId: string, duration: number): void
  onEasingChange(animationId: string, easing: Easing): void
  onNumericToChange(animationId: string, value: number): void
  onMoveDeltaChange(animationId: string, delta: Position): void
}

export function AnimationCardList({
  slideId,
  animations,
  selectedAnimationId,
  getObjectName,
  onSelect,
  onMoveAnimation,
  onTriggerChange,
  onOffsetChange,
  onDurationChange,
  onEasingChange,
  onNumericToChange,
  onMoveDeltaChange
}: AnimationCardListProps): React.JSX.Element {
  const [draggedAnimationId, setDraggedAnimationId] = useState<string | null>(null)

  return (
    <div aria-label={`Animation cards for ${slideId}`} className={styles.list}>
      {animations.map((animation, index) => {
        const isGroupStart = index > 0 && animation.trigger === 'on-click'
        const itemClassName = [
          styles.item,
          isGroupStart ? styles.groupStart : null,
          animation.trigger === 'with-previous' ? styles.withPrevious : null,
          animation.trigger === 'after-previous' ? styles.afterPrevious : null
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <div
            key={animation.id}
            draggable
            data-testid={`animation-card-item-${animation.id}`}
            data-trigger={animation.trigger}
            data-group-start={isGroupStart ? 'true' : undefined}
            className={itemClassName}
            onDragStart={() => setDraggedAnimationId(animation.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              if (!draggedAnimationId || draggedAnimationId === animation.id) {
                setDraggedAnimationId(null)
                return
              }

              const fromIndex = animations.findIndex((item) => item.id === draggedAnimationId)
              if (fromIndex === -1 || fromIndex === index) {
                setDraggedAnimationId(null)
                return
              }

              onMoveAnimation(fromIndex, index)
              setDraggedAnimationId(null)
            }}
            onDragEnd={() => setDraggedAnimationId(null)}
          >
            <AnimationCard
              animation={animation}
              objectName={getObjectName(animation)}
              isSelected={selectedAnimationId === animation.id}
              onClick={() => onSelect(animation.id)}
              onTriggerChange={(trigger) => onTriggerChange(animation.id, trigger)}
              onOffsetChange={(offset) => onOffsetChange(animation.id, offset)}
              onDurationChange={(duration) => onDurationChange(animation.id, duration)}
              onEasingChange={(easing) => onEasingChange(animation.id, easing)}
              onNumericToChange={(value) => onNumericToChange(animation.id, value)}
              onMoveDeltaChange={(delta) => onMoveDeltaChange(animation.id, delta)}
            />
          </div>
        )
      })}
    </div>
  )
}
