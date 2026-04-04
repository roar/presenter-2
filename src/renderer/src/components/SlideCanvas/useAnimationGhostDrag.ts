import { useCallback, useEffect, useRef, useState } from 'react'
import type { Position } from '@shared/model/types'
import type { SelectedAnimationGroup } from '../../store/documentStore'

interface GhostDragData {
  animationId: string
  startClientX: number
  startClientY: number
  originalDelta: Position
}

interface UseAnimationGhostDragParams {
  isSpaceDownRef: React.MutableRefObject<boolean>
  scaleRef: React.MutableRefObject<number>
  selectAnimation: (id: string | null) => void
  selectedAnimationGroup: SelectedAnimationGroup | null
  updateAnimationMoveDelta: (animationId: string, delta: Position) => void
}

interface UseAnimationGhostDragResult {
  ghostPreview: { animationId: string; delta: Position } | null
  ghostDragRef: React.MutableRefObject<GhostDragData | null>
  handleAnimationGhostMouseDown: (
    animationId: string,
    delta: Position,
    event: React.MouseEvent
  ) => void
  updateGhostDragPreview: (event: MouseEvent) => boolean
  commitGhostDrag: (event: MouseEvent) => boolean
}

export function useAnimationGhostDrag({
  isSpaceDownRef,
  scaleRef,
  selectAnimation,
  selectedAnimationGroup,
  updateAnimationMoveDelta
}: UseAnimationGhostDragParams): UseAnimationGhostDragResult {
  const [ghostPreview, setGhostPreview] = useState<{ animationId: string; delta: Position } | null>(
    null
  )
  const ghostDragRef = useRef<GhostDragData | null>(null)
  const selectedAnimationGroupRef = useRef(selectedAnimationGroup)
  const updateAnimationMoveDeltaRef = useRef(updateAnimationMoveDelta)

  useEffect(() => {
    selectedAnimationGroupRef.current = selectedAnimationGroup
  }, [selectedAnimationGroup])

  useEffect(() => {
    updateAnimationMoveDeltaRef.current = updateAnimationMoveDelta
  }, [updateAnimationMoveDelta])

  const handleAnimationGhostMouseDown = useCallback(
    (animationId: string, delta: Position, event: React.MouseEvent) => {
      if (isSpaceDownRef.current) return
      event.preventDefault()
      event.stopPropagation()
      selectAnimation(animationId)
      ghostDragRef.current = {
        animationId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        originalDelta: delta
      }
      setGhostPreview({ animationId, delta })
    },
    [isSpaceDownRef, selectAnimation]
  )

  const updateGhostDragPreview = useCallback(
    (event: MouseEvent) => {
      const ghostDrag = ghostDragRef.current
      if (!ghostDrag) return false

      const dx = (event.clientX - ghostDrag.startClientX) / scaleRef.current
      const dy = (event.clientY - ghostDrag.startClientY) / scaleRef.current
      setGhostPreview({
        animationId: ghostDrag.animationId,
        delta: {
          x: ghostDrag.originalDelta.x + dx,
          y: ghostDrag.originalDelta.y + dy
        }
      })
      return true
    },
    [scaleRef]
  )

  const commitGhostDrag = useCallback(
    (event: MouseEvent) => {
      const ghostDrag = ghostDragRef.current
      if (!ghostDrag) return false

      const dx = (event.clientX - ghostDrag.startClientX) / scaleRef.current
      const dy = (event.clientY - ghostDrag.startClientY) / scaleRef.current
      const nextDelta = {
        x: ghostDrag.originalDelta.x + dx,
        y: ghostDrag.originalDelta.y + dy
      }

      updateAnimationMoveDeltaRef.current(ghostDrag.animationId, nextDelta)
      const moveSteps = selectedAnimationGroupRef.current?.moveSteps ?? []
      const currentIndex = moveSteps.findIndex((step) => step.animationId === ghostDrag.animationId)
      const nextStep = currentIndex >= 0 ? moveSteps[currentIndex + 1] : null
      if (nextStep) {
        updateAnimationMoveDeltaRef.current(nextStep.animationId, {
          x: nextStep.delta.x - (nextDelta.x - ghostDrag.originalDelta.x),
          y: nextStep.delta.y - (nextDelta.y - ghostDrag.originalDelta.y)
        })
      }

      ghostDragRef.current = null
      setGhostPreview(null)
      return true
    },
    [scaleRef]
  )

  return {
    ghostPreview,
    ghostDragRef,
    handleAnimationGhostMouseDown,
    updateGhostDragPreview,
    commitGhostDrag
  }
}
