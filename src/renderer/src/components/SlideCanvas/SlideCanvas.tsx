import React, { useCallback, useEffect, useRef, useState } from 'react'
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@shared/model/types'
import {
  resolveBackgroundGrain,
  resolveBackgroundStyle,
  resolveSlideBackground
} from '@shared/model/background'
import { GrainCanvas } from '@viewer/components/GrainCanvas/GrainCanvas'
import {
  isGradientFill,
  resolveLinearGradientEndpoints,
  setLinearGradientEndpoints
} from '@shared/model/fill'
import type { LinearGradientFill, Transform } from '@shared/model/types'
import {
  computeMsoExitStateChains,
  renderAllSlideEntryStates
} from '@shared/animation/computeSlideEntryStates'
import { useDocumentStore, selectPatchedPresentation } from '../../store/documentStore'
import { ContextMenu } from '../ContextMenu/ContextMenu'
import { ContextMenuItem } from '../ContextMenu/ContextMenuItem'
import { MsoIndicator } from './MsoIndicator'
import { ImageView } from './ImageView'
import { ShapeView } from './ShapeView'
import { TextView } from './TextView'
import styles from './SlideCanvas.module.css'

interface DragData {
  masterId: string
  startClientX: number
  startClientY: number
  originalTransform: Transform
}

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

function parseRenderedTransform(transform: string): {
  translateX: number
  translateY: number
  scale: number
} {
  const translateMatch = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/)
  const scaleMatch = transform.match(/scale\(([-\d.]+)\)/)
  return {
    translateX: translateMatch ? Number(translateMatch[1]) : 0,
    translateY: translateMatch ? Number(translateMatch[2]) : 0,
    scale: scaleMatch ? Number(scaleMatch[1]) : 1
  }
}

function computeSelectionAabb(
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
  translateX: number,
  translateY: number,
  renderedScale: number
): { left: number; top: number; width: number; height: number } {
  const w = width * renderedScale
  const h = height * renderedScale
  const θ = (rotation * Math.PI) / 180
  const cosθ = Math.abs(Math.cos(θ))
  const sinθ = Math.abs(Math.sin(θ))
  const aabbWidth = w * cosθ + h * sinθ
  const aabbHeight = w * sinθ + h * cosθ
  const cx = x + width / 2 + translateX
  const cy = y + height / 2 + translateY
  return {
    left: cx - aabbWidth / 2,
    top: cy - aabbHeight / 2,
    width: aabbWidth,
    height: aabbHeight
  }
}

function getOverlayEndpoints(
  width: number,
  height: number,
  fill: LinearGradientFill
): {
  x1: number
  y1: number
  x2: number
  y2: number
} {
  const endpoints = resolveLinearGradientEndpoints(fill)

  return {
    x1: endpoints.x1 * width,
    y1: endpoints.y1 * height,
    x2: endpoints.x2 * width,
    y2: endpoints.y2 * height
  }
}

export function SlideCanvas(): React.JSX.Element {
  const document = useDocumentStore((s) => s.document)
  const patchedPresentation = useDocumentStore(selectPatchedPresentation)
  const selectedSlideId = useDocumentStore((s) => s.ui.selectedSlideId)
  const selectedElementIds = useDocumentStore((s) => s.ui.selectedElementIds)
  const moveElement = useDocumentStore((s) => s.moveElement)
  const selectElements = useDocumentStore((s) => s.selectElements)
  const setPreviewPatch = useDocumentStore((s) => s.setPreviewPatch)
  const updateObjectFill = useDocumentStore((s) => s.updateObjectFill)
  const updateSlideBackgroundFill = useDocumentStore((s) => s.updateSlideBackgroundFill)
  const addMoveAnimation = useDocumentStore((s) => s.addMoveAnimation)
  const convertToMultiSlideObject = useDocumentStore((s) => s.convertToMultiSlideObject)
  const convertToSingleAppearance = useDocumentStore((s) => s.convertToSingleAppearance)

  const outerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [userZoom, setUserZoom] = useState(1)
  const [userPan, setUserPan] = useState({ x: 0, y: 0 })
  const [isSpaceDown, setIsSpaceDown] = useState(false)
  const [isPanning, setIsPanning] = useState(false)

  const fitScale =
    containerSize.width > 0
      ? Math.min(containerSize.width / SLIDE_WIDTH, containerSize.height / SLIDE_HEIGHT)
      : 1
  const scale = fitScale * userZoom
  const fitOffsetX = (containerSize.width - SLIDE_WIDTH * fitScale) / 2
  const fitOffsetY = (containerSize.height - SLIDE_HEIGHT * fitScale) / 2
  const offsetX = fitOffsetX + userPan.x
  const offsetY = fitOffsetY + userPan.y

  // Stable refs so event handlers never go stale
  const dragRef = useRef<DragData | null>(null)
  const gradientDragRef = useRef<GradientDragData | null>(null)
  const backgroundGradientDragRef = useRef<BackgroundGradientDragData | null>(null)
  const panDragRef = useRef<{
    startX: number
    startY: number
    startPanX: number
    startPanY: number
  } | null>(null)
  const isSpaceDownRef = useRef(false)
  const scaleRef = useRef(scale)
  const moveElementRef = useRef(moveElement)
  const setPreviewPatchRef = useRef(setPreviewPatch)
  const updateObjectFillRef = useRef(updateObjectFill)
  const updateSlideBackgroundFillRef = useRef(updateSlideBackgroundFill)
  const zoomStateRef = useRef({ fitScale, fitOffsetX, fitOffsetY, userZoom, userPan })
  const slideRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scaleRef.current = scale
    zoomStateRef.current = { fitScale, fitOffsetX, fitOffsetY, userZoom, userPan }
  })

  useEffect(() => {
    moveElementRef.current = moveElement
  }, [moveElement])

  useEffect(() => {
    setPreviewPatchRef.current = setPreviewPatch
  }, [setPreviewPatch])

  useEffect(() => {
    updateObjectFillRef.current = updateObjectFill
  }, [updateObjectFill])

  useEffect(() => {
    updateSlideBackgroundFillRef.current = updateSlideBackgroundFill
  }, [updateSlideBackgroundFill])

  // Wheel: pinch / Ctrl+scroll = zoom around cursor, plain scroll = pan
  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      const { fitScale, fitOffsetX, fitOffsetY, userZoom, userPan } = zoomStateRef.current
      const rect = el.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.pow(1.001, -e.deltaY)
        const oldScale = fitScale * userZoom
        const newScale = Math.max(0.05, Math.min(8, oldScale * factor))
        const newUserZoom = newScale / fitScale
        const ratio = newScale / oldScale
        setUserZoom(newUserZoom)
        setUserPan({
          x: mouseX - (mouseX - (fitOffsetX + userPan.x)) * ratio - fitOffsetX,
          y: mouseY - (mouseY - (fitOffsetY + userPan.y)) * ratio - fitOffsetY
        })
      } else {
        setUserPan((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Keyboard: Cmd+0 resets view, Space enables pan mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault()
        setUserZoom(1)
        setUserPan({ x: 0, y: 0 })
      }
      if (
        e.code === 'Space' &&
        !e.repeat &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault()
        isSpaceDownRef.current = true
        setIsSpaceDown(true)
      }
    }
    const onKeyUp = (e: KeyboardEvent): void => {
      if (e.code === 'Space') {
        isSpaceDownRef.current = false
        setIsSpaceDown(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    masterId: string
    appearanceId: string
  } | null>(null)
  const [draggingMasterId, setDraggingMasterId] = useState<string | null>(null)

  useEffect(() => {
    const el = outerRef.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setContainerSize({ width, height })
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Stable global handlers — mounted once, read everything from refs
  useEffect(() => {
    function onMouseMove(e: MouseEvent): void {
      const panDrag = panDragRef.current
      if (panDrag) {
        setUserPan({
          x: panDrag.startPanX + (e.clientX - panDrag.startX),
          y: panDrag.startPanY + (e.clientY - panDrag.startY)
        })
        return
      }

      const drag = dragRef.current
      if (drag) {
        const dx = (e.clientX - drag.startClientX) / scaleRef.current
        const dy = (e.clientY - drag.startClientY) / scaleRef.current
        setPreviewPatchRef.current({
          masterId: drag.masterId,
          transform: {
            ...drag.originalTransform,
            x: drag.originalTransform.x + dx,
            y: drag.originalTransform.y + dy
          }
        })
        return
      }

      const gradientDrag = gradientDragRef.current
      const slideElement = slideRef.current
      if (slideElement) {
        if (gradientDrag) {
          const slideRect = slideElement.getBoundingClientRect()
          const pointerX = (e.clientX - slideRect.left) / scaleRef.current
          const pointerY = (e.clientY - slideRect.top) / scaleRef.current
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
          return
        }

        const bgGradientDrag = backgroundGradientDragRef.current
        if (bgGradientDrag) {
          const slideRect = slideElement.getBoundingClientRect()
          const localX = (e.clientX - slideRect.left) / scaleRef.current / SLIDE_WIDTH
          const localY = (e.clientY - slideRect.top) / scaleRef.current / SLIDE_HEIGHT
          const currentEndpoints = resolveLinearGradientEndpoints(bgGradientDrag.originalFill)
          const endpoints =
            bgGradientDrag.target === 'start'
              ? { ...currentEndpoints, x1: localX, y1: localY }
              : { ...currentEndpoints, x2: localX, y2: localY }
          setPreviewPatchRef.current({
            slideId: bgGradientDrag.slideId,
            backgroundFill: setLinearGradientEndpoints(bgGradientDrag.originalFill, endpoints)
          })
        }
      }
    }

    function onMouseUp(e: MouseEvent): void {
      if (panDragRef.current) {
        panDragRef.current = null
        setIsPanning(false)
        return
      }

      const drag = dragRef.current
      if (drag) {
        const dx = (e.clientX - drag.startClientX) / scaleRef.current
        const dy = (e.clientY - drag.startClientY) / scaleRef.current
        moveElementRef.current(
          drag.masterId,
          drag.originalTransform.x + dx,
          drag.originalTransform.y + dy
        )
        setPreviewPatchRef.current(null)
        dragRef.current = null
        setDraggingMasterId(null)
        return
      }

      const gradientDrag = gradientDragRef.current
      const slideElement = slideRef.current
      if (slideElement) {
        if (gradientDrag) {
          const slideRect = slideElement.getBoundingClientRect()
          const pointerX = (e.clientX - slideRect.left) / scaleRef.current
          const pointerY = (e.clientY - slideRect.top) / scaleRef.current
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
          return
        }

        const bgGradientDrag = backgroundGradientDragRef.current
        if (bgGradientDrag) {
          const slideRect = slideElement.getBoundingClientRect()
          const localX = (e.clientX - slideRect.left) / scaleRef.current / SLIDE_WIDTH
          const localY = (e.clientY - slideRect.top) / scaleRef.current / SLIDE_HEIGHT
          const currentEndpoints = resolveLinearGradientEndpoints(bgGradientDrag.originalFill)
          const endpoints =
            bgGradientDrag.target === 'start'
              ? { ...currentEndpoints, x1: localX, y1: localY }
              : { ...currentEndpoints, x2: localX, y2: localY }
          updateSlideBackgroundFillRef.current(
            bgGradientDrag.slideId,
            setLinearGradientEndpoints(bgGradientDrag.originalFill, endpoints)
          )
          setPreviewPatchRef.current(null)
          backgroundGradientDragRef.current = null
        }
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const handleElementContextMenu = useCallback(
    (masterId: string, appearanceId: string, e: React.MouseEvent) => {
      e.preventDefault()
      setContextMenu({ x: e.clientX, y: e.clientY, masterId, appearanceId })
    },
    []
  )

  const handleConvertToMso = useCallback(() => {
    if (!contextMenu) return
    convertToMultiSlideObject(contextMenu.masterId)
    setContextMenu(null)
  }, [contextMenu, convertToMultiSlideObject])

  const handleConvertToSingle = useCallback(() => {
    if (!contextMenu) return
    convertToSingleAppearance(contextMenu.appearanceId)
    setContextMenu(null)
  }, [contextMenu, convertToSingleAppearance])

  const handleAddMoveAnimation = useCallback(() => {
    if (!contextMenu) return
    addMoveAnimation(contextMenu.appearanceId)
    setContextMenu(null)
  }, [addMoveAnimation, contextMenu])

  const handleOuterMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && isSpaceDownRef.current)) {
      e.preventDefault()
      const { userPan } = zoomStateRef.current
      panDragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPanX: userPan.x,
        startPanY: userPan.y
      }
      setIsPanning(true)
    }
  }, [])

  const handleElementMouseDown = useCallback(
    (masterId: string, e: React.MouseEvent) => {
      if (isSpaceDownRef.current) return
      // Read the original (unpatched) transform as the drag start position
      const master = document?.mastersById[masterId]
      if (!master) return
      e.preventDefault()
      e.stopPropagation()
      selectElements([masterId])
      dragRef.current = {
        masterId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        originalTransform: { ...master.transform }
      }
      setDraggingMasterId(masterId)
    },
    [document, selectElements]
  )

  const handleBackgroundGradientMouseDown = useCallback(
    (slideId: string, fill: LinearGradientFill, target: 'start' | 'end', e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
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
      e: React.MouseEvent
    ) => {
      e.preventDefault()
      e.stopPropagation()
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

  const slide = selectedSlideId != null ? patchedPresentation?.slidesById[selectedSlideId] : null
  const resolvedSlideBackground =
    slide != null
      ? resolveSlideBackground(slide.background, patchedPresentation?.defaultBackground)
      : null
  const msoExitStatesBySlide = patchedPresentation
    ? computeMsoExitStateChains(patchedPresentation)
    : []
  const allEntryStates =
    patchedPresentation != null
      ? renderAllSlideEntryStates(patchedPresentation, msoExitStatesBySlide)
      : []
  const slideIndex =
    selectedSlideId != null && patchedPresentation != null
      ? patchedPresentation.slideOrder.indexOf(selectedSlideId)
      : -1
  const renderedSlide =
    slideIndex >= 0 && slideIndex < allEntryStates.length ? allEntryStates[slideIndex] : null

  const renderedAppearances =
    renderedSlide != null
      ? renderedSlide.appearances.slice().sort((a, b) => a.appearance.zIndex - b.appearance.zIndex)
      : []

  return (
    <>
      <div
        ref={outerRef}
        className={styles.outer}
        style={{ cursor: isPanning ? 'grabbing' : isSpaceDown ? 'grab' : undefined }}
        onMouseDown={handleOuterMouseDown}
      >
        {slide != null && patchedPresentation != null && (
          <div
            ref={slideRef}
            data-testid="slide"
            className={styles.inner}
            style={{
              width: SLIDE_WIDTH,
              height: SLIDE_HEIGHT,
              background:
                resolveBackgroundStyle(
                  resolvedSlideBackground ?? slide.background,
                  patchedPresentation.colorConstantsById
                ) ?? '#ffffff',
              transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
              userSelect: draggingMasterId != null ? 'none' : undefined
            }}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                selectElements([])
              }
            }}
          >
            {resolveBackgroundGrain(resolvedSlideBackground ?? slide.background).enabled ? (
              <GrainCanvas
                grain={resolveBackgroundGrain(resolvedSlideBackground ?? slide.background)}
              />
            ) : null}
            {isGradientFill((resolvedSlideBackground ?? slide.background).fill) &&
            (resolvedSlideBackground ?? slide.background).fill?.kind === 'linear-gradient'
              ? (() => {
                  const fill = (resolvedSlideBackground ?? slide.background)
                    .fill as LinearGradientFill
                  const { x1, y1, x2, y2 } = getOverlayEndpoints(SLIDE_WIDTH, SLIDE_HEIGHT, fill)
                  return (
                    <svg
                      aria-label="Background gradient angle overlay"
                      className={styles.gradientOverlay}
                      style={{
                        left: 0,
                        top: 0,
                        width: SLIDE_WIDTH,
                        height: SLIDE_HEIGHT,
                        zIndex: 2
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <line
                        className={styles.gradientLineHitArea}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                      />
                      <line className={styles.gradientLine} x1={x1} y1={y1} x2={x2} y2={y2} />
                      <circle
                        className={styles.gradientHandle}
                        cx={x1}
                        cy={y1}
                        r={8}
                        onMouseDown={(e) =>
                          handleBackgroundGradientMouseDown(slide.id, fill, 'start', e)
                        }
                      />
                      <circle
                        className={styles.gradientHandle}
                        cx={x2}
                        cy={y2}
                        r={8}
                        onMouseDown={(e) =>
                          handleBackgroundGradientMouseDown(slide.id, fill, 'end', e)
                        }
                      />
                    </svg>
                  )
                })()
              : null}
            {renderedAppearances.map((renderedAppearance) => {
              const { appearance, master, visible, opacity, transform } = renderedAppearance
              const isDraggingThis = draggingMasterId === master.id
              const { x, y, width, height } = master.transform
              const {
                translateX,
                translateY,
                scale: renderedScale
              } = parseRenderedTransform(transform)
              const left = x + translateX
              const top = y + translateY
              const scaledWidth = width * renderedScale
              const scaledHeight = height * renderedScale
              return (
                <React.Fragment key={appearance.id}>
                  {master.type === 'shape' && (
                    <ShapeView
                      master={master}
                      appearance={appearance}
                      rendered={renderedAppearance}
                    />
                  )}
                  {master.type === 'text' && (
                    <TextView
                      master={master}
                      appearance={appearance}
                      rendered={renderedAppearance}
                    />
                  )}
                  {master.type === 'image' && (
                    <ImageView
                      master={master}
                      appearance={appearance}
                      rendered={renderedAppearance}
                    />
                  )}
                  {master.isMultiSlideObject && (
                    <MsoIndicator x={left} y={top} width={scaledWidth} />
                  )}
                  {selectedElementIds.includes(master.id) && (
                    <div
                      data-testid="selection-indicator"
                      style={{
                        position: 'absolute',
                        ...computeSelectionAabb(
                          x,
                          y,
                          width,
                          height,
                          master.transform.rotation,
                          translateX,
                          translateY,
                          renderedScale
                        ),
                        outline: '2px solid var(--accent)',
                        outlineOffset: 2,
                        pointerEvents: 'none',
                        boxSizing: 'border-box',
                        opacity,
                        visibility: visible ? 'visible' : 'hidden'
                      }}
                    />
                  )}
                  {selectedElementIds.includes(master.id) &&
                  master.type === 'shape' &&
                  isGradientFill(master.objectStyle.defaultState.fill) &&
                  master.objectStyle.defaultState.fill.kind === 'linear-gradient'
                    ? (() => {
                        const fill = master.objectStyle.defaultState.fill as LinearGradientFill
                        const { x1, y1, x2, y2 } = getOverlayEndpoints(
                          scaledWidth,
                          scaledHeight,
                          fill
                        )
                        return (
                          <svg
                            aria-label="Gradient angle overlay"
                            className={styles.gradientOverlay}
                            style={{
                              left,
                              top,
                              width: scaledWidth,
                              height: scaledHeight,
                              zIndex: 2,
                              opacity,
                              visibility: visible ? 'visible' : 'hidden'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <line
                              className={styles.gradientLineHitArea}
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                            />
                            <line className={styles.gradientLine} x1={x1} y1={y1} x2={x2} y2={y2} />
                            <circle
                              className={styles.gradientHandle}
                              cx={x1}
                              cy={y1}
                              r={8}
                              onMouseDown={(e) =>
                                handleGradientOverlayMouseDown(
                                  master.id,
                                  fill,
                                  left,
                                  top,
                                  scaledWidth,
                                  scaledHeight,
                                  'start',
                                  e
                                )
                              }
                            />
                            <circle
                              className={styles.gradientHandle}
                              cx={x2}
                              cy={y2}
                              r={8}
                              onMouseDown={(e) =>
                                handleGradientOverlayMouseDown(
                                  master.id,
                                  fill,
                                  left,
                                  top,
                                  scaledWidth,
                                  scaledHeight,
                                  'end',
                                  e
                                )
                              }
                            />
                          </svg>
                        )
                      })()
                    : null}
                  <div
                    data-testid="element-hitbox"
                    style={{
                      position: 'absolute',
                      left,
                      top,
                      width: scaledWidth,
                      height: scaledHeight,
                      zIndex: 1,
                      cursor: isDraggingThis ? 'grabbing' : 'grab'
                    }}
                    onMouseDown={(e) => handleElementMouseDown(master.id, e)}
                    onClick={(e) => e.stopPropagation()}
                    onContextMenu={(e) => handleElementContextMenu(master.id, appearance.id, e)}
                  />
                </React.Fragment>
              )
            })}
          </div>
        )}
      </div>
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}>
          <ContextMenuItem
            submenu={
              <>
                <ContextMenuItem onClick={handleAddMoveAnimation}>Move</ContextMenuItem>
                <ContextMenuItem disabled>Scale</ContextMenuItem>
                <ContextMenuItem disabled>Rotate</ContextMenuItem>
              </>
            }
          >
            Add animation
          </ContextMenuItem>
          {document?.mastersById[contextMenu.masterId]?.isMultiSlideObject ? (
            <ContextMenuItem onClick={handleConvertToSingle}>
              Convert to Single Appearance
            </ContextMenuItem>
          ) : (
            <ContextMenuItem onClick={handleConvertToMso}>
              Convert to Multi Slide Object
            </ContextMenuItem>
          )}
        </ContextMenu>
      )}
    </>
  )
}
