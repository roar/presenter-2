import { useCallback, useEffect, useRef } from 'react'
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@shared/model/types'
import { resolveLinearGradientEndpoints, setLinearGradientEndpoints } from '@shared/model/fill'
import type { Fill, LinearGradientFill } from '@shared/model/types'

interface GradientDragData {
  masterId: string
  left: number
  top: number
  width: number
  height: number
  target: 'start' | 'end'
  originalFill: LinearGradientFill
}

interface BackgroundGradientDragData {
  slideId: string
  target: 'start' | 'end'
  originalFill: LinearGradientFill
}

type PreviewPatch =
  | { masterId: string; fill?: Fill | undefined }
  | { slideId: string; backgroundFill: Fill | undefined }

interface UseGradientOverlayInteractionParams {
  scaleRef: React.MutableRefObject<number>
  slideRef: React.MutableRefObject<HTMLDivElement | null>
  setPreviewPatch: (patch: PreviewPatch | null) => void
  updateObjectFill: (masterId: string, fill: Fill | undefined) => void
  updateSlideBackgroundFill: (slideId: string, fill: Fill | undefined) => void
}

interface UseGradientOverlayInteractionResult {
  handleBackgroundGradientMouseDown: (
    slideId: string,
    fill: LinearGradientFill,
    target: 'start' | 'end',
    event: React.MouseEvent
  ) => void
  handleGradientOverlayMouseDown: (
    masterId: string,
    fill: LinearGradientFill,
    left: number,
    top: number,
    width: number,
    height: number,
    target: 'start' | 'end',
    event: React.MouseEvent
  ) => void
  updateGradientPreview: (event: MouseEvent) => boolean
  commitGradientPreview: (event: MouseEvent) => boolean
}

export function useGradientOverlayInteraction({
  scaleRef,
  slideRef,
  setPreviewPatch,
  updateObjectFill,
  updateSlideBackgroundFill
}: UseGradientOverlayInteractionParams): UseGradientOverlayInteractionResult {
  const gradientDragRef = useRef<GradientDragData | null>(null)
  const backgroundGradientDragRef = useRef<BackgroundGradientDragData | null>(null)
  const setPreviewPatchRef = useRef(setPreviewPatch)
  const updateObjectFillRef = useRef(updateObjectFill)
  const updateSlideBackgroundFillRef = useRef(updateSlideBackgroundFill)

  useEffect(() => {
    setPreviewPatchRef.current = setPreviewPatch
  }, [setPreviewPatch])

  useEffect(() => {
    updateObjectFillRef.current = updateObjectFill
  }, [updateObjectFill])

  useEffect(() => {
    updateSlideBackgroundFillRef.current = updateSlideBackgroundFill
  }, [updateSlideBackgroundFill])

  const handleBackgroundGradientMouseDown = useCallback(
    (
      slideId: string,
      fill: LinearGradientFill,
      target: 'start' | 'end',
      event: React.MouseEvent
    ) => {
      event.preventDefault()
      event.stopPropagation()
      backgroundGradientDragRef.current = {
        slideId,
        target,
        originalFill: { ...fill, stops: fill.stops.map((stop) => ({ ...stop })) }
      }
    },
    []
  )

  const handleGradientOverlayMouseDown = useCallback(
    (
      masterId: string,
      fill: LinearGradientFill,
      left: number,
      top: number,
      width: number,
      height: number,
      target: 'start' | 'end',
      event: React.MouseEvent
    ) => {
      event.preventDefault()
      event.stopPropagation()
      gradientDragRef.current = {
        masterId,
        left,
        top,
        width,
        height,
        target,
        originalFill: { ...fill, stops: fill.stops.map((stop) => ({ ...stop })) }
      }
    },
    []
  )

  const updateGradientPreview = useCallback(
    (event: MouseEvent) => {
      const slideElement = slideRef.current
      if (!slideElement) return false

      const gradientDrag = gradientDragRef.current
      if (gradientDrag) {
        const slideRect = slideElement.getBoundingClientRect()
        const pointerX = (event.clientX - slideRect.left) / scaleRef.current
        const pointerY = (event.clientY - slideRect.top) / scaleRef.current
        const localX = (pointerX - gradientDrag.left) / gradientDrag.width
        const localY = (pointerY - gradientDrag.top) / gradientDrag.height
        const currentEndpoints = resolveLinearGradientEndpoints(gradientDrag.originalFill)
        const endpoints =
          gradientDrag.target === 'start'
            ? { ...currentEndpoints, x1: localX, y1: localY }
            : { ...currentEndpoints, x2: localX, y2: localY }
        setPreviewPatchRef.current({
          masterId: gradientDrag.masterId,
          fill: setLinearGradientEndpoints(gradientDrag.originalFill, endpoints)
        })
        return true
      }

      const backgroundGradientDrag = backgroundGradientDragRef.current
      if (!backgroundGradientDrag) return false

      const slideRect = slideElement.getBoundingClientRect()
      const localX = (event.clientX - slideRect.left) / scaleRef.current / SLIDE_WIDTH
      const localY = (event.clientY - slideRect.top) / scaleRef.current / SLIDE_HEIGHT
      const currentEndpoints = resolveLinearGradientEndpoints(backgroundGradientDrag.originalFill)
      const endpoints =
        backgroundGradientDrag.target === 'start'
          ? { ...currentEndpoints, x1: localX, y1: localY }
          : { ...currentEndpoints, x2: localX, y2: localY }
      setPreviewPatchRef.current({
        slideId: backgroundGradientDrag.slideId,
        backgroundFill: setLinearGradientEndpoints(backgroundGradientDrag.originalFill, endpoints)
      })
      return true
    },
    [scaleRef, slideRef]
  )

  const commitGradientPreview = useCallback(
    (event: MouseEvent) => {
      const slideElement = slideRef.current
      if (!slideElement) return false

      const gradientDrag = gradientDragRef.current
      if (gradientDrag) {
        const slideRect = slideElement.getBoundingClientRect()
        const pointerX = (event.clientX - slideRect.left) / scaleRef.current
        const pointerY = (event.clientY - slideRect.top) / scaleRef.current
        const localX = (pointerX - gradientDrag.left) / gradientDrag.width
        const localY = (pointerY - gradientDrag.top) / gradientDrag.height
        const currentEndpoints = resolveLinearGradientEndpoints(gradientDrag.originalFill)
        const endpoints =
          gradientDrag.target === 'start'
            ? { ...currentEndpoints, x1: localX, y1: localY }
            : { ...currentEndpoints, x2: localX, y2: localY }
        updateObjectFillRef.current(
          gradientDrag.masterId,
          setLinearGradientEndpoints(gradientDrag.originalFill, endpoints)
        )
        setPreviewPatchRef.current(null)
        gradientDragRef.current = null
        return true
      }

      const backgroundGradientDrag = backgroundGradientDragRef.current
      if (!backgroundGradientDrag) return false

      const slideRect = slideElement.getBoundingClientRect()
      const localX = (event.clientX - slideRect.left) / scaleRef.current / SLIDE_WIDTH
      const localY = (event.clientY - slideRect.top) / scaleRef.current / SLIDE_HEIGHT
      const currentEndpoints = resolveLinearGradientEndpoints(backgroundGradientDrag.originalFill)
      const endpoints =
        backgroundGradientDrag.target === 'start'
          ? { ...currentEndpoints, x1: localX, y1: localY }
          : { ...currentEndpoints, x2: localX, y2: localY }
      updateSlideBackgroundFillRef.current(
        backgroundGradientDrag.slideId,
        setLinearGradientEndpoints(backgroundGradientDrag.originalFill, endpoints)
      )
      setPreviewPatchRef.current(null)
      backgroundGradientDragRef.current = null
      return true
    },
    [scaleRef, slideRef]
  )

  return {
    handleBackgroundGradientMouseDown,
    handleGradientOverlayMouseDown,
    updateGradientPreview,
    commitGradientPreview
  }
}
