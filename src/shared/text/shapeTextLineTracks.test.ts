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
    expect(tracks[0]).toEqual({ x: 10, y: 0, width: 180, height: 24 })
    expect(tracks[3]).toEqual({ x: 10, y: 72, width: 180, height: 24 })
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
    expectClose(tracks[0].x, 50)
    expectClose(tracks[0].width, 100)
    expectClose(tracks[2].x, 10)
    expectClose(tracks[2].width, 180)
    expectClose(tracks[4].x, 50)
    expectClose(tracks[4].width, 100)
  })

  it('builds line tracks from the actual interior of a supported path geometry', () => {
    const geometry: ShapeGeometry = {
      type: 'path',
      pathData: 'M 0 0 L 100 0 L 100 100 Z',
      baseWidth: 100,
      baseHeight: 100
    }

    const tracks = buildShapeTextLineTracks({
      geometry,
      frameWidth: 200,
      frameHeight: 100,
      fontSize: 20,
      lineHeight: 24
    })

    expect(tracks).toEqual([
      { x: 34, y: 0, width: 156, height: 24 },
      { x: 82, y: 24, width: 108, height: 24 },
      { x: 130, y: 48, width: 60, height: 24 },
      { x: 178, y: 72, width: 12, height: 24 }
    ])
  })

  it('builds tracks inside an explicit text region for path shapes', () => {
    const geometry: ShapeGeometry = {
      type: 'path',
      pathData: 'M 0 0 L 100 0 L 100 100 L 0 100 Z',
      baseWidth: 100,
      baseHeight: 100,
      textRegion: { x: 20, y: 10, width: 60, height: 50 }
    }

    const tracks = buildShapeTextLineTracks({
      geometry,
      frameWidth: 200,
      frameHeight: 100,
      fontSize: 20,
      lineHeight: 20
    })

    expect(tracks).toEqual([
      { x: 10, y: 0, width: 180, height: 20 },
      { x: 10, y: 20, width: 180, height: 20 },
      { x: 10, y: 40, width: 180, height: 20 }
    ])
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
