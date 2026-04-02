import React from 'react'
import styles from './InfoCard.module.css'

interface InfoCardProps {
  header: React.ReactNode
  isSelected: boolean
  onClick?: () => void
  children: React.ReactNode
}

export function InfoCard({
  header,
  isSelected,
  onClick,
  children
}: InfoCardProps): React.JSX.Element {
  const className = [styles.card, isSelected ? styles.selected : null].filter(Boolean).join(' ')

  if (onClick) {
    return (
      <button className={className} aria-current={isSelected ? true : undefined} onClick={onClick}>
        <span className={styles.header}>{header}</span>
        <div className={styles.content}>{children}</div>
      </button>
    )
  }

  return (
    <div className={className} data-selected={isSelected ? true : undefined}>
      <span className={styles.header}>{header}</span>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
