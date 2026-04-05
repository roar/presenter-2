import type { ShapeGeometry } from '../model/types'
import type { ShapeTextLineTrack } from './shapeTextLineTracks'

export interface ShapeTextFrame {
  x: number
  y: number
  width: number
  height: number
}

export function deriveShapeTextFrame(tracks: ShapeTextLineTrack[]): ShapeTextFrame | null {
  if (tracks.length === 0) {
    return null
  }

  const minX = Math.min(...tracks.map((track) => track.x))
  const minY = Math.min(...tracks.map((track) => track.y))
  const maxX = Math.max(...tracks.map((track) => track.x + track.width))
  const maxY = Math.max(...tracks.map((track) => track.y + track.height))

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

export function resolveShapeTextFrame(
  geometry: ShapeGeometry | null | undefined,
  frameWidth: number,
  frameHeight: number,
  tracks: ShapeTextLineTrack[] = []
): ShapeTextFrame {
  const trackFrame = deriveShapeTextFrame(tracks)
  if (trackFrame) {
    return trackFrame
  }

  if (geometry?.type === 'path' && geometry.textRegion) {
    const baseWidth = geometry.baseWidth ?? frameWidth
    const baseHeight = geometry.baseHeight ?? frameHeight
    const scaleX = baseWidth > 0 ? frameWidth / baseWidth : 1
    const scaleY = baseHeight > 0 ? frameHeight / baseHeight : 1

    return {
      x: geometry.textRegion.x * scaleX,
      y: geometry.textRegion.y * scaleY,
      width: geometry.textRegion.width * scaleX,
      height: geometry.textRegion.height * scaleY
    }
  }

  return {
    x: 0,
    y: 0,
    width: frameWidth,
    height: frameHeight
  }
}
