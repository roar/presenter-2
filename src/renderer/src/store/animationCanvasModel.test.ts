import { describe, expect, it } from 'vitest'
import { buildMoveCanvasSelection, buildMoveChainStates } from './animationCanvasModel'

describe('animationCanvasModel', () => {
  describe('buildMoveChainStates', () => {
    it('builds ordered cumulative move chain states', () => {
      expect(
        buildMoveChainStates(
          [
            { animationId: 'move-1', delta: { x: 10, y: 20 } },
            { animationId: 'move-2', delta: { x: -5, y: 40 } }
          ],
          null
        )
      ).toEqual([
        {
          animationId: 'move-1',
          delta: { x: 10, y: 20 },
          cumulativeDelta: { x: 10, y: 20 },
          path: undefined
        },
        {
          animationId: 'move-2',
          delta: { x: -5, y: 40 },
          cumulativeDelta: { x: 5, y: 60 },
          path: undefined
        }
      ])
    })
  })

  describe('buildMoveCanvasSelection', () => {
    it('derives dashed history segments and an active straight segment', () => {
      expect(
        buildMoveCanvasSelection(
          [
            { animationId: 'move-1', delta: { x: 10, y: 20 } },
            { animationId: 'move-2', delta: { x: -5, y: 40 } }
          ],
          'move-2'
        )
      ).toEqual({
        historySegments: [
          {
            animationId: 'move-1',
            startDelta: { x: 0, y: 0 },
            endDelta: { x: 10, y: 20 }
          }
        ],
        activeSegment: {
          animationId: 'move-2',
          startDelta: { x: 10, y: 20 },
          endDelta: { x: 5, y: 60 }
        },
        activePoints: [
          {
            id: 'move-2:start',
            type: 'sharp',
            position: { x: 10, y: 20 },
            isEndpoint: true
          },
          {
            id: 'move-2:end',
            type: 'sharp',
            position: { x: 5, y: 60 },
            isEndpoint: true
          }
        ]
      })
    })

    it('derives absolute active bezier points from the selected step path', () => {
      expect(
        buildMoveCanvasSelection(
          [
            { animationId: 'move-1', delta: { x: 10, y: 20 } },
            {
              animationId: 'move-2',
              delta: { x: 90, y: 120 },
              path: {
                points: [
                  { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
                  {
                    id: 'mid',
                    position: { x: 40, y: 30 },
                    type: 'bezier',
                    inHandle: { x: 20, y: 10 },
                    outHandle: { x: 55, y: 45 }
                  },
                  { id: 'end', position: { x: 90, y: 120 }, type: 'sharp' }
                ]
              }
            }
          ],
          'move-2'
        )
      ).toEqual({
        historySegments: [
          {
            animationId: 'move-1',
            startDelta: { x: 0, y: 0 },
            endDelta: { x: 10, y: 20 }
          }
        ],
        activeSegment: {
          animationId: 'move-2',
          startDelta: { x: 10, y: 20 },
          endDelta: { x: 100, y: 140 }
        },
        activePoints: [
          {
            id: 'start',
            type: 'sharp',
            position: { x: 10, y: 20 },
            inHandle: undefined,
            outHandle: undefined,
            isEndpoint: true
          },
          {
            id: 'mid',
            type: 'bezier',
            position: { x: 50, y: 50 },
            inHandle: { x: 30, y: 30 },
            outHandle: { x: 65, y: 65 },
            isEndpoint: false
          },
          {
            id: 'end',
            type: 'sharp',
            position: { x: 100, y: 140 },
            inHandle: undefined,
            outHandle: undefined,
            isEndpoint: true
          }
        ]
      })
    })
  })
})
