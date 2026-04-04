import React from 'react'
import type { RenderedAppearance } from '@shared/animation/types'
import type { Appearance, MsoMaster, Position } from '@shared/model/types'
import { ImageView } from './ImageView'
import { ShapeView } from './ShapeView'
import { TextView } from './TextView'
import type { MoveChainStepState } from '../../store/animationCanvasModel'
import { getAnimationOverlayMetrics } from './animationOverlayMetrics'
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

  const { baseLeft, baseTop, ghostWidth, ghostHeight, rotation } = getAnimationOverlayMetrics(
    master,
    renderedAppearance
  )

  return (
    <>
      {moveChainStates.map((step) => {
        const isSelected = step.animationId === selectedAnimationId
        const ghostLeft = baseLeft + step.cumulativeDelta.x
        const ghostTop = baseTop + step.cumulativeDelta.y

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
                width: ghostWidth,
                height: ghostHeight,
                transform: `rotate(${rotation}deg)`,
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
