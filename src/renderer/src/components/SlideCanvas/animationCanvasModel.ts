import type { Position } from '@shared/model/types'

export interface MoveChainStepInput {
  animationId: string
  delta: Position
}

export interface MoveChainStepState {
  animationId: string
  delta: Position
  cumulativeDelta: Position
}

export interface MoveChainPreview {
  animationId: string
  delta: Position
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
      }
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
      }
    }
  })
}
