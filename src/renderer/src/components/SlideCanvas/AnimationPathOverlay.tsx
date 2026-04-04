import React from 'react'
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@shared/model/types'
import type { Position } from '@shared/model/types'
import type { MoveCanvasSelectionState } from '../../store/animationCanvasModel'
import styles from './SlideCanvas.module.css'

interface AnimationPathOverlayProps {
  baseLeft: number
  baseTop: number
  ghostWidth: number
  ghostHeight: number
  moveCanvasSelection: MoveCanvasSelectionState
  onSelect(animationId: string, event: React.MouseEvent): void
  onContextMenu(animationId: string, event: React.MouseEvent): void
}

function toAbsolutePoint(
  baseLeft: number,
  baseTop: number,
  ghostWidth: number,
  ghostHeight: number,
  point: Position
): Position {
  return {
    x: baseLeft + point.x + ghostWidth / 2,
    y: baseTop + point.y + ghostHeight / 2
  }
}

function buildActivePathData(
  baseLeft: number,
  baseTop: number,
  ghostWidth: number,
  ghostHeight: number,
  moveCanvasSelection: MoveCanvasSelectionState
): string | null {
  const points = moveCanvasSelection.activePoints
  if (points.length < 2) return null

  const first = toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, points[0].position)
  const commands = [`M ${first.x} ${first.y}`]

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const currentPoint = toAbsolutePoint(
      baseLeft,
      baseTop,
      ghostWidth,
      ghostHeight,
      current.position
    )
    const control1 = previous.outHandle
      ? toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, previous.outHandle)
      : null
    const control2 = current.inHandle
      ? toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, current.inHandle)
      : null

    if (control1 || control2) {
      const fallbackStart = toAbsolutePoint(
        baseLeft,
        baseTop,
        ghostWidth,
        ghostHeight,
        previous.position
      )
      commands.push(
        `C ${(control1 ?? fallbackStart).x} ${(control1 ?? fallbackStart).y} ${(control2 ?? currentPoint).x} ${(control2 ?? currentPoint).y} ${currentPoint.x} ${currentPoint.y}`
      )
    } else {
      commands.push(`L ${currentPoint.x} ${currentPoint.y}`)
    }
  }

  return commands.join(' ')
}

export function AnimationPathOverlay({
  baseLeft,
  baseTop,
  ghostWidth,
  ghostHeight,
  moveCanvasSelection,
  onSelect,
  onContextMenu
}: AnimationPathOverlayProps): React.JSX.Element | null {
  if (
    moveCanvasSelection.historySegments.length === 0 &&
    moveCanvasSelection.activeSegment == null &&
    moveCanvasSelection.downstreamSegments.length === 0 &&
    moveCanvasSelection.activePoints.length === 0
  ) {
    return null
  }

  const activePathData = buildActivePathData(
    baseLeft,
    baseTop,
    ghostWidth,
    ghostHeight,
    moveCanvasSelection
  )

  return (
    <svg
      aria-label="Move animation path overlay"
      className={styles.animationOverlay}
      style={{ left: 0, top: 0, width: SLIDE_WIDTH, height: SLIDE_HEIGHT, zIndex: 4 }}
    >
      {moveCanvasSelection.historySegments.map((segment) => {
        const start = toAbsolutePoint(
          baseLeft,
          baseTop,
          ghostWidth,
          ghostHeight,
          segment.startDelta
        )
        const end = toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, segment.endDelta)

        return (
          <line
            key={segment.animationId}
            data-testid="animation-path"
            aria-label="Move animation path"
            className={styles.animationPath}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            onClick={(event) => onSelect(segment.animationId, event)}
            onContextMenu={(event) => onContextMenu(segment.animationId, event)}
          />
        )
      })}
      {moveCanvasSelection.downstreamSegments.map((segment) => {
        const start = toAbsolutePoint(
          baseLeft,
          baseTop,
          ghostWidth,
          ghostHeight,
          segment.startDelta
        )
        const end = toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, segment.endDelta)

        return (
          <line
            key={segment.animationId}
            data-testid="animation-path"
            aria-label="Move animation path"
            className={styles.animationPath}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            onClick={(event) => onSelect(segment.animationId, event)}
            onContextMenu={(event) => onContextMenu(segment.animationId, event)}
          />
        )
      })}
      {moveCanvasSelection.activeSegment && activePathData ? (
        <path
          data-testid="animation-path"
          aria-label="Move animation path"
          className={`${styles.animationPath} ${styles.animationPathSelected}`}
          d={activePathData}
          fill="none"
          onClick={(event) => onSelect(moveCanvasSelection.activeSegment!.animationId, event)}
          onContextMenu={(event) =>
            onContextMenu(moveCanvasSelection.activeSegment!.animationId, event)
          }
        />
      ) : null}
      {moveCanvasSelection.activePoints.map((point) => (
        <React.Fragment key={point.id}>
          {point.inHandle ? (
            <>
              <line
                data-testid="animation-path-handle-line"
                className={styles.animationPathHandleLine}
                x1={toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, point.position).x}
                y1={toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, point.position).y}
                x2={toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, point.inHandle).x}
                y2={toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, point.inHandle).y}
              />
              <circle
                data-testid="animation-path-handle"
                className={styles.animationPathHandle}
                cx={toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, point.inHandle).x}
                cy={toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, point.inHandle).y}
                r={4}
              />
            </>
          ) : null}
          {point.outHandle ? (
            <>
              <line
                data-testid="animation-path-handle-line"
                className={styles.animationPathHandleLine}
                x1={toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, point.position).x}
                y1={toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, point.position).y}
                x2={toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, point.outHandle).x}
                y2={toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, point.outHandle).y}
              />
              <circle
                data-testid="animation-path-handle"
                className={styles.animationPathHandle}
                cx={toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, point.outHandle).x}
                cy={toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, point.outHandle).y}
                r={4}
              />
            </>
          ) : null}
          <circle
            data-testid="animation-path-point"
            className={`${styles.animationPathPoint} ${
              point.isEndpoint ? styles.animationPathPointEndpoint : ''
            }`}
            cx={toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, point.position).x}
            cy={toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, point.position).y}
            r={point.isEndpoint ? 5 : 4}
          />
        </React.Fragment>
      ))}
    </svg>
  )
}
