import React, { useEffect } from 'react'
import styles from './ContextMenu.module.css'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  children?: React.ReactNode
}

export function ContextMenu({ x, y, onClose, children }: ContextMenuProps): React.JSX.Element {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <>
      <div data-testid="context-menu-backdrop" className={styles.backdrop} onMouseDown={onClose} />
      <div role="menu" className={styles.menu} style={{ left: x, top: y }}>
        {children}
      </div>
    </>
  )
}
