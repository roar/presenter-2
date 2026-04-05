import { describe, expect, it } from 'vitest'
import {
  bezierEditorPathToMovePath,
  bezierEditorPathToSplinePoints,
  cloneBezierEditorPath,
  convertBezierEditorPointToBalanced,
  convertBezierEditorPointToCorner,
  convertBezierEditorPointToFree,
  convertBezierEditorPointToSmooth,
  deleteBezierEditorPoint,
  insertBezierEditorPointAtSegment,
  movePathToBezierEditorPath,
  splinePointsToBezierEditorPath
} from './bezierEditor'

describe('bezierEditor', () => {
  it('inserts a default smooth point into a segment', () => {
    const path = insertBezierEditorPointAtSegment(
      {
        points: [
          { id: 'start', x: 0, y: 0, kind: 'corner' },
          { id: 'end', x: 40, y: 80, kind: 'corner' }
        ]
      },
      0,
      { id: 'mid', x: 20, y: 40 }
    )

    expect(path.points[1]).toEqual({
      id: 'mid',
      x: 20,
      y: 40,
      kind: 'smooth',
      inHandle: { x: 10, y: 20 },
      outHandle: { x: 30, y: 60 }
    })
  })

  it('converts a point to free by creating default handles', () => {
    const path = convertBezierEditorPointToFree(
      {
        points: [
          { id: 'start', x: 0, y: 0, kind: 'corner' },
          { id: 'mid', x: 20, y: 40, kind: 'corner' },
          { id: 'end', x: 40, y: 80, kind: 'corner' }
        ]
      },
      'mid'
    )

    expect(path.points[1]).toEqual({
      id: 'mid',
      x: 20,
      y: 40,
      kind: 'free',
      inHandle: { x: 15, y: 30 },
      outHandle: { x: 25, y: 50 }
    })
  })

  it('converts a point to balanced by keeping aligned equal-length handles', () => {
    const path = convertBezierEditorPointToBalanced(
      {
        points: [
          { id: 'start', x: 0, y: 0, kind: 'corner' },
          {
            id: 'mid',
            x: 20,
            y: 40,
            kind: 'free',
            inHandle: { x: 10, y: 20 },
            outHandle: { x: 26, y: 52 }
          },
          { id: 'end', x: 40, y: 80, kind: 'corner' }
        ]
      },
      'mid'
    )

    const mid = path.points[1]
    expect(mid.kind).toBe('balanced')
    expect(
      Math.hypot(mid.x - (mid.inHandle?.x ?? mid.x), mid.y - (mid.inHandle?.y ?? mid.y))
    ).toBeCloseTo(
      Math.hypot((mid.outHandle?.x ?? mid.x) - mid.x, (mid.outHandle?.y ?? mid.y) - mid.y),
      6
    )
  })

  it('deletes only interior points', () => {
    const path = deleteBezierEditorPoint(
      {
        points: [
          { id: 'start', x: 0, y: 0, kind: 'corner' },
          { id: 'mid', x: 20, y: 40, kind: 'corner' },
          { id: 'end', x: 40, y: 80, kind: 'corner' }
        ]
      },
      'mid'
    )

    expect(path.points.map((point) => point.id)).toEqual(['start', 'end'])
    expect(deleteBezierEditorPoint(path, 'start').points.map((point) => point.id)).toEqual([
      'start',
      'end'
    ])
  })

  it('round-trips move paths through the generic editor model', () => {
    const original = {
      points: [
        { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' as const },
        {
          id: 'mid',
          position: { x: 20, y: 40 },
          type: 'bezier' as const,
          inHandle: { x: 10, y: 20 },
          outHandle: { x: 30, y: 60 }
        },
        { id: 'end', position: { x: 40, y: 80 }, type: 'smooth' as const }
      ]
    }

    expect(bezierEditorPathToMovePath(movePathToBezierEditorPath(original))).toEqual(original)
  })

  it('round-trips spline points through the generic editor model', () => {
    const original = [
      { x: 0, y: 0, kind: 'corner' as const, outHandle: { dx: 0.2, dy: 0.1 } },
      {
        x: 0.5,
        y: 0.8,
        kind: 'balanced' as const,
        inHandle: { dx: -0.1, dy: -0.2 },
        outHandle: { dx: 0.1, dy: 0.2 }
      },
      { x: 1, y: 1, kind: 'smooth' as const, inHandle: { dx: -0.2, dy: -0.1 } }
    ]

    expect(bezierEditorPathToSplinePoints(splinePointsToBezierEditorPath(original))).toEqual(
      original
    )
  })

  it('clones editor paths deeply', () => {
    const original = {
      points: [{ id: 'mid', x: 20, y: 40, kind: 'free' as const, inHandle: { x: 10, y: 20 } }]
    }
    const clone = cloneBezierEditorPath(original)
    clone.points[0].x = 999
    expect(original.points[0].x).toBe(20)
  })

  it('converts a point to corner by removing handles', () => {
    const path = convertBezierEditorPointToCorner(
      {
        points: [
          { id: 'start', x: 0, y: 0, kind: 'corner' },
          {
            id: 'mid',
            x: 20,
            y: 40,
            kind: 'free',
            inHandle: { x: 10, y: 20 },
            outHandle: { x: 30, y: 60 }
          },
          { id: 'end', x: 40, y: 80, kind: 'corner' }
        ]
      },
      'mid'
    )

    expect(path.points[1]).toEqual({
      id: 'mid',
      x: 20,
      y: 40,
      kind: 'corner',
      inHandle: undefined,
      outHandle: undefined
    })
  })

  it('converts a point to smooth with aligned opposite handles', () => {
    const path = convertBezierEditorPointToSmooth(
      {
        points: [
          { id: 'start', x: 0, y: 0, kind: 'corner' },
          { id: 'mid', x: 20, y: 40, kind: 'corner' },
          { id: 'end', x: 40, y: 80, kind: 'corner' }
        ]
      },
      'mid'
    )

    expect(path.points[1]).toEqual({
      id: 'mid',
      x: 20,
      y: 40,
      kind: 'smooth',
      inHandle: { x: 15, y: 30 },
      outHandle: { x: 25, y: 50 }
    })
  })
})
