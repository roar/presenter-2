import React from 'react'
import { ContextMenu } from '../ContextMenu/ContextMenu'
import { ContextMenuItem } from '../ContextMenu/ContextMenuItem'

interface ElementContextMenuState {
  x: number
  y: number
  masterId: string
  appearanceId: string
}

interface AnimationContextMenuState {
  x: number
  y: number
  animationId: string
}

interface SlideCanvasContextMenusProps {
  elementContextMenu: ElementContextMenuState | null
  animationContextMenu: AnimationContextMenuState | null
  isElementMultiSlideObject: boolean
  onCloseElementMenu: () => void
  onCloseAnimationMenu: () => void
  onAddMoveAnimation: () => void
  onConvertToSingle: () => void
  onConvertToMso: () => void
  onDeleteAnimation: () => void
}

export function SlideCanvasContextMenus({
  elementContextMenu,
  animationContextMenu,
  isElementMultiSlideObject,
  onCloseElementMenu,
  onCloseAnimationMenu,
  onAddMoveAnimation,
  onConvertToSingle,
  onConvertToMso,
  onDeleteAnimation
}: SlideCanvasContextMenusProps): React.JSX.Element | null {
  if (!elementContextMenu && !animationContextMenu) return null

  return (
    <>
      {elementContextMenu ? (
        <ContextMenu x={elementContextMenu.x} y={elementContextMenu.y} onClose={onCloseElementMenu}>
          <ContextMenuItem
            submenu={
              <>
                <ContextMenuItem onClick={onAddMoveAnimation}>Move</ContextMenuItem>
                <ContextMenuItem disabled>Scale</ContextMenuItem>
                <ContextMenuItem disabled>Rotate</ContextMenuItem>
              </>
            }
          >
            Add animation
          </ContextMenuItem>
          {isElementMultiSlideObject ? (
            <ContextMenuItem onClick={onConvertToSingle}>
              Convert to Single Appearance
            </ContextMenuItem>
          ) : (
            <ContextMenuItem onClick={onConvertToMso}>
              Convert to Multi Slide Object
            </ContextMenuItem>
          )}
        </ContextMenu>
      ) : null}
      {animationContextMenu ? (
        <ContextMenu
          x={animationContextMenu.x}
          y={animationContextMenu.y}
          onClose={onCloseAnimationMenu}
        >
          <ContextMenuItem onClick={onDeleteAnimation}>Delete animation</ContextMenuItem>
        </ContextMenu>
      ) : null}
    </>
  )
}
