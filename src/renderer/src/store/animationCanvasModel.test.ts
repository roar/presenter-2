import { describe, expect, it } from 'vitest'
import {
  buildMoveCanvasSelection,
  buildMoveChainStates,
  buildScaleChainStates,
  buildTransformChainStates
} from './animationCanvasModel'

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

  describe('buildTransformChainStates', () => {
    it('builds ordered cumulative move and scale states', () => {
      expect(
        buildTransformChainStates(
          [
            { animationId: 'move-1', type: 'move', delta: { x: 10, y: 20 } },
            { animationId: 'scale-1', type: 'scale', scale: 1.5 },
            { animationId: 'move-2', type: 'move', delta: { x: -5, y: 15 } }
          ],
          null
        )
      ).toEqual([
        {
          animationId: 'move-1',
          type: 'move',
          delta: { x: 10, y: 20 },
          cumulativeDelta: { x: 10, y: 20 },
          cumulativeScale: 1,
          path: undefined
        },
        {
          animationId: 'scale-1',
          type: 'scale',
          scale: 1.5,
          cumulativeDelta: { x: 10, y: 20 },
          cumulativeScale: 1.5
        },
        {
          animationId: 'move-2',
          type: 'move',
          delta: { x: -5, y: 15 },
          cumulativeDelta: { x: 5, y: 35 },
          cumulativeScale: 1.5,
          path: undefined
        }
      ])
    })

    it('recomputes downstream scale states after a scale preview change', () => {
      expect(
        buildTransformChainStates(
          [
            { animationId: 'move-1', type: 'move', delta: { x: 10, y: 20 } },
            { animationId: 'scale-1', type: 'scale', scale: 1.5 },
            { animationId: 'scale-2', type: 'scale', scale: 2 }
          ],
          { animationId: 'scale-1', type: 'scale', scale: 2 }
        )
      ).toEqual([
        {
          animationId: 'move-1',
          type: 'move',
          delta: { x: 10, y: 20 },
          cumulativeDelta: { x: 10, y: 20 },
          cumulativeScale: 1,
          path: undefined
        },
        {
          animationId: 'scale-1',
          type: 'scale',
          scale: 2,
          cumulativeDelta: { x: 10, y: 20 },
          cumulativeScale: 2
        },
        {
          animationId: 'scale-2',
          type: 'scale',
          scale: 2,
          cumulativeDelta: { x: 10, y: 20 },
          cumulativeScale: 4
        }
      ])
    })
  })

  describe('buildScaleChainStates', () => {
    it('derives cumulative scale steps while preserving move offsets', () => {
      expect(
        buildScaleChainStates(
          [
            { animationId: 'move-1', type: 'move', delta: { x: 30, y: 40 } },
            { animationId: 'scale-1', type: 'scale', scale: 1.25 },
            { animationId: 'scale-2', type: 'scale', scale: 0.5 }
          ],
          null
        )
      ).toEqual([
        {
          animationId: 'scale-1',
          scale: 1.25,
          cumulativeScale: 1.25,
          cumulativeDelta: { x: 30, y: 40 }
        },
        {
          animationId: 'scale-2',
          scale: 0.5,
          cumulativeScale: 0.625,
          cumulativeDelta: { x: 30, y: 40 }
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
            endDelta: { x: 10, y: 20 },
            path: undefined
          }
        ],
        activeSegment: {
          animationId: 'move-2',
          startDelta: { x: 10, y: 20 },
          endDelta: { x: 100, y: 140 },
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
            endDelta: { x: 10, y: 20 },
            path: undefined
          }
        ],
        activeSegment: {
          animationId: 'move-2',
          startDelta: { x: 10, y: 20 },
          endDelta: { x: 60, y: 90 },
          path: {
            points: [
              { id: 'start', position: { x: 0, y: 0 }, type: 'sharp' },
              { id: 'end', position: { x: 30, y: 40 }, type: 'sharp' }
            ]
          }
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
