import type { TextBlock, TextContent, TextPosition, TextRange } from '../model/types'
import { blockPlainText, charOffsetToRunPosition } from './textContentUtils'

export interface TextMutation {
  blockId: string
  startOffset: number
  endOffset: number
  insertedText: string
}

export interface RepairedTextRange {
  range: TextRange
  degraded: boolean
}

function getBlock(content: TextContent, blockId: string): TextBlock {
  const block = content.blocks.find((entry) => entry.id === blockId)
  if (!block) {
    throw new Error(`Unknown block: ${blockId}`)
  }

  return block
}

function toCharOffset(block: TextBlock, position: TextPosition): number {
  let offset = 0

  for (const run of block.runs) {
    if (run.id === position.runId) {
      return offset + position.offset
    }

    offset += run.text.length
  }

  throw new Error(`Unknown run: ${position.runId}`)
}

function toTextPosition(block: TextBlock, offset: number): TextPosition {
  const runPosition = charOffsetToRunPosition(block, offset)
  const run = block.runs[runPosition.runIndex]

  if (!run) {
    throw new Error(`Unable to map offset ${offset} in block ${block.id}`)
  }

  return {
    blockId: block.id,
    runId: run.id,
    offset: runPosition.offsetInRun
  }
}

function repairOffsets(
  rangeStart: number,
  rangeEnd: number,
  mutation: TextMutation
): { start: number; end: number; degraded: boolean } {
  const insertedLength = mutation.insertedText.length
  const deletedLength = mutation.endOffset - mutation.startOffset
  const delta = insertedLength - deletedLength

  if (mutation.endOffset <= rangeStart) {
    return {
      start: rangeStart + delta,
      end: rangeEnd + delta,
      degraded: false
    }
  }

  if (mutation.startOffset >= rangeEnd) {
    return { start: rangeStart, end: rangeEnd, degraded: false }
  }

  if (
    mutation.startOffset <= rangeStart &&
    mutation.endOffset >= rangeEnd &&
    insertedLength === 0
  ) {
    return {
      start: mutation.startOffset,
      end: mutation.startOffset,
      degraded: true
    }
  }

  const repairedStart =
    mutation.startOffset < rangeStart ? mutation.startOffset + insertedLength : rangeStart

  let repairedEnd = rangeEnd

  if (mutation.startOffset < rangeEnd && mutation.endOffset < rangeEnd) {
    repairedEnd = rangeEnd + delta
  } else if (mutation.startOffset < rangeEnd) {
    repairedEnd = Math.max(repairedStart, mutation.startOffset + insertedLength)
  }

  return {
    start: repairedStart,
    end: repairedEnd,
    degraded: false
  }
}

export function repairTextRangeAfterMutation(
  oldContent: TextContent,
  newContent: TextContent,
  range: TextRange,
  mutation: TextMutation
): RepairedTextRange {
  const oldBlock = getBlock(oldContent, mutation.blockId)
  const newBlock = getBlock(newContent, mutation.blockId)

  if (range.start.blockId !== mutation.blockId || range.end.blockId !== mutation.blockId) {
    return { range, degraded: false }
  }

  const oldRangeStart = toCharOffset(oldBlock, range.start)
  const oldRangeEnd = toCharOffset(oldBlock, range.end)
  const repairedOffsets = repairOffsets(oldRangeStart, oldRangeEnd, mutation)
  const maxOffset = blockPlainText(newBlock).length
  const clampedStart = Math.max(0, Math.min(repairedOffsets.start, maxOffset))
  const clampedEnd = Math.max(clampedStart, Math.min(repairedOffsets.end, maxOffset))

  return {
    range: {
      start: toTextPosition(newBlock, clampedStart),
      end: toTextPosition(newBlock, clampedEnd)
    },
    degraded: repairedOffsets.degraded
  }
}
