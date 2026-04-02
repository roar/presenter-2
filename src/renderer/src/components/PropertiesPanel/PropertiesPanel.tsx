import React, { useMemo, useState } from 'react'
import type {
  AnimationId,
  AnimationTrigger,
  Easing,
  MsoMaster,
  Position,
  Presentation,
  Slide,
  SlideId,
  SlideTransition,
  TargetedAnimation
} from '@shared/model/types'
import { DropdownMenu } from '../DropdownMenu/DropdownMenu'
import { NumberInput } from '../NumberInput/NumberInput'
import { CollapsibleSection } from '../CollapsibleSection/CollapsibleSection'
import { PropertyCard } from '../PropertyCard/PropertyCard'
import { getMasterDisplayName } from '../../utils/getMasterDisplayName'
import styles from './PropertiesPanel.module.css'

type SlideTransitionTrigger = 'none' | 'on-click'

interface PropertiesPanelProps {
  document: Presentation | null
  selectedSlide: Slide | null
  selectedSlideIndex: number
  selectedMaster: MsoMaster | null
  selectedAnimation: TargetedAnimation | null
  selectedAnimationObjectName: string
  onAnimationTriggerChange?: (animationId: AnimationId, trigger: AnimationTrigger) => void
  onAnimationOffsetChange?: (animationId: AnimationId, offset: number) => void
  onAnimationDurationChange?: (animationId: AnimationId, duration: number) => void
  onAnimationEasingChange?: (animationId: AnimationId, easing: Easing) => void
  onAnimationNumericToChange?: (animationId: AnimationId, value: number) => void
  onAnimationMoveDeltaChange?: (animationId: AnimationId, delta: Position) => void
  onSlideTransitionTriggerChange?: (slideId: SlideId, trigger: SlideTransitionTrigger) => void
  onSlideTransitionDurationChange?: (slideId: SlideId, duration: number) => void
  onSlideTransitionEasingChange?: (slideId: SlideId, easing: Easing) => void
  onSlideTransitionKindChange?: (slideId: SlideId, kind: SlideTransition['kind']) => void
}

interface SectionDefinition {
  id: string
  title: string
  content: React.ReactNode
}

const DEFAULT_TRANSITION: SlideTransition = {
  kind: 'fade-through-color',
  duration: 0.5,
  easing: 'ease-in-out'
}

type EasingOptionValue = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'custom'

function getEasingOptionValue(easing: Easing): EasingOptionValue {
  return typeof easing === 'string' ? easing : 'custom'
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

function getMoveDelta(effect: Extract<TargetedAnimation['effect'], { type: 'move' }>): Position {
  if ('delta' in effect) return effect.delta
  return effect.fromOffset
}

function formatValue(value: string | number | boolean | undefined | null): string {
  if (value == null || value === '') return 'None'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return Number.isInteger(value) ? `${value}` : value.toFixed(2)
  return value
}

function formatAnimationType(animation: TargetedAnimation): string {
  const { type } = animation.effect
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function buildPresentationSection(document: Presentation): SectionDefinition {
  return {
    id: 'presentation',
    title: 'Presentation',
    content: (
      <>
        <PropertyCard title="Presentation">
          <div className={styles.cardRows}>
            <PropertyRow label="Title" value={document.title} />
            <PropertyRow label="Slides" value={document.slideOrder.length} />
            <PropertyRow label="Published" value={document.isPublished} />
          </div>
        </PropertyCard>
      </>
    )
  }
}

function buildSlideSection(
  slide: Slide,
  slideIndex: number,
  onTriggerChange?: (slideId: SlideId, trigger: SlideTransitionTrigger) => void,
  onDurationChange?: (slideId: SlideId, duration: number) => void,
  onEasingChange?: (slideId: SlideId, easing: Easing) => void,
  onKindChange?: (slideId: SlideId, kind: SlideTransition['kind']) => void
): SectionDefinition {
  const transition = slide.transition ?? DEFAULT_TRANSITION
  const trigger: SlideTransitionTrigger = slide.transitionTriggerId ? 'on-click' : 'none'

  return {
    id: 'slide',
    title: 'Slide',
    content: (
      <>
        <PropertyCard title="Slide">
          <div className={styles.cardRows}>
            <PropertyRow label="Number" value={slideIndex + 1} />
            <PropertyRow label="Objects" value={slide.appearanceIds.length} />
            <PropertyRow label="Animations" value={slide.animationOrder.length} />
          </div>
        </PropertyCard>
        <PropertyCard title="Background">
          <div className={styles.cardRows}>
            <PropertyRow label="Color" value={slide.background.color} />
            <PropertyRow label="Image" value={slide.background.image} />
          </div>
        </PropertyCard>
        <PropertyCard title="Transition">
          <div className={styles.controlGrid}>
            <div className={styles.control}>
              <span className={styles.controlLabel}>Trigger</span>
              <DropdownMenu
                value={trigger}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'on-click', label: 'On click' }
                ]}
                onChange={(value) => onTriggerChange?.(slide.id, value)}
              />
            </div>
            <div className={styles.control}>
              <span className={styles.controlLabel}>Duration</span>
              <NumberInput
                aria-label="Slide transition duration"
                value={transition.duration}
                decimals={2}
                onCommit={(value) => onDurationChange?.(slide.id, value)}
              />
            </div>
            <div className={styles.control}>
              <span className={styles.controlLabel}>Easing</span>
              <DropdownMenu
                value={getEasingOptionValue(transition.easing)}
                options={[
                  { value: 'linear', label: 'Linear' },
                  { value: 'ease-in', label: 'Ease in' },
                  { value: 'ease-out', label: 'Ease out' },
                  { value: 'ease-in-out', label: 'Ease in out' },
                  { value: 'custom', label: 'Custom' }
                ]}
                onChange={(value) =>
                  onEasingChange?.(slide.id, mapEasingOptionValue(value, transition.easing))
                }
              />
            </div>
            <div className={styles.control}>
              <span className={styles.controlLabel}>Kind</span>
              <DropdownMenu
                value={transition.kind}
                options={[
                  { value: 'fade-through-color', label: 'Fade' },
                  { value: 'dissolve', label: 'Dissolve' },
                  { value: 'push', label: 'Push' },
                  { value: 'cut', label: 'Cut' }
                ]}
                onChange={(value) => onKindChange?.(slide.id, value)}
              />
            </div>
          </div>
        </PropertyCard>
      </>
    )
  }
}

function buildAnimationSection(
  animation: TargetedAnimation,
  objectName: string,
  onTriggerChange?: (animationId: AnimationId, trigger: AnimationTrigger) => void,
  onOffsetChange?: (animationId: AnimationId, offset: number) => void,
  onDurationChange?: (animationId: AnimationId, duration: number) => void,
  onEasingChange?: (animationId: AnimationId, easing: Easing) => void,
  onNumericToChange?: (animationId: AnimationId, value: number) => void,
  onMoveDeltaChange?: (animationId: AnimationId, delta: Position) => void
): SectionDefinition {
  const moveDelta = animation.effect.type === 'move' ? getMoveDelta(animation.effect) : null

  return {
    id: 'animation',
    title: 'Animation',
    content: (
      <>
        <PropertyCard title="Animation">
          <div className={styles.cardRows}>
            <PropertyRow label="Name" value={`${formatAnimationType(animation)}: ${objectName}`} />
            <PropertyRow label="Target" value={objectName} />
          </div>
        </PropertyCard>
        <PropertyCard title="Timing">
          <div className={styles.controlGrid}>
            <div className={styles.control}>
              <span className={styles.controlLabel}>Trigger</span>
              <DropdownMenu
                value={animation.trigger}
                options={[
                  { value: 'on-click', label: 'On click' },
                  { value: 'after-previous', label: 'After previous' },
                  { value: 'with-previous', label: 'With previous' }
                ]}
                onChange={(value) => onTriggerChange?.(animation.id, value)}
              />
            </div>
            <div className={styles.control}>
              <span className={styles.controlLabel}>Delay</span>
              <NumberInput
                aria-label="Animation delay"
                value={animation.offset}
                decimals={2}
                onCommit={(value) => onOffsetChange?.(animation.id, value)}
              />
            </div>
            <div className={styles.control}>
              <span className={styles.controlLabel}>Duration</span>
              <NumberInput
                aria-label="Animation duration"
                value={animation.duration}
                decimals={2}
                onCommit={(value) => onDurationChange?.(animation.id, value)}
              />
            </div>
            <div className={styles.control}>
              <span className={styles.controlLabel}>Easing</span>
              <DropdownMenu
                value={getEasingOptionValue(animation.easing)}
                options={[
                  { value: 'linear', label: 'Linear' },
                  { value: 'ease-in', label: 'Ease in' },
                  { value: 'ease-out', label: 'Ease out' },
                  { value: 'ease-in-out', label: 'Ease in out' },
                  { value: 'custom', label: 'Custom' }
                ]}
                onChange={(value) =>
                  onEasingChange?.(animation.id, mapEasingOptionValue(value, animation.easing))
                }
              />
            </div>
          </div>
        </PropertyCard>
        <PropertyCard title="Effect">
          <div className={styles.cardRows}>
            <PropertyRow label="Type" value={formatAnimationType(animation)} />
            {animation.effect.type === 'fade' || animation.effect.type === 'scale' ? (
              <div className={styles.control}>
                <span className={styles.controlLabel}>To</span>
                <NumberInput
                  aria-label="Animation effect target"
                  value={animation.effect.to}
                  decimals={2}
                  onCommit={(value) => onNumericToChange?.(animation.id, value)}
                />
              </div>
            ) : null}
            {animation.effect.type === 'move' && moveDelta ? (
              <div className={styles.moveGrid}>
                <div className={styles.control}>
                  <span className={styles.controlLabel}>Delta X</span>
                  <NumberInput
                    aria-label="Animation move delta x"
                    value={moveDelta.x}
                    decimals={2}
                    onCommit={(x) => onMoveDeltaChange?.(animation.id, { x, y: moveDelta.y })}
                  />
                </div>
                <div className={styles.control}>
                  <span className={styles.controlLabel}>Delta Y</span>
                  <NumberInput
                    aria-label="Animation move delta y"
                    value={moveDelta.y}
                    decimals={2}
                    onCommit={(y) => onMoveDeltaChange?.(animation.id, { x: moveDelta.x, y })}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </PropertyCard>
      </>
    )
  }
}

function buildObjectSection(master: MsoMaster): SectionDefinition {
  const objectStyle = master.objectStyle.defaultState
  const textStyle = master.textStyle?.defaultState

  return {
    id: 'object',
    title: 'Object',
    content: (
      <>
        <PropertyCard title="Object">
          <div className={styles.cardRows}>
            <PropertyRow label="Name" value={getMasterDisplayName(master)} />
            <PropertyRow label="Type" value={master.type} />
            <PropertyRow label="Multi-slide" value={master.isMultiSlideObject ?? false} />
          </div>
        </PropertyCard>
        <PropertyCard title="Transform">
          <div className={styles.cardRows}>
            <PropertyRow label="X" value={master.transform.x} />
            <PropertyRow label="Y" value={master.transform.y} />
            <PropertyRow label="Width" value={master.transform.width} />
            <PropertyRow label="Height" value={master.transform.height} />
            <PropertyRow label="Rotation" value={master.transform.rotation} />
          </div>
        </PropertyCard>
        <PropertyCard title="Fill">
          <div className={styles.cardRows}>
            <PropertyRow label="Color" value={objectStyle.fill} />
            <PropertyRow label="Opacity" value={objectStyle.opacity} />
          </div>
        </PropertyCard>
        <PropertyCard title="Stroke">
          <div className={styles.cardRows}>
            <PropertyRow label="Color" value={objectStyle.stroke} />
            <PropertyRow label="Width" value={objectStyle.strokeWidth} />
          </div>
        </PropertyCard>
        {textStyle ? (
          <PropertyCard title="Typography">
            <div className={styles.cardRows}>
              <PropertyRow label="Font" value={textStyle.fontFamily} />
              <PropertyRow label="Size" value={textStyle.fontSize} />
              <PropertyRow label="Weight" value={textStyle.fontWeight} />
              <PropertyRow label="Color" value={textStyle.color} />
            </div>
          </PropertyCard>
        ) : null}
      </>
    )
  }
}

function PropertyRow({
  label,
  value
}: {
  label: string
  value: string | number | boolean | undefined | null
}) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{formatValue(value)}</span>
    </div>
  )
}

export function PropertiesPanel({
  document,
  selectedSlide,
  selectedSlideIndex,
  selectedMaster,
  selectedAnimation,
  selectedAnimationObjectName,
  onAnimationTriggerChange,
  onAnimationOffsetChange,
  onAnimationDurationChange,
  onAnimationEasingChange,
  onAnimationNumericToChange,
  onAnimationMoveDeltaChange,
  onSlideTransitionTriggerChange,
  onSlideTransitionDurationChange,
  onSlideTransitionEasingChange,
  onSlideTransitionKindChange
}: PropertiesPanelProps): React.JSX.Element {
  const selectionKey = selectedAnimation
    ? `animation:${selectedAnimation.id}`
    : selectedMaster
      ? `object:${selectedMaster.id}`
      : selectedSlide
        ? `slide:${selectedSlide.id}`
        : document
          ? `presentation:${document.id}`
          : 'none'
  const sections = useMemo(() => {
    const nextSections: SectionDefinition[] = []

    if (document) {
      nextSections.push(buildPresentationSection(document))
    }
    if (selectedSlide) {
      nextSections.push(
        buildSlideSection(
          selectedSlide,
          selectedSlideIndex,
          onSlideTransitionTriggerChange,
          onSlideTransitionDurationChange,
          onSlideTransitionEasingChange,
          onSlideTransitionKindChange
        )
      )
    }
    if (selectedAnimation) {
      nextSections.push(
        buildAnimationSection(
          selectedAnimation,
          selectedAnimationObjectName,
          onAnimationTriggerChange,
          onAnimationOffsetChange,
          onAnimationDurationChange,
          onAnimationEasingChange,
          onAnimationNumericToChange,
          onAnimationMoveDeltaChange
        )
      )
    } else if (selectedMaster) {
      nextSections.push(buildObjectSection(selectedMaster))
    }

    return nextSections
  }, [
    document,
    onAnimationDurationChange,
    onAnimationEasingChange,
    onAnimationMoveDeltaChange,
    onAnimationNumericToChange,
    onAnimationOffsetChange,
    onAnimationTriggerChange,
    onSlideTransitionDurationChange,
    onSlideTransitionEasingChange,
    onSlideTransitionKindChange,
    onSlideTransitionTriggerChange,
    selectedAnimation,
    selectedAnimationObjectName,
    selectedMaster,
    selectedSlide,
    selectedSlideIndex
  ])

  const defaultOpenSectionId = selectedAnimation
    ? 'animation'
    : selectedMaster
      ? 'object'
      : selectedSlide
        ? 'slide'
        : 'presentation'
  const [openState, setOpenState] = useState(() => ({
    selectionKey,
    sectionId: defaultOpenSectionId
  }))
  const hasOpenSection = sections.some((section) => section.id === openState.sectionId)
  const openSectionId =
    openState.selectionKey !== selectionKey || !hasOpenSection
      ? defaultOpenSectionId
      : openState.sectionId

  return (
    <div className={styles.root}>
      {sections.map((section) => (
        <CollapsibleSection
          key={section.id}
          title={section.title}
          isOpen={openSectionId === section.id}
          onToggle={() =>
            setOpenState({
              selectionKey,
              sectionId: section.id
            })
          }
        >
          {section.content}
        </CollapsibleSection>
      ))}
    </div>
  )
}
