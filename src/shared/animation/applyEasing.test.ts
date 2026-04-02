import { describe, it, expect } from 'vitest'
import { applyEasing } from './applyEasing'

describe('applyEasing', () => {
  describe('boundary conditions', () => {
    it('returns 0 at progress 0 for all named presets', () => {
      expect(applyEasing('linear', 0)).toBe(0)
      expect(applyEasing('ease-in', 0)).toBe(0)
      expect(applyEasing('ease-out', 0)).toBe(0)
      expect(applyEasing('ease-in-out', 0)).toBe(0)
    })

    it('returns 1 at progress 1 for all named presets', () => {
      expect(applyEasing('linear', 1)).toBeCloseTo(1)
      expect(applyEasing('ease-in', 1)).toBeCloseTo(1)
      expect(applyEasing('ease-out', 1)).toBeCloseTo(1)
      expect(applyEasing('ease-in-out', 1)).toBeCloseTo(1)
    })
  })

  describe('linear', () => {
    it('returns progress unchanged', () => {
      expect(applyEasing('linear', 0.5)).toBeCloseTo(0.5)
      expect(applyEasing('linear', 0.25)).toBeCloseTo(0.25)
      expect(applyEasing('linear', 0.75)).toBeCloseTo(0.75)
    })
  })

  describe('ease-out', () => {
    it('is ahead of linear throughout — covers ground faster early', () => {
      expect(applyEasing('ease-out', 0.25)).toBeGreaterThan(applyEasing('linear', 0.25))
      expect(applyEasing('ease-out', 0.5)).toBeGreaterThan(applyEasing('linear', 0.5))
      expect(applyEasing('ease-out', 0.75)).toBeGreaterThan(applyEasing('linear', 0.75))
    })
  })

  describe('ease-in', () => {
    it('is behind linear throughout — covers ground slower early', () => {
      expect(applyEasing('ease-in', 0.25)).toBeLessThan(applyEasing('linear', 0.25))
      expect(applyEasing('ease-in', 0.5)).toBeLessThan(applyEasing('linear', 0.5))
      expect(applyEasing('ease-in', 0.75)).toBeLessThan(applyEasing('linear', 0.75))
    })
  })

  describe('ease-in-out', () => {
    it('is symmetric around 0.5', () => {
      const at025 = applyEasing('ease-in-out', 0.25)
      const at075 = applyEasing('ease-in-out', 0.75)
      expect(at025 + at075).toBeCloseTo(1, 3)
    })

    it('is slower than linear at 0.25', () => {
      expect(applyEasing('ease-in-out', 0.25)).toBeLessThan(applyEasing('linear', 0.25))
    })
  })

  describe('cubic-bezier', () => {
    it('returns 0 at progress 0', () => {
      expect(applyEasing({ kind: 'cubic-bezier', x1: 0.4, y1: 0, x2: 0.2, y2: 1 }, 0)).toBe(0)
    })

    it('returns ~1 at progress 1', () => {
      expect(applyEasing({ kind: 'cubic-bezier', x1: 0.4, y1: 0, x2: 0.2, y2: 1 }, 1)).toBeCloseTo(
        1
      )
    })

    it('midpoint is in (0, 1)', () => {
      const mid = applyEasing({ kind: 'cubic-bezier', x1: 0.4, y1: 0, x2: 0.2, y2: 1 }, 0.5)
      expect(mid).toBeGreaterThan(0)
      expect(mid).toBeLessThan(1)
    })
  })

  describe('spring', () => {
    const spring = {
      kind: 'spring' as const,
      mass: 1,
      stiffness: 100,
      damping: 10,
      initialVelocity: 0
    }

    it('returns 0 at progress 0', () => {
      expect(applyEasing(spring, 0)).toBeCloseTo(0)
    })

    it('returns ~1 at progress 1', () => {
      expect(applyEasing(spring, 1)).toBeCloseTo(1, 2)
    })

    it('may overshoot internally (progress between 0 and 1)', () => {
      // Spring can overshoot — we just check it returns a number
      const mid = applyEasing(spring, 0.5)
      expect(typeof mid).toBe('number')
    })
  })

  describe('curve', () => {
    // Linear bezier: P0=(0,0), P1=(1/3,1/3), P2=(2/3,2/3), P3=(1,1)
    // Achieved by setting outHandle=(1/3,1/3) on the first point and
    // inHandle=(-1/3,-1/3) on the last point.
    const linearCurve = {
      kind: 'curve' as const,
      points: [
        { x: 0, y: 0, kind: 'corner' as const, outHandle: { dx: 1 / 3, dy: 1 / 3 } },
        { x: 1, y: 1, kind: 'corner' as const, inHandle: { dx: -1 / 3, dy: -1 / 3 } }
      ]
    }

    it('returns 0 at progress 0', () => {
      expect(applyEasing(linearCurve, 0)).toBeCloseTo(0)
    })

    it('returns 1 at progress 1', () => {
      expect(applyEasing(linearCurve, 1)).toBeCloseTo(1)
    })

    it('evaluates a linear curve at midpoint', () => {
      expect(applyEasing(linearCurve, 0.5)).toBeCloseTo(0.5, 3)
    })

    it('evaluates a linear curve at quarter points', () => {
      expect(applyEasing(linearCurve, 0.25)).toBeCloseTo(0.25, 3)
      expect(applyEasing(linearCurve, 0.75)).toBeCloseTo(0.75, 3)
    })

    it('evaluates the correct segment of a multi-segment curve', () => {
      // Two-segment linear curve via a midpoint anchor at (0.5, 0.5)
      const twoSegment = {
        kind: 'curve' as const,
        points: [
          { x: 0, y: 0, kind: 'corner' as const, outHandle: { dx: 1 / 6, dy: 1 / 6 } },
          {
            x: 0.5,
            y: 0.5,
            kind: 'corner' as const,
            inHandle: { dx: -1 / 6, dy: -1 / 6 },
            outHandle: { dx: 1 / 6, dy: 1 / 6 }
          },
          { x: 1, y: 1, kind: 'corner' as const, inHandle: { dx: -1 / 6, dy: -1 / 6 } }
        ]
      }
      expect(applyEasing(twoSegment, 0.25)).toBeCloseTo(0.25, 3)
      expect(applyEasing(twoSegment, 0.5)).toBeCloseTo(0.5, 3)
      expect(applyEasing(twoSegment, 0.75)).toBeCloseTo(0.75, 3)
    })

    it('supports overshoot when handles push y beyond 1', () => {
      // outHandle pushes the curve well above y=1 at the midpoint
      const overshoot = {
        kind: 'curve' as const,
        points: [
          { x: 0, y: 0, kind: 'corner' as const, outHandle: { dx: 0.3, dy: 2.0 } },
          { x: 1, y: 1, kind: 'corner' as const, inHandle: { dx: -0.3, dy: -0.5 } }
        ]
      }
      const mid = applyEasing(overshoot, 0.5)
      expect(mid).toBeGreaterThan(1)
    })

    it('handles missing handles (zero-length defaults to cubic ease-in-out shape)', () => {
      const noHandles = {
        kind: 'curve' as const,
        points: [
          { x: 0, y: 0, kind: 'corner' as const },
          { x: 1, y: 1, kind: 'corner' as const }
        ]
      }
      // No handles → P0=P1=(0,0), P2=P3=(1,1) → symmetric 3t²-2t³
      expect(applyEasing(noHandles, 0)).toBeCloseTo(0)
      expect(applyEasing(noHandles, 1)).toBeCloseTo(1)
      // Symmetric: f(t) + f(1-t) ≈ 1
      expect(applyEasing(noHandles, 0.25) + applyEasing(noHandles, 0.75)).toBeCloseTo(1, 3)
    })
  })
})
