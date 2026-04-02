import React from 'react'
import type { Easing, SlideTransition } from '@shared/model/types'
import type { RenderedSlide } from '@shared/animation/types'
import { ContextMenu } from '../ContextMenu/ContextMenu'
import { ContextMenuItem } from '../ContextMenu/ContextMenuItem'
import { InfoCard } from '../InfoCard/InfoCard'
import { SlideTransitionCard } from '../SlideTransitionCard/SlideTransitionCard'
import { SlideThumbnail } from '../SlideThumbnail/SlideThumbnail'
import styles from './ThumbnailCard.module.css'

interface ThumbnailCardProps {
  slideNumber: number
  isSelected: boolean
  renderedSlide: RenderedSlide
  transition?: SlideTransition
  transitionTrigger: 'none' | 'on-click'
  onClick: () => void
  onDelete?: () => void
  onTransitionTriggerChange?: (trigger: 'none' | 'on-click') => void
  onTransitionDurationChange?: (duration: number) => void
  onTransitionEasingChange?: (easing: Easing) => void
  onTransitionKindChange?: (kind: SlideTransition['kind']) => void
}

export function ThumbnailCard({
  slideNumber,
  isSelected,
  renderedSlide,
  transition,
  transitionTrigger,
  onClick,
  onDelete,
  onTransitionTriggerChange,
  onTransitionDurationChange,
  onTransitionEasingChange,
  onTransitionKindChange
}: ThumbnailCardProps): React.JSX.Element {
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number } | null>(null)
  const handleContextMenu = onDelete
    ? (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault()
        setContextMenu({ x: event.clientX, y: event.clientY })
      }
    : undefined

  return (
    <>
      <InfoCard header={slideNumber} isSelected={isSelected} onContextMenu={handleContextMenu}>
        <button
          type="button"
          className={styles.thumbnailButton}
          aria-label={String(slideNumber)}
          onClick={onClick}
          onContextMenu={handleContextMenu}
        >
          <div className={styles.thumbnail}>
            <SlideThumbnail renderedSlide={renderedSlide} />
          </div>
        </button>
        <SlideTransitionCard
          trigger={transitionTrigger}
          transition={transition}
          onTriggerChange={onTransitionTriggerChange}
          onDurationChange={onTransitionDurationChange}
          onEasingChange={onTransitionEasingChange}
          onKindChange={onTransitionKindChange}
        />
      </InfoCard>
      {contextMenu ? (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}>
          <ContextMenuItem
            onClick={() => {
              onDelete?.()
              setContextMenu(null)
            }}
          >
            Delete slide
          </ContextMenuItem>
        </ContextMenu>
      ) : null}
    </>
  )
}
