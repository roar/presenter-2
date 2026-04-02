import React from 'react'
import styles from './InfoCard.module.css'

interface InfoCardProps {
  header: React.ReactNode
  isSelected: boolean
  onClick: () => void
  children: React.ReactNode
}

export function InfoCard({
  header,
  isSelected,
  onClick,
  children
}: InfoCardProps): React.JSX.Element {
  return (
    <button
      className={[styles.card, isSelected ? styles.selected : null].filter(Boolean).join(' ')}
      aria-current={isSelected ? true : undefined}
      onClick={onClick}
    >
      <span className={styles.header}>{header}</span>
      <div className={styles.content}>{children}</div>
    </button>
  )
}
