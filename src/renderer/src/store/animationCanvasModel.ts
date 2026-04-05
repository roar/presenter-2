import type { MovePath, MovePathPointType, Position } from '@shared/model/types'

export interface TransformChainMoveStepInput {
  animationId: string
  type: 'move'
  delta: Position
  path?: MovePath
}

export interface TransformChainScaleStepInput {
  animationId: string
  type: 'scale'
  scale: number
}

export type TransformChainStepInput = TransformChainMoveStepInput | TransformChainScaleStepInput

export interface TransformChainMovePreview {
  animationId: string
  type: 'move'
  delta: Position
}

export interface TransformChainScalePreview {
  animationId: string
  type: 'scale'
  scale: number
}

export type TransformChainPreview = TransformChainMovePreview | TransformChainScalePreview

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

export interface TransformChainStepState {
  animationId: string
  type: 'move' | 'scale'
  delta?: Position
  scale?: number
  cumulativeDelta: Position
  cumulativeScale: number
  path?: MovePath
}

export interface MoveCanvasSegmentState {
  animationId: string
  startDelta: Position
  endDelta: Position
  path?: MovePath
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

export function buildTransformChainStates(
  steps: TransformChainStepInput[],
  preview: TransformChainPreview | null
): TransformChainStepState[] {
  const baseStates = steps.reduce<MoveChainStepState[]>((states, step) => {
    const previous = states[states.length - 1]
    const previousDelta = previous?.cumulativeDelta ?? { x: 0, y: 0 }
    const previousScale = previous?.cumulativeScale ?? 1

    if (step.type === 'move') {
      states.push({
        animationId: step.animationId,
        type: 'move',
        delta: step.delta,
        cumulativeDelta: {
          x: previousDelta.x + step.delta.x,
          y: previousDelta.y + step.delta.y
        },
        cumulativeScale: previousScale,
        path: step.path
      })
    } else {
      states.push({
        animationId: step.animationId,
        type: 'scale',
        scale: step.scale,
        cumulativeDelta: previousDelta,
        cumulativeScale: previousScale * step.scale
      })
    }
    return states
  }, [] as TransformChainStepState[])

  if (!preview) return baseStates

  const previewIndex = baseStates.findIndex(
    (step) => step.animationId === preview.animationId && step.type === preview.type
  )
  if (previewIndex < 0) return baseStates

  if (preview.type === 'move') {
    return baseStates.map((step, index) => {
      if (index !== previewIndex || step.type !== 'move') return step

      return {
        animationId: step.animationId,
        type: 'move',
        delta: preview.delta,
        cumulativeDelta: {
          x: step.cumulativeDelta.x + (preview.delta.x - (step.delta?.x ?? 0)),
          y: step.cumulativeDelta.y + (preview.delta.y - (step.delta?.y ?? 0))
        },
        cumulativeScale: step.cumulativeScale,
        path: step.path
      }
    })
  }

  return steps.reduce<TransformChainStepState[]>((states, step, index) => {
    const previous = states[states.length - 1]
    const previousDelta = previous?.cumulativeDelta ?? { x: 0, y: 0 }
    const previousScale = previous?.cumulativeScale ?? 1
    const stepPreview = index === previewIndex && preview.type === 'scale' ? preview : null

    if (step.type === 'move') {
      const delta = stepPreview?.type === 'move' ? stepPreview.delta : step.delta
      states.push({
        animationId: step.animationId,
        type: 'move',
        delta,
        cumulativeDelta: {
          x: previousDelta.x + delta.x,
          y: previousDelta.y + delta.y
        },
        cumulativeScale: previousScale,
        path: step.path
      })
    } else {
      const scale = stepPreview?.type === 'scale' ? stepPreview.scale : step.scale
      states.push({
        animationId: step.animationId,
        type: 'scale',
        scale,
        cumulativeDelta: previousDelta,
        cumulativeScale: previousScale * scale
      })
    }

    return states
  }, [])
}

export function buildMoveChainStates(
  steps: MoveChainStepInput[],
  preview: MoveChainPreview | null
): MoveChainStepState[] {
  return buildTransformChainStates(
    steps.map((step) => ({ ...step, type: 'move' as const })),
    preview ? { ...preview, type: 'move' as const } : null
  ).map((step) => ({
    animationId: step.animationId,
    delta: step.delta ?? { x: 0, y: 0 },
    cumulativeDelta: step.cumulativeDelta,
    path: step.path
  }))
}

export interface ScaleChainStepState {
  animationId: string
  scale: number
  cumulativeScale: number
  cumulativeDelta: Position
}

export function buildScaleChainStates(
  steps: TransformChainStepInput[],
  preview: TransformChainScalePreview | null
): ScaleChainStepState[] {
  return buildTransformChainStates(steps, preview)
    .filter(
      (step): step is TransformChainStepState & { type: 'scale'; scale: number } =>
        step.type === 'scale'
    )
    .map((step) => ({
      animationId: step.animationId,
      scale: step.scale,
      cumulativeScale: step.cumulativeScale,
      cumulativeDelta: step.cumulativeDelta
    }))
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
        endDelta: step.cumulativeDelta,
        path: step.path
      }
    })

  const selectedStep = states[selectedIndex]
  const previous = selectedIndex === 0 ? null : states[selectedIndex - 1]
  const startDelta = previous?.cumulativeDelta ?? { x: 0, y: 0 }
  const activeSegment = {
    animationId: selectedStep.animationId,
    startDelta,
    endDelta: selectedStep.cumulativeDelta,
    path: selectedStep.path
  }

  const downstreamSegments = states
    .slice(selectedIndex + 1)
    .map<MoveCanvasSegmentState>((step, index) => {
      const previous = index === 0 ? states[selectedIndex] : states[selectedIndex + index]
      return {
        animationId: step.animationId,
        startDelta: previous.cumulativeDelta,
        endDelta: step.cumulativeDelta,
        path: step.path
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
