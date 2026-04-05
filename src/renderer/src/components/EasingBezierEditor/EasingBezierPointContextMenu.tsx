import React from 'react'
import type { BezierEditorPointKind } from '@shared/model/bezierEditor'
import { ContextMenu } from '../ContextMenu/ContextMenu'
import { ContextMenuItem } from '../ContextMenu/ContextMenuItem'

export interface EasingBezierPointContextMenuState {
  x: number
  y: number
  pointId: string
  pointKind: BezierEditorPointKind
  isEndpoint: boolean
}

interface EasingBezierPointContextMenuProps {
  contextMenu: EasingBezierPointContextMenuState | null
  onClose: () => void
  onConvertToCorner: () => void
  onConvertToSmooth: () => void
  onConvertToBalanced: () => void
  onDeletePoint: () => void
}

export function EasingBezierPointContextMenu({
  contextMenu,
  onClose,
  onConvertToCorner,
  onConvertToSmooth,
  onConvertToBalanced,
  onDeletePoint
}: EasingBezierPointContextMenuProps): React.JSX.Element | null {
  if (!contextMenu) return null

  return (
    <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={onClose}>
      <ContextMenuItem disabled={contextMenu.pointKind === 'corner'} onClick={onConvertToCorner}>
        Make Sharp Point
      </ContextMenuItem>
      <ContextMenuItem disabled={contextMenu.pointKind === 'smooth'} onClick={onConvertToSmooth}>
        Make Smooth Point
      </ContextMenuItem>
      <ContextMenuItem
        disabled={contextMenu.pointKind === 'balanced'}
        onClick={onConvertToBalanced}
      >
        Make Bezier Point
      </ContextMenuItem>
      <ContextMenuItem disabled={contextMenu.isEndpoint} onClick={onDeletePoint}>
        Delete Point
      </ContextMenuItem>
    </ContextMenu>
  )
}
