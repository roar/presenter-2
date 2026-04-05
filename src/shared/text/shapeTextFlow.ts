import type { ShapeGeometry } from '../model/types'
import { buildShapeTextLineTracks } from './shapeTextLineTracks'

export interface ShapeTextFlowLine {
  text: string
  x: number
  y: number
  width: number
  height: number
  trackWidth: number
}

export interface ShapeTextFlowResult {
  lines: ShapeTextFlowLine[]
  overflowText: string
}

export interface LayoutShapeTextFlowOptions {
  text: string
  geometry: ShapeGeometry | null | undefined
  frameWidth: number
  frameHeight: number
  fontSize: number
  lineHeight: number
  measureTextWidth: (text: string, fontSize: number) => number
}

export function layoutShapeTextFlow({
  text,
  geometry,
  frameWidth,
  frameHeight,
  fontSize,
  lineHeight,
  measureTextWidth
}: LayoutShapeTextFlowOptions): ShapeTextFlowResult {
  const tracks = buildShapeTextLineTracks({
    geometry,
    frameWidth,
    frameHeight,
    fontSize,
    lineHeight
  })

  const words = text.trim().length === 0 ? [] : text.trim().split(/\s+/)
  const lines: ShapeTextFlowLine[] = []
  let trackIndex = 0
  let wordIndex = 0

  while (trackIndex < tracks.length && wordIndex < words.length) {
    const track = tracks[trackIndex]
    let lineText = ''
    let lineWidth = 0

    while (wordIndex < words.length) {
      const nextWord = words[wordIndex]
      const candidate = lineText ? `${lineText} ${nextWord}` : nextWord
      const candidateWidth = measureTextWidth(candidate, fontSize)

      if (candidateWidth <= track.width || lineText.length === 0) {
        lineText = candidate
        lineWidth = candidateWidth
        wordIndex += 1
        continue
      }

      break
    }

    if (lineText.length > 0) {
      lines.push({
        text: lineText,
        x: track.x,
        y: track.y,
        width: lineWidth,
        height: track.height,
        trackWidth: track.width
      })
    }

    trackIndex += 1
  }

  return {
    lines,
    overflowText: words.slice(wordIndex).join(' ')
  }
}
