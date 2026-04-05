import type { ShapeTextLineSpan } from './shapeTextLayout'

export interface PathPolylinePoint {
  x: number
  y: number
}

export function resolvePathTextLineSpanFromPolyline(
  points: PathPolylinePoint[],
  lineCenterY: number,
  minX = Number.NEGATIVE_INFINITY,
  maxX = Number.POSITIVE_INFINITY
): ShapeTextLineSpan | null {
  if (points.length < 2) {
    return null
  }

  const intersections: number[] = []

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index]
    const end = points[index + 1]

    if (start.y === end.y) {
      continue
    }

    const lowerY = Math.min(start.y, end.y)
    const upperY = Math.max(start.y, end.y)
    if (lineCenterY < lowerY || lineCenterY >= upperY) {
      continue
    }

    const t = (lineCenterY - start.y) / (end.y - start.y)
    intersections.push(start.x + (end.x - start.x) * t)
  }

  intersections.sort((left, right) => left - right)

  let bestSpan: ShapeTextLineSpan | null = null
  for (let index = 0; index < intersections.length - 1; index += 2) {
    const left = Math.max(intersections[index], minX)
    const right = Math.min(intersections[index + 1], maxX)
    const width = right - left
    if (width <= 0) {
      continue
    }

    if (!bestSpan || width > bestSpan.width) {
      bestSpan = { x: left, width }
    }
  }

  return bestSpan
}

export function buildEllipsePolyline(
  width: number,
  height: number,
  segments = 64
): PathPolylinePoint[] {
  const rx = width / 2
  const ry = height / 2
  const cx = rx
  const cy = ry
  const points: PathPolylinePoint[] = []

  for (let index = 0; index <= segments; index += 1) {
    const angle = (Math.PI * 2 * index) / segments
    points.push({
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry
    })
  }

  return points
}
