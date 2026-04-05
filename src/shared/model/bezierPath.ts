import type { MovePath, Position } from './types'
import {
  bezierEditorPathToMovePath,
  cloneBezierEditorPath,
  convertBezierEditorPointToCorner,
  convertBezierEditorPointToFree,
  convertBezierEditorPointToSmooth,
  deleteBezierEditorPoint,
  insertBezierEditorPointAtSegment,
  movePathToBezierEditorPath
} from './bezierEditor'

export function cloneMovePath(path: MovePath): MovePath {
  return bezierEditorPathToMovePath(cloneBezierEditorPath(movePathToBezierEditorPath(path)))
}

export function insertBezierPointAtSegment(
  path: MovePath,
  segmentIndex: number,
  pointId: string,
  insertedPosition?: Position
): MovePath {
  const editorPath = movePathToBezierEditorPath(path)
  const start = editorPath.points[segmentIndex]
  const end = editorPath.points[segmentIndex + 1]
  if (!start || !end) return path

  return bezierEditorPathToMovePath(
    insertBezierEditorPointAtSegment(editorPath, segmentIndex, {
      id: pointId,
      x: insertedPosition?.x ?? (start.x + end.x) / 2,
      y: insertedPosition?.y ?? (start.y + end.y) / 2,
      kind: 'smooth'
    })
  )
}

export function convertPointToSharp(path: MovePath, pointId: string): MovePath {
  return bezierEditorPathToMovePath(
    convertBezierEditorPointToCorner(movePathToBezierEditorPath(path), pointId)
  )
}

export function convertPointToBezier(path: MovePath, pointId: string): MovePath {
  return bezierEditorPathToMovePath(
    convertBezierEditorPointToFree(movePathToBezierEditorPath(path), pointId)
  )
}

export function convertPointToSmooth(path: MovePath, pointId: string): MovePath {
  return bezierEditorPathToMovePath(
    convertBezierEditorPointToSmooth(movePathToBezierEditorPath(path), pointId)
  )
}

export function deletePoint(path: MovePath, pointId: string): MovePath {
  return bezierEditorPathToMovePath(
    deleteBezierEditorPoint(movePathToBezierEditorPath(path), pointId)
  )
}
