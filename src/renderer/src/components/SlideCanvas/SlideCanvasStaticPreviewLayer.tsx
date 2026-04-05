import React from 'react'
import { GrainCanvas } from '@viewer/components/GrainCanvas/GrainCanvas'
import { isGradientFill, resolveLinearGradientEndpoints } from '@shared/model/fill'
import { resolveBackgroundGrain, resolveSlideBackground } from '@shared/model/background'
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@shared/model/types'
import type { RenderedAppearance } from '@shared/animation/types'
import type { Background, LinearGradientFill, Slide } from '@shared/model/types'
import { ObjectAnnotationLayer } from './ObjectAnnotationLayer'
import { SlideCanvasObject } from './SlideCanvasObject'
import styles from './SlideCanvas.module.css'

type HandleType = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br' | 'rotation'

interface SlideCanvasStaticPreviewLayerProps {
  defaultBackground?: Background
  draggingMasterId: string | null
  editingTextMasterId: string | null
  renderedAppearances: RenderedAppearance[]
  scale: number
  selectedElementIds: string[]
  slide: Slide
  onBackgroundGradientMouseDown: (
    slideId: string,
    fill: LinearGradientFill,
    target: 'start' | 'end',
    event: React.MouseEvent
  ) => void
  onElementContextMenu: (masterId: string, appearanceId: string, event: React.MouseEvent) => void
  onElementMouseDown: (masterId: string, event: React.MouseEvent) => void
  onGradientOverlayMouseDown: (
    masterId: string,
    fill: LinearGradientFill,
    left: number,
    top: number,
    width: number,
    height: number,
    target: 'start' | 'end',
    event: React.MouseEvent
  ) => void
  onHandleMouseDown: (handle: HandleType, masterId: string, event: React.MouseEvent) => void
}

function getOverlayEndpoints(
  width: number,
  height: number,
  fill: LinearGradientFill
): {
  x1: number
  y1: number
  x2: number
  y2: number
} {
  const endpoints = resolveLinearGradientEndpoints(fill)

  return {
    x1: endpoints.x1 * width,
    y1: endpoints.y1 * height,
    x2: endpoints.x2 * width,
    y2: endpoints.y2 * height
  }
}

export function SlideCanvasStaticPreviewLayer({
  defaultBackground,
  draggingMasterId,
  editingTextMasterId,
  renderedAppearances,
  scale,
  selectedElementIds,
  slide,
  onBackgroundGradientMouseDown,
  onElementContextMenu,
  onElementMouseDown,
  onGradientOverlayMouseDown,
  onHandleMouseDown
}: SlideCanvasStaticPreviewLayerProps): React.JSX.Element {
  const resolvedSlideBackground = resolveSlideBackground(slide.background, defaultBackground)

  return (
    <>
      {resolveBackgroundGrain(resolvedSlideBackground).enabled ? (
        <GrainCanvas grain={resolveBackgroundGrain(resolvedSlideBackground)} />
      ) : null}
      {isGradientFill(resolvedSlideBackground.fill) &&
      resolvedSlideBackground.fill?.kind === 'linear-gradient'
        ? (() => {
            const fill = resolvedSlideBackground.fill as LinearGradientFill
            const { x1, y1, x2, y2 } = getOverlayEndpoints(SLIDE_WIDTH, SLIDE_HEIGHT, fill)
            return (
              <svg
                aria-label="Background gradient angle overlay"
                className={styles.gradientOverlay}
                style={{
                  left: 0,
                  top: 0,
                  width: SLIDE_WIDTH,
                  height: SLIDE_HEIGHT,
                  zIndex: 2
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <line className={styles.gradientLineHitArea} x1={x1} y1={y1} x2={x2} y2={y2} />
                <line className={styles.gradientLine} x1={x1} y1={y1} x2={x2} y2={y2} />
                <circle
                  className={styles.gradientHandle}
                  cx={x1}
                  cy={y1}
                  r={8}
                  onMouseDown={(event) =>
                    onBackgroundGradientMouseDown(slide.id, fill, 'start', event)
                  }
                />
                <circle
                  className={styles.gradientHandle}
                  cx={x2}
                  cy={y2}
                  r={8}
                  onMouseDown={(event) =>
                    onBackgroundGradientMouseDown(slide.id, fill, 'end', event)
                  }
                />
              </svg>
            )
          })()
        : null}
      {renderedAppearances.map((renderedAppearance) => (
        <SlideCanvasObject
          key={renderedAppearance.appearance.id}
          renderedAppearance={renderedAppearance}
          scale={scale}
          isSelected={selectedElementIds.includes(renderedAppearance.master.id)}
          isDragging={draggingMasterId === renderedAppearance.master.id}
          isEditingText={editingTextMasterId === renderedAppearance.master.id}
          onElementMouseDown={onElementMouseDown}
          onElementContextMenu={onElementContextMenu}
          onHandleMouseDown={onHandleMouseDown}
          onGradientOverlayMouseDown={onGradientOverlayMouseDown}
        />
      ))}
      <ObjectAnnotationLayer renderedAppearances={renderedAppearances} />
    </>
  )
}
