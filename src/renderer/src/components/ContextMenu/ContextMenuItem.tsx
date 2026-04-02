import React, { useState } from 'react'
import styles from './ContextMenuItem.module.css'

interface ContextMenuItemProps {
  onClick?: () => void
  submenu?: React.ReactNode
  disabled?: boolean
  children: React.ReactNode
}

export function ContextMenuItem({
  onClick,
  submenu,
  disabled = false,
  children
}: ContextMenuItemProps): React.JSX.Element {
  const [submenuOpen, setSubmenuOpen] = useState(false)
  const hasSubmenu = submenu != null

  return (
    <div
      className={styles.itemWrapper}
      onMouseEnter={() => setSubmenuOpen(true)}
      onMouseLeave={() => setSubmenuOpen(false)}
    >
      <button
        role="menuitem"
        type="button"
        className={styles.item}
        onClick={onClick}
        disabled={disabled}
        aria-haspopup={hasSubmenu ? 'menu' : undefined}
        aria-expanded={hasSubmenu ? submenuOpen : undefined}
      >
        <span>{children}</span>
        {hasSubmenu ? (
          <span className={styles.chevron} aria-hidden="true">
            ›
          </span>
        ) : null}
      </button>
      {hasSubmenu && submenuOpen ? (
        <div role="menu" className={styles.submenu}>
          {submenu}
        </div>
      ) : null}
    </div>
  )
}
