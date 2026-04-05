import { describe, expect, it } from 'vitest'
import type { ShapeGeometry } from '../model/types'
import { buildShapeTextRenderLayout } from './shapeTextRenderLayout'

describe('shapeTextRenderLayout', () => {
  it('builds render lines from plain text and shape geometry', () => {
    const geometry: ShapeGeometry = { type: 'rect' }

    const result = buildShapeTextRenderLayout({
      text: 'HELLO WORLD AGAIN',
      geometry,
      frameWidth: 100,
      frameHeight: 60,
      fontSize: 20,
      lineHeight: 20,
      measureTextWidth: (text) => text.length * 10
    })

    expect(result.lines.map((line) => line.text)).toEqual(['HELLO', 'WORLD', 'AGAIN'])
    expect(result.overflowText).toBe('')
  })

  it('returns overflow when the shape cannot fit all lines', () => {
    const geometry: ShapeGeometry = { type: 'ellipse' }

    const result = buildShapeTextRenderLayout({
      text: 'ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT NINE TEN ELEVEN TWELVE',
      geometry,
      frameWidth: 200,
      frameHeight: 60,
      fontSize: 20,
      lineHeight: 20,
      measureTextWidth: (text) => text.length * 10
    })

    expect(result.lines.length).toBeGreaterThan(0)
    expect(result.overflowText.length).toBeGreaterThan(0)
  })

  it('uses an explicit path text region when building render lines', () => {
    const geometry: ShapeGeometry = {
      type: 'path',
      pathData: 'M 0 0 L 100 0 L 100 100 Z',
      baseWidth: 100,
      baseHeight: 100,
      textRegion: { x: 20, y: 10, width: 60, height: 50 }
    }

    const result = buildShapeTextRenderLayout({
      text: 'HELLO WORLD AGAIN',
      geometry,
      frameWidth: 200,
      frameHeight: 100,
      fontSize: 20,
      lineHeight: 20,
      measureTextWidth: (text) => text.length * 10
    })

    expect(result.lines.map((line) => ({ text: line.text, x: line.x, y: line.y }))).toEqual([
      { text: 'HELLO WORLD', x: 40, y: 0 },
      { text: 'AGAIN', x: 40, y: 20 }
    ])
  })
})
