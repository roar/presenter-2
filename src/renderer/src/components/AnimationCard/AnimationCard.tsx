import React from 'react'
import type { Easing, TargetedAnimation } from '@shared/model/types'
import { InfoCard } from '../InfoCard/InfoCard'
import styles from './AnimationCard.module.css'

interface AnimationCardProps {
  animation: TargetedAnimation
  isSelected: boolean
  onClick: () => void
}

function formatEffectType(animation: TargetedAnimation): string {
  const effectType = animation.effect.type
  return effectType.charAt(0).toUpperCase() + effectType.slice(1)
}

function formatTrigger(trigger: TargetedAnimation['trigger']): string {
  if (trigger === 'on-click') return 'On click'
  if (trigger === 'after-previous') return 'After previous'
  return 'With previous'
}

function formatSeconds(value: number): string {
  return `${value}s`
}

function formatEasing(easing: Easing): string {
  if (typeof easing === 'string') return easing
  if (easing.kind === 'cubic-bezier') {
    return `cubic-bezier(${easing.x1}, ${easing.y1}, ${easing.x2}, ${easing.y2})`
  }
  return 'curve'
}

export function AnimationCard({
  animation,
  isSelected,
  onClick
}: AnimationCardProps): React.JSX.Element {
  return (
    <InfoCard header={formatEffectType(animation)} isSelected={isSelected} onClick={onClick}>
      <div className={styles.details}>
        <div className={styles.detail}>
          <span className={styles.label}>Trigger</span>
          <span className={styles.value}>{formatTrigger(animation.trigger)}</span>
        </div>
        <div className={styles.detail}>
          <span className={styles.label}>Delay</span>
          <span className={styles.value}>{formatSeconds(animation.offset)}</span>
        </div>
        <div className={styles.detail}>
          <span className={styles.label}>Duration</span>
          <span className={styles.value}>{formatSeconds(animation.duration)}</span>
        </div>
        <div className={styles.detail}>
          <span className={styles.label}>Easing</span>
          <span className={styles.value}>{formatEasing(animation.easing)}</span>
        </div>
      </div>
    </InfoCard>
  )
}
