import { useCallback, useEffect, useRef, useState } from 'react'
import type { Position } from '@shared/model/types'
import type { BezierEditorPath } from '@shared/model/bezierEditor'
import {
  cloneBezierEditorPath,
  convertBezierEditorPointToBalanced,
  convertBezierEditorPointToCorner,
  convertBezierEditorPointToFree,
  convertBezierEditorPointToSmooth,
  deleteBezierEditorPoint,
  insertBezierEditorPointAtSegment
} from '@shared/model/bezierEditor'

interface BezierDragData {
  editorId: string
  pointId: string
  handle?: 'in' | 'out'
  startClientX: number
  startClientY: number
  originalPath: BezierEditorPath
}

interface UseBezierEditorInteractionParams {
  isSpaceDownRef: React.MutableRefObject<boolean>
  scaleRef: React.MutableRefObject<number>
  editorId: string | null
  getEditablePath: () => BezierEditorPath | null
  onCommitPath: (editorId: string, path: BezierEditorPath) => void
  toLocalDelta?: (delta: Position) => Position
  toLocalInsertPosition?: (position: Position) => Position
  constrainPath?: (path: BezierEditorPath) => BezierEditorPath
}

interface UseBezierEditorInteractionResult {
  pathPreview: { editorId: string; path: BezierEditorPath } | null
  handlePointMouseDown: (pointId: string, event: React.MouseEvent) => void
  handleHandleMouseDown: (pointId: string, handle: 'in' | 'out', event: React.MouseEvent) => void
  handleInsertPointMouseDown: (
    segmentIndex: number,
    position: Position,
    event: React.MouseEvent
  ) => void
  convertPointToCorner: (pointId: string) => void
  convertPointToSmooth: (pointId: string) => void
  convertPointToBalanced: (pointId: string) => void
  convertPointToFree: (pointId: string) => void
  deletePoint: (pointId: string) => void
  updateDragPreview: (event: MouseEvent) => boolean
  commitDrag: (event: MouseEvent) => boolean
}

function translatePoint(
  path: BezierEditorPath,
  pointId: string,
  dx: number,
  dy: number
): BezierEditorPath {
  return {
    points: path.points.map((point) =>
      point.id === pointId
        ? {
            ...point,
            x: point.x + dx,
            y: point.y + dy,
            inHandle: point.inHandle
              ? { x: point.inHandle.x + dx, y: point.inHandle.y + dy }
              : undefined,
            outHandle: point.outHandle
              ? { x: point.outHandle.x + dx, y: point.outHandle.y + dy }
              : undefined
          }
        : point
    )
  }
}

function translateHandle(
  path: BezierEditorPath,
  pointId: string,
  handle: 'in' | 'out',
  dx: number,
  dy: number
): BezierEditorPath {
  return {
    points: path.points.map((point) => {
      if (point.id !== pointId) return point
      const key = handle === 'in' ? 'inHandle' : 'outHandle'
      const oppositeKey = handle === 'in' ? 'outHandle' : 'inHandle'
      const current = point[key] ?? { x: point.x, y: point.y }
      const nextHandle = { x: current.x + dx, y: current.y + dy }

      if (point.kind === 'smooth' || point.kind === 'balanced') {
        const oppositeCurrent = point[oppositeKey] ?? { x: point.x, y: point.y }
        const vecX = nextHandle.x - point.x
        const vecY = nextHandle.y - point.y
        const vecLength = Math.hypot(vecX, vecY) || 1
        const unitX = vecX / vecLength
        const unitY = vecY / vecLength
        const oppositeLength =
          point.kind === 'balanced'
            ? Math.hypot(vecX, vecY)
            : Math.hypot(oppositeCurrent.x - point.x, oppositeCurrent.y - point.y)

        return {
          ...point,
          [key]: nextHandle,
          [oppositeKey]: {
            x: point.x - unitX * oppositeLength,
            y: point.y - unitY * oppositeLength
          }
        }
      }

      return { ...point, [key]: nextHandle }
    })
  }
}

export function useBezierEditorInteraction({
  isSpaceDownRef,
  scaleRef,
  editorId,
  getEditablePath,
  onCommitPath,
  toLocalDelta,
  toLocalInsertPosition,
  constrainPath
}: UseBezierEditorInteractionParams): UseBezierEditorInteractionResult {
  const [pathPreview, setPathPreview] = useState<{
    editorId: string
    path: BezierEditorPath
  } | null>(null)
  const dragRef = useRef<BezierDragData | null>(null)
  const editorIdRef = useRef(editorId)
  const getEditablePathRef = useRef(getEditablePath)
  const onCommitPathRef = useRef(onCommitPath)
  const toLocalDeltaRef = useRef(toLocalDelta)
  const toLocalInsertPositionRef = useRef(toLocalInsertPosition)
  const constrainPathRef = useRef(constrainPath)

  useEffect(() => {
    editorIdRef.current = editorId
  }, [editorId])

  useEffect(() => {
    getEditablePathRef.current = getEditablePath
  }, [getEditablePath])

  useEffect(() => {
    onCommitPathRef.current = onCommitPath
  }, [onCommitPath])

  useEffect(() => {
    toLocalDeltaRef.current = toLocalDelta
  }, [toLocalDelta])

  useEffect(() => {
    toLocalInsertPositionRef.current = toLocalInsertPosition
  }, [toLocalInsertPosition])

  useEffect(() => {
    constrainPathRef.current = constrainPath
  }, [constrainPath])

  const applyConstraints = useCallback((path: BezierEditorPath): BezierEditorPath => {
    const constrain = constrainPathRef.current
    return constrain ? constrain(path) : path
  }, [])

  const beginDrag = useCallback(
    (pointId: string, handle: 'in' | 'out' | undefined, event: React.MouseEvent) => {
      if (isSpaceDownRef.current) return
      const nextEditorId = editorIdRef.current
      const editablePath = getEditablePathRef.current()
      if (!nextEditorId || !editablePath) return

      event.preventDefault()
      event.stopPropagation()
      dragRef.current = {
        editorId: nextEditorId,
        pointId,
        handle,
        startClientX: event.clientX,
        startClientY: event.clientY,
        originalPath: editablePath
      }
      setPathPreview({ editorId: nextEditorId, path: applyConstraints(editablePath) })
    },
    [applyConstraints, isSpaceDownRef]
  )

  const updateDragPreview = useCallback(
    (event: MouseEvent) => {
      const drag = dragRef.current
      if (!drag) return false

      const delta = toLocalDeltaRef.current?.({
        x: (event.clientX - drag.startClientX) / scaleRef.current,
        y: (event.clientY - drag.startClientY) / scaleRef.current
      }) ?? {
        x: (event.clientX - drag.startClientX) / scaleRef.current,
        y: (event.clientY - drag.startClientY) / scaleRef.current
      }
      setPathPreview({
        editorId: drag.editorId,
        path: applyConstraints(
          drag.handle
            ? translateHandle(
                cloneBezierEditorPath(drag.originalPath),
                drag.pointId,
                drag.handle,
                delta.x,
                delta.y
              )
            : translatePoint(
                cloneBezierEditorPath(drag.originalPath),
                drag.pointId,
                delta.x,
                delta.y
              )
        )
      })
      return true
    },
    [applyConstraints, scaleRef]
  )

  const commitDrag = useCallback(
    (event: MouseEvent) => {
      const drag = dragRef.current
      if (!drag) return false

      const delta = toLocalDeltaRef.current?.({
        x: (event.clientX - drag.startClientX) / scaleRef.current,
        y: (event.clientY - drag.startClientY) / scaleRef.current
      }) ?? {
        x: (event.clientX - drag.startClientX) / scaleRef.current,
        y: (event.clientY - drag.startClientY) / scaleRef.current
      }
      const nextPath = applyConstraints(
        drag.handle
          ? translateHandle(
              cloneBezierEditorPath(drag.originalPath),
              drag.pointId,
              drag.handle,
              delta.x,
              delta.y
            )
          : translatePoint(cloneBezierEditorPath(drag.originalPath), drag.pointId, delta.x, delta.y)
      )

      onCommitPathRef.current(drag.editorId, nextPath)
      dragRef.current = null
      setPathPreview(null)
      return true
    },
    [applyConstraints, scaleRef]
  )

  const applyPathOperation = useCallback(
    (operation: (path: BezierEditorPath) => BezierEditorPath) => {
      const nextEditorId = editorIdRef.current
      const editablePath = getEditablePathRef.current()
      if (!nextEditorId || !editablePath) return
      onCommitPathRef.current(nextEditorId, applyConstraints(operation(editablePath)))
    },
    [applyConstraints]
  )

  return {
    pathPreview,
    handlePointMouseDown: (pointId, event) => beginDrag(pointId, undefined, event),
    handleHandleMouseDown: (pointId, handle, event) => beginDrag(pointId, handle, event),
    handleInsertPointMouseDown: (segmentIndex, position, event) => {
      if (isSpaceDownRef.current) return
      const nextEditorId = editorIdRef.current
      const editablePath = getEditablePathRef.current()
      if (!nextEditorId || !editablePath) return

      const localPosition = toLocalInsertPositionRef.current?.(position) ?? position
      const nextPath = applyConstraints(
        insertBezierEditorPointAtSegment(editablePath, segmentIndex, {
          id: `point-${Math.random().toString(36).slice(2, 10)}`,
          x: localPosition.x,
          y: localPosition.y,
          kind: 'smooth'
        })
      )
      const insertedPoint = nextPath.points[segmentIndex + 1]
      if (!insertedPoint) return

      event.preventDefault()
      event.stopPropagation()
      dragRef.current = {
        editorId: nextEditorId,
        pointId: insertedPoint.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        originalPath: nextPath
      }
      setPathPreview({ editorId: nextEditorId, path: nextPath })
    },
    convertPointToCorner: (pointId) =>
      applyPathOperation((path) => convertBezierEditorPointToCorner(path, pointId)),
    convertPointToSmooth: (pointId) =>
      applyPathOperation((path) => convertBezierEditorPointToSmooth(path, pointId)),
    convertPointToBalanced: (pointId) =>
      applyPathOperation((path) => convertBezierEditorPointToBalanced(path, pointId)),
    convertPointToFree: (pointId) =>
      applyPathOperation((path) => convertBezierEditorPointToFree(path, pointId)),
    deletePoint: (pointId) => applyPathOperation((path) => deleteBezierEditorPoint(path, pointId)),
    updateDragPreview,
    commitDrag
  }
}
