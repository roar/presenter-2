import { describe, expect, it } from 'vitest'
import type { TextBlock, TextContent, TextMark } from '../model/types'
import {
  blockPlainText,
  charOffsetToRunPosition,
  extractPlainText,
  normalizeTextContent
} from './textContentUtils'

function makeBlock(
  id: string,
  runs: Array<{ id: string; text: string; marks?: TextMark[] }>,
  list?: { kind: 'none' | 'bulleted' | 'numbered'; start?: number }
): TextBlock {
  return {
    id,
    runs: runs.map((run) => ({ id: run.id, text: run.text, marks: run.marks ?? [] })),
    ...(list ? { list } : {})
  } as TextBlock
}

function makeContent(blocks: TextBlock[]): TextContent {
  return { blocks }
}

describe('textContentUtils', () => {
  describe('blockPlainText', () => {
    it('joins all runs in a block without inserting extra separators', () => {
      const block = makeBlock('b1', [
        { id: 'r1', text: 'I løpet av de ' },
        { id: 'r2', text: 'neste timene' },
        { id: 'r3', text: ' er ' },
        { id: 'r4', text: 'kritiske.' }
      ])

      expect(blockPlainText(block)).toBe('I løpet av de neste timene er kritiske.')
    })
  })

  describe('extractPlainText', () => {
    it('joins block text with newlines while ignoring run boundaries', () => {
      const content = makeContent([
        makeBlock('b1', [
          { id: 'r1', text: 'Første' },
          { id: 'r2', text: ' linje' }
        ]),
        makeBlock('b2', [{ id: 'r3', text: 'Andre linje' }])
      ])

      expect(extractPlainText(content)).toBe('Første linje\nAndre linje')
    })
  })

  describe('charOffsetToRunPosition', () => {
    it('maps offsets across run boundaries within a block', () => {
      const block = makeBlock('b1', [
        { id: 'r1', text: 'Hei' },
        { id: 'r2', text: ' ' },
        { id: 'r3', text: 'verden' }
      ])

      expect(charOffsetToRunPosition(block, 0)).toEqual({ runIndex: 0, offsetInRun: 0 })
      expect(charOffsetToRunPosition(block, 3)).toEqual({ runIndex: 1, offsetInRun: 0 })
      expect(charOffsetToRunPosition(block, 4)).toEqual({ runIndex: 2, offsetInRun: 0 })
      expect(charOffsetToRunPosition(block, 10)).toEqual({ runIndex: 2, offsetInRun: 6 })
    })
  })

  describe('normalizeTextContent', () => {
    it('adds default list metadata to blocks that do not have it yet', () => {
      const content = makeContent([makeBlock('b1', [{ id: 'r1', text: 'Punkt' }])])

      expect(normalizeTextContent(content)).toEqual({
        blocks: [
          {
            id: 'b1',
            list: { kind: 'none' },
            runs: [{ id: 'r1', text: 'Punkt', marks: [] }]
          }
        ]
      })
    })

    it('preserves existing list metadata while merging adjacent runs with identical marks', () => {
      const boldMark: TextMark = { type: 'bold' }
      const content = makeContent([
        makeBlock(
          'b1',
          [
            { id: 'r1', text: 'Alpha', marks: [boldMark] },
            { id: 'r2', text: '', marks: [boldMark] },
            { id: 'r3', text: ' Beta', marks: [boldMark] }
          ],
          { kind: 'numbered', start: 3 }
        )
      ])

      expect(normalizeTextContent(content)).toEqual({
        blocks: [
          {
            id: 'b1',
            list: { kind: 'numbered', start: 3 },
            runs: [{ id: 'r1', text: 'Alpha Beta', marks: [{ type: 'bold' }] }]
          }
        ]
      })
    })

    it('keeps one empty run in an otherwise empty block', () => {
      const content = makeContent([makeBlock('b1', [{ id: 'r1', text: '' }])])

      expect(normalizeTextContent(content)).toEqual({
        blocks: [
          {
            id: 'b1',
            list: { kind: 'none' },
            runs: [{ id: 'r1', text: '', marks: [] }]
          }
        ]
      })
    })
  })
})
