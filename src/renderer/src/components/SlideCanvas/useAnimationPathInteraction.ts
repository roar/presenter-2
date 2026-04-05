import { useCallback } from 'react'
import type { MovePath } from '@shared/model/types'
import {
  cloneMovePath,
  convertPointToBezier as convertPathPointToBezier,
  convertPointToSmooth as convertPathPointToSmooth,
  convertPointToSharp as convertPathPointToSharp,
  deletePoint as deletePathPoint
} from '@shared/model/bezierPath'
import { bezierEditorPathToMovePath, movePathToBezierEditorPath } from '@shared/model/bezierEditor'
import type { SelectedAnimationGroup } from '../../store/documentStore'
import { useBezierEditorInteraction } from './useBezierEditorInteraction'

interface UseAnimationPathInteractionParams {
  isSpaceDownRef: React.MutableRefObject<boolean>
  scaleRef: React.MutableRefObject<number>
  selectedAnimationGroup: SelectedAnimationGroup | null
  updateAnimationMovePath: (animationId: string, path: MovePath | undefined) => void
}

interface UseAnimationPathInteractionResult {
  pathPreview: { animationId: string; path: MovePath } | null
  handlePathPointMouseDown: (pointId: string, event: React.MouseEvent) => void
  handlePathHandleMouseDown: (
    pointId: string,
    handle: 'in' | 'out',
    event: React.MouseEvent
  ) => void
  handleInsertPointMouseDown: (
    segmentIndex: number,
    position: { x: number; y: number },
    event: React.MouseEvent
  ) => void
  convertPointToSharp: (pointId: string) => void
  convertPointToSmooth: (pointId: string) => void
  convertPointToBezier: (pointId: string) => void
  deletePoint: (pointId: string) => void
  updatePathDragPreview: (event: MouseEvent) => boolean
  commitPathDrag: (event: MouseEvent) => boolean
}

function buildEditablePath(selectedAnimationGroup: SelectedAnimationGroup): MovePath | null {
  const moveStep = selectedAnimationGroup.moveSteps.find(
    (step) => step.animationId === selectedAnimationGroup.selectedAnimation.id
  )
  if (!moveStep) return null
  if (moveStep.path) return cloneMovePath(moveStep.path)

  const activeSegment = selectedAnimationGroup.moveCanvasSelection.activeSegment
  if (!activeSegment) return null

  return {
    points: [
      { id: `${moveStep.animationId}:start`, position: { x: 0, y: 0 }, type: 'sharp' },
      {
        id: `${moveStep.animationId}:end`,
        position: {
          x: activeSegment.endDelta.x - activeSegment.startDelta.x,
          y: activeSegment.endDelta.y - activeSegment.startDelta.y
        },
        type: 'sharp'
      }
    ]
  }
}

export function useAnimationPathInteraction({
  isSpaceDownRef,
  scaleRef,
  selectedAnimationGroup,
  updateAnimationMovePath
}: UseAnimationPathInteractionParams): UseAnimationPathInteractionResult {
  const bezierInteraction = useBezierEditorInteraction({
    isSpaceDownRef,
    scaleRef,
    editorId:
      selectedAnimationGroup?.selectedAnimation.effect.type === 'move'
        ? selectedAnimationGroup.selectedAnimation.id
        : null,
    getEditablePath: () => {
      if (
        !selectedAnimationGroup ||
        selectedAnimationGroup.selectedAnimation.effect.type !== 'move'
      ) {
        return null
      }
      const editablePath = buildEditablePath(selectedAnimationGroup)
      return editablePath ? movePathToBezierEditorPath(editablePath) : null
    },
    onCommitPath: (animationId, path) => {
      updateAnimationMovePath(animationId, bezierEditorPathToMovePath(path))
    },
    toLocalInsertPosition: (position) => {
      const startDelta = selectedAnimationGroup?.moveCanvasSelection.activeSegment?.startDelta ?? {
        x: 0,
        y: 0
      }
      return {
        x: position.x - startDelta.x,
        y: position.y - startDelta.y
      }
    }
  })

  const applyPathOperation = useCallback(
    (operation: (path: MovePath) => MovePath) => {
      const group = selectedAnimationGroup
      if (!group || group.selectedAnimation.effect.type !== 'move') return
      const editablePath = buildEditablePath(group)
      if (!editablePath) return
      updateAnimationMovePath(group.selectedAnimation.id, operation(editablePath))
    },
    [selectedAnimationGroup, updateAnimationMovePath]
  )

  return {
    pathPreview: bezierInteraction.pathPreview
      ? {
          animationId: bezierInteraction.pathPreview.editorId,
          path: bezierEditorPathToMovePath(bezierInteraction.pathPreview.path)
        }
      : null,
    handlePathPointMouseDown: bezierInteraction.handlePointMouseDown,
    handlePathHandleMouseDown: bezierInteraction.handleHandleMouseDown,
    handleInsertPointMouseDown: bezierInteraction.handleInsertPointMouseDown,
    convertPointToSharp: (pointId) =>
      applyPathOperation((path) => convertPathPointToSharp(path, pointId)),
    convertPointToSmooth: (pointId) =>
      applyPathOperation((path) => convertPathPointToSmooth(path, pointId)),
    convertPointToBezier: (pointId) =>
      applyPathOperation((path) => convertPathPointToBezier(path, pointId)),
    deletePoint: (pointId) => applyPathOperation((path) => deletePathPoint(path, pointId)),
    updatePathDragPreview: bezierInteraction.updateDragPreview,
    commitPathDrag: bezierInteraction.commitDrag
  }
}
