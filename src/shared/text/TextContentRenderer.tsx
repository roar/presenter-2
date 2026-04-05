import React from 'react'
import { resolveColorValue } from '../model/colors'
import type {
  ColorConstant,
  TextBlock,
  TextContent,
  TextDecoration,
  TextMark,
  TextPosition,
  TextRange
} from '../model/types'

interface TextContentRendererProps {
  content: TextContent
  colorConstantsById?: Record<string, ColorConstant>
  decorations?: TextDecoration[]
}

function getRunStyle(
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

function getBlockPrefix(block: TextBlock, index: number): string | null {
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

function getDecorationRangesForRun(
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

function buildRunSegments(
  text: string,
  decorations: Array<{ start: number; end: number; kind: TextDecoration['kind'] }>
): Array<{ text: string; decorationKinds: TextDecoration['kind'][] }> {
  if (decorations.length === 0) {
    return [{ text, decorationKinds: [] }]
  }

  const cutPoints = new Set<number>([0, text.length])
  for (const decoration of decorations) {
    cutPoints.add(decoration.start)
    cutPoints.add(decoration.end)
  }

  const sortedCutPoints = Array.from(cutPoints).sort((left, right) => left - right)
  const segments: Array<{ text: string; decorationKinds: TextDecoration['kind'][] }> = []

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
      decorationKinds
    })
  }

  return segments
}

export function TextContentRenderer({
  content,
  colorConstantsById,
  decorations = []
}: TextContentRendererProps): React.JSX.Element {
  let numberedSequenceIndex = 0
  let numberedSequenceBase = 1

  return (
    <>
      {content.blocks.map((block) => {
        if (block.list.kind === 'numbered') {
          if (numberedSequenceIndex === 0) {
            numberedSequenceBase = block.list.start ?? 1
          }
        } else {
          numberedSequenceIndex = 0
          numberedSequenceBase = 1
        }

        const sequenceIndex = block.list.kind === 'numbered' ? numberedSequenceIndex++ : 0
        const prefix =
          block.list.kind === 'numbered'
            ? `${numberedSequenceBase + sequenceIndex}. `
            : getBlockPrefix(block, sequenceIndex)

        return (
          <p key={block.id} style={{ margin: 0 }}>
            {prefix ? <span>{prefix}</span> : null}
            {block.runs.map((run) => {
              const runDecorations = getDecorationRangesForRun(
                block,
                run.id,
                run.text.length,
                decorations
              )
              const segments = buildRunSegments(run.text, runDecorations)

              return segments.map((segment, index) => (
                <span
                  key={`${run.id}-${index}`}
                  style={getRunStyle(run.marks, segment.decorationKinds, colorConstantsById)}
                >
                  {segment.text}
                </span>
              ))
            })}
          </p>
        )
      })}
    </>
  )
}
