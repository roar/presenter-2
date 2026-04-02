import React from 'react'
import styles from './ContextMenuItem.module.css'

interface ContextMenuItemProps {
  onClick: () => void
  children: React.ReactNode
}

export function ContextMenuItem({ onClick, children }: ContextMenuItemProps): React.JSX.Element {
  return (
    <button role="menuitem" className={styles.item} onClick={onClick}>
      {children}
    </button>
  )
}
