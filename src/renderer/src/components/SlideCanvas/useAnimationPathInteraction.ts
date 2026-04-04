import { useCallback, useEffect, useRef, useState } from 'react'
import type { MovePath } from '@shared/model/types'
import type { SelectedAnimationGroup } from '../../store/documentStore'

interface PathPointDragData {
  animationId: string
  pointId: string
  startClientX: number
  startClientY: number
  originalPath: MovePath
}

interface UseAnimationPathInteractionParams {
  isSpaceDownRef: React.MutableRefObject<boolean>
  scaleRef: React.MutableRefObject<number>
  selectedAnimationGroup: SelectedAnimationGroup | null
  updateAnimationMovePath: (animationId: string, path: MovePath | undefined) => void
}

interface UseAnimationPathInteractionResult {
  pathPreview: { animationId: string; path: MovePath } | null
  handlePathPointMouseDown: (pointId: string, event: React.MouseEvent) => void
  updatePathDragPreview: (event: MouseEvent) => boolean
  commitPathDrag: (event: MouseEvent) => boolean
}

function clonePath(path: MovePath): MovePath {
  return {
    points: path.points.map((point) => ({
      ...point,
      position: { ...point.position },
      inHandle: point.inHandle ? { ...point.inHandle } : undefined,
      outHandle: point.outHandle ? { ...point.outHandle } : undefined
    }))
  }
}

function buildEditablePath(selectedAnimationGroup: SelectedAnimationGroup): MovePath | null {
  const moveStep = selectedAnimationGroup.moveSteps.find(
    (step) => step.animationId === selectedAnimationGroup.selectedAnimation.id
  )
  if (!moveStep) return null
  if (moveStep.path) return clonePath(moveStep.path)

  const activeSegment = selectedAnimationGroup.moveCanvasSelection.activeSegment
  if (!activeSegment) return null

  return {
    points: [
      { id: `${moveStep.animationId}:start`, position: { x: 0, y: 0 }, type: 'sharp' },
      {
        id: `${moveStep.animationId}:end`,
        position: {
          x: activeSegment.endDelta.x - activeSegment.startDelta.x,
          y: activeSegment.endDelta.y - activeSegment.startDelta.y
        },
        type: 'sharp'
      }
    ]
  }
}

function translatePathPoint(path: MovePath, pointId: string, dx: number, dy: number): MovePath {
  return {
    points: path.points.map((point) => {
      if (point.id !== pointId) return point
      return {
        ...point,
        position: { x: point.position.x + dx, y: point.position.y + dy },
        inHandle: point.inHandle
          ? { x: point.inHandle.x + dx, y: point.inHandle.y + dy }
          : undefined,
        outHandle: point.outHandle
          ? { x: point.outHandle.x + dx, y: point.outHandle.y + dy }
          : undefined
      }
    })
  }
}

export function useAnimationPathInteraction({
  isSpaceDownRef,
  scaleRef,
  selectedAnimationGroup,
  updateAnimationMovePath
}: UseAnimationPathInteractionParams): UseAnimationPathInteractionResult {
  const [pathPreview, setPathPreview] = useState<{ animationId: string; path: MovePath } | null>(
    null
  )
  const dragRef = useRef<PathPointDragData | null>(null)
  const selectedAnimationGroupRef = useRef(selectedAnimationGroup)
  const updateAnimationMovePathRef = useRef(updateAnimationMovePath)

  useEffect(() => {
    selectedAnimationGroupRef.current = selectedAnimationGroup
  }, [selectedAnimationGroup])

  useEffect(() => {
    updateAnimationMovePathRef.current = updateAnimationMovePath
  }, [updateAnimationMovePath])

  const handlePathPointMouseDown = useCallback(
    (pointId: string, event: React.MouseEvent) => {
      if (isSpaceDownRef.current) return
      const group = selectedAnimationGroupRef.current
      if (!group || group.selectedAnimation.effect.type !== 'move') return

      const editablePath = buildEditablePath(group)
      if (!editablePath) return

      event.preventDefault()
      event.stopPropagation()
      dragRef.current = {
        animationId: group.selectedAnimation.id,
        pointId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        originalPath: editablePath
      }
      setPathPreview({ animationId: group.selectedAnimation.id, path: editablePath })
    },
    [isSpaceDownRef]
  )

  const updatePathDragPreview = useCallback(
    (event: MouseEvent) => {
      const drag = dragRef.current
      if (!drag) return false

      const dx = (event.clientX - drag.startClientX) / scaleRef.current
      const dy = (event.clientY - drag.startClientY) / scaleRef.current
      setPathPreview({
        animationId: drag.animationId,
        path: translatePathPoint(clonePath(drag.originalPath), drag.pointId, dx, dy)
      })
      return true
    },
    [scaleRef]
  )

  const commitPathDrag = useCallback(
    (event: MouseEvent) => {
      const drag = dragRef.current
      if (!drag) return false

      const dx = (event.clientX - drag.startClientX) / scaleRef.current
      const dy = (event.clientY - drag.startClientY) / scaleRef.current
      const nextPath = translatePathPoint(clonePath(drag.originalPath), drag.pointId, dx, dy)

      updateAnimationMovePathRef.current(drag.animationId, nextPath)
      dragRef.current = null
      setPathPreview(null)
      return true
    },
    [scaleRef]
  )

  return {
    pathPreview,
    handlePathPointMouseDown,
    updatePathDragPreview,
    commitPathDrag
  }
}
