import React, { useEffect } from 'react'
import { createSlide } from '../../../../shared/model/factories'
import { useDocumentStore } from '../../store/documentStore'
import { Button } from '../Button/Button'
import { Panel } from '../Panel/Panel'
import { SlideCanvas } from '../SlideCanvas/SlideCanvas'
import { ThumbnailCard } from '../ThumbnailCard/ThumbnailCard'
import { Toolbar } from '../Toolbar/Toolbar'
import styles from './EditorLayout.module.css'

export function EditorLayout(): React.JSX.Element {
  const slideOrder = useDocumentStore((s) => s.document?.slideOrder) ?? []
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
              onClick={() => selectSlide(id)}
            />
          ))}
        </Panel>
        <Panel className={styles.canvasPanel}>
          <SlideCanvas />
        </Panel>
      </div>
    </div>
  )
}
