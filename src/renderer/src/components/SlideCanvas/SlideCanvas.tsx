import React, { useCallback, useEffect, useRef, useState } from 'react'
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@shared/model/types'
import { resolveBackgroundStyle, resolveSlideBackground } from '@shared/model/background'
import type { Position } from '@shared/model/types'
import { getMovePathEndpoint, withMovePathEndpoint } from '@shared/model/movePath'
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
import {
  buildMoveCanvasSelection,
  buildTransformChainStates,
  type TransformChainPreview
} from '../../store/animationCanvasModel'
import { getAnimationOverlayMetrics } from './animationOverlayMetrics'
import { SlideCanvasPreviewLayer } from './SlideCanvasPreviewLayer'
import { SlideCanvasContextMenus } from './SlideCanvasContextMenus'
import { useCanvasContextMenus } from './useCanvasContextMenus'
import { useAnimationGhostDrag } from './useAnimationGhostDrag'
import { useAnimationPathContextMenu } from './useAnimationPathContextMenu'
import { useAnimationPathInteraction } from './useAnimationPathInteraction'
import { useElementTransformInteraction } from './useElementTransformInteraction'
import { useGradientOverlayInteraction } from './useGradientOverlayInteraction'
import { useRotateGhostRotate } from './useRotateGhostRotate'
import { useScaleGhostResize } from './useScaleGhostResize'
import styles from './SlideCanvas.module.css'

interface SlideCanvasProps {
  previewFrame?: FrameState | null
}

export function SlideCanvas({ previewFrame = null }: SlideCanvasProps): React.JSX.Element {
  const document = useDocumentStore((s) => s.document)
  const patchedPresentation = useDocumentStore(selectPatchedPresentation)
  const selectedAnimationGroup = useDocumentStore(selectSelectedAnimationGroup)
  const selectedSlideId = useDocumentStore((s) => s.ui.selectedSlideId)
  const selectedElementIds = useDocumentStore((s) => s.ui.selectedElementIds)
  const selectedAnimationId = useDocumentStore((s) => s.ui.selectedAnimationId)
  const editingTextMasterId = useDocumentStore((s) => s.ui.editingText?.masterId ?? null)
  const selectElements = useDocumentStore((s) => s.selectElements)
  const selectAnimation = useDocumentStore((s) => s.selectAnimation)
  const setPreviewPatch = useDocumentStore((s) => s.setPreviewPatch)
  const updateObjectFill = useDocumentStore((s) => s.updateObjectFill)
  const updateSlideBackgroundFill = useDocumentStore((s) => s.updateSlideBackgroundFill)
  const moveElement = useDocumentStore((s) => s.moveElement)
  const updateMasterTransform = useDocumentStore((s) => s.updateMasterTransform)
  const addMoveAnimation = useDocumentStore((s) => s.addMoveAnimation)
  const addScaleAnimation = useDocumentStore((s) => s.addScaleAnimation)
  const addRotateAnimation = useDocumentStore((s) => s.addRotateAnimation)
  const updateAnimationNumericTo = useDocumentStore((s) => s.updateAnimationNumericTo)
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
  const canvasSlideId = previewFrame?.front.slide.id ?? selectedSlideId
  const annotationSlideId = selectedAnimationGroup?.slideId ?? selectedSlideId

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
  const { scalePreview, handleScaleHandleMouseDown, updateScalePreview, commitScalePreview } =
    useScaleGhostResize({
      isSpaceDownRef,
      scaleRef,
      slideRef,
      updateAnimationNumericTo: updateAnimationNumericTo
    })
  const { rotatePreview, handleRotateHandleMouseDown, updateRotatePreview, commitRotatePreview } =
    useRotateGhostRotate({
      isSpaceDownRef,
      scaleRef,
      slideRef,
      updateAnimationNumericTo
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
    handleAddScaleAnimation,
    handleAddRotateAnimation,
    handleDeleteAnimation
  } = useCanvasContextMenus({
    addMoveAnimation,
    addScaleAnimation,
    addRotateAnimation,
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

      if (updateScalePreview(e)) {
        return
      }

      if (updateRotatePreview(e)) {
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

      if (commitScalePreview(e)) {
        return
      }

      if (commitRotatePreview(e)) {
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
    commitScalePreview,
    commitRotatePreview,
    updateElementTransformPreview,
    updateGhostDragPreview,
    updatePathDragPreview,
    updateGradientPreview,
    updateScalePreview,
    updateRotatePreview
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

  const handleAnimationContextMenuWithAppearance = useCallback(
    (animationId: string, event: React.MouseEvent) => {
      if (!selectedAnimationGroup) return
      handleAnimationContextMenu(animationId, selectedAnimationGroup.appearanceId, event)
    },
    [handleAnimationContextMenu, selectedAnimationGroup]
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
    previewFrame && canvasSlideId
      ? previewFrame.front.slide.id === canvasSlideId
        ? previewFrame.front
        : previewFrame.behind?.slide.id === canvasSlideId
          ? previewFrame.behind
          : null
      : null

  const slide =
    previewRenderedSlide?.slide ??
    (canvasSlideId != null ? patchedPresentation?.slidesById[canvasSlideId] : null)
  const msoExitStatesBySlide = patchedPresentation
    ? computeMsoExitStateChains(patchedPresentation)
    : []
  const allEntryStates =
    patchedPresentation != null
      ? renderAllSlideEntryStates(patchedPresentation, msoExitStatesBySlide)
      : []
  const slideIndex =
    canvasSlideId != null && patchedPresentation != null
      ? patchedPresentation.slideOrder.indexOf(canvasSlideId)
      : -1
  const baseRenderedSlide =
    slideIndex >= 0 && slideIndex < allEntryStates.length ? allEntryStates[slideIndex] : null
  const annotationSlideIndex =
    annotationSlideId != null && patchedPresentation != null
      ? patchedPresentation.slideOrder.indexOf(annotationSlideId)
      : -1
  const annotationRenderedSlide =
    annotationSlideIndex >= 0 && annotationSlideIndex < allEntryStates.length
      ? allEntryStates[annotationSlideIndex]
      : null

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

  const annotationRenderedAppearances =
    annotationRenderedSlide?.appearances
      .slice()
      .sort((a, b) => a.appearance.zIndex - b.appearance.zIndex) ?? []

  const selectedGroupMoveAnimation =
    selectedAnimationGroup?.slideId === annotationSlideId &&
    selectedAnimationGroup.selectedAnimation.effect.type === 'move'
      ? selectedAnimationGroup.selectedAnimation
      : null
  const moveAnnotationSelectionId =
    selectedAnimationGroup?.slideId === annotationSlideId
      ? (selectedGroupMoveAnimation?.id ??
        selectedAnimationGroup.moveSteps[selectedAnimationGroup.moveSteps.length - 1]
          ?.animationId ??
        null)
      : null

  const selectedGroupOverlayAppearance =
    selectedAnimationGroup != null
      ? (annotationRenderedAppearances.find(
          (renderedAppearance) =>
            renderedAppearance.appearance.id === selectedAnimationGroup.appearanceId
        ) ?? null)
      : null

  const selectedGroupMaster =
    selectedAnimationGroup != null && patchedPresentation != null
      ? (patchedPresentation.mastersById[selectedAnimationGroup.masterId] ?? null)
      : null

  const moveChainSteps =
    selectedAnimationGroup?.slideId === annotationSlideId
      ? selectedAnimationGroup.moveSteps.map((step, index, steps) => {
          const selectedPreviewStepIndex =
            ghostPreview != null
              ? steps.findIndex((candidate) => candidate.animationId === ghostPreview.animationId)
              : -1
          const previewDeltaOffset =
            ghostPreview != null && selectedPreviewStepIndex >= 0
              ? {
                  x: ghostPreview.delta.x - steps[selectedPreviewStepIndex].delta.x,
                  y: ghostPreview.delta.y - steps[selectedPreviewStepIndex].delta.y
                }
              : null

          if (pathPreview?.animationId === step.animationId) {
            return {
              animationId: step.animationId,
              delta: getMovePathEndpoint(pathPreview.path) ?? step.delta,
              path: pathPreview.path
            }
          }

          if (ghostPreview?.animationId === step.animationId) {
            return {
              animationId: step.animationId,
              delta: step.delta,
              path: withMovePathEndpoint(step.path, ghostPreview.delta)
            }
          }

          if (
            previewDeltaOffset != null &&
            selectedPreviewStepIndex >= 0 &&
            index === selectedPreviewStepIndex + 1
          ) {
            return {
              animationId: step.animationId,
              delta: step.delta,
              path: withMovePathEndpoint(step.path, {
                x: step.delta.x - previewDeltaOffset.x,
                y: step.delta.y - previewDeltaOffset.y
              })
            }
          }

          return {
            animationId: step.animationId,
            delta: step.delta,
            path: step.path
          }
        })
      : []
  const transformPreview: TransformChainPreview | null = scalePreview
    ? { animationId: scalePreview.animationId, type: 'scale', scale: scalePreview.scale }
    : rotatePreview
      ? {
          animationId: rotatePreview.animationId,
          type: 'rotate',
          rotation: rotatePreview.rotation
        }
      : ghostPreview
        ? { animationId: ghostPreview.animationId, type: 'move', delta: ghostPreview.delta }
        : null
  const transformChainSteps =
    selectedAnimationGroup?.slideId === annotationSlideId
      ? selectedAnimationGroup.transformSteps.map((step) => {
          if (step.type !== 'move') return step

          const moveStep = moveChainSteps.find(
            (candidate) => candidate.animationId === step.animationId
          )
          return {
            animationId: step.animationId,
            type: 'move' as const,
            delta: moveStep?.delta ?? step.delta,
            path: moveStep?.path ?? step.path
          }
        })
      : []
  const transformChainStates = buildTransformChainStates(transformChainSteps, transformPreview)
  const moveCanvasSelection =
    selectedAnimationGroup?.slideId === annotationSlideId
      ? buildMoveCanvasSelection(moveChainSteps, moveAnnotationSelectionId, ghostPreview)
      : { historySegments: [], activeSegment: null, downstreamSegments: [], activePoints: [] }
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
                  resolveSlideBackground(slide.background, patchedPresentation?.defaultBackground),
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
            <SlideCanvasPreviewLayer
              defaultBackground={patchedPresentation.defaultBackground}
              draggingMasterId={draggingMasterId}
              editingTextMasterId={editingTextMasterId}
              previewFrame={previewFrame}
              renderedAppearances={renderedAppearances}
              scale={scale}
              selectedElementIds={selectedElementIds}
              slide={slide}
              onBackgroundGradientMouseDown={handleBackgroundGradientMouseDown}
              onElementContextMenu={handleElementContextMenu}
              onElementMouseDown={handleElementMouseDown}
              onGradientOverlayMouseDown={handleGradientOverlayMouseDown}
              onHandleMouseDown={handleHandleMouseDown}
            />
            {selectedAnimationGroup?.slideId === annotationSlideId &&
            transformChainStates.length > 0 &&
            selectedGroupOverlayAppearance &&
            selectedGroupMaster ? (
              <>
                {selectedGroupOverlayMetrics ? (
                  moveCanvasSelection.activeSegment != null ||
                  moveCanvasSelection.historySegments.length > 0 ||
                  moveCanvasSelection.downstreamSegments.length > 0 ? (
                    <AnimationPathOverlay
                      baseLeft={selectedGroupOverlayMetrics.baseLeft}
                      baseTop={selectedGroupOverlayMetrics.baseTop}
                      ghostWidth={selectedGroupOverlayMetrics.ghostWidth}
                      ghostHeight={selectedGroupOverlayMetrics.ghostHeight}
                      moveCanvasSelection={moveCanvasSelection}
                      showEditorControls={selectedGroupMoveAnimation != null}
                      onSelect={handleAnimationSelect}
                      onContextMenu={handleAnimationContextMenuWithAppearance}
                      onPointMouseDown={handlePathPointMouseDown}
                      onPointContextMenu={openPointContextMenu}
                      onHandleMouseDown={handlePathHandleMouseDown}
                      onInsertPointMouseDown={handleInsertPointMouseDown}
                    />
                  ) : null
                ) : null}
                <AnimationCanvasOverlay
                  master={selectedGroupMaster}
                  renderedAppearance={selectedGroupOverlayAppearance}
                  transformChainStates={transformChainStates}
                  selectedAnimationId={selectedAnimationId}
                  canvasScale={scale}
                  onSelect={handleAnimationSelect}
                  onContextMenu={handleAnimationContextMenuWithAppearance}
                  onGhostMouseDown={(animationId, state, event) => {
                    if (state.type === 'move') {
                      handleAnimationGhostMouseDownWithMenus(animationId, state.delta, event)
                      return
                    }
                    handleAnimationSelect(animationId, event)
                  }}
                  onScaleHandleMouseDown={handleScaleHandleMouseDown}
                  onRotateHandleMouseDown={handleRotateHandleMouseDown}
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
        onAddScaleAnimation={handleAddScaleAnimation}
        onAddRotateAnimation={handleAddRotateAnimation}
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
