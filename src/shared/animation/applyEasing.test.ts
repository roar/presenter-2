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

  describe('not implemented variants', () => {
    it('throws for cubic-bezier', () => {
      expect(() =>
        applyEasing({ kind: 'cubic-bezier', x1: 0.4, y1: 0, x2: 0.2, y2: 1 }, 0.5)
      ).toThrow('not implemented')
    })

    it('throws for steps', () => {
      expect(() => applyEasing({ kind: 'steps', count: 4, direction: 'end' }, 0.5)).toThrow(
        'not implemented'
      )
    })
  })
})
