import React, { useEffect, useMemo, useRef, useState } from 'react'
import { buildTimeline } from '@shared/animation/buildTimeline'
import { createSlide } from '../../../../shared/model/factories'
import type { Presentation, TargetedAnimation } from '@shared/model/types'
import {
  computeMsoExitStateChains,
  renderAllSlideEntryStates
} from '@shared/animation/computeSlideEntryStates'
import { resolveFrame } from '@shared/animation/resolveFrame'
import { useDocumentStore, selectPatchedPresentation } from '../../store/documentStore'
import { AnimationCard } from '../AnimationCard/AnimationCard'
import { Button } from '../Button/Button'
import { ObjectCard } from '../ObjectCard/ObjectCard'
import { Panel, PanelSection } from '../Panel/Panel'
import { PropertiesPanel } from '../PropertiesPanel/PropertiesPanel'
import { SlideCanvas } from '../SlideCanvas/SlideCanvas'
import { SlideTimeline } from '../SlideTimeline/SlideTimeline'
import {
  buildPresentationPlaybackPlan,
  buildPresentationTimelineViewModel,
  buildSlideTimelineViewModel,
  buildTriggerTimesForPresentationTime,
  buildTriggerTimesForSlideTime
} from '../SlideTimeline/slideTimelineModel'
import { ThumbnailCard } from '../ThumbnailCard/ThumbnailCard'
import { Toolbar } from '../Toolbar/Toolbar'
import { getMasterDisplayName } from '../../utils/getMasterDisplayName'
import { SlideRenderer } from '../../../../viewer/src/components/SlideRenderer/SlideRenderer'
import styles from './EditorLayout.module.css'

interface LayoutPanelProps {
  title: string
  className?: string
  children?: React.ReactNode
  actions?: React.ReactNode
  testId?: string
  selectedSlideId?: string | null
  flush?: boolean
  scrollable?: boolean
}

function LayoutPanel({
  title,
  className,
  children,
  actions,
  testId,
  selectedSlideId,
  flush = false,
  scrollable = false
}: LayoutPanelProps): React.JSX.Element {
  return (
    <Panel className={className}>
      <PanelSection
        title={title}
        actions={actions}
        testId={testId}
        selectedSlideId={selectedSlideId}
        fill={true}
        flush={flush}
        scrollable={scrollable}
      >
        {children ?? null}
      </PanelSection>
    </Panel>
  )
}

function getAnimationObjectName(
  animation: TargetedAnimation,
  document: Presentation | null
): string {
  if (!document) return 'Object'

  if (animation.target.kind === 'appearance' || animation.target.kind === 'group-child') {
    const appearance = document.appearancesById[animation.target.appearanceId]
    const master = appearance ? document.mastersById[appearance.masterId] : null
    return getMasterDisplayName(master)
  }

  return 'Object'
}

type PanelKey = 'slides' | 'animation' | 'objects' | 'properties' | 'timeline' | 'notes' | 'video'

type CollapsedPanels = Record<PanelKey, boolean>

const PANEL_STORAGE_KEY = 'presenter-2:collapsed-panels'

const defaultCollapsedPanels: CollapsedPanels = {
  slides: false,
  animation: false,
  objects: false,
  properties: false,
  timeline: false,
  notes: false,
  video: false
}

function loadCollapsedPanels(): CollapsedPanels {
  if (typeof window === 'undefined') {
    return defaultCollapsedPanels
  }

  try {
    const raw = window.localStorage.getItem(PANEL_STORAGE_KEY)
    if (!raw) {
      return defaultCollapsedPanels
    }

    return { ...defaultCollapsedPanels, ...(JSON.parse(raw) as Partial<CollapsedPanels>) }
  } catch {
    return defaultCollapsedPanels
  }
}

function CollapseButton({
  label,
  onClick
}: {
  label: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <button type="button" className={styles.panelIconButton} aria-label={label} onClick={onClick}>
      <span aria-hidden="true">−</span>
    </button>
  )
}

function CollapsedPanelRail({
  title,
  onExpand
}: {
  title: string
  onExpand: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={styles.collapsedRail}
      aria-label={`Expand ${title} panel`}
      onClick={onExpand}
    >
      <span className={styles.collapsedRailText}>{title}</span>
    </button>
  )
}

export function EditorLayout(): React.JSX.Element {
  const document = useDocumentStore((s) => s.document)
  const patchedPresentation = useDocumentStore(selectPatchedPresentation)
  const selectedSlideId = useDocumentStore((s) => s.ui.selectedSlideId)
  const selectedElementIds = useDocumentStore((s) => s.ui.selectedElementIds)
  const selectedAnimationId = useDocumentStore((s) => s.ui.selectedAnimationId)
  const selectSlide = useDocumentStore((s) => s.selectSlide)
  const selectElements = useDocumentStore((s) => s.selectElements)
  const selectAnimation = useDocumentStore((s) => s.selectAnimation)
  const addSlide = useDocumentStore((s) => s.addSlide)
  const removeSlide = useDocumentStore((s) => s.removeSlide)
  const copyElement = useDocumentStore((s) => s.copyElement)
  const pasteElement = useDocumentStore((s) => s.pasteElement)
  const updateAnimationTrigger = useDocumentStore((s) => s.updateAnimationTrigger)
  const updateAnimationOffset = useDocumentStore((s) => s.updateAnimationOffset)
  const updateAnimationDuration = useDocumentStore((s) => s.updateAnimationDuration)
  const updateAnimationEasing = useDocumentStore((s) => s.updateAnimationEasing)
  const updateAnimationNumericTo = useDocumentStore((s) => s.updateAnimationNumericTo)
  const updateAnimationMoveDelta = useDocumentStore((s) => s.updateAnimationMoveDelta)
  const updateSlideTransitionTrigger = useDocumentStore((s) => s.updateSlideTransitionTrigger)
  const updateSlideTransitionDuration = useDocumentStore((s) => s.updateSlideTransitionDuration)
  const updateSlideTransitionEasing = useDocumentStore((s) => s.updateSlideTransitionEasing)
  const updateSlideTransitionKind = useDocumentStore((s) => s.updateSlideTransitionKind)
  const addColorConstant = useDocumentStore((s) => s.addColorConstant)
  const nameColorConstant = useDocumentStore((s) => s.nameColorConstant)
  const updateColorConstantName = useDocumentStore((s) => s.updateColorConstantName)
  const updateColorConstantValue = useDocumentStore((s) => s.updateColorConstantValue)
  const deleteColorConstant = useDocumentStore((s) => s.deleteColorConstant)
  const updateSlideBackgroundColor = useDocumentStore((s) => s.updateSlideBackgroundColor)
  const updateSlideBackgroundFill = useDocumentStore((s) => s.updateSlideBackgroundFill)
  const updateSlideBackgroundGrain = useDocumentStore((s) => s.updateSlideBackgroundGrain)
  const updatePresentationDefaultBackgroundFill = useDocumentStore(
    (s) => s.updatePresentationDefaultBackgroundFill
  )
  const updatePresentationDefaultBackgroundGrain = useDocumentStore(
    (s) => s.updatePresentationDefaultBackgroundGrain
  )
  const updateMasterTransform = useDocumentStore((s) => s.updateMasterTransform)
  const updateObjectFill = useDocumentStore((s) => s.updateObjectFill)
  const updateObjectGrain = useDocumentStore((s) => s.updateObjectGrain)
  const updateObjectStroke = useDocumentStore((s) => s.updateObjectStroke)
  const updateTextColor = useDocumentStore((s) => s.updateTextColor)
  const updateTextShadowColor = useDocumentStore((s) => s.updateTextShadowColor)
  const [timelineState, setTimelineState] = useState<{
    key: string
    time: number
    isPlaying: boolean
  }>({ key: '', time: 0, isPlaying: false })
  const [collapsedPanels, setCollapsedPanels] = useState<CollapsedPanels>(() =>
    loadCollapsedPanels()
  )
  const [timelineScope, setTimelineScope] = useState<'selected-slide' | 'all-slides'>(
    'selected-slide'
  )
  const timelineTimeRef = useRef(0)

  useEffect(() => {
    window.localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(collapsedPanels))
  }, [collapsedPanels])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (!e.metaKey && !e.ctrlKey) return
      if (e.key === 'c') {
        const masterId = selectedElementIds[0]
        if (masterId) {
          e.preventDefault()
          copyElement(masterId)
        }
      }
      if (e.key === 'v') {
        if (selectedSlideId) {
          e.preventDefault()
          pasteElement(selectedSlideId)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedElementIds, selectedSlideId, copyElement, pasteElement])

  // Tier 1 — expensive, infrequent.
  // Recomputes when animation structure, slide order, or appearance structure changes.
  // Does NOT recompute during drag (drag only patches master transforms, not document).
  const msoExitStatesBySlide = useMemo(
    () => (document ? computeMsoExitStateChains(document) : []),
    [document]
  )

  // Tier 2 — cheap, frequent.
  // Recomputes on every drag event (patchedPresentation changes) and on document mutations.
  // Reads master transforms from patchedPresentation so drag position is reflected immediately.
  const allEntryStates = useMemo(
    () =>
      patchedPresentation
        ? renderAllSlideEntryStates(patchedPresentation, msoExitStatesBySlide)
        : [],
    [patchedPresentation, msoExitStatesBySlide]
  )

  const slideOrder = document?.slideOrder ?? []
  const selectedSlide = selectedSlideId ? document?.slidesById[selectedSlideId] : null
  const selectedSlideIndex =
    selectedSlideId != null ? slideOrder.findIndex((slideId) => slideId === selectedSlideId) : -1
  const selectedRenderedSlide =
    selectedSlideIndex >= 0 && selectedSlideIndex < allEntryStates.length
      ? allEntryStates[selectedSlideIndex]
      : null
  const playbackPlan = useMemo(
    () => (patchedPresentation ? buildPresentationPlaybackPlan(patchedPresentation) : null),
    [patchedPresentation]
  )
  const selectedSlideTimeline =
    selectedSlideId && playbackPlan ? playbackPlan.slideTimelinesById[selectedSlideId] : null
  const timelineKey =
    timelineScope === 'selected-slide' ? `selected:${selectedSlideId ?? ''}` : 'all-slides'
  const timelineViewModel = useMemo(() => {
    if (!playbackPlan) return null
    if (timelineScope === 'all-slides') return buildPresentationTimelineViewModel(playbackPlan)
    return selectedSlideTimeline ? buildSlideTimelineViewModel(selectedSlideTimeline) : null
  }, [playbackPlan, selectedSlideTimeline, timelineScope])
  const timelineTime = timelineState.key === timelineKey ? timelineState.time : 0
  const isTimelinePlaying = timelineState.key === timelineKey ? timelineState.isPlaying : false
  const selectedSlideAnimations =
    selectedSlide != null && document != null
      ? selectedSlide.animationOrder
          .map((animationId) => document.animationsById[animationId])
          .filter(Boolean)
      : []
  const selectedAnimation =
    selectedAnimationId != null && document != null
      ? (document.animationsById[selectedAnimationId] ?? null)
      : null
  const selectedMaster =
    selectedElementIds[0] != null && patchedPresentation != null
      ? (patchedPresentation.mastersById[selectedElementIds[0]] ?? null)
      : null
  const selectedAnimationObjectName = selectedAnimation
    ? getAnimationObjectName(selectedAnimation, document)
    : 'Object'
  const selectedSlideObjects =
    selectedRenderedSlide?.appearances
      .slice()
      .sort((a, b) => a.appearance.zIndex - b.appearance.zIndex) ?? []
  const isTimelinePreviewing = timelineViewModel != null && (isTimelinePlaying || timelineTime > 0)

  useEffect(() => {
    timelineTimeRef.current = timelineTime
  }, [timelineTime])

  useEffect(() => {
    if (!isTimelinePlaying || !timelineViewModel) return

    const initialTime = Math.min(timelineTimeRef.current, timelineViewModel.totalDuration)
    let frameId = 0
    let startTime: number | null = null

    const tick = (now: number): void => {
      if (startTime === null) {
        startTime = now - initialTime * 1000
      }

      const nextTime = Math.min(
        (now - startTime) / 1000,
        Math.max(timelineViewModel.totalDuration, 0)
      )
      timelineTimeRef.current = nextTime
      setTimelineState((current) => ({
        key: timelineKey,
        time: nextTime,
        isPlaying: current.isPlaying
      }))

      if (nextTime >= timelineViewModel.totalDuration) {
        setTimelineState({
          key: timelineKey,
          time: nextTime,
          isPlaying: false
        })
        return
      }

      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [isTimelinePlaying, timelineKey, timelineViewModel])

  const timelinePreviewFrame = useMemo(() => {
    if (!playbackPlan || !isTimelinePreviewing) return null

    const { absoluteTime, triggerTimes } =
      timelineScope === 'all-slides'
        ? buildTriggerTimesForPresentationTime(playbackPlan, timelineTime)
        : selectedSlideId
          ? buildTriggerTimesForSlideTime(playbackPlan, selectedSlideId, timelineTime)
          : { absoluteTime: 0, triggerTimes: new Map<string, number>() }

    return resolveFrame(buildTimeline(playbackPlan.presentation, triggerTimes), absoluteTime)
  }, [isTimelinePreviewing, playbackPlan, selectedSlideId, timelineScope, timelineTime])

  function handleNewSlide() {
    addSlide(createSlide())
  }

  function handleTimelineTimeChange(nextTime: number): void {
    setTimelineState({
      key: timelineKey,
      time: nextTime,
      isPlaying: false
    })
    timelineTimeRef.current = nextTime
  }

  function handleTimelinePlayToggle(nextPlaying: boolean): void {
    if (!timelineViewModel) return

    const nextTime =
      nextPlaying && timelineTimeRef.current >= timelineViewModel.totalDuration
        ? 0
        : timelineTimeRef.current
    timelineTimeRef.current = nextTime
    setTimelineState({
      key: timelineKey,
      time: nextTime,
      isPlaying: nextPlaying
    })
  }

  function handleTimelineScopeToggle(): void {
    setTimelineScope((current) => (current === 'selected-slide' ? 'all-slides' : 'selected-slide'))
    timelineTimeRef.current = 0
  }

  function setPanelCollapsed(key: PanelKey, collapsed: boolean): void {
    setCollapsedPanels((current) => ({ ...current, [key]: collapsed }))
  }

  function toggleFocusCanvas(): void {
    const shouldFocus =
      !collapsedPanels.slides ||
      !collapsedPanels.animation ||
      !collapsedPanels.objects ||
      !collapsedPanels.properties ||
      !collapsedPanels.timeline ||
      !collapsedPanels.notes ||
      !collapsedPanels.video

    setCollapsedPanels({
      slides: shouldFocus,
      animation: shouldFocus,
      objects: shouldFocus,
      properties: shouldFocus,
      timeline: shouldFocus,
      notes: shouldFocus,
      video: shouldFocus
    })
  }

  const isCanvasFocused =
    collapsedPanels.slides &&
    collapsedPanels.animation &&
    collapsedPanels.objects &&
    collapsedPanels.properties &&
    collapsedPanels.timeline &&
    collapsedPanels.notes &&
    collapsedPanels.video

  return (
    <div className={styles.layout}>
      <Panel className={styles.toolbar}>
        <Toolbar />
      </Panel>
      <div className={styles.workspace}>
        <div className={styles.mainRow}>
          {collapsedPanels.slides ? (
            <CollapsedPanelRail
              title="Slides"
              onExpand={() => setPanelCollapsed('slides', false)}
            />
          ) : (
            <LayoutPanel
              title="Slides"
              className={styles.slidesPanel}
              testId="slides-panel"
              scrollable={true}
              actions={
                <CollapseButton
                  label="Collapse Slides panel"
                  onClick={() => setPanelCollapsed('slides', true)}
                />
              }
            >
              <div className={styles.newSlideRow}>
                <Button variant="secondary" onClick={handleNewSlide}>
                  New Slide
                </Button>
              </div>
              <div className={styles.slideList}>
                {slideOrder.map((id, idx) => {
                  const slide = document?.slidesById[id]
                  if (!slide) return null

                  return (
                    <ThumbnailCard
                      key={id}
                      slideNumber={idx + 1}
                      isSelected={selectedSlideId === id}
                      renderedSlide={allEntryStates[idx] ?? { slide, appearances: [] }}
                      transition={slide.transition}
                      transitionTrigger={slide.transitionTriggerId ? 'on-click' : 'none'}
                      onClick={() => selectSlide(id)}
                      onDelete={() => removeSlide(id)}
                      onTransitionTriggerChange={(trigger) =>
                        updateSlideTransitionTrigger(id, trigger)
                      }
                      onTransitionDurationChange={(duration) =>
                        updateSlideTransitionDuration(id, duration)
                      }
                      onTransitionEasingChange={(easing) => updateSlideTransitionEasing(id, easing)}
                      onTransitionKindChange={(kind) => updateSlideTransitionKind(id, kind)}
                    />
                  )
                })}
              </div>
            </LayoutPanel>
          )}
          {collapsedPanels.animation ? (
            <CollapsedPanelRail
              title="Animation"
              onExpand={() => setPanelCollapsed('animation', false)}
            />
          ) : (
            <LayoutPanel
              title="Animation"
              className={styles.sidebarPanel}
              testId="animation-panel"
              scrollable={true}
              actions={
                <CollapseButton
                  label="Collapse Animation panel"
                  onClick={() => setPanelCollapsed('animation', true)}
                />
              }
            >
              {selectedSlideAnimations.map((animation) => (
                <AnimationCard
                  key={animation.id}
                  animation={animation}
                  objectName={getAnimationObjectName(animation, document)}
                  isSelected={selectedAnimationId === animation.id}
                  onClick={() => selectAnimation(animation.id)}
                  onTriggerChange={(trigger) => updateAnimationTrigger(animation.id, trigger)}
                  onOffsetChange={(offset) => updateAnimationOffset(animation.id, offset)}
                  onDurationChange={(duration) => updateAnimationDuration(animation.id, duration)}
                  onEasingChange={(easing) => updateAnimationEasing(animation.id, easing)}
                  onNumericToChange={(value) => updateAnimationNumericTo(animation.id, value)}
                  onMoveDeltaChange={(delta) => updateAnimationMoveDelta(animation.id, delta)}
                />
              ))}
            </LayoutPanel>
          )}
          {collapsedPanels.objects ? (
            <CollapsedPanelRail
              title="Objects"
              onExpand={() => setPanelCollapsed('objects', false)}
            />
          ) : (
            <LayoutPanel
              title="Objects"
              className={styles.sidebarPanel}
              testId="objects-panel"
              scrollable={true}
              actions={
                <CollapseButton
                  label="Collapse Objects panel"
                  onClick={() => setPanelCollapsed('objects', true)}
                />
              }
            >
              {selectedSlideObjects.map((renderedAppearance) => (
                <ObjectCard
                  key={renderedAppearance.appearance.id}
                  objectName={getMasterDisplayName(renderedAppearance.master)}
                  rendered={renderedAppearance}
                  isSelected={selectedElementIds.includes(renderedAppearance.master.id)}
                  onClick={() => selectElements([renderedAppearance.master.id])}
                />
              ))}
            </LayoutPanel>
          )}
          <div className={styles.centralColumn}>
            <LayoutPanel
              title="SlideEditor"
              className={styles.slideEditorPanel}
              testId="slide-editor-panel"
              selectedSlideId={selectedSlideId}
              flush={true}
              actions={
                <button
                  type="button"
                  className={styles.focusButton}
                  aria-label={isCanvasFocused ? 'Restore panels' : 'Focus canvas'}
                  onClick={toggleFocusCanvas}
                >
                  {isCanvasFocused ? 'Restore Panels' : 'Focus Canvas'}
                </button>
              }
            >
              <div className={styles.slideCanvasContainer}>
                {timelinePreviewFrame ? (
                  <SlideRenderer frame={timelinePreviewFrame} />
                ) : (
                  <SlideCanvas />
                )}
              </div>
            </LayoutPanel>
            <div className={styles.centralLowerRow}>
              {collapsedPanels.notes ? (
                <CollapsedPanelRail
                  title="Notes"
                  onExpand={() => setPanelCollapsed('notes', false)}
                />
              ) : (
                <LayoutPanel
                  title="Notes"
                  className={styles.bottomHalfPanel}
                  testId="notes-panel"
                  actions={
                    <CollapseButton
                      label="Collapse Notes panel"
                      onClick={() => setPanelCollapsed('notes', true)}
                    />
                  }
                />
              )}
              {collapsedPanels.video ? (
                <CollapsedPanelRail
                  title="Video"
                  onExpand={() => setPanelCollapsed('video', false)}
                />
              ) : (
                <LayoutPanel
                  title="Video"
                  className={styles.bottomHalfPanel}
                  testId="video-panel"
                  actions={
                    <CollapseButton
                      label="Collapse Video panel"
                      onClick={() => setPanelCollapsed('video', true)}
                    />
                  }
                />
              )}
            </div>
          </div>
          {collapsedPanels.properties ? (
            <CollapsedPanelRail
              title="Properties"
              onExpand={() => setPanelCollapsed('properties', false)}
            />
          ) : (
            <LayoutPanel
              title="Properties"
              className={styles.sidebarPanel}
              testId="properties-panel"
              scrollable={true}
              actions={
                <CollapseButton
                  label="Collapse Properties panel"
                  onClick={() => setPanelCollapsed('properties', true)}
                />
              }
            >
              <PropertiesPanel
                document={document}
                selectedSlide={selectedSlide}
                selectedSlideIndex={selectedSlideIndex}
                selectedMaster={selectedMaster}
                selectedAnimation={selectedAnimation}
                selectedAnimationObjectName={selectedAnimationObjectName}
                onAnimationTriggerChange={updateAnimationTrigger}
                onAnimationOffsetChange={updateAnimationOffset}
                onAnimationDurationChange={updateAnimationDuration}
                onAnimationEasingChange={updateAnimationEasing}
                onAnimationNumericToChange={updateAnimationNumericTo}
                onAnimationMoveDeltaChange={updateAnimationMoveDelta}
                onSlideTransitionTriggerChange={updateSlideTransitionTrigger}
                onSlideTransitionDurationChange={updateSlideTransitionDuration}
                onSlideTransitionEasingChange={updateSlideTransitionEasing}
                onSlideTransitionKindChange={updateSlideTransitionKind}
                onAddColorConstant={addColorConstant}
                onNameColorConstant={nameColorConstant}
                onColorConstantNameChange={updateColorConstantName}
                onColorConstantValueChange={updateColorConstantValue}
                onDeleteColorConstant={deleteColorConstant}
                onSlideBackgroundColorChange={updateSlideBackgroundColor}
                onSlideBackgroundFillChange={updateSlideBackgroundFill}
                onSlideBackgroundGrainChange={updateSlideBackgroundGrain}
                onPresentationDefaultBackgroundFillChange={updatePresentationDefaultBackgroundFill}
                onPresentationDefaultBackgroundGrainChange={
                  updatePresentationDefaultBackgroundGrain
                }
                onObjectTransformChange={updateMasterTransform}
                onObjectFillChange={updateObjectFill}
                onObjectGrainChange={updateObjectGrain}
                onObjectStrokeChange={updateObjectStroke}
                onTextColorChange={updateTextColor}
                onTextShadowColorChange={updateTextShadowColor}
              />
            </LayoutPanel>
          )}
        </div>
        {collapsedPanels.timeline ? (
          <div className={styles.timelineRestoreBar}>
            <button
              type="button"
              className={styles.timelineRestoreButton}
              aria-label="Expand Timeline panel"
              onClick={() => setPanelCollapsed('timeline', false)}
            >
              Timeline
            </button>
          </div>
        ) : (
          <LayoutPanel
            title="Timeline"
            className={styles.timelinePanel}
            testId="timeline-panel"
            actions={
              <CollapseButton
                label="Collapse Timeline panel"
                onClick={() => setPanelCollapsed('timeline', true)}
              />
            }
          >
            {timelineViewModel ? (
              <SlideTimeline
                timeline={timelineViewModel}
                currentTime={timelineTime}
                isPlaying={isTimelinePlaying}
                onTimeChange={handleTimelineTimeChange}
                onPlayToggle={handleTimelinePlayToggle}
                scope={timelineScope}
                onScopeToggle={handleTimelineScopeToggle}
              />
            ) : null}
          </LayoutPanel>
        )}
      </div>
    </div>
  )
}
