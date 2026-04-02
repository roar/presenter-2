import React from 'react'
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
  const selectSlide = useDocumentStore((s) => s.selectSlide)
  const addSlide = useDocumentStore((s) => s.addSlide)

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
