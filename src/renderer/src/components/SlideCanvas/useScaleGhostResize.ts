import { useCallback, useEffect, useRef, useState } from 'react'

type HandleType = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br'

interface ScaleGhostDragData {
  animationId: string
  handle: HandleType
  centerX: number
  centerY: number
  baseWidth: number
  baseHeight: number
  previousCumulativeScale: number
  rotation: number
}

interface UseScaleGhostResizeParams {
  isSpaceDownRef: React.MutableRefObject<boolean>
  scaleRef: React.MutableRefObject<number>
  slideRef: React.MutableRefObject<HTMLDivElement | null>
  updateAnimationNumericTo: (animationId: string, value: number) => void
}

interface UseScaleGhostResizeResult {
  scalePreview: { animationId: string; scale: number } | null
  handleScaleHandleMouseDown: (
    handle: HandleType,
    state: {
      animationId: string
      centerX: number
      centerY: number
      width: number
      height: number
      cumulativeScale: number
      previousCumulativeScale: number
      rotation: number
    },
    event: React.MouseEvent
  ) => void
  updateScalePreview: (event: MouseEvent) => boolean
  commitScalePreview: (event: MouseEvent) => boolean
}

function getNextScaleFactor(drag: ScaleGhostDragData, slideX: number, slideY: number): number {
  const dx = slideX - drag.centerX
  const dy = slideY - drag.centerY
  const theta = (drag.rotation * Math.PI) / 180
  const cosTheta = Math.cos(theta)
  const sinTheta = Math.sin(theta)
  const localX = Math.abs(dx * cosTheta + dy * sinTheta)
  const localY = Math.abs(-dx * sinTheta + dy * cosTheta)
  const halfBaseWidth = Math.max(2, drag.baseWidth / 2)
  const halfBaseHeight = Math.max(2, drag.baseHeight / 2)

  let cumulativeScale: number
  if (drag.handle === 'tc' || drag.handle === 'bc') {
    cumulativeScale = localY / halfBaseHeight
  } else if (drag.handle === 'ml' || drag.handle === 'mr') {
    cumulativeScale = localX / halfBaseWidth
  } else {
    cumulativeScale = Math.max(localX / halfBaseWidth, localY / halfBaseHeight)
  }

  const minimumScale = 0.05
  return Math.max(minimumScale, cumulativeScale / Math.max(0.0001, drag.previousCumulativeScale))
}

export function useScaleGhostResize({
  isSpaceDownRef,
  scaleRef,
  slideRef,
  updateAnimationNumericTo
}: UseScaleGhostResizeParams): UseScaleGhostResizeResult {
  const [scalePreview, setScalePreview] = useState<{ animationId: string; scale: number } | null>(
    null
  )
  const dragRef = useRef<ScaleGhostDragData | null>(null)
  const updateAnimationNumericToRef = useRef(updateAnimationNumericTo)

  useEffect(() => {
    updateAnimationNumericToRef.current = updateAnimationNumericTo
  }, [updateAnimationNumericTo])

  const handleScaleHandleMouseDown = useCallback(
    (
      handle: HandleType,
      state: {
        animationId: string
        centerX: number
        centerY: number
        width: number
        height: number
        cumulativeScale: number
        previousCumulativeScale: number
        rotation: number
      },
      event: React.MouseEvent
    ) => {
      if (isSpaceDownRef.current) return
      event.preventDefault()
      event.stopPropagation()
      dragRef.current = {
        animationId: state.animationId,
        handle,
        centerX: state.centerX,
        centerY: state.centerY,
        baseWidth: state.width / Math.max(state.cumulativeScale, 0.0001),
        baseHeight: state.height / Math.max(state.cumulativeScale, 0.0001),
        previousCumulativeScale: state.previousCumulativeScale,
        rotation: state.rotation
      }
    },
    [isSpaceDownRef]
  )

  const updateScalePreview = useCallback(
    (event: MouseEvent) => {
      const drag = dragRef.current
      const slideEl = slideRef.current
      if (!drag || !slideEl) return false

      const slideRect = slideEl.getBoundingClientRect()
      const slideX = (event.clientX - slideRect.left) / scaleRef.current
      const slideY = (event.clientY - slideRect.top) / scaleRef.current
      setScalePreview({
        animationId: drag.animationId,
        scale: getNextScaleFactor(drag, slideX, slideY)
      })
      return true
    },
    [scaleRef, slideRef]
  )

  const commitScalePreview = useCallback(
    (event: MouseEvent) => {
      const drag = dragRef.current
      const slideEl = slideRef.current
      if (!drag || !slideEl) return false

      const slideRect = slideEl.getBoundingClientRect()
      const slideX = (event.clientX - slideRect.left) / scaleRef.current
      const slideY = (event.clientY - slideRect.top) / scaleRef.current
      updateAnimationNumericToRef.current(
        drag.animationId,
        getNextScaleFactor(drag, slideX, slideY)
      )
      dragRef.current = null
      setScalePreview(null)
      return true
    },
    [scaleRef, slideRef]
  )

  return {
    scalePreview,
    handleScaleHandleMouseDown,
    updateScalePreview,
    commitScalePreview
  }
}
