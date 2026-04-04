import React from 'react'
import { ContextMenu } from '../ContextMenu/ContextMenu'
import { ContextMenuItem } from '../ContextMenu/ContextMenuItem'

export interface PathPointContextMenuState {
  x: number
  y: number
  pointId: string
  pointType: 'sharp' | 'bezier'
  isEndpoint: boolean
}

interface AnimationPathContextMenuProps {
  contextMenu: PathPointContextMenuState | null
  onClose: () => void
  onConvertToSharp: () => void
  onConvertToBezier: () => void
  onDeletePoint: () => void
}

export function AnimationPathContextMenu({
  contextMenu,
  onClose,
  onConvertToSharp,
  onConvertToBezier,
  onDeletePoint
}: AnimationPathContextMenuProps): React.JSX.Element | null {
  if (!contextMenu) return null

  return (
    <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={onClose}>
      <ContextMenuItem disabled={contextMenu.pointType === 'sharp'} onClick={onConvertToSharp}>
        Make Sharp Point
      </ContextMenuItem>
      <ContextMenuItem disabled={contextMenu.pointType === 'bezier'} onClick={onConvertToBezier}>
        Make Bezier Point
      </ContextMenuItem>
      <ContextMenuItem disabled={contextMenu.isEndpoint} onClick={onDeletePoint}>
        Delete Point
      </ContextMenuItem>
    </ContextMenu>
  )
}
