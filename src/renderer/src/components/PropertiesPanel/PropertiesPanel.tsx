import React, { useMemo, useState } from 'react'
import type {
  AnimationId,
  AnimationTrigger,
  Color,
  ColorConstant,
  ColorConstantId,
  Easing,
  MsoMaster,
  Position,
  Presentation,
  Slide,
  SlideId,
  SlideTransition,
  TargetedAnimation
} from '@shared/model/types'
import { getColorConstantUsageCount, resolveColorValue } from '@shared/model/colors'
import { Button } from '../Button/Button'
import { ColorField } from '../ColorField/ColorField'
import { DropdownMenu } from '../DropdownMenu/DropdownMenu'
import { NumberInput } from '../NumberInput/NumberInput'
import { CollapsibleSection } from '../CollapsibleSection/CollapsibleSection'
import { PropertyCard } from '../PropertyCard/PropertyCard'
import { Tabs } from '../Tabs/Tabs'
import { TextInput } from '../TextInput/TextInput'
import { getMasterDisplayName } from '../../utils/getMasterDisplayName'
import styles from './PropertiesPanel.module.css'

type SlideTransitionTrigger = 'none' | 'on-click'
type InspectorTab = 'properties' | 'text' | 'object' | 'colors'

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
  onAddColorConstant?: () => void
  onNameColorConstant?: (value: string, name: string) => ColorConstantId | null
  onColorConstantNameChange?: (colorId: ColorConstantId, name: string) => void
  onColorConstantValueChange?: (colorId: ColorConstantId, value: string) => void
  onDeleteColorConstant?: (colorId: ColorConstantId) => void
  onSlideBackgroundColorChange?: (slideId: SlideId, color: Color | undefined) => void
  onObjectFillChange?: (masterId: string, color: Color | undefined) => void
  onObjectStrokeChange?: (masterId: string, color: Color | undefined) => void
  onTextColorChange?: (masterId: string, color: Color | undefined) => void
  onTextShadowColorChange?: (masterId: string, color: Color | undefined) => void
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

function ReadOnlyNumberField({
  label,
  value,
  ariaLabel
}: {
  label: string
  value: number
  ariaLabel: string
}): React.JSX.Element {
  return (
    <label className={styles.transformField}>
      <span className={styles.transformFieldLabel}>{label}</span>
      <NumberInput
        aria-label={ariaLabel}
        value={value}
        decimals={0}
        readOnly={true}
        onCommit={() => {}}
      />
    </label>
  )
}

function ColorConstantRow({
  colorConstant,
  usageCount,
  onNameChange,
  onValueChange,
  onDelete
}: {
  colorConstant: ColorConstant
  usageCount: number
  onNameChange?: (name: string) => void
  onValueChange?: (value: string) => void
  onDelete?: () => void
}): React.JSX.Element {
  const [nameDraft, setNameDraft] = useState(colorConstant.name)

  React.useEffect(() => {
    setNameDraft(colorConstant.name)
  }, [colorConstant.name])

  return (
    <div className={styles.colorEditorRow}>
      <div className={styles.colorIdentity}>
        <TextInput
          aria-label={`${colorConstant.name} name`}
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          onBlur={() => onNameChange?.(nameDraft)}
        />
        <span className={styles.colorUsage}>{usageCount ? `Used ${usageCount}` : 'Unused'}</span>
      </div>
      <div className={styles.colorValueEditor}>
        <input
          aria-label={`${colorConstant.name} color value`}
          className={styles.colorPickerLarge}
          type="color"
          value={colorConstant.value}
          onChange={(event) => onValueChange?.(event.target.value)}
        />
        <span className={styles.colorHex}>{colorConstant.value}</span>
      </div>
      <Button variant="secondary" onClick={() => onDelete?.()}>
        Delete
      </Button>
    </div>
  )
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
  document: Presentation | null,
  slide: Slide,
  slideIndex: number,
  colorConstants: ColorConstant[],
  onTriggerChange?: (slideId: SlideId, trigger: SlideTransitionTrigger) => void,
  onDurationChange?: (slideId: SlideId, duration: number) => void,
  onEasingChange?: (slideId: SlideId, easing: Easing) => void,
  onKindChange?: (slideId: SlideId, kind: SlideTransition['kind']) => void,
  onBackgroundColorChange?: (slideId: SlideId, color: Color | undefined) => void,
  onNameColorConstant?: (value: string, name: string) => ColorConstantId | null
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
          <div className={styles.control}>
            <ColorField
              label="Color"
              color={slide.background.color}
              colorConstants={colorConstants}
              onChange={(color) => onBackgroundColorChange?.(slide.id, color)}
              onNameColor={onNameColorConstant}
            />
          </div>
          <div className={styles.cardRows}>
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
      </>
    )
  }
}

function buildObjectStyleSection(
  master: MsoMaster,
  document: Presentation | null,
  colorConstants: ColorConstant[],
  onFillChange?: (masterId: string, color: Color | undefined) => void,
  onStrokeChange?: (masterId: string, color: Color | undefined) => void,
  onNameColorConstant?: (value: string, name: string) => ColorConstantId | null
): SectionDefinition {
  const objectStyle = master.objectStyle.defaultState

  return {
    id: 'object-style',
    title: 'Object',
    content: (
      <>
        <PropertyCard title="Transform">
          <div className={styles.transformLayout}>
            <div className={styles.transformGrid}>
              <ReadOnlyNumberField label="X" value={master.transform.x} ariaLabel="Transform x" />
              <ReadOnlyNumberField label="Y" value={master.transform.y} ariaLabel="Transform y" />
              <ReadOnlyNumberField
                label="Width"
                value={master.transform.width}
                ariaLabel="Transform width"
              />
              <ReadOnlyNumberField
                label="Height"
                value={master.transform.height}
                ariaLabel="Transform height"
              />
            </div>
            <div className={styles.keepRatioRow}>
              <span className={styles.keepRatioLabel}>Keep Ratio</span>
              <button
                type="button"
                className={styles.keepRatioToggle}
                aria-pressed="true"
                aria-label="Keep ratio enabled"
              >
                <span className={styles.keepRatioCheck}>✓</span>
              </button>
            </div>
            <div className={styles.rotationSection}>
              <span className={styles.transformFieldLabel}>Rotation</span>
              <div className={styles.rotationRow}>
                <div className={styles.rotationDial} aria-hidden="true">
                  <span className={styles.rotationArrow}>↑</span>
                </div>
                <div className={styles.rotationInput}>
                  <NumberInput
                    aria-label="Transform rotation"
                    value={master.transform.rotation}
                    decimals={0}
                    readOnly={true}
                    onCommit={() => {}}
                  />
                </div>
              </div>
            </div>
          </div>
        </PropertyCard>
        <PropertyCard title="Fill">
          <div className={styles.control}>
            <ColorField
              label="Color"
              color={objectStyle.fill}
              colorConstants={colorConstants}
              onChange={(color) => onFillChange?.(master.id, color)}
              onNameColor={onNameColorConstant}
            />
          </div>
          <div className={styles.cardRows}>
            <PropertyRow label="Opacity" value={objectStyle.opacity} />
          </div>
        </PropertyCard>
        <PropertyCard title="Stroke">
          <div className={styles.control}>
            <ColorField
              label="Color"
              color={objectStyle.stroke}
              colorConstants={colorConstants}
              onChange={(color) => onStrokeChange?.(master.id, color)}
              onNameColor={onNameColorConstant}
            />
          </div>
          <div className={styles.cardRows}>
            <PropertyRow label="Width" value={objectStyle.strokeWidth} />
          </div>
        </PropertyCard>
        <PropertyCard title="States">
          <div className={styles.cardRows}>
            <PropertyRow
              label="Named Styles"
              value={Object.keys(master.objectStyle.namedStates).length}
            />
          </div>
        </PropertyCard>
      </>
    )
  }
}

function buildTextStyleSection(
  master: MsoMaster | null,
  document: Presentation | null,
  colorConstants: ColorConstant[],
  onTextColorChange?: (masterId: string, color: Color | undefined) => void,
  onTextShadowColorChange?: (masterId: string, color: Color | undefined) => void,
  onNameColorConstant?: (value: string, name: string) => ColorConstantId | null
): SectionDefinition {
  const textStyle = master?.textStyle?.defaultState

  return {
    id: 'text-style',
    title: 'Text',
    content: textStyle ? (
      <>
        <PropertyCard title="Typography">
          <div className={styles.cardRows}>
            <PropertyRow label="Font" value={textStyle.fontFamily} />
            <PropertyRow label="Size" value={textStyle.fontSize} />
            <PropertyRow label="Weight" value={textStyle.fontWeight} />
          </div>
          <div className={styles.control}>
            <ColorField
              label="Color"
              color={textStyle.color}
              colorConstants={colorConstants}
              onChange={(color) => master && onTextColorChange?.(master.id, color)}
              onNameColor={onNameColorConstant}
            />
          </div>
        </PropertyCard>
        <PropertyCard title="Effects">
          <div className={styles.cardRows}>
            <PropertyRow label="Shadow X" value={textStyle.textShadow?.offsetX} />
            <PropertyRow label="Shadow Y" value={textStyle.textShadow?.offsetY} />
            <PropertyRow label="Shadow Blur" value={textStyle.textShadow?.blur} />
          </div>
          <div className={styles.control}>
            <ColorField
              label="Shadow Color"
              color={textStyle.textShadow?.color}
              colorConstants={colorConstants}
              onChange={(color) => master && onTextShadowColorChange?.(master.id, color)}
              onNameColor={onNameColorConstant}
            />
          </div>
        </PropertyCard>
        <PropertyCard title="States">
          <div className={styles.cardRows}>
            <PropertyRow
              label="Named Styles"
              value={master ? Object.keys(master.textStyle?.namedStates ?? {}).length : 0}
            />
          </div>
        </PropertyCard>
      </>
    ) : (
      <PropertyCard title="Text Styles">
        <p className={styles.emptyCardText}>Select a text object to inspect text styles.</p>
      </PropertyCard>
    )
  }
}

function buildColorsSection(
  colorConstants: ColorConstant[],
  usageCounts: Record<ColorConstantId, number>,
  onAddColorConstant?: () => void,
  onColorConstantNameChange?: (colorId: ColorConstantId, name: string) => void,
  onColorConstantValueChange?: (colorId: ColorConstantId, value: string) => void,
  onDeleteColorConstant?: (colorId: ColorConstantId) => void
): SectionDefinition {
  return {
    id: 'colors',
    title: '',
    content: (
      <>
        <div className={styles.colorsRoot}>
          <div className={styles.colorsHeader}>
            <Button variant="secondary" onClick={() => onAddColorConstant?.()}>
              New Color
            </Button>
          </div>
          {colorConstants.length ? (
            <div className={styles.colorEditorList}>
              {colorConstants.map((colorConstant) => (
                <ColorConstantRow
                  key={colorConstant.id}
                  colorConstant={colorConstant}
                  usageCount={usageCounts[colorConstant.id] ?? 0}
                  onNameChange={(name) => onColorConstantNameChange?.(colorConstant.id, name)}
                  onValueChange={(value) => onColorConstantValueChange?.(colorConstant.id, value)}
                  onDelete={() => {
                    const usageCount = usageCounts[colorConstant.id] ?? 0
                    if (!usageCount) {
                      onDeleteColorConstant?.(colorConstant.id)
                      return
                    }

                    const shouldDelete = window.confirm(
                      `"${colorConstant.name}" is used ${usageCount} time${usageCount === 1 ? '' : 's'}. Delete it and keep those usages as unnamed raw colors?`
                    )
                    if (shouldDelete) {
                      onDeleteColorConstant?.(colorConstant.id)
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <p className={styles.emptyCardText}>No named colors yet.</p>
          )}
        </div>
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
  onSlideTransitionKindChange,
  onAddColorConstant,
  onNameColorConstant,
  onColorConstantNameChange,
  onColorConstantValueChange,
  onDeleteColorConstant,
  onSlideBackgroundColorChange,
  onObjectFillChange,
  onObjectStrokeChange,
  onTextColorChange,
  onTextShadowColorChange
}: PropertiesPanelProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<InspectorTab>('properties')
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
    const colorConstants = Object.values(document?.colorConstantsById ?? {})
    const usageCounts = Object.fromEntries(
      colorConstants.map((colorConstant) => [
        colorConstant.id,
        document ? getColorConstantUsageCount(document, colorConstant.id) : 0
      ])
    ) as Record<ColorConstantId, number>

    if (activeTab === 'properties') {
      if (document) {
        nextSections.push(buildPresentationSection(document))
      }
      if (selectedSlide) {
          nextSections.push(
          buildSlideSection(
            document,
            selectedSlide,
            selectedSlideIndex,
            colorConstants,
            onSlideTransitionTriggerChange,
            onSlideTransitionDurationChange,
            onSlideTransitionEasingChange,
            onSlideTransitionKindChange,
            onSlideBackgroundColorChange,
            onNameColorConstant
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
    } else if (activeTab === 'object') {
      if (selectedMaster) {
        nextSections.push(
          buildObjectStyleSection(
            selectedMaster,
            document,
            colorConstants,
            onObjectFillChange,
            onObjectStrokeChange,
            onNameColorConstant
          )
        )
      } else {
        nextSections.push({
          id: 'object-style',
          title: 'Object',
          content: (
            <PropertyCard title="Object Styles">
              <p className={styles.emptyCardText}>Select an object to inspect object styles.</p>
            </PropertyCard>
          )
        })
      }
    } else if (activeTab === 'text') {
      nextSections.push(
        buildTextStyleSection(
          selectedMaster,
          document,
          colorConstants,
          onTextColorChange,
          onTextShadowColorChange,
          onNameColorConstant
        )
      )
    } else if (activeTab === 'colors') {
      nextSections.push(
        buildColorsSection(
          colorConstants,
          usageCounts,
          onAddColorConstant,
          onColorConstantNameChange,
          onColorConstantValueChange,
          onDeleteColorConstant
        )
      )
    }

    return nextSections
  }, [
    activeTab,
    document,
    onAnimationDurationChange,
    onAnimationEasingChange,
    onAnimationMoveDeltaChange,
    onAnimationNumericToChange,
    onAnimationOffsetChange,
    onAnimationTriggerChange,
    onAddColorConstant,
    onDeleteColorConstant,
    onNameColorConstant,
    onColorConstantNameChange,
    onColorConstantValueChange,
    onObjectFillChange,
    onObjectStrokeChange,
    onSlideTransitionDurationChange,
    onSlideBackgroundColorChange,
    onSlideTransitionEasingChange,
    onSlideTransitionKindChange,
    onSlideTransitionTriggerChange,
    onTextColorChange,
    onTextShadowColorChange,
    selectedAnimation,
    selectedAnimationObjectName,
    selectedMaster,
    selectedSlide,
    selectedSlideIndex
  ])

  const defaultOpenSectionId =
    activeTab === 'text'
      ? 'text-style'
      : activeTab === 'object'
        ? 'object-style'
        : activeTab === 'colors'
          ? 'colors'
          : selectedAnimation
            ? 'animation'
            : selectedMaster
              ? 'object'
              : selectedSlide
                ? 'slide'
                : 'presentation'
  const [openState, setOpenState] = useState(() => ({
    selectionKey: `${selectionKey}:${activeTab}`,
    sectionId: defaultOpenSectionId
  }))
  const hasOpenSection = sections.some((section) => section.id === openState.sectionId)
  const openSectionId =
    openState.selectionKey !== `${selectionKey}:${activeTab}` || !hasOpenSection
      ? defaultOpenSectionId
      : openState.sectionId

  return (
    <div className={styles.root}>
      <Tabs
        value={activeTab}
        tabs={[
          { value: 'properties', label: 'Properties' },
          { value: 'text', label: 'Text' },
          { value: 'object', label: 'Object' },
          { value: 'colors', label: 'Colors' }
        ]}
        onChange={setActiveTab}
      />
      {activeTab === 'colors'
        ? sections.map((section) => <React.Fragment key={section.id}>{section.content}</React.Fragment>)
        : sections.map((section) => (
            <CollapsibleSection
              key={section.id}
              title={section.title}
              isOpen={openSectionId === section.id}
              onToggle={() =>
                setOpenState({
                  selectionKey: `${selectionKey}:${activeTab}`,
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
