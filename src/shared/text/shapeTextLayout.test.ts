import { describe, expect, it } from 'vitest'
import type { ShapeGeometry } from '../model/types'
import { resolveShapeTextLineSpan } from './shapeTextLayout'

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

    it('returns null for path shapes until an exact text region strategy exists', () => {
      const geometry: ShapeGeometry = { type: 'path', pathData: 'M 0 0 L 100 0 L 100 100 Z' }

      expect(resolveShapeTextLineSpan(geometry, 200, 100, 50)).toBeNull()
    })
  })
})
