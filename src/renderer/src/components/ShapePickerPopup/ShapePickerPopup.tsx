import React, { useEffect } from 'react'
import styles from './ShapePickerPopup.module.css'

interface ShapePickerPopupProps {
  onClose: () => void
}

export function ShapePickerPopup({ onClose }: ShapePickerPopupProps): React.JSX.Element {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <>
      <div role="presentation" className={styles.backdrop} onClick={onClose} />
      <div role="dialog" aria-label="Insert shape" className={styles.popup}>
        <p className={styles.placeholder}>Shape library coming soon</p>
      </div>
    </>
  )
}
