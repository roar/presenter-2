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
        downstreamSegments: [],
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
        downstreamSegments: [],
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

    it('moves the active path with the ghost preview while keeping earlier history fixed', () => {
      expect(
        buildMoveCanvasSelection(
          [
            { animationId: 'move-1', delta: { x: 10, y: 20 } },
            {
              animationId: 'move-2',
              delta: { x: 30, y: 40 },
              path: {
                points: [
                  { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
                  { id: 'end', position: { x: 30, y: 40 }, type: 'sharp' }
                ]
              }
            }
          ],
          'move-2',
          { animationId: 'move-2', delta: { x: 50, y: 70 } }
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
          endDelta: { x: 60, y: 90 }
        },
        downstreamSegments: [],
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
            id: 'end',
            type: 'sharp',
            position: { x: 40, y: 60 },
            inHandle: undefined,
            outHandle: undefined,
            isEndpoint: true
          }
        ]
      })
    })

    it('derives downstream continuation segments after the selected step', () => {
      expect(
        buildMoveCanvasSelection(
          [
            { animationId: 'move-1', delta: { x: 10, y: 20 } },
            { animationId: 'move-2', delta: { x: 30, y: 40 } },
            { animationId: 'move-3', delta: { x: -15, y: 25 } }
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
          endDelta: { x: 40, y: 60 }
        },
        downstreamSegments: [
          {
            animationId: 'move-3',
            startDelta: { x: 40, y: 60 },
            endDelta: { x: 25, y: 85 }
          }
        ],
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
            position: { x: 40, y: 60 },
            isEndpoint: true
          }
        ]
      })
    })
  })
})
