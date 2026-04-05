import type {
  ColorConstant,
  ShapeGeometry,
  TextContent,
  TextDecoration,
  TextMark
} from '../model/types'
import { buildShapeTextLineTracks } from './shapeTextLineTracks'
import { buildRunSegments, getBlockPrefix, getDecorationRangesForRun } from './textRenderUtils'

export interface ShapeTextRenderFragment {
  kind: 'content' | 'list-prefix'
  blockId: string
  runId: string | null
  startOffset: number
  endOffset: number
  text: string
  x: number
  y: number
  width: number
  height: number
  marks: TextMark[]
  decorationKinds: TextDecoration['kind'][]
}

export interface ShapeTextRenderLine {
  blockId: string
  text: string
  x: number
  y: number
  width: number
  height: number
  trackWidth: number
  fragments: ShapeTextRenderFragment[]
}

export interface ShapeTextRenderLayoutResult {
  lines: ShapeTextRenderLine[]
  lineBoxes: Array<{ x: number; y: number; width: number; height: number }>
  fragments: ShapeTextRenderFragment[]
  overflow: boolean
}

export interface BuildShapeTextRenderLayoutOptions {
  content: TextContent
  decorations?: TextDecoration[]
  geometry: ShapeGeometry | null | undefined
  frameWidth: number
  frameHeight: number
  fontSize: number
  lineHeight: number
  measureTextWidth: (text: string, fontSize: number) => number
  colorConstantsById?: Record<string, ColorConstant>
}

interface LayoutToken {
  kind: 'content' | 'list-prefix'
  blockId: string
  runId: string | null
  startOffset: number
  endOffset: number
  text: string
  marks: TextMark[]
  decorationKinds: TextDecoration['kind'][]
  width: number
}

const TOKEN_PATTERN = /\S+\s*|\s+/g

export function supportsShapeTextLayout(geometry: ShapeGeometry | null | undefined): boolean {
  if (!geometry) {
    return false
  }

  if (geometry.type === 'rect' || geometry.type === 'ellipse') {
    return true
  }

  return geometry.type === 'path' && Boolean(geometry.pathData)
}

export function buildShapeTextRenderLayout({
  content,
  decorations = [],
  geometry,
  frameWidth,
  frameHeight,
  fontSize,
  lineHeight,
  measureTextWidth
}: BuildShapeTextRenderLayoutOptions): ShapeTextRenderLayoutResult {
  const tracks = buildShapeTextLineTracks({
    geometry,
    frameWidth,
    frameHeight,
    fontSize,
    lineHeight
  })

  const initialLayout = layoutContentOnTracks({
    tracks,
    content,
    decorations,
    fontSize,
    measureTextWidth
  })

  const centeredTracks =
    geometry?.type === 'path' &&
    initialLayout.lines.length > 0 &&
    initialLayout.lines.length < tracks.length
      ? tracks.slice(Math.max(0, Math.floor((tracks.length - initialLayout.lines.length) / 2)))
      : tracks
  const finalLayout =
    centeredTracks === tracks
      ? initialLayout
      : layoutContentOnTracks({
          tracks: centeredTracks,
          content,
          decorations,
          fontSize,
          measureTextWidth
        })

  return {
    lines: finalLayout.lines,
    lineBoxes: finalLayout.lines.map((line) => ({
      x: line.x,
      y: line.y,
      width: line.trackWidth,
      height: line.height
    })),
    fragments: finalLayout.fragments,
    overflow: finalLayout.overflow
  }
}

function layoutContentOnTracks({
  tracks,
  content,
  decorations,
  fontSize,
  measureTextWidth
}: {
  tracks: Array<{ x: number; y: number; width: number; height: number }>
  content: TextContent
  decorations: TextDecoration[]
  fontSize: number
  measureTextWidth: (text: string, fontSize: number) => number
}): { lines: ShapeTextRenderLine[]; fragments: ShapeTextRenderFragment[]; overflow: boolean } {
  const lines: ShapeTextRenderLine[] = []
  const fragments: ShapeTextRenderFragment[] = []
  let trackIndex = 0
  let numberedSequenceIndex = 0
  let numberedSequenceBase = 1
  let overflow = false

  for (const block of content.blocks) {
    if (trackIndex >= tracks.length) {
      overflow = true
      break
    }

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
    const tokens = tokenizeBlock({
      block,
      prefix,
      decorations,
      fontSize,
      measureTextWidth
    })

    if (tokens.length === 0) {
      trackIndex += 1
      continue
    }

    let tokenIndex = 0
    while (tokenIndex < tokens.length) {
      if (trackIndex >= tracks.length) {
        overflow = true
        break
      }

      const track = tracks[trackIndex]
      const lineTokens: LayoutToken[] = []
      let lineText = ''

      while (tokenIndex < tokens.length) {
        const token = tokens[tokenIndex]
        const isWhitespace = token.text.trim().length === 0

        if (lineTokens.length === 0 && isWhitespace) {
          tokenIndex += 1
          continue
        }

        const candidateText = `${lineText}${token.text}`
        const candidateWidth = measureTextWidth(candidateText.trimEnd(), fontSize)
        if (candidateWidth <= track.width || lineTokens.length === 0) {
          lineTokens.push(token)
          lineText = candidateText
          tokenIndex += 1
          continue
        }

        break
      }

      trimTrailingWhitespace(lineTokens, fontSize, measureTextWidth)

      const lineFragments = buildLineFragments(lineTokens, track.x, track.y, track.height)
      if (lineFragments.length > 0) {
        lines.push({
          blockId: block.id,
          text: lineFragments.map((fragment) => fragment.text).join(''),
          x: track.x,
          y: track.y,
          width: lineFragments.reduce((sum, fragment) => sum + fragment.width, 0),
          height: track.height,
          trackWidth: track.width,
          fragments: lineFragments
        })
        fragments.push(...lineFragments)
      }

      trackIndex += 1
    }
  }

  return { lines, fragments, overflow }
}

function tokenizeBlock({
  block,
  prefix,
  decorations,
  fontSize,
  measureTextWidth
}: {
  block: TextContent['blocks'][number]
  prefix: string | null
  decorations: TextDecoration[]
  fontSize: number
  measureTextWidth: (text: string, fontSize: number) => number
}): LayoutToken[] {
  const tokens: LayoutToken[] = []

  if (prefix) {
    tokens.push({
      kind: 'list-prefix',
      blockId: block.id,
      runId: null,
      startOffset: 0,
      endOffset: prefix.length,
      text: prefix,
      marks: [],
      decorationKinds: [],
      width: measureTextWidth(prefix, fontSize)
    })
  }

  for (const run of block.runs) {
    const runDecorations = getDecorationRangesForRun(block, run.id, run.text.length, decorations)
    const segments = buildRunSegments(run.text, runDecorations)

    for (const segment of segments) {
      tokens.push(
        ...tokenizeSegment({
          blockId: block.id,
          runId: run.id,
          text: segment.text,
          segmentStartOffset: segment.start,
          marks: run.marks,
          decorationKinds: segment.decorationKinds,
          fontSize,
          measureTextWidth
        })
      )
    }
  }

  return tokens
}

function tokenizeSegment({
  blockId,
  runId,
  text,
  segmentStartOffset,
  marks,
  decorationKinds,
  fontSize,
  measureTextWidth
}: {
  blockId: string
  runId: string
  text: string
  segmentStartOffset: number
  marks: TextMark[]
  decorationKinds: TextDecoration['kind'][]
  fontSize: number
  measureTextWidth: (text: string, fontSize: number) => number
}): LayoutToken[] {
  const matches = text.matchAll(TOKEN_PATTERN)
  const tokens: LayoutToken[] = []

  for (const match of matches) {
    const tokenText = match[0]
    const start = segmentStartOffset + (match.index ?? 0)
    const end = start + tokenText.length
    tokens.push({
      kind: 'content',
      blockId,
      runId,
      startOffset: start,
      endOffset: end,
      text: tokenText,
      marks,
      decorationKinds,
      width: measureTextWidth(tokenText, fontSize)
    })
  }

  return tokens
}

function trimTrailingWhitespace(
  tokens: LayoutToken[],
  fontSize: number,
  measureTextWidth: (text: string, fontSize: number) => number
): void {
  while (tokens.length > 0) {
    const token = tokens[tokens.length - 1]
    const trimmed = token.text.replace(/\s+$/u, '')
    if (trimmed === token.text) {
      return
    }

    if (trimmed.length === 0) {
      tokens.pop()
      continue
    }

    const removedLength = token.text.length - trimmed.length
    token.text = trimmed
    token.endOffset -= removedLength
    token.width = measureTextWidth(trimmed, fontSize)
    return
  }
}

function buildLineFragments(
  tokens: LayoutToken[],
  x: number,
  y: number,
  height: number
): ShapeTextRenderFragment[] {
  const fragments: ShapeTextRenderFragment[] = []
  let cursorX = x

  for (const token of tokens) {
    if (token.text.length === 0) {
      continue
    }

    fragments.push({
      kind: token.kind,
      blockId: token.blockId,
      runId: token.runId,
      startOffset: token.startOffset,
      endOffset: token.endOffset,
      text: token.text,
      x: cursorX,
      y,
      width: token.width,
      height,
      marks: token.marks,
      decorationKinds: token.decorationKinds
    })
    cursorX += token.width
  }

  return fragments
}
