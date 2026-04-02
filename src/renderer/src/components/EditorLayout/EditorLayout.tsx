import React, { useEffect, useMemo } from 'react'
import { createSlide } from '../../../../shared/model/factories'
import {
  computeMsoExitStateChains,
  renderAllSlideEntryStates
} from '@shared/animation/computeSlideEntryStates'
import { useDocumentStore, selectPatchedPresentation } from '../../store/documentStore'
import { AnimationCard } from '../AnimationCard/AnimationCard'
import { Button } from '../Button/Button'
import { Panel, PanelSection } from '../Panel/Panel'
import { SlideCanvas } from '../SlideCanvas/SlideCanvas'
import { ThumbnailCard } from '../ThumbnailCard/ThumbnailCard'
import { Toolbar } from '../Toolbar/Toolbar'
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
  const selectedSlideAnimations =
    selectedSlide != null && document != null
      ? selectedSlide.animationOrder
          .map((animationId) => document.animationsById[animationId])
          .filter(Boolean)
      : []

  function handleNewSlide() {
    addSlide(createSlide())
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
              {slideOrder.map((id, idx) => (
                <ThumbnailCard
                  key={id}
                  slideNumber={idx + 1}
                  isSelected={selectedSlideId === id}
                  renderedSlide={
                    allEntryStates[idx] ?? { slide: document!.slidesById[id], appearances: [] }
                  }
                  onClick={() => selectSlide(id)}
                />
              ))}
            </div>
          </LayoutPanel>
          <LayoutPanel title="Animation" className={styles.sidebarPanel} testId="animation-panel">
            {selectedSlideAnimations.map((animation) => (
              <AnimationCard
                key={animation.id}
                animation={animation}
                isSelected={false}
                onTriggerChange={(trigger) => updateAnimationTrigger(animation.id, trigger)}
                onOffsetChange={(offset) => updateAnimationOffset(animation.id, offset)}
                onDurationChange={(duration) => updateAnimationDuration(animation.id, duration)}
                onEasingChange={(easing) => updateAnimationEasing(animation.id, easing)}
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
                <SlideCanvas />
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
        <LayoutPanel title="Timeline" className={styles.timelinePanel} testId="timeline-panel" />
      </div>
    </div>
  )
}
