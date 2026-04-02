import React, { useCallback, useEffect, useRef, useState } from 'react'
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@shared/model/types'
import type { MsoMaster } from '@shared/model/types'
import { useDocumentStore } from '../../store/documentStore'
import { ContextMenu } from '../ContextMenu/ContextMenu'
import { ImageView } from './ImageView'
import { ShapeView } from './ShapeView'
import { TextView } from './TextView'
import styles from './SlideCanvas.module.css'

interface DragData {
  masterId: string
  startClientX: number
  startClientY: number
  startX: number
  startY: number
}

export function SlideCanvas(): React.JSX.Element {
  const document = useDocumentStore((s) => s.document)
  const selectedSlideId = useDocumentStore((s) => s.ui.selectedSlideId)
  const moveElement = useDocumentStore((s) => s.moveElement)

  const outerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)

  // Stable refs so event handlers never go stale — synced via effects, never read in render
  const dragRef = useRef<DragData | null>(null)
  const scaleRef = useRef(scale)
  const moveElementRef = useRef(moveElement)

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  useEffect(() => {
    moveElementRef.current = moveElement
  }, [moveElement])

  // Render-visible drag state (separate from the ref so JSX can react to it)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; masterId: string } | null>(
    null
  )
  const [draggingMasterId, setDraggingMasterId] = useState<string | null>(null)
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null)
  const [liveDelta, setLiveDelta] = useState<{ x: number; y: number } | null>(null)

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
      setLiveDelta({
        x: (e.clientX - drag.startClientX) / scaleRef.current,
        y: (e.clientY - drag.startClientY) / scaleRef.current
      })
    }

    function onMouseUp(e: MouseEvent): void {
      const drag = dragRef.current
      if (!drag) return
      const dx = (e.clientX - drag.startClientX) / scaleRef.current
      const dy = (e.clientY - drag.startClientY) / scaleRef.current
      moveElementRef.current(drag.masterId, drag.startX + dx, drag.startY + dy)
      dragRef.current = null
      setDraggingMasterId(null)
      setDragStartPos(null)
      setLiveDelta(null)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const handleElementContextMenu = useCallback((masterId: string, e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, masterId })
  }, [])

  const handleElementMouseDown = useCallback(
    (masterId: string, e: React.MouseEvent) => {
      const master = document?.mastersById[masterId]
      if (!master) return
      e.preventDefault()
      dragRef.current = {
        masterId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: master.transform.x,
        startY: master.transform.y
      }
      setDraggingMasterId(masterId)
      setDragStartPos({ x: master.transform.x, y: master.transform.y })
      setLiveDelta({ x: 0, y: 0 })
    },
    [document]
  )

  const slide = selectedSlideId != null ? document?.slidesById[selectedSlideId] : null

  const appearances =
    slide != null && document != null
      ? slide.appearanceIds
          .map((id) => document.appearancesById[id])
          .filter(Boolean)
          .sort((a, b) => a.zIndex - b.zIndex)
      : []

  function getLiveMaster(master: MsoMaster): MsoMaster {
    if (!liveDelta || !dragStartPos || draggingMasterId !== master.id) return master
    return {
      ...master,
      transform: {
        ...master.transform,
        x: dragStartPos.x + liveDelta.x,
        y: dragStartPos.y + liveDelta.y
      }
    }
  }

  return (
    <>
      <div ref={outerRef} className={styles.outer}>
        {slide != null && document != null && (
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
          >
            {appearances.map((appearance) => {
              const master = document.mastersById[appearance.masterId]
              if (!master) return null
              const liveMaster = getLiveMaster(master)
              const isDraggingThis = draggingMasterId === master.id
              const { x, y, width, height } = liveMaster.transform
              return (
                <React.Fragment key={appearance.id}>
                  {liveMaster.type === 'shape' && (
                    <ShapeView master={liveMaster} appearance={appearance} />
                  )}
                  {liveMaster.type === 'text' && (
                    <TextView master={liveMaster} appearance={appearance} />
                  )}
                  {liveMaster.type === 'image' && (
                    <ImageView master={liveMaster} appearance={appearance} />
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
                    onContextMenu={(e) => handleElementContextMenu(master.id, e)}
                  />
                </React.Fragment>
              )
            })}
          </div>
        )}
      </div>
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />
      )}
    </>
  )
}
