import { useCallback, useEffect, useRef, useState } from 'react'

interface RotateGhostDragData {
  animationId: string
  centerX: number
  centerY: number
  startAngle: number
  originalRotation: number
}

interface UseRotateGhostRotateParams {
  isSpaceDownRef: React.MutableRefObject<boolean>
  scaleRef: React.MutableRefObject<number>
  slideRef: React.MutableRefObject<HTMLDivElement | null>
  updateAnimationNumericTo: (animationId: string, value: number) => void
}

interface UseRotateGhostRotateResult {
  rotatePreview: { animationId: string; rotation: number } | null
  handleRotateHandleMouseDown: (
    state: {
      animationId: string
      centerX: number
      centerY: number
      cumulativeRotation: number
      previousCumulativeRotation: number
    },
    event: React.MouseEvent
  ) => void
  updateRotatePreview: (event: MouseEvent) => boolean
  commitRotatePreview: (event: MouseEvent) => boolean
}

function getAngle(centerX: number, centerY: number, x: number, y: number): number {
  return Math.atan2(y - centerY, x - centerX) * (180 / Math.PI)
}

export function useRotateGhostRotate({
  isSpaceDownRef,
  scaleRef,
  slideRef,
  updateAnimationNumericTo
}: UseRotateGhostRotateParams): UseRotateGhostRotateResult {
  const [rotatePreview, setRotatePreview] = useState<{
    animationId: string
    rotation: number
  } | null>(null)
  const dragRef = useRef<RotateGhostDragData | null>(null)
  const updateAnimationNumericToRef = useRef(updateAnimationNumericTo)

  useEffect(() => {
    updateAnimationNumericToRef.current = updateAnimationNumericTo
  }, [updateAnimationNumericTo])

  const handleRotateHandleMouseDown = useCallback(
    (
      state: {
        animationId: string
        centerX: number
        centerY: number
        cumulativeRotation: number
        previousCumulativeRotation: number
      },
      event: React.MouseEvent
    ) => {
      if (isSpaceDownRef.current) return
      const slideEl = slideRef.current
      if (!slideEl) return
      const slideRect = slideEl.getBoundingClientRect()
      const slideX = (event.clientX - slideRect.left) / scaleRef.current
      const slideY = (event.clientY - slideRect.top) / scaleRef.current
      event.preventDefault()
      event.stopPropagation()

      dragRef.current = {
        animationId: state.animationId,
        centerX: state.centerX,
        centerY: state.centerY,
        startAngle: getAngle(state.centerX, state.centerY, slideX, slideY),
        originalRotation: state.cumulativeRotation - state.previousCumulativeRotation
      }
    },
    [isSpaceDownRef, scaleRef, slideRef]
  )

  const updateRotatePreview = useCallback(
    (event: MouseEvent) => {
      const drag = dragRef.current
      const slideEl = slideRef.current
      if (!drag || !slideEl) return false

      const slideRect = slideEl.getBoundingClientRect()
      const slideX = (event.clientX - slideRect.left) / scaleRef.current
      const slideY = (event.clientY - slideRect.top) / scaleRef.current
      const angleDelta = getAngle(drag.centerX, drag.centerY, slideX, slideY) - drag.startAngle
      setRotatePreview({
        animationId: drag.animationId,
        rotation: drag.originalRotation + angleDelta
      })
      return true
    },
    [scaleRef, slideRef]
  )

  const commitRotatePreview = useCallback(
    (event: MouseEvent) => {
      const drag = dragRef.current
      const slideEl = slideRef.current
      if (!drag || !slideEl) return false

      const slideRect = slideEl.getBoundingClientRect()
      const slideX = (event.clientX - slideRect.left) / scaleRef.current
      const slideY = (event.clientY - slideRect.top) / scaleRef.current
      const angleDelta = getAngle(drag.centerX, drag.centerY, slideX, slideY) - drag.startAngle
      updateAnimationNumericToRef.current(drag.animationId, drag.originalRotation + angleDelta)
      dragRef.current = null
      setRotatePreview(null)
      return true
    },
    [scaleRef, slideRef]
  )

  return {
    rotatePreview,
    handleRotateHandleMouseDown,
    updateRotatePreview,
    commitRotatePreview
  }
}
