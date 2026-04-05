import React, { useState } from 'react'
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@shared/model/types'
import type { Position } from '@shared/model/types'
import styles from './SlideCanvas.module.css'

export interface BezierEditorOverlayPoint {
  id: string
  position: Position
  inHandle?: Position
  outHandle?: Position
  isEndpoint: boolean
}

interface BezierEditorOverlayProps {
  points: BezierEditorOverlayPoint[]
  onPointMouseDown(pointId: string, event: React.MouseEvent): void
  onPointContextMenu(pointId: string, event: React.MouseEvent): void
  onHandleMouseDown(pointId: string, handle: 'in' | 'out', event: React.MouseEvent): void
  onInsertPointMouseDown(segmentIndex: number, position: Position, event: React.MouseEvent): void
}

function interpolateCubic(a: number, b: number, c: number, d: number, t: number): number {
  const mt = 1 - t
  return mt * mt * mt * a + 3 * mt * mt * t * b + 3 * mt * t * t * c + t * t * t * d
}

function getCubicPoint(
  start: Position,
  control1: Position,
  control2: Position,
  end: Position,
  t: number
): Position {
  return {
    x: interpolateCubic(start.x, control1.x, control2.x, end.x, t),
    y: interpolateCubic(start.y, control1.y, control2.y, end.y, t)
  }
}

function getArcLengthMidpoint(
  start: Position,
  control1: Position,
  control2: Position,
  end: Position
): Position {
  const samples = 40
  let previousPoint = getCubicPoint(start, control1, control2, end, 0)
  const sampledPoints = [{ point: previousPoint, length: 0 }]
  let totalLength = 0

  for (let index = 1; index <= samples; index += 1) {
    const point = getCubicPoint(start, control1, control2, end, index / samples)
    totalLength += Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y)
    sampledPoints.push({ point, length: totalLength })
    previousPoint = point
  }

  const halfLength = totalLength / 2
  for (let index = 1; index < sampledPoints.length; index += 1) {
    const previousSample = sampledPoints[index - 1]
    const currentSample = sampledPoints[index]
    if (currentSample.length < halfLength) continue

    const segmentLength = currentSample.length - previousSample.length || 1
    const ratio = (halfLength - previousSample.length) / segmentLength
    return {
      x: previousSample.point.x + (currentSample.point.x - previousSample.point.x) * ratio,
      y: previousSample.point.y + (currentSample.point.y - previousSample.point.y) * ratio
    }
  }

  return sampledPoints[sampledPoints.length - 1].point
}

function getSegmentInsertPoint(
  previous: Position & { outHandle?: Position },
  current: Position & { inHandle?: Position }
): Position {
  if (previous.outHandle || current.inHandle) {
    return getArcLengthMidpoint(
      previous,
      previous.outHandle ?? previous,
      current.inHandle ?? current,
      current
    )
  }

  return { x: (previous.x + current.x) / 2, y: (previous.y + current.y) / 2 }
}

function buildPathData(points: BezierEditorOverlayPoint[]): string | null {
  if (points.length < 2) return null

  const commands = [`M ${points[0].position.x} ${points[0].position.y}`]

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]

    if (previous.outHandle || current.inHandle) {
      const control1 = previous.outHandle ?? previous.position
      const control2 = current.inHandle ?? current.position
      commands.push(
        `C ${control1.x} ${control1.y} ${control2.x} ${control2.y} ${current.position.x} ${current.position.y}`
      )
    } else {
      commands.push(`L ${current.position.x} ${current.position.y}`)
    }
  }

  return commands.join(' ')
}

export function BezierEditorOverlay({
  points,
  onPointMouseDown,
  onPointContextMenu,
  onHandleMouseDown,
  onInsertPointMouseDown
}: BezierEditorOverlayProps): React.JSX.Element | null {
  const [hoveredSegmentIndex, setHoveredSegmentIndex] = useState<number | null>(null)

  if (points.length === 0) return null

  const activePathData = buildPathData(points)

  return (
    <svg
      aria-label="Bezier editor overlay"
      className={styles.animationOverlay}
      style={{ left: 0, top: 0, width: SLIDE_WIDTH, height: SLIDE_HEIGHT, zIndex: 6 }}
    >
      {activePathData ? (
        <path
          data-testid="animation-path"
          aria-label="Move animation path"
          className={`${styles.animationPath} ${styles.animationPathSelected}`}
          d={activePathData}
          fill="none"
        />
      ) : null}
      {points.slice(0, -1).map((point, index) => {
        const nextPoint = points[index + 1]
        const midpoint = getSegmentInsertPoint(
          { ...point.position, outHandle: point.outHandle },
          { ...nextPoint.position, inHandle: nextPoint.inHandle }
        )

        return (
          <React.Fragment key={`insert-${point.id}-${nextPoint.id}`}>
            <circle
              data-testid="animation-path-insert-hit-area"
              className={styles.animationPathInsertHitArea}
              cx={midpoint.x}
              cy={midpoint.y}
              r={18}
              onMouseEnter={() => setHoveredSegmentIndex(index)}
              onMouseLeave={() =>
                setHoveredSegmentIndex((current) => (current === index ? null : current))
              }
            />
            {hoveredSegmentIndex === index ? (
              <circle
                data-testid="animation-path-insert-point"
                className={styles.animationPathInsertPoint}
                cx={midpoint.x}
                cy={midpoint.y}
                r={10}
                onMouseDown={(event) => {
                  event.stopPropagation()
                  onInsertPointMouseDown(index, midpoint, event)
                }}
              />
            ) : null}
          </React.Fragment>
        )
      })}
      {points.map((point) => (
        <React.Fragment key={point.id}>
          {point.inHandle ? (
            <>
              <line
                data-testid="animation-path-handle-line"
                className={styles.animationPathHandleLine}
                x1={point.position.x}
                y1={point.position.y}
                x2={point.inHandle.x}
                y2={point.inHandle.y}
              />
              <circle
                data-testid="animation-path-handle"
                className={styles.animationPathHandle}
                cx={point.inHandle.x}
                cy={point.inHandle.y}
                r={4}
                onMouseDown={(event) => onHandleMouseDown(point.id, 'in', event)}
              />
            </>
          ) : null}
          {point.outHandle ? (
            <>
              <line
                data-testid="animation-path-handle-line"
                className={styles.animationPathHandleLine}
                x1={point.position.x}
                y1={point.position.y}
                x2={point.outHandle.x}
                y2={point.outHandle.y}
              />
              <circle
                data-testid="animation-path-handle"
                className={styles.animationPathHandle}
                cx={point.outHandle.x}
                cy={point.outHandle.y}
                r={4}
                onMouseDown={(event) => onHandleMouseDown(point.id, 'out', event)}
              />
            </>
          ) : null}
          <circle
            data-testid="animation-path-point"
            className={`${styles.animationPathPoint} ${
              point.isEndpoint ? styles.animationPathPointEndpoint : ''
            }`}
            cx={point.position.x}
            cy={point.position.y}
            r={point.isEndpoint ? 5 : 4}
            onMouseDown={(event) => onPointMouseDown(point.id, event)}
            onContextMenu={(event) => onPointContextMenu(point.id, event)}
          />
        </React.Fragment>
      ))}
    </svg>
  )
}
