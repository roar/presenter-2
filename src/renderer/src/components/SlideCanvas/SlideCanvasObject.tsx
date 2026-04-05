import React from 'react'
import { isGradientFill, resolveLinearGradientEndpoints } from '@shared/model/fill'
import type { RenderedAppearance } from '@shared/animation/types'
import type { LinearGradientFill } from '@shared/model/types'
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@shared/model/types'
import { ImageView } from './ImageView'
import { SelectionOverlay } from './SelectionOverlay'
import { ShapeView } from './ShapeView'
import { TextView } from './TextView'
import styles from './SlideCanvas.module.css'

type HandleType = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br' | 'rotation'

interface SlideCanvasObjectProps {
  renderedAppearance: RenderedAppearance
  scale: number
  isSelected: boolean
  isDragging: boolean
  isEditingText: boolean
  onElementMouseDown: (masterId: string, event: React.MouseEvent) => void
  onElementContextMenu: (masterId: string, appearanceId: string, event: React.MouseEvent) => void
  onHandleMouseDown: (handle: HandleType, masterId: string, event: React.MouseEvent) => void
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
}

function parseRenderedTransform(transform: string): {
  translateX: number
  translateY: number
  scale: number
  rotation: number
} {
  const translateMatch = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/)
  const scaleMatch = transform.match(/scale\(([-\d.]+)\)/)
  const rotateMatch = transform.match(/rotate\(([-\d.]+)deg\)/)
  return {
    translateX: translateMatch ? Number(translateMatch[1]) : 0,
    translateY: translateMatch ? Number(translateMatch[2]) : 0,
    scale: scaleMatch ? Number(scaleMatch[1]) : 1,
    rotation: rotateMatch ? Number(rotateMatch[1]) : 0
  }
}

function getOverlayEndpoints(
  width: number,
  height: number,
  fill: LinearGradientFill
): { x1: number; y1: number; x2: number; y2: number } {
  const endpoints = resolveLinearGradientEndpoints(fill)
  return {
    x1: endpoints.x1 * width,
    y1: endpoints.y1 * height,
    x2: endpoints.x2 * width,
    y2: endpoints.y2 * height
  }
}

export function SlideCanvasObject({
  renderedAppearance,
  scale,
  isSelected,
  isDragging,
  isEditingText,
  onElementMouseDown,
  onElementContextMenu,
  onHandleMouseDown,
  onGradientOverlayMouseDown
}: SlideCanvasObjectProps): React.JSX.Element {
  const { appearance, master, visible, opacity, transform } = renderedAppearance
  const { x, y, width, height } = master.transform
  const {
    translateX,
    translateY,
    scale: renderedScale,
    rotation: renderedRotation
  } = parseRenderedTransform(transform)
  const left = x + translateX
  const top = y + translateY
  const scaledWidth = width * renderedScale
  const scaledHeight = height * renderedScale

  return (
    <>
      {master.type === 'shape' && (
        <ShapeView master={master} appearance={appearance} rendered={renderedAppearance} />
      )}
      {master.type === 'text' && (
        <TextView
          master={master}
          appearance={appearance}
          rendered={renderedAppearance}
          isEditing={isEditingText}
        />
      )}
      {master.type === 'image' && (
        <ImageView master={master} appearance={appearance} rendered={renderedAppearance} />
      )}
      {isSelected ? (
        <SelectionOverlay
          rotation={master.transform.rotation + renderedRotation}
          cx={x + width / 2 + translateX}
          cy={y + height / 2 + translateY}
          scaledWidth={scaledWidth}
          scaledHeight={scaledHeight}
          opacity={opacity}
          visible={visible}
          scale={scale}
          slideWidth={SLIDE_WIDTH}
          slideHeight={SLIDE_HEIGHT}
          isDragging={isDragging}
          onHandleMouseDown={(handle, event) => onHandleMouseDown(handle, master.id, event)}
        />
      ) : null}
      {isSelected &&
      master.type === 'shape' &&
      isGradientFill(master.objectStyle.defaultState.fill) &&
      master.objectStyle.defaultState.fill.kind === 'linear-gradient'
        ? (() => {
            const fill = master.objectStyle.defaultState.fill as LinearGradientFill
            const { x1, y1, x2, y2 } = getOverlayEndpoints(scaledWidth, scaledHeight, fill)
            return (
              <svg
                aria-label="Gradient angle overlay"
                className={styles.gradientOverlay}
                style={{
                  left,
                  top,
                  width: scaledWidth,
                  height: scaledHeight,
                  zIndex: 2,
                  opacity,
                  visibility: visible ? 'visible' : 'hidden'
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
                    onGradientOverlayMouseDown(
                      master.id,
                      fill,
                      left,
                      top,
                      scaledWidth,
                      scaledHeight,
                      'start',
                      event
                    )
                  }
                />
                <circle
                  className={styles.gradientHandle}
                  cx={x2}
                  cy={y2}
                  r={8}
                  onMouseDown={(event) =>
                    onGradientOverlayMouseDown(
                      master.id,
                      fill,
                      left,
                      top,
                      scaledWidth,
                      scaledHeight,
                      'end',
                      event
                    )
                  }
                />
              </svg>
            )
          })()
        : null}
      <div
        data-testid="element-hitbox"
        style={{
          position: 'absolute',
          left,
          top,
          width: scaledWidth,
          height: scaledHeight,
          zIndex: 1,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={(event) => onElementMouseDown(master.id, event)}
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => onElementContextMenu(master.id, appearance.id, event)}
      />
    </>
  )
}
