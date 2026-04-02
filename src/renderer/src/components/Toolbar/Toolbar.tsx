import React, { useState } from 'react'
import { Button } from '../Button/Button'
import { ShapePickerPopup } from '../ShapePickerPopup/ShapePickerPopup'
import styles from './Toolbar.module.css'

export function Toolbar(): React.JSX.Element {
  const [shapePickerOpen, setShapePickerOpen] = useState(false)

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
      {shapePickerOpen && <ShapePickerPopup onClose={() => setShapePickerOpen(false)} />}
    </>
  )
}
