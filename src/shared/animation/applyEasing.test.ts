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

  describe('steps(4, end)', () => {
    it('t=0.25 → 0', () => {
      expect(applyEasing({ kind: 'steps', count: 4, direction: 'end' }, 0.25)).toBe(0)
    })

    it('t=0.5 → 0.25', () => {
      expect(applyEasing({ kind: 'steps', count: 4, direction: 'end' }, 0.5)).toBeCloseTo(0.25)
    })

    it('t=1.0 → 1.0', () => {
      expect(applyEasing({ kind: 'steps', count: 4, direction: 'end' }, 1.0)).toBeCloseTo(1.0)
    })
  })

  describe('steps(4, start)', () => {
    it('t=0.01 → 0.25', () => {
      expect(applyEasing({ kind: 'steps', count: 4, direction: 'start' }, 0.01)).toBeCloseTo(0.25)
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
})
