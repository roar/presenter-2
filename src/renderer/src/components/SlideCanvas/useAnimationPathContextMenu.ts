import { useCallback, useState } from 'react'
import type { MoveCanvasPointState } from '../../store/animationCanvasModel'
import type { PathPointContextMenuState } from './AnimationPathContextMenu'

interface UseAnimationPathContextMenuResult {
  contextMenu: PathPointContextMenuState | null
  closeContextMenu: () => void
  openPointContextMenu: (point: MoveCanvasPointState, event: React.MouseEvent) => void
}

export function useAnimationPathContextMenu(): UseAnimationPathContextMenuResult {
  const [contextMenu, setContextMenu] = useState<PathPointContextMenuState | null>(null)

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const openPointContextMenu = useCallback(
    (point: MoveCanvasPointState, event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        pointId: point.id,
        pointType: point.type,
        isEndpoint: point.isEndpoint
      })
    },
    []
  )

  return {
    contextMenu,
    closeContextMenu,
    openPointContextMenu
  }
}
