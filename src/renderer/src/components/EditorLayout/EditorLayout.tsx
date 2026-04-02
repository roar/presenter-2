import React, { useEffect, useMemo } from 'react'
import { createSlide } from '../../../../shared/model/factories'
import {
  computeMsoExitStateChains,
  renderAllSlideEntryStates
} from '@shared/animation/computeSlideEntryStates'
import { useDocumentStore, selectPatchedPresentation } from '../../store/documentStore'
import { Button } from '../Button/Button'
import { Panel, PanelSection } from '../Panel/Panel'
import { SlideCanvas } from '../SlideCanvas/SlideCanvas'
import { ThumbnailCard } from '../ThumbnailCard/ThumbnailCard'
import { Toolbar } from '../Toolbar/Toolbar'
import styles from './EditorLayout.module.css'

export function EditorLayout(): React.JSX.Element {
  const document = useDocumentStore((s) => s.document)
  const patchedPresentation = useDocumentStore(selectPatchedPresentation)
  const selectedSlideId = useDocumentStore((s) => s.ui.selectedSlideId)
  const selectedElementIds = useDocumentStore((s) => s.ui.selectedElementIds)
  const selectSlide = useDocumentStore((s) => s.selectSlide)
  const addSlide = useDocumentStore((s) => s.addSlide)
  const copyElement = useDocumentStore((s) => s.copyElement)
  const pasteElement = useDocumentStore((s) => s.pasteElement)

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

  function handleNewSlide() {
    addSlide(createSlide())
  }

  return (
    <div className={styles.layout}>
      <Panel className={styles.toolbar}>
        <Toolbar />
      </Panel>
      <div className={styles.body}>
        <Panel className={styles.thumbnailPanel}>
          <div className={styles.newSlideRow}>
            <Button variant="secondary" onClick={handleNewSlide}>
              New Slide
            </Button>
          </div>
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
        </Panel>
        <Panel className={styles.animationPanel}>
          <div data-selected-slide-id={selectedSlideId ?? undefined}>
            <PanelSection title="Animations">{null}</PanelSection>
          </div>
        </Panel>
        <Panel className={styles.canvasPanel}>
          <SlideCanvas />
        </Panel>
      </div>
    </div>
  )
}
