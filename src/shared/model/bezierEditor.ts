import type { MovePath, MovePathPoint, Position, SplinePoint, SplinePointKind } from './types'

export type BezierEditorPointKind = 'corner' | 'smooth' | 'balanced' | 'free'

export interface BezierEditorPoint {
  id: string
  x: number
  y: number
  kind: BezierEditorPointKind
  inHandle?: Position
  outHandle?: Position
}

export interface BezierEditorPath {
  points: BezierEditorPoint[]
}

function clonePosition(position: Position | undefined): Position | undefined {
  return position ? { ...position } : undefined
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(12))
}

function clonePoint(point: BezierEditorPoint): BezierEditorPoint {
  return {
    ...point,
    inHandle: clonePosition(point.inHandle),
    outHandle: clonePosition(point.outHandle)
  }
}

export function cloneBezierEditorPath(path: BezierEditorPath): BezierEditorPath {
  return { points: path.points.map(clonePoint) }
}

function resolveDefaultHandleSpan(
  path: BezierEditorPath,
  pointIndex: number
): { dx: number; dy: number } {
  const point = path.points[pointIndex]
  const previous = path.points[pointIndex - 1]
  const next = path.points[pointIndex + 1]
  const dx = next ? (next.x - point.x) / 4 : previous ? (point.x - previous.x) / 4 : 20
  const dy = next ? (next.y - point.y) / 4 : previous ? (point.y - previous.y) / 4 : 0
  return { dx, dy }
}

export function insertBezierEditorPointAtSegment(
  path: BezierEditorPath,
  segmentIndex: number,
  point: { id: string; x: number; y: number; kind?: BezierEditorPointKind }
): BezierEditorPath {
  const start = path.points[segmentIndex]
  const end = path.points[segmentIndex + 1]
  if (!start || !end) return path

  const dx = end.x - start.x
  const dy = end.y - start.y
  const insertedPoint: BezierEditorPoint = {
    id: point.id,
    x: point.x,
    y: point.y,
    kind: point.kind ?? 'smooth',
    inHandle: { x: point.x - dx / 4, y: point.y - dy / 4 },
    outHandle: { x: point.x + dx / 4, y: point.y + dy / 4 }
  }

  return {
    points: [
      ...path.points.slice(0, segmentIndex + 1).map(clonePoint),
      insertedPoint,
      ...path.points.slice(segmentIndex + 1).map(clonePoint)
    ]
  }
}

export function convertBezierEditorPointToCorner(
  path: BezierEditorPath,
  pointId: string
): BezierEditorPath {
  return {
    points: path.points.map((point) =>
      point.id === pointId
        ? { ...clonePoint(point), kind: 'corner', inHandle: undefined, outHandle: undefined }
        : clonePoint(point)
    )
  }
}

export function convertBezierEditorPointToFree(
  path: BezierEditorPath,
  pointId: string
): BezierEditorPath {
  const pointIndex = path.points.findIndex((point) => point.id === pointId)
  if (pointIndex < 0) return path

  const point = path.points[pointIndex]
  if (point.kind === 'free' && point.inHandle && point.outHandle) {
    return cloneBezierEditorPath(path)
  }

  const { dx, dy } = resolveDefaultHandleSpan(path, pointIndex)

  return {
    points: path.points.map((candidate) =>
      candidate.id === pointId
        ? {
            ...clonePoint(candidate),
            kind: 'free',
            inHandle: candidate.inHandle ?? { x: candidate.x - dx, y: candidate.y - dy },
            outHandle: candidate.outHandle ?? { x: candidate.x + dx, y: candidate.y + dy }
          }
        : clonePoint(candidate)
    )
  }
}

function alignedHandlesForKind(
  point: BezierEditorPoint,
  previousPoint: BezierEditorPoint | undefined,
  nextPoint: BezierEditorPoint | undefined,
  nextKind: 'smooth' | 'balanced'
): Pick<BezierEditorPoint, 'kind' | 'inHandle' | 'outHandle'> {
  const inDx = point.inHandle
    ? point.x - point.inHandle.x
    : previousPoint
      ? (point.x - previousPoint.x) / 4
      : 20
  const inDy = point.inHandle
    ? point.y - point.inHandle.y
    : previousPoint
      ? (point.y - previousPoint.y) / 4
      : 0
  const outDx = point.outHandle
    ? point.outHandle.x - point.x
    : nextPoint
      ? (nextPoint.x - point.x) / 4
      : 20
  const outDy = point.outHandle
    ? point.outHandle.y - point.y
    : nextPoint
      ? (nextPoint.y - point.y) / 4
      : 0

  let tangentX = outDx
  let tangentY = outDy
  if (tangentX === 0 && tangentY === 0) {
    tangentX = inDx
    tangentY = inDy
  }
  if (tangentX === 0 && tangentY === 0) {
    tangentX = 20
    tangentY = 0
  }

  const tangentLength = Math.hypot(tangentX, tangentY) || 1
  const unitX = tangentX / tangentLength
  const unitY = tangentY / tangentLength
  const inLength = Math.hypot(inDx, inDy) || tangentLength
  const outLength = Math.hypot(outDx, outDy) || tangentLength
  const handleLength = nextKind === 'balanced' ? (inLength + outLength) / 2 : undefined

  return {
    kind: nextKind,
    inHandle: {
      x: point.x - unitX * (handleLength ?? inLength),
      y: point.y - unitY * (handleLength ?? inLength)
    },
    outHandle: {
      x: point.x + unitX * (handleLength ?? outLength),
      y: point.y + unitY * (handleLength ?? outLength)
    }
  }
}

export function convertBezierEditorPointToSmooth(
  path: BezierEditorPath,
  pointId: string
): BezierEditorPath {
  const pointIndex = path.points.findIndex((point) => point.id === pointId)
  if (pointIndex < 0) return path

  const point = path.points[pointIndex]
  const previousPoint = path.points[pointIndex - 1]
  const nextPoint = path.points[pointIndex + 1]
  const nextState = alignedHandlesForKind(point, previousPoint, nextPoint, 'smooth')

  return {
    points: path.points.map((candidate) =>
      candidate.id === pointId ? { ...clonePoint(candidate), ...nextState } : clonePoint(candidate)
    )
  }
}

export function convertBezierEditorPointToBalanced(
  path: BezierEditorPath,
  pointId: string
): BezierEditorPath {
  const pointIndex = path.points.findIndex((point) => point.id === pointId)
  if (pointIndex < 0) return path

  const point = path.points[pointIndex]
  const previousPoint = path.points[pointIndex - 1]
  const nextPoint = path.points[pointIndex + 1]
  const nextState = alignedHandlesForKind(point, previousPoint, nextPoint, 'balanced')

  return {
    points: path.points.map((candidate) =>
      candidate.id === pointId ? { ...clonePoint(candidate), ...nextState } : clonePoint(candidate)
    )
  }
}

export function deleteBezierEditorPoint(path: BezierEditorPath, pointId: string): BezierEditorPath {
  const pointIndex = path.points.findIndex((point) => point.id === pointId)
  if (pointIndex <= 0 || pointIndex >= path.points.length - 1) {
    return cloneBezierEditorPath(path)
  }

  return {
    points: path.points.filter((point) => point.id !== pointId).map(clonePoint)
  }
}

function movePathPointTypeToBezierKind(type: MovePathPoint['type']): BezierEditorPointKind {
  if (type === 'sharp') return 'corner'
  if (type === 'smooth') return 'smooth'
  return 'free'
}

function bezierKindToMovePathPointType(kind: BezierEditorPointKind): MovePathPoint['type'] {
  if (kind === 'corner') return 'sharp'
  if (kind === 'smooth' || kind === 'balanced') return 'smooth'
  return 'bezier'
}

export function movePathToBezierEditorPath(path: MovePath): BezierEditorPath {
  return {
    points: path.points.map((point) => ({
      id: point.id,
      x: point.position.x,
      y: point.position.y,
      kind: movePathPointTypeToBezierKind(point.type),
      inHandle: clonePosition(point.inHandle),
      outHandle: clonePosition(point.outHandle)
    }))
  }
}

export function bezierEditorPathToMovePath(path: BezierEditorPath): MovePath {
  return {
    points: path.points.map((point) => ({
      id: point.id,
      position: { x: point.x, y: point.y },
      type: bezierKindToMovePathPointType(point.kind),
      inHandle: clonePosition(point.inHandle),
      outHandle: clonePosition(point.outHandle)
    }))
  }
}

function splinePointKindToBezierKind(kind: SplinePointKind): BezierEditorPointKind {
  if (kind === 'corner') return 'corner'
  if (kind === 'smooth') return 'smooth'
  return 'balanced'
}

function bezierKindToSplinePointKind(kind: BezierEditorPointKind): SplinePointKind {
  if (kind === 'corner') return 'corner'
  if (kind === 'smooth') return 'smooth'
  return 'balanced'
}

export function splinePointsToBezierEditorPath(points: SplinePoint[]): BezierEditorPath {
  return {
    points: points.map((point, index) => ({
      id: `spline-${index}`,
      x: point.x,
      y: point.y,
      kind: splinePointKindToBezierKind(point.kind),
      inHandle: point.inHandle
        ? { x: point.x + point.inHandle.dx, y: point.y + point.inHandle.dy }
        : undefined,
      outHandle: point.outHandle
        ? { x: point.x + point.outHandle.dx, y: point.y + point.outHandle.dy }
        : undefined
    }))
  }
}

export function bezierEditorPathToSplinePoints(path: BezierEditorPath): SplinePoint[] {
  return path.points.map((point) => {
    const splinePoint: SplinePoint = {
      x: point.x,
      y: point.y,
      kind: bezierKindToSplinePointKind(point.kind)
    }

    if (point.inHandle) {
      splinePoint.inHandle = {
        dx: roundCoordinate(point.inHandle.x - point.x),
        dy: roundCoordinate(point.inHandle.y - point.y)
      }
    }

    if (point.outHandle) {
      splinePoint.outHandle = {
        dx: roundCoordinate(point.outHandle.x - point.x),
        dy: roundCoordinate(point.outHandle.y - point.y)
      }
    }

    return splinePoint
  })
}
