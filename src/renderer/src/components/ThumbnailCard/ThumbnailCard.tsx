import React from 'react'
import styles from './ThumbnailCard.module.css'

interface ThumbnailCardProps {
  slideNumber: number
  isSelected: boolean
  onClick: () => void
}

export function ThumbnailCard({
  slideNumber,
  isSelected,
  onClick
}: ThumbnailCardProps): React.JSX.Element {
  return (
    <button
      className={[styles.card, isSelected ? styles.selected : null].filter(Boolean).join(' ')}
      aria-current={isSelected ? true : undefined}
      onClick={onClick}
    >
      <div className={styles.thumbnail} />
      <span className={styles.label}>{slideNumber}</span>
    </button>
  )
}
