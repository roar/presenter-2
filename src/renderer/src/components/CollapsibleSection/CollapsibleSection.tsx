import React from 'react'
import styles from './CollapsibleSection.module.css'

interface CollapsibleSectionProps {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children
}: CollapsibleSectionProps): React.JSX.Element {
  return (
    <section className={styles.section}>
      <button type="button" className={styles.trigger} aria-expanded={isOpen} onClick={onToggle}>
        <span>{title}</span>
        <span
          aria-hidden="true"
          className={[styles.chevron, isOpen ? styles.chevronOpen : ''].join(' ')}
        >
          ▾
        </span>
      </button>
      <div className={[styles.body, isOpen ? styles.bodyOpen : ''].join(' ')}>
        <div className={styles.bodyInner}>{children}</div>
      </div>
    </section>
  )
}
