import type { TextBlock, TextContent, TextList, TextMark, TextRun } from '../model/types'

export interface RunPosition {
  runIndex: number
  offsetInRun: number
}

function normalizeList(list: TextList | undefined): TextList {
  if (!list) {
    return { kind: 'none' }
  }

  if (list.kind !== 'numbered') {
    return { kind: list.kind }
  }

  return list.start === undefined ? { kind: 'numbered' } : { kind: 'numbered', start: list.start }
}

function normalizeMarks(marks: TextMark[] | undefined): TextMark[] {
  return marks ? [...marks] : []
}

function areMarksEqual(left: TextMark[], right: TextMark[]): boolean {
  if (left.length !== right.length) {
    return false
  }

  return left.every((mark, index) => {
    const other = right[index]
    return mark.type === other.type && mark.value === other.value
  })
}

function normalizeRuns(runs: TextRun[]): TextRun[] {
  const normalizedRuns = runs.map((run) => ({
    id: run.id,
    text: run.text,
    marks: normalizeMarks(run.marks)
  }))

  const nonEmptyRuns = normalizedRuns.filter((run) => run.text.length > 0)

  if (nonEmptyRuns.length === 0) {
    const fallbackRun = normalizedRuns[0]
    return [
      {
        id: fallbackRun?.id ?? crypto.randomUUID(),
        text: '',
        marks: fallbackRun?.marks ?? []
      }
    ]
  }

  const mergedRuns: TextRun[] = []

  for (const run of nonEmptyRuns) {
    const previousRun = mergedRuns[mergedRuns.length - 1]

    if (previousRun && areMarksEqual(previousRun.marks, run.marks)) {
      previousRun.text += run.text
      continue
    }

    mergedRuns.push({
      id: run.id,
      text: run.text,
      marks: [...run.marks]
    })
  }

  return mergedRuns
}

export function blockPlainText(block: TextBlock): string {
  return block.runs.map((run) => run.text).join('')
}

export function extractPlainText(content: TextContent): string {
  return content.blocks.map(blockPlainText).join('\n')
}

export function charOffsetToRunPosition(block: TextBlock, offset: number): RunPosition {
  const plainTextLength = blockPlainText(block).length
  const clampedOffset = Math.max(0, Math.min(offset, plainTextLength))

  let consumed = 0
  for (const [runIndex, run] of block.runs.entries()) {
    const nextConsumed = consumed + run.text.length
    const isLastRun = runIndex === block.runs.length - 1
    if (clampedOffset < nextConsumed || (isLastRun && clampedOffset === nextConsumed)) {
      return {
        runIndex,
        offsetInRun: clampedOffset - consumed
      }
    }
    consumed = nextConsumed
  }

  const lastRunIndex = Math.max(block.runs.length - 1, 0)
  const lastRun = block.runs[lastRunIndex]
  return {
    runIndex: lastRunIndex,
    offsetInRun: lastRun ? lastRun.text.length : 0
  }
}

export function normalizeTextContent(content: TextContent): TextContent {
  return {
    blocks: content.blocks.map((block) => ({
      id: block.id,
      list: normalizeList(block.list),
      runs: normalizeRuns(block.runs)
    }))
  }
}
