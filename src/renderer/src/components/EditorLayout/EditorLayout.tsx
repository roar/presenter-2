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
import { Panel, PanelSection } from '../Panel/Panel'
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
  testId?: string
  selectedSlideId?: string | null
}

function LayoutPanel({
  title,
  className,
  children,
  testId,
  selectedSlideId
}: LayoutPanelProps): React.JSX.Element {
  return (
    <Panel className={className}>
      <PanelSection title={title} testId={testId} selectedSlideId={selectedSlideId} fill={true}>
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

export function EditorLayout(): React.JSX.Element {
  const document = useDocumentStore((s) => s.document)
  const patchedPresentation = useDocumentStore(selectPatchedPresentation)
  const selectedSlideId = useDocumentStore((s) => s.ui.selectedSlideId)
  const selectedElementIds = useDocumentStore((s) => s.ui.selectedElementIds)
  const selectSlide = useDocumentStore((s) => s.selectSlide)
  const addSlide = useDocumentStore((s) => s.addSlide)
  const copyElement = useDocumentStore((s) => s.copyElement)
  const pasteElement = useDocumentStore((s) => s.pasteElement)
  const updateAnimationTrigger = useDocumentStore((s) => s.updateAnimationTrigger)
  const updateAnimationOffset = useDocumentStore((s) => s.updateAnimationOffset)
  const updateAnimationDuration = useDocumentStore((s) => s.updateAnimationDuration)
  const updateAnimationEasing = useDocumentStore((s) => s.updateAnimationEasing)
  const updateAnimationNumericTo = useDocumentStore((s) => s.updateAnimationNumericTo)
  const updateAnimationMoveDelta = useDocumentStore((s) => s.updateAnimationMoveDelta)
  const [timelineState, setTimelineState] = useState<{
    key: string
    time: number
    isPlaying: boolean
  }>({ key: '', time: 0, isPlaying: false })
  const [timelineScope, setTimelineScope] = useState<'selected-slide' | 'all-slides'>(
    'selected-slide'
  )
  const timelineTimeRef = useRef(0)

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

  return (
    <div className={styles.layout}>
      <Panel className={styles.toolbar}>
        <Toolbar />
      </Panel>
      <div className={styles.workspace}>
        <div className={styles.mainRow}>
          <LayoutPanel title="Slides" className={styles.slidesPanel} testId="slides-panel">
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
                    onClick={() => selectSlide(id)}
                  />
                )
              })}
            </div>
          </LayoutPanel>
          <LayoutPanel title="Animation" className={styles.sidebarPanel} testId="animation-panel">
            {selectedSlideAnimations.map((animation) => (
              <AnimationCard
                key={animation.id}
                animation={animation}
                objectName={getAnimationObjectName(animation, document)}
                isSelected={false}
                onTriggerChange={(trigger) => updateAnimationTrigger(animation.id, trigger)}
                onOffsetChange={(offset) => updateAnimationOffset(animation.id, offset)}
                onDurationChange={(duration) => updateAnimationDuration(animation.id, duration)}
                onEasingChange={(easing) => updateAnimationEasing(animation.id, easing)}
                onNumericToChange={(value) => updateAnimationNumericTo(animation.id, value)}
                onMoveDeltaChange={(delta) => updateAnimationMoveDelta(animation.id, delta)}
              />
            ))}
          </LayoutPanel>
          <LayoutPanel title="Objects" className={styles.sidebarPanel} testId="objects-panel" />
          <div className={styles.centralColumn}>
            <LayoutPanel
              title="SlideEditor"
              className={styles.slideEditorPanel}
              testId="slide-editor-panel"
              selectedSlideId={selectedSlideId}
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
              <LayoutPanel title="Notes" className={styles.bottomHalfPanel} testId="notes-panel" />
              <LayoutPanel title="Video" className={styles.bottomHalfPanel} testId="video-panel" />
            </div>
          </div>
          <LayoutPanel
            title="Properties"
            className={styles.sidebarPanel}
            testId="properties-panel"
          />
        </div>
        <LayoutPanel title="Timeline" className={styles.timelinePanel} testId="timeline-panel">
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
      </div>
    </div>
  )
}
