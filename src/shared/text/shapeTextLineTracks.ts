import type { ShapeGeometry } from '../model/types'
import { resolveShapeTextLineSpan } from './shapeTextLayout'

export interface ShapeTextLineTrack {
  x: number
  y: number
  width: number
  height: number
}

export interface BuildShapeTextLineTracksOptions {
  geometry: ShapeGeometry | null | undefined
  frameWidth: number
  frameHeight: number
  fontSize: number
  lineHeight: number
}

export function buildShapeTextLineTracks({
  geometry,
  frameWidth,
  frameHeight,
  fontSize,
  lineHeight
}: BuildShapeTextLineTracksOptions): ShapeTextLineTrack[] {
  if (frameWidth <= 0 || frameHeight <= 0 || lineHeight <= 0) {
    return []
  }

  const tracks: ShapeTextLineTrack[] = []
  const lineCount = Math.floor(frameHeight / lineHeight)
  const horizontalInset = Math.max(8, fontSize * 0.5)

  for (let index = 0; index < lineCount; index += 1) {
    const y = index * lineHeight
    const lineCenterY = y + lineHeight / 2
    const span = resolveShapeTextLineSpan(geometry, frameWidth, frameHeight, lineCenterY)
    if (!span || span.width <= 0) {
      continue
    }

    const insetWidth = span.width - horizontalInset * 2
    if (insetWidth <= 0) {
      continue
    }

    tracks.push({
      x: span.x + horizontalInset,
      y,
      width: insetWidth,
      height: lineHeight
    })
  }

  return tracks
}
