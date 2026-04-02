import React from 'react'
import type { RenderedSlide } from '@shared/animation/types'
import { SlideThumbnail } from '../SlideThumbnail/SlideThumbnail'
import styles from './ThumbnailCard.module.css'

interface ThumbnailCardProps {
  slideNumber: number
  isSelected: boolean
  renderedSlide: RenderedSlide
  onClick: () => void
}

export function ThumbnailCard({
  slideNumber,
  isSelected,
  renderedSlide,
  onClick
}: ThumbnailCardProps): React.JSX.Element {
  return (
    <button
      className={[styles.card, isSelected ? styles.selected : null].filter(Boolean).join(' ')}
      aria-current={isSelected ? true : undefined}
      onClick={onClick}
    >
      <div className={styles.thumbnail}>
        <SlideThumbnail renderedSlide={renderedSlide} />
      </div>
      <span className={styles.label}>{slideNumber}</span>
    </button>
  )
}
