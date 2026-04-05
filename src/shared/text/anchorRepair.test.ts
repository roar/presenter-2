import { describe, expect, it } from 'vitest'
import type { TextContent, TextRange } from '../model/types'
import { repairTextRangeAfterMutation, type TextMutation } from './anchorRepair'

function makeContent(run1Text: string, run2Text: string): TextContent {
  return {
    blocks: [
      {
        id: 'b1',
        list: { kind: 'none' },
        runs: [
          { id: 'r1', text: run1Text, marks: [] },
          { id: 'r2', text: run2Text, marks: [] }
        ]
      }
    ]
  }
}

function makeRange(startOffset: number, endOffset: number): TextRange {
  return {
    start: { blockId: 'b1', runId: 'r2', offset: startOffset },
    end: { blockId: 'b1', runId: 'r2', offset: endOffset }
  }
}

function repair(
  range: TextRange,
  oldContent: TextContent,
  newContent: TextContent,
  mutation: TextMutation
) {
  return repairTextRangeAfterMutation(oldContent, newContent, range, mutation)
}

describe('repairTextRangeAfterMutation', () => {
  it('shifts a range forward when text is inserted before it', () => {
    const oldContent = makeContent('hello ', 'world')
    const newContent = makeContent('hello brave ', 'world')
    const repaired = repair(makeRange(0, 5), oldContent, newContent, {
      blockId: 'b1',
      startOffset: 6,
      endOffset: 6,
      insertedText: 'brave '
    })

    expect(repaired).toEqual({
      range: {
        start: { blockId: 'b1', runId: 'r2', offset: 0 },
        end: { blockId: 'b1', runId: 'r2', offset: 5 }
      },
      degraded: false
    })
  })

  it('shifts a range backward when text before it is deleted', () => {
    const oldContent = makeContent('hello brave ', 'world')
    const newContent = makeContent('hello ', 'world')
    const repaired = repair(makeRange(0, 5), oldContent, newContent, {
      blockId: 'b1',
      startOffset: 6,
      endOffset: 12,
      insertedText: ''
    })

    expect(repaired).toEqual({
      range: {
        start: { blockId: 'b1', runId: 'r2', offset: 0 },
        end: { blockId: 'b1', runId: 'r2', offset: 5 }
      },
      degraded: false
    })
  })

  it('expands a range when text is inserted inside it', () => {
    const oldContent = makeContent('hello ', 'world')
    const newContent = makeContent('hello ', 'wo-rld')
    const repaired = repair(makeRange(0, 5), oldContent, newContent, {
      blockId: 'b1',
      startOffset: 8,
      endOffset: 8,
      insertedText: '-'
    })

    expect(repaired).toEqual({
      range: {
        start: { blockId: 'b1', runId: 'r2', offset: 0 },
        end: { blockId: 'b1', runId: 'r2', offset: 6 }
      },
      degraded: false
    })
  })

  it('shrinks a range when text inside it is deleted', () => {
    const oldContent = makeContent('hello ', 'world')
    const newContent = makeContent('hello ', 'wld')
    const repaired = repair(makeRange(0, 5), oldContent, newContent, {
      blockId: 'b1',
      startOffset: 7,
      endOffset: 9,
      insertedText: ''
    })

    expect(repaired).toEqual({
      range: {
        start: { blockId: 'b1', runId: 'r2', offset: 0 },
        end: { blockId: 'b1', runId: 'r2', offset: 3 }
      },
      degraded: false
    })
  })

  it('marks the range degraded when the full targeted content is deleted', () => {
    const oldContent = makeContent('hello ', 'world')
    const newContent = makeContent('hello ', '')
    const repaired = repair(makeRange(0, 5), oldContent, newContent, {
      blockId: 'b1',
      startOffset: 6,
      endOffset: 11,
      insertedText: ''
    })

    expect(repaired).toEqual({
      range: {
        start: { blockId: 'b1', runId: 'r2', offset: 0 },
        end: { blockId: 'b1', runId: 'r2', offset: 0 }
      },
      degraded: true
    })
  })
})
