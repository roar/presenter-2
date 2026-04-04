import React, { useCallback, useEffect, useRef, useState } from 'react'
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@shared/model/types'
import {
  resolveBackgroundGrain,
  resolveBackgroundStyle,
  resolveSlideBackground
} from '@shared/model/background'
import { GrainCanvas } from '@viewer/components/GrainCanvas/GrainCanvas'
import { isGradientFill, resolveLinearGradientEndpoints } from '@shared/model/fill'
import type { LinearGradientFill, Position } from '@shared/model/types'
import { getMovePathEndpoint } from '@shared/model/movePath'
import {
  computeMsoExitStateChains,
  renderAllSlideEntryStates
} from '@shared/animation/computeSlideEntryStates'
import type { FrameState, RenderedSlide } from '@shared/animation/types'
import {
  useDocumentStore,
  selectPatchedPresentation,
  selectSelectedAnimationGroup
} from '../../store/documentStore'
import { AnimationCanvasOverlay } from './AnimationCanvasOverlay'
import { AnimationPathContextMenu } from './AnimationPathContextMenu'
import { AnimationPathOverlay } from './AnimationPathOverlay'
import { buildMoveCanvasSelection, buildMoveChainStates } from '../../store/animationCanvasModel'
import { getAnimationOverlayMetrics } from './animationOverlayMetrics'
import { SlideCanvasContextMenus } from './SlideCanvasContextMenus'
import { SlideCanvasObject } from './SlideCanvasObject'
import { useCanvasContextMenus } from './useCanvasContextMenus'
import { useAnimationGhostDrag } from './useAnimationGhostDrag'
import { useAnimationPathContextMenu } from './useAnimationPathContextMenu'
import { useAnimationPathInteraction } from './useAnimationPathInteraction'
import { useElementTransformInteraction } from './useElementTransformInteraction'
import { useGradientOverlayInteraction } from './useGradientOverlayInteraction'
import styles from './SlideCanvas.module.css'

interface SlideCanvasProps {
  previewFrame?: FrameState | null
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

export function SlideCanvas({ previewFrame = null }: SlideCanvasProps): React.JSX.Element {
  const document = useDocumentStore((s) => s.document)
  const patchedPresentation = useDocumentStore(selectPatchedPresentation)
  const selectedAnimationGroup = useDocumentStore(selectSelectedAnimationGroup)
  const selectedSlideId = useDocumentStore((s) => s.ui.selectedSlideId)
  const selectedElementIds = useDocumentStore((s) => s.ui.selectedElementIds)
  const selectedAnimationId = useDocumentStore((s) => s.ui.selectedAnimationId)
  const selectElements = useDocumentStore((s) => s.selectElements)
  const selectAnimation = useDocumentStore((s) => s.selectAnimation)
  const setPreviewPatch = useDocumentStore((s) => s.setPreviewPatch)
  const updateObjectFill = useDocumentStore((s) => s.updateObjectFill)
  const updateSlideBackgroundFill = useDocumentStore((s) => s.updateSlideBackgroundFill)
  const moveElement = useDocumentStore((s) => s.moveElement)
  const updateMasterTransform = useDocumentStore((s) => s.updateMasterTransform)
  const addMoveAnimation = useDocumentStore((s) => s.addMoveAnimation)
  const updateAnimationMoveDelta = useDocumentStore((s) => s.updateAnimationMoveDelta)
  const updateAnimationMovePath = useDocumentStore((s) => s.updateAnimationMovePath)
  const removeAnimation = useDocumentStore((s) => s.removeAnimation)
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
  const panDragRef = useRef<{
    startX: number
    startY: number
    startPanX: number
    startPanY: number
  } | null>(null)
  const isSpaceDownRef = useRef(false)
  const scaleRef = useRef(scale)
  const zoomStateRef = useRef({ fitScale, fitOffsetX, fitOffsetY, userZoom, userPan })
  const slideRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scaleRef.current = scale
    zoomStateRef.current = { fitScale, fitOffsetX, fitOffsetY, userZoom, userPan }
  })

  const { ghostPreview, handleAnimationGhostMouseDown, updateGhostDragPreview, commitGhostDrag } =
    useAnimationGhostDrag({
      isSpaceDownRef,
      scaleRef,
      selectAnimation,
      selectedAnimationGroup,
      updateAnimationMoveDelta
    })

  const {
    pathPreview,
    handlePathPointMouseDown,
    convertPointToBezier,
    convertPointToSmooth,
    convertPointToSharp,
    deletePoint,
    handlePathHandleMouseDown,
    handleInsertPointMouseDown,
    updatePathDragPreview,
    commitPathDrag
  } = useAnimationPathInteraction({
    isSpaceDownRef,
    scaleRef,
    selectedAnimationGroup,
    updateAnimationMovePath
  })
  const {
    contextMenu: pathPointContextMenu,
    closeContextMenu: closePathPointContextMenu,
    openPointContextMenu
  } = useAnimationPathContextMenu()

  const {
    draggingMasterId,
    handleElementMouseDown,
    handleHandleMouseDown,
    updateElementTransformPreview,
    commitElementTransform
  } = useElementTransformInteraction({
    document,
    isSpaceDownRef,
    scaleRef,
    slideRef,
    moveElement,
    selectElements,
    setPreviewPatch,
    updateMasterTransform
  })

  const {
    handleBackgroundGradientMouseDown,
    handleGradientOverlayMouseDown,
    updateGradientPreview,
    commitGradientPreview
  } = useGradientOverlayInteraction({
    scaleRef,
    slideRef,
    setPreviewPatch,
    updateObjectFill,
    updateSlideBackgroundFill
  })

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

  const {
    elementContextMenu,
    animationContextMenu,
    closeAllMenus,
    closeElementMenu,
    closeAnimationMenu,
    handleElementContextMenu,
    handleAnimationContextMenu,
    handleConvertToMso,
    handleConvertToSingle,
    handleAddMoveAnimation,
    handleDeleteAnimation
  } = useCanvasContextMenus({
    addMoveAnimation,
    convertToMultiSlideObject,
    convertToSingleAppearance,
    removeAnimation,
    selectAnimation
  })
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

      if (updateElementTransformPreview(e)) {
        return
      }

      if (updateGhostDragPreview(e)) {
        return
      }

      if (updatePathDragPreview(e)) {
        return
      }

      if (updateGradientPreview(e)) {
        return
      }
    }

    function onMouseUp(e: MouseEvent): void {
      if (panDragRef.current) {
        panDragRef.current = null
        setIsPanning(false)
        return
      }

      if (commitElementTransform(e)) {
        return
      }

      if (commitGhostDrag(e)) {
        return
      }

      if (commitPathDrag(e)) {
        return
      }

      if (commitGradientPreview(e)) {
        return
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [
    commitElementTransform,
    commitGhostDrag,
    commitPathDrag,
    commitGradientPreview,
    updateElementTransformPreview,
    updateGhostDragPreview,
    updatePathDragPreview,
    updateGradientPreview
  ])

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

  const handleAnimationGhostMouseDownWithMenus = useCallback(
    (animationId: string, delta: Position, e: React.MouseEvent) => {
      closeAllMenus()
      handleAnimationGhostMouseDown(animationId, delta, e)
    },
    [closeAllMenus, handleAnimationGhostMouseDown]
  )

  const handleAnimationSelect = useCallback(
    (animationId: string, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      selectAnimation(animationId)
    },
    [selectAnimation]
  )

  const previewRenderedSlide: RenderedSlide | null =
    previewFrame && selectedSlideId
      ? previewFrame.front.slide.id === selectedSlideId
        ? previewFrame.front
        : previewFrame.behind?.slide.id === selectedSlideId
          ? previewFrame.behind
          : null
      : null

  const slide =
    previewRenderedSlide?.slide ??
    (selectedSlideId != null ? patchedPresentation?.slidesById[selectedSlideId] : null)
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
  const baseRenderedSlide =
    slideIndex >= 0 && slideIndex < allEntryStates.length ? allEntryStates[slideIndex] : null

  const renderedAppearances = (() => {
    if (!baseRenderedSlide) return []
    if (!previewFrame || !selectedSlideId) {
      return baseRenderedSlide.appearances
        .slice()
        .sort((a, b) => a.appearance.zIndex - b.appearance.zIndex)
    }

    const previewAppearances = new Map(
      [...(previewRenderedSlide?.appearances ?? []), ...previewFrame.msoAppearances].map(
        (appearance) => [appearance.appearance.id, appearance]
      )
    )

    return baseRenderedSlide.appearances
      .map((appearance) => previewAppearances.get(appearance.appearance.id) ?? appearance)
      .sort((a, b) => a.appearance.zIndex - b.appearance.zIndex)
  })()

  const baseRenderedAppearances =
    baseRenderedSlide?.appearances
      .slice()
      .sort((a, b) => a.appearance.zIndex - b.appearance.zIndex) ?? []

  const selectedGroupMoveAnimation =
    selectedAnimationGroup?.slideId === selectedSlideId &&
    selectedAnimationGroup.moveAnimation?.effect.type === 'move'
      ? selectedAnimationGroup.moveAnimation
      : null

  const selectedGroupOverlayAppearance =
    selectedAnimationGroup != null
      ? (baseRenderedAppearances.find(
          (renderedAppearance) =>
            renderedAppearance.appearance.id === selectedAnimationGroup.appearanceId
        ) ?? null)
      : null

  const selectedGroupMaster =
    selectedAnimationGroup != null && patchedPresentation != null
      ? (patchedPresentation.mastersById[selectedAnimationGroup.masterId] ?? null)
      : null

  const moveChainSteps =
    selectedAnimationGroup?.slideId === selectedSlideId
      ? selectedAnimationGroup.moveSteps.map((step) => ({
          animationId: step.animationId,
          delta:
            pathPreview?.animationId === step.animationId
              ? (getMovePathEndpoint(pathPreview.path) ?? step.delta)
              : step.delta,
          path: pathPreview?.animationId === step.animationId ? pathPreview.path : step.path
        }))
      : []
  const moveChainStates = buildMoveChainStates(moveChainSteps, ghostPreview)
  const moveCanvasSelection =
    selectedAnimationGroup?.slideId === selectedSlideId
      ? buildMoveCanvasSelection(moveChainSteps, selectedAnimationId, ghostPreview)
      : { historySegments: [], activeSegment: null, activePoints: [] }
  const selectedGroupOverlayMetrics =
    selectedGroupOverlayAppearance && selectedGroupMaster
      ? getAnimationOverlayMetrics(selectedGroupMaster, selectedGroupOverlayAppearance)
      : null

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
            {renderedAppearances.map((renderedAppearance) => (
              <SlideCanvasObject
                key={renderedAppearance.appearance.id}
                renderedAppearance={renderedAppearance}
                scale={scale}
                isSelected={selectedElementIds.includes(renderedAppearance.master.id)}
                isDragging={draggingMasterId === renderedAppearance.master.id}
                onElementMouseDown={handleElementMouseDown}
                onElementContextMenu={handleElementContextMenu}
                onHandleMouseDown={handleHandleMouseDown}
                onGradientOverlayMouseDown={handleGradientOverlayMouseDown}
              />
            ))}
            {selectedGroupMoveAnimation && selectedGroupOverlayAppearance && selectedGroupMaster ? (
              <>
                {selectedGroupOverlayMetrics ? (
                  <AnimationPathOverlay
                    baseLeft={selectedGroupOverlayMetrics.baseLeft}
                    baseTop={selectedGroupOverlayMetrics.baseTop}
                    ghostWidth={selectedGroupOverlayMetrics.ghostWidth}
                    ghostHeight={selectedGroupOverlayMetrics.ghostHeight}
                    moveCanvasSelection={moveCanvasSelection}
                    onSelect={handleAnimationSelect}
                    onContextMenu={handleAnimationContextMenu}
                    onPointMouseDown={handlePathPointMouseDown}
                    onPointContextMenu={openPointContextMenu}
                    onHandleMouseDown={handlePathHandleMouseDown}
                    onInsertPointMouseDown={handleInsertPointMouseDown}
                  />
                ) : null}
                <AnimationCanvasOverlay
                  master={selectedGroupMaster}
                  renderedAppearance={selectedGroupOverlayAppearance}
                  moveChainStates={moveChainStates}
                  selectedAnimationId={selectedAnimationId}
                  onSelect={handleAnimationSelect}
                  onContextMenu={handleAnimationContextMenu}
                  onGhostMouseDown={handleAnimationGhostMouseDownWithMenus}
                />
              </>
            ) : null}
          </div>
        )}
      </div>
      <SlideCanvasContextMenus
        elementContextMenu={elementContextMenu}
        animationContextMenu={animationContextMenu}
        isElementMultiSlideObject={
          elementContextMenu
            ? Boolean(document?.mastersById[elementContextMenu.masterId]?.isMultiSlideObject)
            : false
        }
        onCloseElementMenu={closeElementMenu}
        onCloseAnimationMenu={closeAnimationMenu}
        onAddMoveAnimation={handleAddMoveAnimation}
        onConvertToSingle={handleConvertToSingle}
        onConvertToMso={handleConvertToMso}
        onDeleteAnimation={handleDeleteAnimation}
      />
      <AnimationPathContextMenu
        contextMenu={pathPointContextMenu}
        onClose={closePathPointContextMenu}
        onConvertToSharp={() => {
          if (!pathPointContextMenu) return
          convertPointToSharp(pathPointContextMenu.pointId)
          closePathPointContextMenu()
        }}
        onConvertToSmooth={() => {
          if (!pathPointContextMenu) return
          convertPointToSmooth(pathPointContextMenu.pointId)
          closePathPointContextMenu()
        }}
        onConvertToBezier={() => {
          if (!pathPointContextMenu) return
          convertPointToBezier(pathPointContextMenu.pointId)
          closePathPointContextMenu()
        }}
        onDeletePoint={() => {
          if (!pathPointContextMenu) return
          deletePoint(pathPointContextMenu.pointId)
          closePathPointContextMenu()
        }}
      />
    </>
  )
}
