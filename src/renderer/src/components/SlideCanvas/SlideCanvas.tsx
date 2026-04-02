import React, { useCallback, useEffect, useRef, useState } from 'react'
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@shared/model/types'
import type { Transform } from '@shared/model/types'
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

export function SlideCanvas(): React.JSX.Element {
  const document = useDocumentStore((s) => s.document)
  const patchedPresentation = useDocumentStore(selectPatchedPresentation)
  const selectedSlideId = useDocumentStore((s) => s.ui.selectedSlideId)
  const selectedElementIds = useDocumentStore((s) => s.ui.selectedElementIds)
  const moveElement = useDocumentStore((s) => s.moveElement)
  const selectElements = useDocumentStore((s) => s.selectElements)
  const setPreviewPatch = useDocumentStore((s) => s.setPreviewPatch)
  const convertToMultiSlideObject = useDocumentStore((s) => s.convertToMultiSlideObject)
  const convertToSingleAppearance = useDocumentStore((s) => s.convertToSingleAppearance)

  const outerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)

  // Stable refs so event handlers never go stale
  const dragRef = useRef<DragData | null>(null)
  const scaleRef = useRef(scale)
  const moveElementRef = useRef(moveElement)
  const setPreviewPatchRef = useRef(setPreviewPatch)

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  useEffect(() => {
    moveElementRef.current = moveElement
  }, [moveElement])

  useEffect(() => {
    setPreviewPatchRef.current = setPreviewPatch
  }, [setPreviewPatch])

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
      const s = Math.min(width / SLIDE_WIDTH, height / SLIDE_HEIGHT)
      setScale(s)
      setOffsetX((width - SLIDE_WIDTH * s) / 2)
      setOffsetY((height - SLIDE_HEIGHT * s) / 2)
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Stable global handlers — mounted once, read everything from refs
  useEffect(() => {
    function onMouseMove(e: MouseEvent): void {
      const drag = dragRef.current
      if (!drag) return
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
    }

    function onMouseUp(e: MouseEvent): void {
      const drag = dragRef.current
      if (!drag) return
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

  const handleElementMouseDown = useCallback(
    (masterId: string, e: React.MouseEvent) => {
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

  const slide = selectedSlideId != null ? patchedPresentation?.slidesById[selectedSlideId] : null

  const appearances =
    slide != null && patchedPresentation != null
      ? slide.appearanceIds
          .map((id) => patchedPresentation.appearancesById[id])
          .filter(Boolean)
          .sort((a, b) => a.zIndex - b.zIndex)
      : []

  return (
    <>
      <div ref={outerRef} className={styles.outer}>
        {slide != null && patchedPresentation != null && (
          <div
            data-testid="slide"
            className={styles.inner}
            style={{
              width: SLIDE_WIDTH,
              height: SLIDE_HEIGHT,
              backgroundColor: slide.background.color ?? '#ffffff',
              transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
              userSelect: draggingMasterId != null ? 'none' : undefined
            }}
            onClick={() => selectElements([])}
          >
            {appearances.map((appearance) => {
              const master = patchedPresentation.mastersById[appearance.masterId]
              if (!master) return null
              const isDraggingThis = draggingMasterId === master.id
              const { x, y, width, height } = master.transform
              return (
                <React.Fragment key={appearance.id}>
                  {master.type === 'shape' && <ShapeView master={master} appearance={appearance} />}
                  {master.type === 'text' && <TextView master={master} appearance={appearance} />}
                  {master.type === 'image' && <ImageView master={master} appearance={appearance} />}
                  {master.isMultiSlideObject && <MsoIndicator x={x} y={y} width={width} />}
                  {selectedElementIds.includes(master.id) && (
                    <div
                      data-testid="selection-indicator"
                      style={{
                        position: 'absolute',
                        left: x,
                        top: y,
                        width,
                        height,
                        outline: '2px solid var(--accent)',
                        outlineOffset: 2,
                        pointerEvents: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  )}
                  <div
                    data-testid="element-hitbox"
                    style={{
                      position: 'absolute',
                      left: x,
                      top: y,
                      width,
                      height,
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
                <ContextMenuItem disabled>Move</ContextMenuItem>
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
