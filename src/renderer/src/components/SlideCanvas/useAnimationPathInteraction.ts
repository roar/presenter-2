import { useCallback, useEffect, useRef, useState } from 'react'
import type { MovePath } from '@shared/model/types'
import {
  cloneMovePath,
  convertPointToBezier as convertPathPointToBezier,
  convertPointToSmooth as convertPathPointToSmooth,
  convertPointToSharp as convertPathPointToSharp,
  deletePoint as deletePathPoint,
  insertBezierPointAtSegment
} from '@shared/model/bezierPath'
import type { SelectedAnimationGroup } from '../../store/documentStore'

interface PathPointDragData {
  animationId: string
  pointId: string
  handle?: 'in' | 'out'
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
  handlePathHandleMouseDown: (
    pointId: string,
    handle: 'in' | 'out',
    event: React.MouseEvent
  ) => void
  handleInsertPointMouseDown: (segmentIndex: number, event: React.MouseEvent) => void
  convertPointToSharp: (pointId: string) => void
  convertPointToSmooth: (pointId: string) => void
  convertPointToBezier: (pointId: string) => void
  deletePoint: (pointId: string) => void
  updatePathDragPreview: (event: MouseEvent) => boolean
  commitPathDrag: (event: MouseEvent) => boolean
}

function buildEditablePath(selectedAnimationGroup: SelectedAnimationGroup): MovePath | null {
  const moveStep = selectedAnimationGroup.moveSteps.find(
    (step) => step.animationId === selectedAnimationGroup.selectedAnimation.id
  )
  if (!moveStep) return null
  if (moveStep.path) return cloneMovePath(moveStep.path)

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

function translatePathHandle(
  path: MovePath,
  pointId: string,
  handle: 'in' | 'out',
  dx: number,
  dy: number
): MovePath {
  return {
    points: path.points.map((point) => {
      if (point.id !== pointId) return point
      const key = handle === 'in' ? 'inHandle' : 'outHandle'
      const oppositeKey = handle === 'in' ? 'outHandle' : 'inHandle'
      const current = point[key] ?? point.position
      const nextHandle = { x: current.x + dx, y: current.y + dy }

      if (point.type === 'smooth') {
        const oppositeCurrent = point[oppositeKey] ?? point.position
        const vecX = nextHandle.x - point.position.x
        const vecY = nextHandle.y - point.position.y
        const vecLength = Math.hypot(vecX, vecY) || 1
        const unitX = vecX / vecLength
        const unitY = vecY / vecLength
        const oppositeLength = Math.hypot(
          oppositeCurrent.x - point.position.x,
          oppositeCurrent.y - point.position.y
        )
        return {
          ...point,
          [key]: nextHandle,
          [oppositeKey]: {
            x: point.position.x - unitX * oppositeLength,
            y: point.position.y - unitY * oppositeLength
          }
        }
      }

      return {
        ...point,
        [key]: nextHandle
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

  const handlePathHandleMouseDown = useCallback(
    (pointId: string, handle: 'in' | 'out', event: React.MouseEvent) => {
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
        handle,
        startClientX: event.clientX,
        startClientY: event.clientY,
        originalPath: editablePath
      }
      setPathPreview({ animationId: group.selectedAnimation.id, path: editablePath })
    },
    [isSpaceDownRef]
  )

  const handleInsertPointMouseDown = useCallback(
    (segmentIndex: number, event: React.MouseEvent) => {
      if (isSpaceDownRef.current) return
      const group = selectedAnimationGroupRef.current
      if (!group || group.selectedAnimation.effect.type !== 'move') return
      const editablePath = buildEditablePath(group)
      if (!editablePath) return

      const nextPath = insertBezierPointAtSegment(
        editablePath,
        segmentIndex,
        `point-${Math.random().toString(36).slice(2, 10)}`
      )
      const insertedPoint = nextPath.points[segmentIndex + 1]
      if (!insertedPoint) return

      event.preventDefault()
      event.stopPropagation()
      dragRef.current = {
        animationId: group.selectedAnimation.id,
        pointId: insertedPoint.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        originalPath: nextPath
      }
      setPathPreview({ animationId: group.selectedAnimation.id, path: nextPath })
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
        path: drag.handle
          ? translatePathHandle(cloneMovePath(drag.originalPath), drag.pointId, drag.handle, dx, dy)
          : translatePathPoint(cloneMovePath(drag.originalPath), drag.pointId, dx, dy)
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
      const nextPath = drag.handle
        ? translatePathHandle(cloneMovePath(drag.originalPath), drag.pointId, drag.handle, dx, dy)
        : translatePathPoint(cloneMovePath(drag.originalPath), drag.pointId, dx, dy)

      updateAnimationMovePathRef.current(drag.animationId, nextPath)
      dragRef.current = null
      setPathPreview(null)
      return true
    },
    [scaleRef]
  )

  const applyPathOperation = useCallback((operation: (path: MovePath) => MovePath) => {
    const group = selectedAnimationGroupRef.current
    if (!group || group.selectedAnimation.effect.type !== 'move') return
    const editablePath = buildEditablePath(group)
    if (!editablePath) return
    updateAnimationMovePathRef.current(group.selectedAnimation.id, operation(editablePath))
  }, [])

  return {
    pathPreview,
    handlePathPointMouseDown,
    handlePathHandleMouseDown,
    handleInsertPointMouseDown,
    convertPointToSharp: (pointId) =>
      applyPathOperation((path) => convertPathPointToSharp(path, pointId)),
    convertPointToSmooth: (pointId) =>
      applyPathOperation((path) => convertPathPointToSmooth(path, pointId)),
    convertPointToBezier: (pointId) =>
      applyPathOperation((path) => convertPathPointToBezier(path, pointId)),
    deletePoint: (pointId) => applyPathOperation((path) => deletePathPoint(path, pointId)),
    updatePathDragPreview,
    commitPathDrag
  }
}
