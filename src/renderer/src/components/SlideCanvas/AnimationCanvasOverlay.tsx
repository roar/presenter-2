import React from 'react'
import type { RenderedAppearance } from '@shared/animation/types'
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@shared/model/types'
import type { Appearance, MsoMaster, Position } from '@shared/model/types'
import { ImageView } from './ImageView'
import { SelectionOverlay } from './SelectionOverlay'
import { ShapeView } from './ShapeView'
import { TextView } from './TextView'
import type { TransformChainStepState } from '../../store/animationCanvasModel'
import { getAnimationOverlayMetrics } from './animationOverlayMetrics'
import styles from './SlideCanvas.module.css'

interface AnimationCanvasOverlayProps {
  master: MsoMaster
  renderedAppearance: RenderedAppearance
  transformChainStates: TransformChainStepState[]
  selectedAnimationId: string | null
  canvasScale: number
  onSelect(animationId: string, event: React.MouseEvent): void
  onContextMenu(animationId: string, event: React.MouseEvent): void
  onGhostMouseDown(
    animationId: string,
    state:
      | { type: 'move'; delta: Position }
      | { type: 'scale'; scale: number }
      | { type: 'rotate'; rotation: number },
    event: React.MouseEvent
  ): void
  onScaleHandleMouseDown?: (
    handle: 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br',
    state: {
      animationId: string
      centerX: number
      centerY: number
      width: number
      height: number
      cumulativeScale: number
      previousCumulativeScale: number
      rotation: number
    },
    event: React.MouseEvent
  ) => void
  onRotateHandleMouseDown?: (
    state: {
      animationId: string
      centerX: number
      centerY: number
      width: number
      height: number
      cumulativeRotation: number
      previousCumulativeRotation: number
    },
    event: React.MouseEvent
  ) => void
}

function renderAnimationGhostObject(
  master: MsoMaster,
  appearance: Appearance,
  width: number,
  height: number
): React.JSX.Element | null {
  const ghostMaster = {
    ...master,
    transform: {
      ...master.transform,
      x: 0,
      y: 0,
      width,
      height,
      rotation: 0
    }
  }

  if (master.type === 'shape') {
    return <ShapeView master={ghostMaster} appearance={appearance} />
  }

  if (master.type === 'text') {
    return <TextView master={ghostMaster} appearance={appearance} />
  }

  if (master.type === 'image') {
    return <ImageView master={ghostMaster} appearance={appearance} />
  }

  return null
}

function getGhostZIndex(stepType: TransformChainStepState['type']): number {
  // Move ghosts must stay above scale ghosts so earlier move steps remain hittable
  // even when a later scale step expands over the same area.
  return stepType === 'move' ? 5 : 4
}

export function AnimationCanvasOverlay({
  master,
  renderedAppearance,
  transformChainStates,
  selectedAnimationId,
  canvasScale,
  onSelect,
  onContextMenu,
  onGhostMouseDown,
  onScaleHandleMouseDown,
  onRotateHandleMouseDown
}: AnimationCanvasOverlayProps): React.JSX.Element | null {
  if (transformChainStates.length === 0) return null

  const { baseLeft, baseTop, ghostWidth, ghostHeight, rotation } = getAnimationOverlayMetrics(
    master,
    renderedAppearance
  )
  const baseCenterX = baseLeft + ghostWidth / 2
  const baseCenterY = baseTop + ghostHeight / 2

  return (
    <>
      {transformChainStates.map((step, index) => {
        const isSelected = step.animationId === selectedAnimationId
        const scaledGhostWidth = ghostWidth * step.cumulativeScale
        const scaledGhostHeight = ghostHeight * step.cumulativeScale
        const ghostCenterX = baseCenterX + step.cumulativeDelta.x
        const ghostCenterY = baseCenterY + step.cumulativeDelta.y
        const ghostLeft = ghostCenterX - scaledGhostWidth / 2
        const ghostTop = ghostCenterY - scaledGhostHeight / 2
        const previousCumulativeScale =
          index > 0 ? transformChainStates[index - 1].cumulativeScale : 1
        const previousCumulativeRotation =
          index > 0 ? transformChainStates[index - 1].cumulativeRotation : 0
        const ghostRotation = rotation + step.cumulativeRotation

        return (
          <React.Fragment key={step.animationId}>
            <div
              aria-label="Move animation ghost"
              data-testid="animation-ghost"
              className={`${styles.animationGhost} ${
                isSelected ? styles.animationGhostSelected : ''
              }`}
              style={{
                left: ghostLeft,
                top: ghostTop,
                width: scaledGhostWidth,
                height: scaledGhostHeight,
                transform: `rotate(${ghostRotation}deg)`,
                zIndex: getGhostZIndex(step.type)
              }}
              onMouseDown={(event) =>
                onGhostMouseDown(
                  step.animationId,
                  step.type === 'move'
                    ? { type: 'move', delta: step.delta ?? { x: 0, y: 0 } }
                    : step.type === 'scale'
                      ? { type: 'scale', scale: step.scale ?? 1 }
                      : { type: 'rotate', rotation: step.rotation ?? 0 },
                  event
                )
              }
              onClick={(event) => onSelect(step.animationId, event)}
              onContextMenu={(event) => onContextMenu(step.animationId, event)}
            >
              <div
                className={`${styles.animationGhostContent} ${
                  isSelected ? styles.animationGhostContentSelected : ''
                }`}
              >
                {renderAnimationGhostObject(
                  master,
                  renderedAppearance.appearance,
                  scaledGhostWidth,
                  scaledGhostHeight
                )}
              </div>
            </div>
            {isSelected && step.type === 'scale' && onScaleHandleMouseDown ? (
              <SelectionOverlay
                rotation={ghostRotation}
                cx={ghostCenterX}
                cy={ghostCenterY}
                scaledWidth={scaledGhostWidth}
                scaledHeight={scaledGhostHeight}
                opacity={1}
                visible={true}
                scale={canvasScale}
                slideWidth={SLIDE_WIDTH}
                slideHeight={SLIDE_HEIGHT}
                isDragging={false}
                showRotationHandle={false}
                onHandleMouseDown={(handle, event) => {
                  if (handle === 'rotation') return
                  onScaleHandleMouseDown(
                    handle,
                    {
                      animationId: step.animationId,
                      centerX: ghostCenterX,
                      centerY: ghostCenterY,
                      width: scaledGhostWidth,
                      height: scaledGhostHeight,
                      cumulativeScale: step.cumulativeScale,
                      previousCumulativeScale,
                      rotation: ghostRotation
                    },
                    event
                  )
                }}
              />
            ) : null}
            {isSelected && step.type === 'rotate' && onRotateHandleMouseDown ? (
              <SelectionOverlay
                rotation={ghostRotation}
                cx={ghostCenterX}
                cy={ghostCenterY}
                scaledWidth={scaledGhostWidth}
                scaledHeight={scaledGhostHeight}
                opacity={1}
                visible={true}
                scale={canvasScale}
                slideWidth={SLIDE_WIDTH}
                slideHeight={SLIDE_HEIGHT}
                isDragging={false}
                showResizeHandles={false}
                onHandleMouseDown={(handle, event) => {
                  if (handle !== 'rotation') return
                  onRotateHandleMouseDown(
                    {
                      animationId: step.animationId,
                      centerX: ghostCenterX,
                      centerY: ghostCenterY,
                      width: scaledGhostWidth,
                      height: scaledGhostHeight,
                      cumulativeRotation: step.cumulativeRotation,
                      previousCumulativeRotation
                    },
                    event
                  )
                }}
              />
            ) : null}
          </React.Fragment>
        )
      })}
    </>
  )
}
