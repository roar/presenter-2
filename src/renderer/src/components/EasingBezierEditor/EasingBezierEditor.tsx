import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Easing } from '@shared/model/types'
import type { BezierEditorPath } from '@shared/model/bezierEditor'
import {
  bezierEditorPathToSplinePoints,
  cloneBezierEditorPath,
  splinePointsToBezierEditorPath
} from '@shared/model/bezierEditor'
import { BezierEditorOverlay } from '../SlideCanvas/BezierEditorOverlay'
import { useBezierEditorInteraction } from '../SlideCanvas/useBezierEditorInteraction'
import {
  EasingBezierPointContextMenu,
  type EasingBezierPointContextMenuState
} from './EasingBezierPointContextMenu'
import styles from './EasingBezierEditor.module.css'

const EDITOR_WIDTH = 232
const EDITOR_HEIGHT = 152
const GRAPH_PADDING = 16
const MIN_POINT_SPACING = 0.02

interface EasingBezierEditorProps {
  easing: Extract<Easing, { kind: 'curve' }>
  onChange(nextEasing: Extract<Easing, { kind: 'curve' }>): void
}

interface YDomain {
  min: number
  max: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function getYDomain(path: BezierEditorPath): YDomain {
  const values = path.points.flatMap((point) => [
    point.y,
    point.inHandle?.y ?? point.y,
    point.outHandle?.y ?? point.y
  ])
  const min = Math.min(0, ...values)
  const max = Math.max(1, ...values)
  if (min === max) {
    return { min: min - 0.5, max: max + 0.5 }
  }
  return { min, max }
}

function constrainEasingPath(path: BezierEditorPath): BezierEditorPath {
  if (path.points.length < 2) return cloneBezierEditorPath(path)

  return {
    points: path.points.map((point, index, points) => {
      const previous = points[index - 1]
      const next = points[index + 1]

      const minX = previous ? previous.x + MIN_POINT_SPACING : 0
      const maxX = next ? next.x - MIN_POINT_SPACING : 1
      const clampedX =
        index === 0 ? 0 : index === points.length - 1 ? 1 : clamp(point.x, minX, maxX)
      const clampedY = index === 0 ? 0 : index === points.length - 1 ? 1 : point.y

      return {
        ...point,
        x: clampedX,
        y: clampedY,
        inHandle: index === 0 ? undefined : point.inHandle,
        outHandle: index === points.length - 1 ? undefined : point.outHandle
      }
    })
  }
}

function getGraphWidth(): number {
  return EDITOR_WIDTH - GRAPH_PADDING * 2
}

function getGraphHeight(): number {
  return EDITOR_HEIGHT - GRAPH_PADDING * 2
}

function toCanvasX(x: number): number {
  return GRAPH_PADDING + x * getGraphWidth()
}

function toCanvasY(y: number, domain: YDomain): number {
  return GRAPH_PADDING + ((domain.max - y) / (domain.max - domain.min || 1)) * getGraphHeight()
}

function toLocalX(x: number): number {
  return clamp((x - GRAPH_PADDING) / getGraphWidth(), 0, 1)
}

function toLocalY(y: number, domain: YDomain): number {
  return domain.max - ((y - GRAPH_PADDING) / getGraphHeight()) * (domain.max - domain.min || 1)
}

export function EasingBezierEditor({
  easing,
  onChange
}: EasingBezierEditorProps): React.JSX.Element {
  const isSpaceDownRef = useRef(false)
  const scaleRef = useRef(1)
  const [contextMenu, setContextMenu] = useState<EasingBezierPointContextMenuState | null>(null)
  const path = useMemo(() => splinePointsToBezierEditorPath(easing.points), [easing.points])
  const domain = useMemo(() => getYDomain(path), [path])

  const {
    pathPreview,
    handlePointMouseDown,
    handleHandleMouseDown,
    handleInsertPointMouseDown,
    convertPointToCorner,
    convertPointToSmooth,
    convertPointToBalanced,
    deletePoint,
    updateDragPreview,
    commitDrag
  } = useBezierEditorInteraction({
    isSpaceDownRef,
    scaleRef,
    editorId: 'easing-curve',
    getEditablePath: () => path,
    onCommitPath: (_editorId, nextPath) => {
      onChange({ kind: 'curve', points: bezierEditorPathToSplinePoints(nextPath) })
    },
    toLocalDelta: (delta) => ({
      x: delta.x / getGraphWidth(),
      y: (-delta.y / getGraphHeight()) * (domain.max - domain.min || 1)
    }),
    toLocalInsertPosition: (position) => ({
      x: toLocalX(position.x),
      y: toLocalY(position.y, domain)
    }),
    constrainPath: constrainEasingPath
  })

  const activePath = pathPreview?.path ?? path

  const pointMetaById = useMemo(
    () =>
      new Map(
        activePath.points.map((point, index) => [
          point.id,
          {
            kind: point.kind,
            isEndpoint: index === 0 || index === activePath.points.length - 1
          }
        ])
      ),
    [activePath]
  )

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const runContextAction = useCallback(
    (action: (pointId: string) => void) => {
      if (!contextMenu) return
      action(contextMenu.pointId)
      setContextMenu(null)
    },
    [contextMenu]
  )

  useEffect(() => {
    function handleMouseMove(event: MouseEvent): void {
      updateDragPreview(event)
    }

    function handleMouseUp(event: MouseEvent): void {
      commitDrag(event)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [commitDrag, updateDragPreview])

  const overlayPoints = activePath.points.map((point, index) => ({
    id: point.id,
    position: { x: toCanvasX(point.x), y: toCanvasY(point.y, domain) },
    inHandle: point.inHandle
      ? { x: toCanvasX(point.inHandle.x), y: toCanvasY(point.inHandle.y, domain) }
      : undefined,
    outHandle: point.outHandle
      ? { x: toCanvasX(point.outHandle.x), y: toCanvasY(point.outHandle.y, domain) }
      : undefined,
    isEndpoint: index === 0 || index === activePath.points.length - 1
  }))

  return (
    <div className={styles.root}>
      <div
        className={styles.frame}
        style={{ width: EDITOR_WIDTH, height: EDITOR_HEIGHT }}
        aria-label="Custom easing editor"
      >
        <div className={styles.grid} />
        <div
          className={`${styles.guide} ${styles.guideVertical}`}
          style={{ left: `${toCanvasX(0.5)}px` }}
        />
        <div
          className={`${styles.guide} ${styles.guideHorizontal}`}
          style={{ top: `${toCanvasY(0.5, domain)}px` }}
        />
        <BezierEditorOverlay
          points={overlayPoints}
          width={EDITOR_WIDTH}
          height={EDITOR_HEIGHT}
          zIndex={1}
          ariaLabel="Custom easing curve"
          onPointMouseDown={handlePointMouseDown}
          onPointContextMenu={(pointId, event) => {
            const pointMeta = pointMetaById.get(pointId)
            if (!pointMeta) return
            event.preventDefault()
            event.stopPropagation()
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              pointId,
              pointKind: pointMeta.kind,
              isEndpoint: pointMeta.isEndpoint
            })
          }}
          onHandleMouseDown={handleHandleMouseDown}
          onInsertPointMouseDown={handleInsertPointMouseDown}
        />
      </div>
      <div className={styles.hint}>Drag points and handles to shape the easing curve.</div>
      <EasingBezierPointContextMenu
        contextMenu={contextMenu}
        onClose={closeContextMenu}
        onConvertToCorner={() => runContextAction(convertPointToCorner)}
        onConvertToSmooth={() => runContextAction(convertPointToSmooth)}
        onConvertToBalanced={() => runContextAction(convertPointToBalanced)}
        onDeletePoint={() => runContextAction(deletePoint)}
      />
    </div>
  )
}
