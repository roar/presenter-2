import type { MovePath, MovePathPoint } from './types'

function clonePoint(point: MovePathPoint): MovePathPoint {
  return {
    ...point,
    position: { ...point.position },
    inHandle: point.inHandle ? { ...point.inHandle } : undefined,
    outHandle: point.outHandle ? { ...point.outHandle } : undefined
  }
}

export function cloneMovePath(path: MovePath): MovePath {
  return { points: path.points.map(clonePoint) }
}

export function insertBezierPointAtSegment(
  path: MovePath,
  segmentIndex: number,
  pointId: string
): MovePath {
  const start = path.points[segmentIndex]
  const end = path.points[segmentIndex + 1]
  if (!start || !end) return path

  const midX = (start.position.x + end.position.x) / 2
  const midY = (start.position.y + end.position.y) / 2
  const dx = end.position.x - start.position.x
  const dy = end.position.y - start.position.y
  const newPoint: MovePathPoint = {
    id: pointId,
    position: { x: midX, y: midY },
    type: 'bezier',
    inHandle: { x: midX - dx / 4, y: midY - dy / 4 },
    outHandle: { x: midX + dx / 4, y: midY + dy / 4 }
  }

  return {
    points: [
      ...path.points.slice(0, segmentIndex + 1),
      newPoint,
      ...path.points.slice(segmentIndex + 1)
    ]
  }
}

export function convertPointToSharp(path: MovePath, pointId: string): MovePath {
  return {
    points: path.points.map((point) =>
      point.id === pointId
        ? { ...clonePoint(point), type: 'sharp', inHandle: undefined, outHandle: undefined }
        : clonePoint(point)
    )
  }
}

export function convertPointToBezier(path: MovePath, pointId: string): MovePath {
  const index = path.points.findIndex((point) => point.id === pointId)
  if (index < 0) return path

  const point = path.points[index]
  if (point.type === 'bezier' && point.inHandle && point.outHandle) {
    return cloneMovePath(path)
  }

  const previous = path.points[index - 1]
  const next = path.points[index + 1]
  const dx = next
    ? (next.position.x - point.position.x) / 4
    : previous
      ? (point.position.x - previous.position.x) / 4
      : 20
  const dy = next
    ? (next.position.y - point.position.y) / 4
    : previous
      ? (point.position.y - previous.position.y) / 4
      : 0

  return {
    points: path.points.map((candidate) =>
      candidate.id === pointId
        ? {
            ...clonePoint(candidate),
            type: 'bezier',
            inHandle: candidate.inHandle ?? {
              x: candidate.position.x - dx,
              y: candidate.position.y - dy
            },
            outHandle: candidate.outHandle ?? {
              x: candidate.position.x + dx,
              y: candidate.position.y + dy
            }
          }
        : clonePoint(candidate)
    )
  }
}

export function deletePoint(path: MovePath, pointId: string): MovePath {
  const index = path.points.findIndex((point) => point.id === pointId)
  if (index <= 0 || index >= path.points.length - 1) return cloneMovePath(path)
  return {
    points: path.points.filter((point) => point.id !== pointId).map(clonePoint)
  }
}
