import { describe, expect, it } from 'vitest'
import type { ShapeGeometry } from '../model/types'
import { buildShapeTextRenderLayout, supportsShapeTextLayout } from './shapeTextRenderLayout'
import shapes from '../shapes/keynote-shapes.library.json'

describe('shapeTextRenderLayout', () => {
  it('builds structured render lines from block content and shape geometry', () => {
    const geometry: ShapeGeometry = { type: 'rect' }

    const result = buildShapeTextRenderLayout({
      content: {
        blocks: [
          {
            id: 'b1',
            list: { kind: 'none' },
            runs: [
              { id: 'r1', text: 'HELLO', marks: [] },
              { id: 'r2', text: ' WORLD AGAIN', marks: [] }
            ]
          }
        ]
      },
      geometry,
      frameWidth: 100,
      frameHeight: 60,
      fontSize: 20,
      lineHeight: 20,
      measureTextWidth: (text) => text.length * 10
    })

    expect(result.lines.map((line) => line.text)).toEqual(['HELLO', 'WORLD', 'AGAIN'])
    expect(result.fragments[0]).toMatchObject({
      blockId: 'b1',
      runId: 'r1',
      startOffset: 0,
      endOffset: 5,
      text: 'HELLO'
    })
    expect(result.overflow).toBe(false)
  })

  it('preserves list prefixes and run styling fragments in the layout output', () => {
    const geometry: ShapeGeometry = { type: 'rect' }

    const result = buildShapeTextRenderLayout({
      content: {
        blocks: [
          {
            id: 'b1',
            list: { kind: 'bulleted' },
            runs: [
              { id: 'r1', text: 'Bold', marks: [{ type: 'bold' }] },
              { id: 'r2', text: ' item', marks: [{ type: 'color', value: '#00ff00' }] }
            ]
          }
        ]
      },
      geometry,
      frameWidth: 240,
      frameHeight: 40,
      fontSize: 20,
      lineHeight: 20,
      measureTextWidth: (text) => text.length * 10
    })

    expect(result.lines).toHaveLength(1)
    expect(result.lines[0]?.text).toBe('• Bold item')
    expect(result.lines[0]?.fragments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'list-prefix', text: '• ', runId: null }),
        expect.objectContaining({
          kind: 'content',
          text: 'Bold',
          runId: 'r1',
          marks: [{ type: 'bold' }]
        }),
        expect.objectContaining({
          kind: 'content',
          text: 'item',
          runId: 'r2',
          marks: [{ type: 'color', value: '#00ff00' }]
        })
      ])
    )
  })

  it('renders persisted decorations into content fragments without dropping offsets', () => {
    const geometry: ShapeGeometry = { type: 'rect' }

    const result = buildShapeTextRenderLayout({
      content: {
        blocks: [
          {
            id: 'b1',
            list: { kind: 'none' },
            runs: [{ id: 'r1', text: 'Hello world', marks: [] }]
          }
        ]
      },
      decorations: [
        {
          id: 'd1',
          kind: 'highlight',
          range: {
            start: { blockId: 'b1', runId: 'r1', offset: 6 },
            end: { blockId: 'b1', runId: 'r1', offset: 11 }
          }
        }
      ],
      geometry,
      frameWidth: 220,
      frameHeight: 40,
      fontSize: 20,
      lineHeight: 20,
      measureTextWidth: (text) => text.length * 10
    })

    expect(result.fragments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          runId: 'r1',
          startOffset: 0,
          endOffset: 6,
          text: 'Hello '
        }),
        expect.objectContaining({
          runId: 'r1',
          startOffset: 6,
          endOffset: 11,
          text: 'world',
          decorationKinds: ['highlight']
        })
      ])
    )
  })

  it('uses actual path width horizontally even when a text region exists', () => {
    const geometry: ShapeGeometry = {
      type: 'path',
      pathData: 'M 0 0 L 100 0 L 100 100 L 0 100 Z',
      baseWidth: 100,
      baseHeight: 100,
      textRegion: { x: 20, y: 10, width: 60, height: 50 }
    }

    const result = buildShapeTextRenderLayout({
      content: {
        blocks: [
          {
            id: 'b1',
            list: { kind: 'none' },
            runs: [{ id: 'r1', text: 'HELLO WORLD AGAIN', marks: [] }]
          }
        ]
      },
      geometry,
      frameWidth: 200,
      frameHeight: 100,
      fontSize: 20,
      lineHeight: 20,
      measureTextWidth: (text) => text.length * 10
    })

    expect(result.lines.map((line) => ({ text: line.text, x: line.x, y: line.y }))).toEqual([
      { text: 'HELLO WORLD AGAIN', x: 10, y: 20 }
    ])
  })

  it('treats path shapes with path data as supported even without a text region', () => {
    expect(
      supportsShapeTextLayout({
        type: 'path',
        pathData: 'M 0 0 L 100 0 L 100 100 Z'
      })
    ).toBe(true)
  })

  it('vertically centers a single line inside the balloon text area instead of pinning it to the top', () => {
    const balloon = (
      shapes as { shapes: Array<{ name: string; template: { path: any } }> }
    ).shapes.find((entry) => entry.name === 'Balloon')
    const geometry: ShapeGeometry = {
      type: 'path',
      pathData: balloon!.template.path.d,
      baseWidth: balloon!.template.path.baseWidth,
      baseHeight: balloon!.template.path.baseHeight,
      textRegion: balloon!.template.path.textRegion
    }

    const result = buildShapeTextRenderLayout({
      content: {
        blocks: [
          {
            id: 'b1',
            list: { kind: 'none' },
            runs: [{ id: 'r1', text: 'TEKST', marks: [] }]
          }
        ]
      },
      geometry,
      frameWidth: 200,
      frameHeight: 267,
      fontSize: 20,
      lineHeight: 24,
      measureTextWidth: (text) => text.length * 10
    })

    expect(result.lines).toHaveLength(1)
    expect(result.lines[0]?.y).toBeGreaterThan(60)
  })
})
