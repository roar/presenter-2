import { describe, expect, it } from 'vitest'
import {
  getMoveEffectDelta,
  syncMoveEffectDelta,
  syncMoveEffectPath,
  withMovePathEndpoint
} from './movePath'
import type { Animation } from './types'

describe('movePath', () => {
  describe('getMoveEffectDelta', () => {
    it('returns the stored delta when no path is present', () => {
      const effect: Extract<Animation, { type: 'move' }> = {
        kind: 'action',
        type: 'move',
        delta: { x: 24, y: 48 }
      }

      expect(getMoveEffectDelta(effect)).toEqual({ x: 24, y: 48 })
    })

    it('returns the path endpoint when a path is present', () => {
      const effect: Extract<Animation, { type: 'move' }> = {
        kind: 'action',
        type: 'move',
        delta: { x: 0, y: 0 },
        path: {
          points: [
            { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
            {
              id: 'curve',
              position: { x: 30, y: 20 },
              type: 'bezier',
              inHandle: { x: 10, y: 12 },
              outHandle: { x: 45, y: 28 }
            },
            { id: 'end', position: { x: 90, y: 120 }, type: 'sharp' }
          ]
        }
      }

      expect(getMoveEffectDelta(effect)).toEqual({ x: 90, y: 120 })
    })

    it('supports legacy move effects stored with fromOffset', () => {
      const effect = {
        kind: 'action',
        type: 'move',
        fromOffset: { x: 12, y: 34 }
      } as Extract<Animation, { type: 'move' }>

      expect(getMoveEffectDelta(effect)).toEqual({ x: 12, y: 34 })
    })
  })

  describe('syncMoveEffectDelta', () => {
    it('updates both delta and the path endpoint for a path-backed effect', () => {
      const effect: Extract<Animation, { type: 'move' }> = {
        kind: 'action',
        type: 'move',
        delta: { x: 10, y: 20 },
        path: {
          points: [
            { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
            { id: 'end', position: { x: 10, y: 20 }, type: 'sharp' }
          ]
        }
      }

      syncMoveEffectDelta(effect, { x: 40, y: 80 })

      expect(effect.delta).toEqual({ x: 40, y: 80 })
      expect(effect.path?.points[1]?.position).toEqual({ x: 40, y: 80 })
    })
  })

  describe('syncMoveEffectPath', () => {
    it('replaces the path and syncs delta from the new endpoint', () => {
      const effect: Extract<Animation, { type: 'move' }> = {
        kind: 'action',
        type: 'move',
        delta: { x: 10, y: 20 }
      }

      syncMoveEffectPath(effect, {
        points: [
          { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
          { id: 'end', position: { x: 120, y: 160 }, type: 'sharp' }
        ]
      })

      expect(effect.path).toEqual({
        points: [
          { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
          { id: 'end', position: { x: 120, y: 160 }, type: 'sharp' }
        ]
      })
      expect(effect.delta).toEqual({ x: 120, y: 160 })
    })
  })

  describe('withMovePathEndpoint', () => {
    it('returns a cloned path with the last point moved to the provided endpoint', () => {
      const path = {
        points: [
          { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' as const },
          { id: 'curve', position: { x: 30, y: 20 }, type: 'smooth' as const },
          { id: 'end', position: { x: 40, y: 80 }, type: 'sharp' as const }
        ]
      }

      expect(withMovePathEndpoint(path, { x: 60, y: 110 })).toEqual({
        points: [
          { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
          { id: 'curve', position: { x: 30, y: 20 }, type: 'smooth' },
          { id: 'end', position: { x: 60, y: 110 }, type: 'sharp' }
        ]
      })
      expect(path.points[2].position).toEqual({ x: 40, y: 80 })
    })
  })
})
