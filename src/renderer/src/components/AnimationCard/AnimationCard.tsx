import React from 'react'
import type { Easing, Position, TargetedAnimation } from '@shared/model/types'
import { DropdownMenu } from '../DropdownMenu/DropdownMenu'
import { EasingBezierEditor } from '../EasingBezierEditor/EasingBezierEditor'
import { InfoCard } from '../InfoCard/InfoCard'
import { NumberInput } from '../NumberInput/NumberInput'
import styles from './AnimationCard.module.css'

interface AnimationCardProps {
  animation: TargetedAnimation
  objectName: string
  isSelected: boolean
  onClick?: () => void
  onTriggerChange?: (trigger: TargetedAnimation['trigger']) => void
  onOffsetChange?: (offset: number) => void
  onDurationChange?: (duration: number) => void
  onEasingChange?: (easing: Easing) => void
  onNumericToChange?: (value: number) => void
  onMoveDeltaChange?: (delta: Position) => void
}

function formatEffectType(animation: TargetedAnimation): string {
  const effectType = animation.effect.type
  return effectType.charAt(0).toUpperCase() + effectType.slice(1)
}

function getMoveDelta(effect: Extract<TargetedAnimation['effect'], { type: 'move' }>): Position {
  if ('delta' in effect) return effect.delta
  return effect.fromOffset
}

function formatAnimationToValue(animation: TargetedAnimation): string {
  const { effect } = animation

  switch (effect.type) {
    case 'fade':
      return `Opacity: ${effect.to}`
    case 'move':
      return `X: ${getMoveDelta(effect).x}, Y: ${getMoveDelta(effect).y}`
    case 'scale':
      return `Scale: ${effect.to}`
    case 'rotate':
      return `Rotation: ${effect.to}`
    case 'text-shadow':
      return `X: ${effect.to.offsetX}, Y: ${effect.to.offsetY}, Blur: ${effect.to.blur}`
    case 'line-draw':
      return 'Complete'
  }
}

type EasingOptionValue = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'custom'

function getEasingOptionValue(easing: Easing): EasingOptionValue {
  if (typeof easing === 'string') return easing
  return 'custom'
}

function mapEasingOptionValue(value: EasingOptionValue, current: Easing): Easing {
  if (value === 'custom') {
    if (typeof current === 'string') {
      return {
        kind: 'curve',
        points: [
          { x: 0, y: 0, kind: 'corner' },
          { x: 1, y: 1, kind: 'corner' }
        ]
      }
    }
    return current
  }
  return value
}

export function AnimationCard({
  animation,
  objectName,
  isSelected,
  onClick,
  onTriggerChange,
  onOffsetChange,
  onDurationChange,
  onEasingChange,
  onNumericToChange,
  onMoveDeltaChange
}: AnimationCardProps): React.JSX.Element {
  const moveDelta = animation.effect.type === 'move' ? getMoveDelta(animation.effect) : null

  const toField =
    animation.effect.type === 'fade' ||
    animation.effect.type === 'scale' ||
    animation.effect.type === 'rotate' ? (
      <NumberInput
        aria-label="To value"
        value={animation.effect.to}
        decimals={2}
        onCommit={(value) => onNumericToChange?.(value)}
      />
    ) : animation.effect.type === 'move' ? (
      <div className={styles.moveDeltaFields}>
        <div className={styles.moveDeltaField}>
          <span className={styles.subLabel}>X</span>
          <NumberInput
            aria-label="Move delta X"
            value={moveDelta!.x}
            decimals={2}
            onCommit={(x) => onMoveDeltaChange?.({ x, y: moveDelta!.y })}
          />
        </div>
        <div className={styles.moveDeltaField}>
          <span className={styles.subLabel}>Y</span>
          <NumberInput
            aria-label="Move delta Y"
            value={moveDelta!.y}
            decimals={2}
            onCommit={(y) => onMoveDeltaChange?.({ x: moveDelta!.x, y })}
          />
        </div>
      </div>
    ) : (
      <span className={styles.value}>{formatAnimationToValue(animation)}</span>
    )

  return (
    <InfoCard
      header={`${formatEffectType(animation)}: ${objectName}`}
      isSelected={isSelected}
      onClick={onClick}
    >
      <div className={styles.details}>
        <div className={styles.detail}>
          <span className={styles.label}>Trigger</span>
          <DropdownMenu
            value={animation.trigger}
            options={[
              { value: 'on-click', label: 'On click' },
              { value: 'after-previous', label: 'After previous' },
              { value: 'with-previous', label: 'With previous' }
            ]}
            onChange={(trigger) => onTriggerChange?.(trigger)}
          />
        </div>
        <div className={styles.detail}>
          <span className={styles.label}>Delay</span>
          <NumberInput
            aria-label="Delay"
            value={animation.offset}
            decimals={2}
            onCommit={(offset) => onOffsetChange?.(offset)}
          />
        </div>
        <div className={styles.detail}>
          <span className={styles.label}>Duration</span>
          <NumberInput
            aria-label="Duration"
            value={animation.duration}
            decimals={2}
            onCommit={(duration) => onDurationChange?.(duration)}
          />
        </div>
        <div className={styles.detail}>
          <span className={styles.label}>Easing</span>
          <DropdownMenu
            value={getEasingOptionValue(animation.easing)}
            options={[
              { value: 'linear', label: 'Linear' },
              { value: 'ease-in', label: 'Ease in' },
              { value: 'ease-out', label: 'Ease out' },
              { value: 'ease-in-out', label: 'Ease in out' },
              { value: 'custom', label: 'Custom' }
            ]}
            onChange={(value) => onEasingChange?.(mapEasingOptionValue(value, animation.easing))}
          />
        </div>
        {typeof animation.easing !== 'string' && animation.easing.kind === 'curve' ? (
          <div className={`${styles.detail} ${styles.editorDetail}`}>
            <span className={styles.label}>Curve</span>
            <EasingBezierEditor
              easing={animation.easing}
              onChange={(easing) => onEasingChange?.(easing)}
            />
          </div>
        ) : null}
        <div className={styles.detail}>
          <span className={styles.label}>To</span>
          {toField}
        </div>
      </div>
    </InfoCard>
  )
}
