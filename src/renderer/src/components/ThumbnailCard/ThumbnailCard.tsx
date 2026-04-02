import React from 'react'
import type { RenderedSlide } from '@shared/animation/types'
import { InfoCard } from '../InfoCard/InfoCard'
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
    <InfoCard header={slideNumber} isSelected={isSelected} onClick={onClick}>
      <div className={styles.thumbnail}>
        <SlideThumbnail renderedSlide={renderedSlide} />
      </div>
    </InfoCard>
  )
}
