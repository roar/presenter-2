import { describe, expect, it } from 'vitest'
import type { ShapeGeometry } from '../model/types'
import { layoutShapeTextFlow } from './shapeTextFlow'

describe('shapeTextFlow', () => {
  it('flows text into one line when the first track has enough width', () => {
    const geometry: ShapeGeometry = { type: 'rect' }

    const result = layoutShapeTextFlow({
      text: 'HELLO',
      geometry,
      frameWidth: 100,
      frameHeight: 40,
      fontSize: 20,
      lineHeight: 20,
      measureTextWidth: (text) => text.length * 10
    })

    expect(result.lines).toEqual([
      {
        text: 'HELLO',
        x: 0,
        y: 0,
        width: 50,
        height: 20,
        trackWidth: 100
      }
    ])
  })

  it('wraps words onto later tracks when needed', () => {
    const geometry: ShapeGeometry = { type: 'rect' }

    const result = layoutShapeTextFlow({
      text: 'HELLO WORLD AGAIN',
      geometry,
      frameWidth: 100,
      frameHeight: 60,
      fontSize: 20,
      lineHeight: 20,
      measureTextWidth: (text) => text.length * 10
    })

    expect(result.lines.map((line) => line.text)).toEqual(['HELLO', 'WORLD', 'AGAIN'])
    expect(result.lines.map((line) => line.y)).toEqual([0, 20, 40])
  })

  it('uses narrower ellipse tracks near the top and wider ones near the middle', () => {
    const geometry: ShapeGeometry = { type: 'ellipse' }

    const result = layoutShapeTextFlow({
      text: 'ONE TWO THREE FOUR FIVE SIX SEVEN',
      geometry,
      frameWidth: 200,
      frameHeight: 100,
      fontSize: 20,
      lineHeight: 20,
      measureTextWidth: (text) => text.length * 10
    })

    expect(result.lines).toHaveLength(3)
    expect(result.lines[0]?.trackWidth).toBeLessThan(result.lines[1]?.trackWidth ?? 0)
  })

  it('reports overflow text when there are not enough tracks', () => {
    const geometry: ShapeGeometry = { type: 'rect' }

    const result = layoutShapeTextFlow({
      text: 'ONE TWO THREE',
      geometry,
      frameWidth: 60,
      frameHeight: 40,
      fontSize: 20,
      lineHeight: 20,
      measureTextWidth: (text) => text.length * 10
    })

    expect(result.lines.map((line) => line.text)).toEqual(['ONE', 'TWO'])
    expect(result.overflowText).toBe('THREE')
  })
})
