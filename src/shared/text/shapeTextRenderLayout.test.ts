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
})
