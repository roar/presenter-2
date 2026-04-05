import React from 'react'
import { resolveColorValue } from '../model/colors'
import type {
  ColorConstant,
  TextBlock,
  TextDecoration,
  TextMark,
  TextPosition,
  TextRange
} from '../model/types'

export function getTextRunStyle(
  marks: TextMark[],
  decorationKinds: TextDecoration['kind'][],
  colorConstantsById?: Record<string, ColorConstant>
): React.CSSProperties {
  const style: React.CSSProperties = {}

  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        style.fontWeight = 700
        break
      case 'italic':
        style.fontStyle = 'italic'
        break
      case 'underline':
        style.textDecoration = 'underline'
        break
      case 'color':
        style.color = resolveColorValue(mark.value, colorConstantsById)
        break
    }
  }

  if (decorationKinds.includes('underline')) {
    style.textDecoration = style.textDecoration ? `${style.textDecoration} underline` : 'underline'
  }

  if (decorationKinds.includes('highlight')) {
    style.backgroundColor = 'rgba(255, 230, 0, 0.45)'
  }

  if (decorationKinds.includes('outline')) {
    style.textShadow = '0 0 1px currentColor'
  }

  return style
}

export function getBlockPrefix(block: TextBlock, index: number): string | null {
  if (block.list.kind === 'bulleted') {
    return '\u2022 '
  }

  if (block.list.kind === 'numbered') {
    const base = block.list.start ?? 1
    return `${base + index}. `
  }

  return null
}

function intersectsRun(runId: string, range: TextRange): boolean {
  return range.start.runId <= runId && runId <= range.end.runId
}

function getOffsetInRun(runId: string, boundary: TextPosition, fallback: number): number {
  return boundary.runId === runId ? boundary.offset : fallback
}

export function getDecorationRangesForRun(
  block: TextBlock,
  runId: string,
  runLength: number,
  decorations: TextDecoration[]
): Array<{ start: number; end: number; kind: TextDecoration['kind'] }> {
  return decorations
    .filter((decoration) => !decoration.degraded && decoration.range.start.blockId === block.id)
    .filter((decoration) => intersectsRun(runId, decoration.range))
    .map((decoration) => ({
      kind: decoration.kind,
      start: getOffsetInRun(runId, decoration.range.start, 0),
      end: getOffsetInRun(runId, decoration.range.end, runLength)
    }))
    .filter((decoration) => decoration.start < decoration.end)
}

export function buildRunSegments(
  text: string,
  decorations: Array<{ start: number; end: number; kind: TextDecoration['kind'] }>
): Array<{ text: string; start: number; end: number; decorationKinds: TextDecoration['kind'][] }> {
  if (decorations.length === 0) {
    return [{ text, start: 0, end: text.length, decorationKinds: [] }]
  }

  const cutPoints = new Set<number>([0, text.length])
  for (const decoration of decorations) {
    cutPoints.add(decoration.start)
    cutPoints.add(decoration.end)
  }

  const sortedCutPoints = Array.from(cutPoints).sort((left, right) => left - right)
  const segments: Array<{
    text: string
    start: number
    end: number
    decorationKinds: TextDecoration['kind'][]
  }> = []

  for (let index = 0; index < sortedCutPoints.length - 1; index += 1) {
    const start = sortedCutPoints[index]
    const end = sortedCutPoints[index + 1]
    if (start === end) {
      continue
    }

    const decorationKinds = decorations
      .filter((decoration) => decoration.start <= start && decoration.end >= end)
      .map((decoration) => decoration.kind)

    segments.push({
      text: text.slice(start, end),
      start,
      end,
      decorationKinds
    })
  }

  return segments
}
