import React from 'react'
import type { Easing, SlideTransition } from '@shared/model/types'
import { DropdownMenu } from '../DropdownMenu/DropdownMenu'
import { EasingBezierEditor } from '../EasingBezierEditor/EasingBezierEditor'
import { InfoCard } from '../InfoCard/InfoCard'
import { NumberInput } from '../NumberInput/NumberInput'
import styles from './SlideTransitionCard.module.css'

export type SlideTransitionTrigger = 'none' | 'on-click'

interface SlideTransitionCardProps {
  trigger: SlideTransitionTrigger
  transition?: SlideTransition
  onTriggerChange?: (trigger: SlideTransitionTrigger) => void
  onDurationChange?: (duration: number) => void
  onEasingChange?: (easing: Easing) => void
  onKindChange?: (kind: SlideTransition['kind']) => void
}

const DEFAULT_TRANSITION: SlideTransition = {
  kind: 'fade-through-color',
  duration: 0.5,
  easing: 'ease-in-out'
}

type EasingOptionValue = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'custom'

function getEffectiveTransition(transition?: SlideTransition): SlideTransition {
  return transition ?? DEFAULT_TRANSITION
}

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

export function SlideTransitionCard({
  trigger,
  transition,
  onTriggerChange,
  onDurationChange,
  onEasingChange,
  onKindChange
}: SlideTransitionCardProps): React.JSX.Element {
  const effectiveTransition = getEffectiveTransition(transition)

  return (
    <InfoCard header="Transition" isSelected={false}>
      <div className={styles.details}>
        <div className={styles.detail}>
          <span className={styles.label}>Trigger</span>
          <DropdownMenu
            value={trigger}
            options={[
              { value: 'none', label: 'None' },
              { value: 'on-click', label: 'On click' }
            ]}
            onChange={(value) => onTriggerChange?.(value)}
          />
        </div>
        <div className={styles.detail}>
          <span className={styles.label}>Duration</span>
          <NumberInput
            aria-label="Transition duration"
            value={effectiveTransition.duration}
            decimals={2}
            onCommit={(duration) => onDurationChange?.(duration)}
          />
        </div>
        <div className={styles.detail}>
          <span className={styles.label}>Easing</span>
          <DropdownMenu
            value={getEasingOptionValue(effectiveTransition.easing)}
            options={[
              { value: 'linear', label: 'Linear' },
              { value: 'ease-in', label: 'Ease in' },
              { value: 'ease-out', label: 'Ease out' },
              { value: 'ease-in-out', label: 'Ease in out' },
              { value: 'custom', label: 'Custom' }
            ]}
            onChange={(value) =>
              onEasingChange?.(mapEasingOptionValue(value, effectiveTransition.easing))
            }
          />
        </div>
        {typeof effectiveTransition.easing !== 'string' &&
        effectiveTransition.easing.kind === 'curve' ? (
          <div className={`${styles.detail} ${styles.editorDetail}`}>
            <span className={styles.label}>Curve</span>
            <EasingBezierEditor
              easing={effectiveTransition.easing}
              onChange={(easing) => onEasingChange?.(easing)}
            />
          </div>
        ) : null}
        <div className={styles.detail}>
          <span className={styles.label}>Kind</span>
          <DropdownMenu
            value={effectiveTransition.kind}
            options={[
              { value: 'fade-through-color', label: 'Fade' },
              { value: 'dissolve', label: 'Dissolve' },
              { value: 'push', label: 'Push' },
              { value: 'cut', label: 'Cut' }
            ]}
            onChange={(kind) => onKindChange?.(kind)}
          />
        </div>
      </div>
    </InfoCard>
  )
}
