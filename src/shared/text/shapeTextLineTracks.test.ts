import { describe, expect, it } from 'vitest'
import type { ShapeGeometry } from '../model/types'
import { buildShapeTextLineTracks } from './shapeTextLineTracks'

function expectClose(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThan(0.0001)
}

describe('shapeTextLineTracks', () => {
  it('builds evenly spaced full-width line tracks for rectangles', () => {
    const geometry: ShapeGeometry = { type: 'rect' }

    const tracks = buildShapeTextLineTracks({
      geometry,
      frameWidth: 200,
      frameHeight: 100,
      fontSize: 20,
      lineHeight: 24
    })

    expect(tracks).toHaveLength(4)
    expect(tracks[0]).toEqual({ x: 0, y: 0, width: 200, height: 24 })
    expect(tracks[3]).toEqual({ x: 0, y: 72, width: 200, height: 24 })
  })

  it('builds ellipse tracks from exact horizontal chords at line centers', () => {
    const geometry: ShapeGeometry = { type: 'ellipse' }

    const tracks = buildShapeTextLineTracks({
      geometry,
      frameWidth: 200,
      frameHeight: 100,
      fontSize: 20,
      lineHeight: 20
    })

    expect(tracks).toHaveLength(5)
    expectClose(tracks[0].x, 40)
    expectClose(tracks[0].width, 120)
    expectClose(tracks[2].x, 0)
    expectClose(tracks[2].width, 200)
    expectClose(tracks[4].x, 40)
    expectClose(tracks[4].width, 120)
  })

  it('skips line tracks that do not intersect an unsupported geometry', () => {
    const geometry: ShapeGeometry = { type: 'path', pathData: 'M 0 0 L 100 0 L 100 100 Z' }

    const tracks = buildShapeTextLineTracks({
      geometry,
      frameWidth: 200,
      frameHeight: 100,
      fontSize: 20,
      lineHeight: 24
    })

    expect(tracks).toEqual([])
  })

  it('returns no tracks for non-positive line heights', () => {
    const geometry: ShapeGeometry = { type: 'rect' }

    expect(
      buildShapeTextLineTracks({
        geometry,
        frameWidth: 200,
        frameHeight: 100,
        fontSize: 20,
        lineHeight: 0
      })
    ).toEqual([])
  })
})
