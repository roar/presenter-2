import { describe, expect, it } from 'vitest'
import {
  cloneMovePath,
  convertPointToBezier,
  convertPointToSmooth,
  convertPointToSharp,
  deletePoint,
  insertBezierPointAtSegment
} from './bezierPath'

describe('bezierPath', () => {
  it('inserts a bezier point into a segment', () => {
    const path = insertBezierPointAtSegment(
      {
        points: [
          { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
          { id: 'end', position: { x: 40, y: 80 }, type: 'sharp' }
        ]
      },
      0,
      'mid'
    )

    expect(path.points).toHaveLength(3)
    expect(path.points[1]).toEqual({
      id: 'mid',
      position: { x: 20, y: 40 },
      type: 'bezier',
      inHandle: { x: 10, y: 20 },
      outHandle: { x: 30, y: 60 }
    })
  })

  it('converts a point to sharp by removing handles', () => {
    expect(
      convertPointToSharp(
        {
          points: [
            { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
            {
              id: 'mid',
              position: { x: 20, y: 40 },
              type: 'bezier',
              inHandle: { x: 10, y: 20 },
              outHandle: { x: 30, y: 60 }
            },
            { id: 'end', position: { x: 40, y: 80 }, type: 'sharp' }
          ]
        },
        'mid'
      ).points[1]
    ).toEqual({
      id: 'mid',
      position: { x: 20, y: 40 },
      type: 'sharp',
      inHandle: undefined,
      outHandle: undefined
    })
  })

  it('converts a point to bezier by adding default handles', () => {
    expect(
      convertPointToBezier(
        {
          points: [
            { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
            { id: 'mid', position: { x: 20, y: 40 }, type: 'sharp' },
            { id: 'end', position: { x: 40, y: 80 }, type: 'sharp' }
          ]
        },
        'mid'
      ).points[1]
    ).toEqual({
      id: 'mid',
      position: { x: 20, y: 40 },
      type: 'bezier',
      inHandle: { x: 15, y: 30 },
      outHandle: { x: 25, y: 50 }
    })
  })

  it('converts a point to smooth by creating opposite aligned handles', () => {
    expect(
      convertPointToSmooth(
        {
          points: [
            { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
            { id: 'mid', position: { x: 20, y: 40 }, type: 'sharp' },
            { id: 'end', position: { x: 40, y: 80 }, type: 'sharp' }
          ]
        },
        'mid'
      ).points[1]
    ).toEqual({
      id: 'mid',
      position: { x: 20, y: 40 },
      type: 'smooth',
      inHandle: { x: 15, y: 30 },
      outHandle: { x: 25, y: 50 }
    })
  })

  it('deletes only interior points', () => {
    const path = deletePoint(
      {
        points: [
          { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
          { id: 'mid', position: { x: 20, y: 40 }, type: 'sharp' },
          { id: 'end', position: { x: 40, y: 80 }, type: 'sharp' }
        ]
      },
      'mid'
    )

    expect(path.points.map((point) => point.id)).toEqual(['start', 'end'])
    expect(deletePoint(path, 'start').points.map((point) => point.id)).toEqual(['start', 'end'])
  })

  it('clones a path deeply', () => {
    const original = {
      points: [
        {
          id: 'mid',
          position: { x: 20, y: 40 },
          type: 'bezier' as const,
          inHandle: { x: 10, y: 20 },
          outHandle: { x: 30, y: 60 }
        }
      ]
    }
    const clone = cloneMovePath(original)
    clone.points[0].position.x = 999
    expect(original.points[0].position.x).toBe(20)
  })
})
