import React from 'react'
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@shared/model/types'
import type { MovePath, Position } from '@shared/model/types'
import { BezierEditorOverlay } from './BezierEditorOverlay'
import type {
  MoveCanvasPointState,
  MoveCanvasSelectionState
} from '../../store/animationCanvasModel'
import styles from './SlideCanvas.module.css'

interface AnimationPathOverlayProps {
  baseLeft: number
  baseTop: number
  ghostWidth: number
  ghostHeight: number
  moveCanvasSelection: MoveCanvasSelectionState
  onSelect(animationId: string, event: React.MouseEvent): void
  onContextMenu(animationId: string, event: React.MouseEvent): void
  onPointMouseDown(pointId: string, event: React.MouseEvent): void
  onPointContextMenu(point: MoveCanvasPointState, event: React.MouseEvent): void
  onHandleMouseDown(pointId: string, handle: 'in' | 'out', event: React.MouseEvent): void
  onInsertPointMouseDown(segmentIndex: number, position: Position, event: React.MouseEvent): void
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

function buildPathDataFromMovePath(
  baseLeft: number,
  baseTop: number,
  ghostWidth: number,
  ghostHeight: number,
  startDelta: Position,
  path: MovePath
): string | null {
  if (path.points.length < 2) return null

  const first = toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, {
    x: startDelta.x + path.points[0].position.x,
    y: startDelta.y + path.points[0].position.y
  })
  const commands = [`M ${first.x} ${first.y}`]

  for (let index = 1; index < path.points.length; index += 1) {
    const previous = path.points[index - 1]
    const current = path.points[index]
    const currentPoint = toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, {
      x: startDelta.x + current.position.x,
      y: startDelta.y + current.position.y
    })
    const control1 = previous.outHandle
      ? toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, {
          x: startDelta.x + previous.outHandle.x,
          y: startDelta.y + previous.outHandle.y
        })
      : null
    const control2 = current.inHandle
      ? toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, {
          x: startDelta.x + current.inHandle.x,
          y: startDelta.y + current.inHandle.y
        })
      : null

    if (control1 || control2) {
      const fallbackStart = toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, {
        x: startDelta.x + previous.position.x,
        y: startDelta.y + previous.position.y
      })
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
  onContextMenu,
  onPointMouseDown,
  onPointContextMenu,
  onHandleMouseDown,
  onInsertPointMouseDown
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
      style={{ left: 0, top: 0, width: SLIDE_WIDTH, height: SLIDE_HEIGHT, zIndex: 6 }}
    >
      {moveCanvasSelection.historySegments.map((segment) => {
        const pathData = segment.path
          ? buildPathDataFromMovePath(
              baseLeft,
              baseTop,
              ghostWidth,
              ghostHeight,
              segment.startDelta,
              segment.path
            )
          : null
        const start = toAbsolutePoint(
          baseLeft,
          baseTop,
          ghostWidth,
          ghostHeight,
          segment.startDelta
        )
        const end = toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, segment.endDelta)

        return pathData ? (
          <path
            key={segment.animationId}
            data-testid="animation-path"
            aria-label="Move animation path"
            className={styles.animationPath}
            d={pathData}
            fill="none"
            onClick={(event) => onSelect(segment.animationId, event)}
            onContextMenu={(event) => onContextMenu(segment.animationId, event)}
          />
        ) : (
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
        const pathData = segment.path
          ? buildPathDataFromMovePath(
              baseLeft,
              baseTop,
              ghostWidth,
              ghostHeight,
              segment.startDelta,
              segment.path
            )
          : null
        const start = toAbsolutePoint(
          baseLeft,
          baseTop,
          ghostWidth,
          ghostHeight,
          segment.startDelta
        )
        const end = toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, segment.endDelta)

        return pathData ? (
          <path
            key={segment.animationId}
            data-testid="animation-path"
            aria-label="Move animation path"
            className={styles.animationPath}
            d={pathData}
            fill="none"
            onClick={(event) => onSelect(segment.animationId, event)}
            onContextMenu={(event) => onContextMenu(segment.animationId, event)}
          />
        ) : (
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
        <g
          onClick={(event) => onSelect(moveCanvasSelection.activeSegment.animationId, event)}
          onContextMenu={(event) =>
            onContextMenu(moveCanvasSelection.activeSegment.animationId, event)
          }
        >
          <BezierEditorOverlay
            points={moveCanvasSelection.activePoints.map((point) => ({
              id: point.id,
              position: toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, point.position),
              inHandle: point.inHandle
                ? toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, point.inHandle)
                : undefined,
              outHandle: point.outHandle
                ? toAbsolutePoint(baseLeft, baseTop, ghostWidth, ghostHeight, point.outHandle)
                : undefined,
              isEndpoint: point.isEndpoint
            }))}
            onPointMouseDown={onPointMouseDown}
            onPointContextMenu={(pointId, event) => {
              const point = moveCanvasSelection.activePoints.find(
                (candidate) => candidate.id === pointId
              )
              if (point) onPointContextMenu(point, event)
            }}
            onHandleMouseDown={onHandleMouseDown}
            onInsertPointMouseDown={(segmentIndex, position, event) =>
              onInsertPointMouseDown(
                segmentIndex,
                {
                  x: position.x - baseLeft - ghostWidth / 2,
                  y: position.y - baseTop - ghostHeight / 2
                },
                event
              )
            }
          />
        </g>
      ) : null}
    </svg>
  )
}
