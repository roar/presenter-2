import { useCallback, useEffect, useRef, useState } from 'react'
import type { Transform } from '@shared/model/types'

type HandleType = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br' | 'rotation'

interface DragData {
  masterId: string
  startClientX: number
  startClientY: number
  originalTransform: Transform
}

interface HandleDragData {
  handle: HandleType
  masterId: string
  startSlideX: number
  startSlideY: number
  originalTransform: Transform
}

function computeResizeTransform(
  handle: HandleType,
  orig: Transform,
  slideX: number,
  slideY: number
): Partial<Transform> {
  const { x, y, width, height, rotation } = orig
  const hw = width / 2
  const hh = height / 2
  const cx = x + hw
  const cy = y + hh
  const theta = (rotation * Math.PI) / 180
  const cosTheta = Math.cos(theta)
  const sinTheta = Math.sin(theta)

  const anchorOffsets: Record<HandleType, [number, number]> = {
    tl: [hw, hh],
    tc: [0, hh],
    tr: [-hw, hh],
    ml: [hw, 0],
    mr: [-hw, 0],
    bl: [hw, -hh],
    bc: [0, -hh],
    br: [-hw, -hh],
    rotation: [0, 0]
  }
  const [ax, ay] = anchorOffsets[handle]
  const anchorX = cx + ax * cosTheta - ay * sinTheta
  const anchorY = cy + ax * sinTheta + ay * cosTheta
  const nextCenterX = (anchorX + slideX) / 2
  const nextCenterY = (anchorY + slideY) / 2
  const deltaVectorX = slideX - nextCenterX
  const deltaVectorY = slideY - nextCenterY
  const deltaLocalX = deltaVectorX * cosTheta + deltaVectorY * sinTheta
  const deltaLocalY = -deltaVectorX * sinTheta + deltaVectorY * cosTheta

  const minimum = 4
  const isHorizontalEdge = handle === 'tc' || handle === 'bc'
  const isVerticalEdge = handle === 'ml' || handle === 'mr'
  const nextHalfWidth = isHorizontalEdge ? hw : Math.max(minimum / 2, Math.abs(deltaLocalX))
  const nextHalfHeight = isVerticalEdge ? hh : Math.max(minimum / 2, Math.abs(deltaLocalY))

  return {
    x: nextCenterX - nextHalfWidth,
    y: nextCenterY - nextHalfHeight,
    width: nextHalfWidth * 2,
    height: nextHalfHeight * 2
  }
}

interface UseElementTransformInteractionParams {
  document: { mastersById: Record<string, { transform: Transform }> } | null
  isSpaceDownRef: React.MutableRefObject<boolean>
  scaleRef: React.MutableRefObject<number>
  slideRef: React.MutableRefObject<HTMLDivElement | null>
  moveElement: (masterId: string, x: number, y: number) => void
  selectElements: (ids: string[]) => void
  setPreviewPatch: (patch: { masterId: string; transform?: Transform } | null) => void
  updateMasterTransform: (masterId: string, transform: Partial<Transform>) => void
}

interface UseElementTransformInteractionResult {
  draggingMasterId: string | null
  handleElementMouseDown: (masterId: string, event: React.MouseEvent) => void
  handleHandleMouseDown: (handle: HandleType, masterId: string, event: React.MouseEvent) => void
  updateElementTransformPreview: (event: MouseEvent) => boolean
  commitElementTransform: (event: MouseEvent) => boolean
}

export function useElementTransformInteraction({
  document,
  isSpaceDownRef,
  scaleRef,
  slideRef,
  moveElement,
  selectElements,
  setPreviewPatch,
  updateMasterTransform
}: UseElementTransformInteractionParams): UseElementTransformInteractionResult {
  const [draggingMasterId, setDraggingMasterId] = useState<string | null>(null)
  const dragRef = useRef<DragData | null>(null)
  const handleDragRef = useRef<HandleDragData | null>(null)
  const moveElementRef = useRef(moveElement)
  const setPreviewPatchRef = useRef(setPreviewPatch)
  const updateMasterTransformRef = useRef(updateMasterTransform)

  useEffect(() => {
    moveElementRef.current = moveElement
  }, [moveElement])

  useEffect(() => {
    setPreviewPatchRef.current = setPreviewPatch
  }, [setPreviewPatch])

  useEffect(() => {
    updateMasterTransformRef.current = updateMasterTransform
  }, [updateMasterTransform])

  const handleElementMouseDown = useCallback(
    (masterId: string, event: React.MouseEvent) => {
      if (isSpaceDownRef.current) return
      const master = document?.mastersById[masterId]
      if (!master) return
      event.preventDefault()
      event.stopPropagation()
      selectElements([masterId])
      dragRef.current = {
        masterId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        originalTransform: { ...master.transform }
      }
      setDraggingMasterId(masterId)
    },
    [document, isSpaceDownRef, selectElements]
  )

  const handleHandleMouseDown = useCallback(
    (handle: HandleType, masterId: string, event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const master = document?.mastersById[masterId]
      if (!master) return
      const slideEl = slideRef.current
      if (!slideEl) return
      const slideRect = slideEl.getBoundingClientRect()
      const currentScale = scaleRef.current
      handleDragRef.current = {
        handle,
        masterId,
        startSlideX: (event.clientX - slideRect.left) / currentScale,
        startSlideY: (event.clientY - slideRect.top) / currentScale,
        originalTransform: { ...master.transform }
      }
    },
    [document, scaleRef, slideRef]
  )

  const updateElementTransformPreview = useCallback(
    (event: MouseEvent) => {
      const handleDrag = handleDragRef.current
      const slideEl = slideRef.current
      if (handleDrag && slideEl) {
        const slideRect = slideEl.getBoundingClientRect()
        const slideX = (event.clientX - slideRect.left) / scaleRef.current
        const slideY = (event.clientY - slideRect.top) / scaleRef.current

        if (handleDrag.handle === 'rotation') {
          const cx = handleDrag.originalTransform.x + handleDrag.originalTransform.width / 2
          const cy = handleDrag.originalTransform.y + handleDrag.originalTransform.height / 2
          const startAngle = Math.atan2(handleDrag.startSlideY - cy, handleDrag.startSlideX - cx)
          const currentAngle = Math.atan2(slideY - cy, slideX - cx)
          const delta = (currentAngle - startAngle) * (180 / Math.PI)
          setPreviewPatchRef.current({
            masterId: handleDrag.masterId,
            transform: {
              ...handleDrag.originalTransform,
              rotation: handleDrag.originalTransform.rotation + delta
            }
          })
        } else {
          setPreviewPatchRef.current({
            masterId: handleDrag.masterId,
            transform: {
              ...handleDrag.originalTransform,
              ...computeResizeTransform(
                handleDrag.handle,
                handleDrag.originalTransform,
                slideX,
                slideY
              )
            }
          })
        }
        return true
      }

      const drag = dragRef.current
      if (!drag) return false

      const dx = (event.clientX - drag.startClientX) / scaleRef.current
      const dy = (event.clientY - drag.startClientY) / scaleRef.current
      setPreviewPatchRef.current({
        masterId: drag.masterId,
        transform: {
          ...drag.originalTransform,
          x: drag.originalTransform.x + dx,
          y: drag.originalTransform.y + dy
        }
      })
      return true
    },
    [scaleRef, slideRef]
  )

  const commitElementTransform = useCallback(
    (event: MouseEvent) => {
      const handleDrag = handleDragRef.current
      if (handleDrag && slideRef.current) {
        const slideRect = slideRef.current.getBoundingClientRect()
        const slideX = (event.clientX - slideRect.left) / scaleRef.current
        const slideY = (event.clientY - slideRect.top) / scaleRef.current

        let nextTransform: Partial<Transform>
        if (handleDrag.handle === 'rotation') {
          const cx = handleDrag.originalTransform.x + handleDrag.originalTransform.width / 2
          const cy = handleDrag.originalTransform.y + handleDrag.originalTransform.height / 2
          const startAngle = Math.atan2(handleDrag.startSlideY - cy, handleDrag.startSlideX - cx)
          const currentAngle = Math.atan2(slideY - cy, slideX - cx)
          const delta = (currentAngle - startAngle) * (180 / Math.PI)
          nextTransform = { rotation: handleDrag.originalTransform.rotation + delta }
        } else {
          nextTransform = computeResizeTransform(
            handleDrag.handle,
            handleDrag.originalTransform,
            slideX,
            slideY
          )
        }

        updateMasterTransformRef.current(handleDrag.masterId, nextTransform)
        setPreviewPatchRef.current(null)
        handleDragRef.current = null
        return true
      }

      const drag = dragRef.current
      if (!drag) return false

      const dx = (event.clientX - drag.startClientX) / scaleRef.current
      const dy = (event.clientY - drag.startClientY) / scaleRef.current
      moveElementRef.current(
        drag.masterId,
        drag.originalTransform.x + dx,
        drag.originalTransform.y + dy
      )
      setPreviewPatchRef.current(null)
      dragRef.current = null
      setDraggingMasterId(null)
      return true
    },
    [scaleRef, slideRef]
  )

  return {
    draggingMasterId,
    handleElementMouseDown,
    handleHandleMouseDown,
    updateElementTransformPreview,
    commitElementTransform
  }
}
