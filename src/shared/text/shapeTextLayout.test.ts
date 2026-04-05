import { describe, expect, it } from 'vitest'
import type { ShapeGeometry } from '../model/types'
import { resolveShapeTextLineSpan } from './shapeTextLayout'
import shapes from '../shapes/keynote-shapes.library.json'

function expectClose(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThan(0.0001)
}

describe('shapeTextLayout', () => {
  describe('resolveShapeTextLineSpan', () => {
    it('returns the full frame width for rectangles', () => {
      const geometry: ShapeGeometry = { type: 'rect' }

      expect(resolveShapeTextLineSpan(geometry, 200, 100, 0)).toEqual({ x: 0, width: 200 })
      expect(resolveShapeTextLineSpan(geometry, 200, 100, 50)).toEqual({ x: 0, width: 200 })
      expect(resolveShapeTextLineSpan(geometry, 200, 100, 100)).toEqual({ x: 0, width: 200 })
    })

    it('returns the exact horizontal chord for ellipses', () => {
      const geometry: ShapeGeometry = { type: 'ellipse' }

      const center = resolveShapeTextLineSpan(geometry, 200, 100, 50)
      expect(center).not.toBeNull()
      expectClose(center?.x ?? 0, 0)
      expectClose(center?.width ?? 0, 200)

      const quarter = resolveShapeTextLineSpan(geometry, 200, 100, 25)
      expect(quarter).not.toBeNull()
      expectClose(quarter?.x ?? 0, 13.3974596)
      expectClose(quarter?.width ?? 0, 173.2050808)
    })

    it('collapses to a point at the top and bottom of the ellipse', () => {
      const geometry: ShapeGeometry = { type: 'ellipse' }

      const top = resolveShapeTextLineSpan(geometry, 200, 100, 0)
      const bottom = resolveShapeTextLineSpan(geometry, 200, 100, 100)

      expect(top).not.toBeNull()
      expectClose(top?.x ?? 0, 100)
      expectClose(top?.width ?? 0, 0)
      expect(bottom).not.toBeNull()
      expectClose(bottom?.x ?? 0, 100)
      expectClose(bottom?.width ?? 0, 0)
    })

    it('returns null outside the supported ellipse frame', () => {
      const geometry: ShapeGeometry = { type: 'ellipse' }

      expect(resolveShapeTextLineSpan(geometry, 200, 100, -1)).toBeNull()
      expect(resolveShapeTextLineSpan(geometry, 200, 100, 101)).toBeNull()
    })

    it('returns a real interior span for path shapes without a text region', () => {
      const geometry: ShapeGeometry = {
        type: 'path',
        pathData: 'M 0 0 L 100 0 L 100 100 L 0 100 Z',
        baseWidth: 100,
        baseHeight: 100
      }

      expect(resolveShapeTextLineSpan(geometry, 200, 100, 50)).toEqual({ x: 0, width: 200 })
    })

    it('uses the actual path interior horizontally even when a text region exists', () => {
      const geometry: ShapeGeometry = {
        type: 'path',
        pathData: 'M 0 0 L 100 0 L 100 100 L 0 100 Z',
        baseWidth: 100,
        baseHeight: 100,
        textRegion: { x: 20, y: 10, width: 60, height: 50 }
      }

      expect(resolveShapeTextLineSpan(geometry, 200, 100, 20)).toEqual({ x: 0, width: 200 })
      expect(resolveShapeTextLineSpan(geometry, 200, 100, 70)).toBeNull()
    })

    it('allows balloon spans to extend beyond the text region when the actual shape interior is wider', () => {
      const balloon = (
        shapes as { shapes: Array<{ name: string; template: { path: any } }> }
      ).shapes.find((entry) => entry.name === 'Balloon')
      expect(balloon).toBeDefined()

      const geometry: ShapeGeometry = {
        type: 'path',
        pathData: balloon!.template.path.d,
        baseWidth: balloon!.template.path.baseWidth,
        baseHeight: balloon!.template.path.baseHeight,
        textRegion: balloon!.template.path.textRegion
      }

      const frameWidth = 200
      const frameHeight = 267
      const lineCenterY = 36
      const span = resolveShapeTextLineSpan(geometry, frameWidth, frameHeight, lineCenterY)
      const scaledRegionX = (geometry.textRegion!.x * frameWidth) / geometry.baseWidth!
      const scaledRegionWidth = (geometry.textRegion!.width * frameWidth) / geometry.baseWidth!

      expect(span).not.toBeNull()
      expect(span?.x ?? 0).toBeLessThan(scaledRegionX)
      expect(span?.width ?? 0).toBeGreaterThan(scaledRegionWidth)
    })
  })
})
