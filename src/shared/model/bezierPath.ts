import type { MovePath, MovePathPoint, Position } from './types'

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
  pointId: string,
  insertedPosition?: Position
): MovePath {
  const start = path.points[segmentIndex]
  const end = path.points[segmentIndex + 1]
  if (!start || !end) return path

  const midX = insertedPosition?.x ?? (start.position.x + end.position.x) / 2
  const midY = insertedPosition?.y ?? (start.position.y + end.position.y) / 2
  const dx = end.position.x - start.position.x
  const dy = end.position.y - start.position.y
  const newPoint: MovePathPoint = {
    id: pointId,
    position: { x: midX, y: midY },
    type: 'smooth',
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

export function convertPointToSmooth(path: MovePath, pointId: string): MovePath {
  const index = path.points.findIndex((point) => point.id === pointId)
  if (index < 0) return path

  const point = path.points[index]
  const previous = path.points[index - 1]
  const next = path.points[index + 1]
  const inDx = point.inHandle
    ? point.position.x - point.inHandle.x
    : previous
      ? (point.position.x - previous.position.x) / 4
      : 20
  const inDy = point.inHandle
    ? point.position.y - point.inHandle.y
    : previous
      ? (point.position.y - previous.position.y) / 4
      : 0
  const outDx = point.outHandle
    ? point.outHandle.x - point.position.x
    : next
      ? (next.position.x - point.position.x) / 4
      : 20
  const outDy = point.outHandle
    ? point.outHandle.y - point.position.y
    : next
      ? (next.position.y - point.position.y) / 4
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

  return {
    points: path.points.map((candidate) =>
      candidate.id === pointId
        ? {
            ...clonePoint(candidate),
            type: 'smooth',
            inHandle: {
              x: candidate.position.x - unitX * inLength,
              y: candidate.position.y - unitY * inLength
            },
            outHandle: {
              x: candidate.position.x + unitX * outLength,
              y: candidate.position.y + unitY * outLength
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
