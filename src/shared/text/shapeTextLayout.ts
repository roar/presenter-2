import type { ShapeGeometry } from '../model/types'
import { resolvePathScanlineSpan } from './pathScanlineLayout'

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

  if (geometry.type === 'path' && geometry.pathData) {
    const baseWidth = geometry.baseWidth ?? frameWidth
    const baseHeight = geometry.baseHeight ?? frameHeight
    if (baseWidth <= 0 || baseHeight <= 0) {
      return null
    }

    const scaleX = frameWidth / baseWidth
    const scaleY = frameHeight / baseHeight
    if (geometry.textRegion) {
      const regionTop = geometry.textRegion.y * scaleY
      const regionBottom = regionTop + geometry.textRegion.height * scaleY

      if (lineCenterY < regionTop || lineCenterY > regionBottom) {
        return null
      }
    }

    const scanlineSpan = resolvePathScanlineSpan({
      pathData: geometry.pathData,
      baseWidth,
      baseHeight,
      frameWidth,
      frameHeight,
      lineY: lineCenterY,
      lineHeight: 0
    })
    if (scanlineSpan) {
      return scanlineSpan
    }

    if (geometry.textRegion) {
      const minX = geometry.textRegion.x * scaleX
      const maxX = minX + geometry.textRegion.width * scaleX
      return {
        x: minX,
        width: maxX - minX
      }
    }
  }

  return null
}
