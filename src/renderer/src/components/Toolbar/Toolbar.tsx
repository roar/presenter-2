import React, { useState } from 'react'
import { createMsoMaster } from '../../../../shared/model/factories'
import type { ShapeLibraryEntry } from '../../../../shared/shapes/types'
import { useDocumentStore } from '../../store/documentStore'
import { Button } from '../Button/Button'
import { ShapePickerPopup } from '../ShapePickerPopup/ShapePickerPopup'
import styles from './Toolbar.module.css'

export function Toolbar(): React.JSX.Element {
  const [shapePickerOpen, setShapePickerOpen] = useState(false)
  const insertElement = useDocumentStore((s) => s.insertElement)
  const selectedSlideId = useDocumentStore((s) => s.ui.selectedSlideId)

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
    master.geometry = { type: 'path', pathData: entry.template.path.d }
    insertElement(selectedSlideId, master)
  }

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.group}>
          <Button variant="secondary">New Presentation</Button>
          <Button variant="ghost" onClick={() => setShapePickerOpen(true)}>
            Insert Shape
          </Button>
        </div>
      </div>
      {shapePickerOpen && (
        <ShapePickerPopup
          onClose={() => setShapePickerOpen(false)}
          onInsertShape={handleInsertShape}
        />
      )}
    </>
  )
}
