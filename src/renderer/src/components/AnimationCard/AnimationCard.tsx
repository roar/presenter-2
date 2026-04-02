import React from 'react'
import type { Easing, TargetedAnimation } from '@shared/model/types'
import { DropdownMenu } from '../DropdownMenu/DropdownMenu'
import { InfoCard } from '../InfoCard/InfoCard'
import { NumberInput } from '../NumberInput/NumberInput'
import styles from './AnimationCard.module.css'

interface AnimationCardProps {
  animation: TargetedAnimation
  isSelected: boolean
  onClick?: () => void
  onTriggerChange?: (trigger: TargetedAnimation['trigger']) => void
  onOffsetChange?: (offset: number) => void
  onDurationChange?: (duration: number) => void
  onEasingChange?: (easing: Easing) => void
}

function formatEffectType(animation: TargetedAnimation): string {
  const effectType = animation.effect.type
  return effectType.charAt(0).toUpperCase() + effectType.slice(1)
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
  isSelected,
  onClick,
  onTriggerChange,
  onOffsetChange,
  onDurationChange,
  onEasingChange
}: AnimationCardProps): React.JSX.Element {
  return (
    <InfoCard header={formatEffectType(animation)} isSelected={isSelected} onClick={onClick}>
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
      </div>
    </InfoCard>
  )
}
