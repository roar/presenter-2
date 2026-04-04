import type { MovePath, MovePathPointType, Position } from '@shared/model/types'

export interface MoveChainStepInput {
  animationId: string
  delta: Position
  path?: MovePath
}

export interface MoveChainStepState {
  animationId: string
  delta: Position
  cumulativeDelta: Position
  path?: MovePath
}

export interface MoveChainPreview {
  animationId: string
  delta: Position
}

export interface MoveCanvasSegmentState {
  animationId: string
  startDelta: Position
  endDelta: Position
}

export interface MoveCanvasPointState {
  id: string
  type: MovePathPointType
  position: Position
  inHandle?: Position
  outHandle?: Position
  isEndpoint: boolean
}

export interface MoveCanvasSelectionState {
  historySegments: MoveCanvasSegmentState[]
  activeSegment: MoveCanvasSegmentState | null
  downstreamSegments: MoveCanvasSegmentState[]
  activePoints: MoveCanvasPointState[]
}

function addPositions(a: Position, b: Position): Position {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function buildMoveChainStates(
  steps: MoveChainStepInput[],
  preview: MoveChainPreview | null
): MoveChainStepState[] {
  const baseStates = steps.reduce<MoveChainStepState[]>((states, step) => {
    const previous = states[states.length - 1]?.cumulativeDelta ?? { x: 0, y: 0 }
    states.push({
      animationId: step.animationId,
      delta: step.delta,
      cumulativeDelta: {
        x: previous.x + step.delta.x,
        y: previous.y + step.delta.y
      },
      path: step.path
    })
    return states
  }, [])

  if (!preview) return baseStates

  const previewIndex = baseStates.findIndex((step) => step.animationId === preview.animationId)
  if (previewIndex < 0) return baseStates

  return baseStates.map((step, index) => {
    if (index !== previewIndex) return step

    return {
      animationId: step.animationId,
      delta: preview.delta,
      cumulativeDelta: {
        x: step.cumulativeDelta.x + (preview.delta.x - step.delta.x),
        y: step.cumulativeDelta.y + (preview.delta.y - step.delta.y)
      },
      path: step.path
    }
  })
}

export function buildMoveCanvasSelection(
  steps: MoveChainStepInput[],
  selectedAnimationId: string | null,
  preview: MoveChainPreview | null = null
): MoveCanvasSelectionState {
  const states = buildMoveChainStates(steps, preview)
  const selectedIndex = selectedAnimationId
    ? states.findIndex((step) => step.animationId === selectedAnimationId)
    : -1

  if (selectedIndex < 0) {
    return { historySegments: [], activeSegment: null, downstreamSegments: [], activePoints: [] }
  }

  const historySegments = states
    .slice(0, selectedIndex)
    .map<MoveCanvasSegmentState>((step, index) => {
      const previous = index === 0 ? null : states[index - 1]
      return {
        animationId: step.animationId,
        startDelta: previous?.cumulativeDelta ?? { x: 0, y: 0 },
        endDelta: step.cumulativeDelta
      }
    })

  const selectedStep = states[selectedIndex]
  const previous = selectedIndex === 0 ? null : states[selectedIndex - 1]
  const startDelta = previous?.cumulativeDelta ?? { x: 0, y: 0 }
  const activeSegment = {
    animationId: selectedStep.animationId,
    startDelta,
    endDelta: selectedStep.cumulativeDelta
  }

  const downstreamSegments = states
    .slice(selectedIndex + 1)
    .map<MoveCanvasSegmentState>((step, index) => {
      const previous = index === 0 ? states[selectedIndex] : states[selectedIndex + index]
      return {
        animationId: step.animationId,
        startDelta: previous.cumulativeDelta,
        endDelta: step.cumulativeDelta
      }
    })

  const activePoints = selectedStep.path?.points.length
    ? selectedStep.path.points.map((point, index, points) => ({
        id: point.id,
        type: point.type,
        position: addPositions(startDelta, point.position),
        inHandle: point.inHandle ? addPositions(startDelta, point.inHandle) : undefined,
        outHandle: point.outHandle ? addPositions(startDelta, point.outHandle) : undefined,
        isEndpoint: index === 0 || index === points.length - 1
      }))
    : [
        {
          id: `${selectedStep.animationId}:start`,
          type: 'sharp',
          position: startDelta,
          isEndpoint: true
        },
        {
          id: `${selectedStep.animationId}:end`,
          type: 'sharp',
          position: selectedStep.cumulativeDelta,
          isEndpoint: true
        }
      ]

  return {
    historySegments,
    activeSegment,
    downstreamSegments,
    activePoints
  }
}
