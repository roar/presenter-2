import { describe, expect, it } from 'vitest'
import { buildEllipsePolyline, resolvePathTextLineSpanFromPolyline } from './pathPolylineLayout'

function expectClose(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThan(1)
}

describe('pathPolylineLayout', () => {
  it('computes a centered span inside a circle from boundary points', () => {
    const points = buildEllipsePolyline(200, 200, 128)

    const center = resolvePathTextLineSpanFromPolyline(points, 100)
    expect(center).not.toBeNull()
    expectClose(center?.x ?? 0, 0)
    expectClose(center?.width ?? 0, 200)
  })

  it('computes a narrower span near the top of the circle', () => {
    const points = buildEllipsePolyline(200, 200, 128)

    const upper = resolvePathTextLineSpanFromPolyline(points, 40)
    expect(upper).not.toBeNull()
    expect(upper?.x ?? 0).toBeGreaterThan(0)
    expect(upper?.width ?? 0).toBeLessThan(200)
  })

  it('respects additional horizontal clipping bounds', () => {
    const points = buildEllipsePolyline(200, 200, 128)

    const clipped = resolvePathTextLineSpanFromPolyline(points, 100, 40, 160)
    expect(clipped).toEqual({ x: 40, width: 120 })
  })
})
