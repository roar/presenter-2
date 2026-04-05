import type { ShapeGeometry } from '../model/types'

export interface ShapeTextLineSpan {
  x: number
  width: number
}

export function resolveShapeTextLineSpan(
  geometry: ShapeGeometry | null | undefined,
  frameWidth: number,
  frameHeight: number,
  lineCenterY: number
): ShapeTextLineSpan | null {
  if (!geometry) {
    return { x: 0, width: frameWidth }
  }

  if (geometry.type === 'rect') {
    if (lineCenterY < 0 || lineCenterY > frameHeight) {
      return null
    }
    return { x: 0, width: frameWidth }
  }

  if (geometry.type === 'ellipse') {
    if (lineCenterY < 0 || lineCenterY > frameHeight) {
      return null
    }

    const rx = frameWidth / 2
    const ry = frameHeight / 2
    if (rx <= 0 || ry <= 0) {
      return null
    }

    const cy = ry
    const normalizedY = (lineCenterY - cy) / ry
    const squaredTerm = 1 - normalizedY * normalizedY
    const halfChord = squaredTerm <= 0 ? 0 : rx * Math.sqrt(squaredTerm)
    const cx = rx

    return {
      x: cx - halfChord,
      width: halfChord * 2
    }
  }

  return null
}
