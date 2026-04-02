import React, { useState } from 'react'
import { nullAuthContext } from '../../../../shared/auth/types'
import { createMsoMaster } from '../../../../shared/model/factories'
import type { ShapeLibraryEntry } from '../../../../shared/shapes/types'
import { JsonFileRepository } from '../../repository/JsonFileRepository'
import { useDocumentStore } from '../../store/documentStore'
import { Button } from '../Button/Button'
import { OpenPresentationPopup } from '../OpenPresentationPopup/OpenPresentationPopup'
import { ShapePickerPopup } from '../ShapePickerPopup/ShapePickerPopup'
import styles from './Toolbar.module.css'

export function Toolbar(): React.JSX.Element {
  const [shapePickerOpen, setShapePickerOpen] = useState(false)
  const [openPresentationPopupOpen, setOpenPresentationPopupOpen] = useState(false)
  const newPresentation = useDocumentStore((s) => s.newPresentation)
  const loadDocument = useDocumentStore((s) => s.loadDocument)
  const insertElement = useDocumentStore((s) => s.insertElement)
  const selectedSlideId = useDocumentStore((s) => s.ui.selectedSlideId)
  const repository = new JsonFileRepository()

  function handleInsertShape(entry: ShapeLibraryEntry): void {
    if (!selectedSlideId) return
    const master = createMsoMaster('shape')
    master.transform = {
      x: 100,
      y: 100,
      width: entry.template.transform.width,
      height: entry.template.transform.height,
      rotation: entry.template.transform.rotation
    }
    master.objectStyle = {
      defaultState: {
        fill: entry.template.style.fill,
        stroke: entry.template.style.stroke,
        strokeWidth: entry.template.style.strokeWidth,
        opacity: entry.template.style.opacity
      },
      namedStates: {}
    }
    master.geometry = {
      type: 'path',
      pathData: entry.template.path.d,
      baseWidth: entry.template.path.baseWidth,
      baseHeight: entry.template.path.baseHeight
    }
    insertElement(selectedSlideId, master)
  }

  function handleOpenPresentation(id: string): void {
    void loadDocument(repository, id, nullAuthContext)
  }

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.group}>
          <Button variant="secondary" onClick={newPresentation}>
            New Presentation
          </Button>
          <Button variant="ghost" onClick={() => setOpenPresentationPopupOpen(true)}>
            Open
          </Button>
          <Button variant="ghost" onClick={() => setShapePickerOpen(true)}>
            Insert Shape
          </Button>
        </div>
      </div>
      {openPresentationPopupOpen && (
        <OpenPresentationPopup
          presentations={repository.list(nullAuthContext)}
          onClose={() => setOpenPresentationPopupOpen(false)}
          onOpen={handleOpenPresentation}
        />
      )}
      {shapePickerOpen && (
        <ShapePickerPopup
          onClose={() => setShapePickerOpen(false)}
          onInsertShape={handleInsertShape}
        />
      )}
    </>
  )
}
