import React from 'react'
import type { RenderedAppearance } from '@shared/animation/types'
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@shared/model/types'
import type { Appearance, MsoMaster, Position } from '@shared/model/types'
import { ImageView } from './ImageView'
import { ShapeView } from './ShapeView'
import { TextView } from './TextView'
import type { MoveChainStepState } from './animationCanvasModel'
import styles from './SlideCanvas.module.css'

interface AnimationCanvasOverlayProps {
  master: MsoMaster
  renderedAppearance: RenderedAppearance
  moveChainStates: MoveChainStepState[]
  selectedAnimationId: string | null
  onSelect(animationId: string, event: React.MouseEvent): void
  onContextMenu(animationId: string, event: React.MouseEvent): void
  onGhostMouseDown(animationId: string, delta: Position, event: React.MouseEvent): void
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

export function AnimationCanvasOverlay({
  master,
  renderedAppearance,
  moveChainStates,
  selectedAnimationId,
  onSelect,
  onContextMenu,
  onGhostMouseDown
}: AnimationCanvasOverlayProps): React.JSX.Element | null {
  if (moveChainStates.length === 0) return null

  const transform = renderedAppearance.transform
  const translateMatch = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/)
  const scaleMatch = transform.match(/scale\(([-\d.]+)\)/)
  const translateX = translateMatch ? Number(translateMatch[1]) : 0
  const translateY = translateMatch ? Number(translateMatch[2]) : 0
  const renderedScale = scaleMatch ? Number(scaleMatch[1]) : 1
  const baseLeft = master.transform.x + translateX
  const baseTop = master.transform.y + translateY
  const ghostWidth = master.transform.width * renderedScale
  const ghostHeight = master.transform.height * renderedScale

  return (
    <>
      {moveChainStates.map((step, index) => {
        const isSelected = step.animationId === selectedAnimationId
        const previousState = index === 0 ? null : moveChainStates[index - 1]
        const segmentStartLeft = previousState
          ? baseLeft + previousState.cumulativeDelta.x
          : baseLeft
        const segmentStartTop = previousState ? baseTop + previousState.cumulativeDelta.y : baseTop
        const ghostLeft = baseLeft + step.cumulativeDelta.x
        const ghostTop = baseTop + step.cumulativeDelta.y
        const startCenterX = segmentStartLeft + ghostWidth / 2
        const startCenterY = segmentStartTop + ghostHeight / 2
        const ghostCenterX = ghostLeft + ghostWidth / 2
        const ghostCenterY = ghostTop + ghostHeight / 2

        return (
          <React.Fragment key={step.animationId}>
            <svg
              aria-label="Move animation path"
              className={styles.animationOverlay}
              style={{ left: 0, top: 0, width: SLIDE_WIDTH, height: SLIDE_HEIGHT, zIndex: 4 }}
            >
              <line
                data-testid="animation-path"
                className={`${styles.animationPath} ${
                  isSelected ? styles.animationPathSelected : ''
                }`}
                x1={startCenterX}
                y1={startCenterY}
                x2={ghostCenterX}
                y2={ghostCenterY}
                onClick={(event) => onSelect(step.animationId, event)}
                onContextMenu={(event) => onContextMenu(step.animationId, event)}
              />
            </svg>
            <div
              aria-label="Move animation ghost"
              data-testid="animation-ghost"
              className={`${styles.animationGhost} ${
                isSelected ? styles.animationGhostSelected : ''
              }`}
              style={{
                left: ghostLeft,
                top: ghostTop,
                width: ghostWidth,
                height: ghostHeight,
                transform: `rotate(${master.transform.rotation}deg)`,
                zIndex: 5
              }}
              onMouseDown={(event) => onGhostMouseDown(step.animationId, step.delta, event)}
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
                  ghostWidth,
                  ghostHeight
                )}
              </div>
            </div>
          </React.Fragment>
        )
      })}
    </>
  )
}
