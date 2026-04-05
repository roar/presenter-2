import { useCallback, useState } from 'react'

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
  appearanceId: string
}

interface UseCanvasContextMenusParams {
  addMoveAnimation: (appearanceId: string, afterAnimationId?: string) => void
  addScaleAnimation: (appearanceId: string, afterAnimationId?: string) => void
  convertToMultiSlideObject: (masterId: string) => void
  convertToSingleAppearance: (appearanceId: string) => void
  removeAnimation: (animationId: string) => void
  selectAnimation: (id: string | null) => void
}

interface UseCanvasContextMenusResult {
  elementContextMenu: ElementContextMenuState | null
  animationContextMenu: AnimationContextMenuState | null
  closeAllMenus: () => void
  closeElementMenu: () => void
  closeAnimationMenu: () => void
  handleElementContextMenu: (
    masterId: string,
    appearanceId: string,
    event: React.MouseEvent
  ) => void
  handleAnimationContextMenu: (
    animationId: string,
    appearanceId: string,
    event: React.MouseEvent
  ) => void
  handleConvertToMso: () => void
  handleConvertToSingle: () => void
  handleAddMoveAnimation: () => void
  handleAddScaleAnimation: () => void
  handleDeleteAnimation: () => void
}

export function useCanvasContextMenus({
  addMoveAnimation,
  addScaleAnimation,
  convertToMultiSlideObject,
  convertToSingleAppearance,
  removeAnimation,
  selectAnimation
}: UseCanvasContextMenusParams): UseCanvasContextMenusResult {
  const [elementContextMenu, setElementContextMenu] = useState<ElementContextMenuState | null>(null)
  const [animationContextMenu, setAnimationContextMenu] =
    useState<AnimationContextMenuState | null>(null)

  const closeAllMenus = useCallback(() => {
    setElementContextMenu(null)
    setAnimationContextMenu(null)
  }, [])

  const closeElementMenu = useCallback(() => {
    setElementContextMenu(null)
  }, [])

  const closeAnimationMenu = useCallback(() => {
    setAnimationContextMenu(null)
  }, [])

  const handleElementContextMenu = useCallback(
    (masterId: string, appearanceId: string, event: React.MouseEvent) => {
      event.preventDefault()
      setAnimationContextMenu(null)
      setElementContextMenu({ x: event.clientX, y: event.clientY, masterId, appearanceId })
    },
    []
  )

  const handleAnimationContextMenu = useCallback(
    (animationId: string, appearanceId: string, event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      selectAnimation(animationId)
      setAnimationContextMenu({ x: event.clientX, y: event.clientY, animationId, appearanceId })
      setElementContextMenu(null)
    },
    [selectAnimation]
  )

  const handleConvertToMso = useCallback(() => {
    if (!elementContextMenu) return
    convertToMultiSlideObject(elementContextMenu.masterId)
    setElementContextMenu(null)
  }, [convertToMultiSlideObject, elementContextMenu])

  const handleConvertToSingle = useCallback(() => {
    if (!elementContextMenu) return
    convertToSingleAppearance(elementContextMenu.appearanceId)
    setElementContextMenu(null)
  }, [convertToSingleAppearance, elementContextMenu])

  const handleAddMoveAnimation = useCallback(() => {
    const appearanceId = animationContextMenu?.appearanceId ?? elementContextMenu?.appearanceId
    if (!appearanceId) return
    addMoveAnimation(appearanceId, animationContextMenu?.animationId)
    setElementContextMenu(null)
    setAnimationContextMenu(null)
  }, [addMoveAnimation, animationContextMenu, elementContextMenu])

  const handleDeleteAnimation = useCallback(() => {
    if (!animationContextMenu) return
    removeAnimation(animationContextMenu.animationId)
    setAnimationContextMenu(null)
  }, [animationContextMenu, removeAnimation])

  const handleAddScaleAnimation = useCallback(() => {
    const appearanceId = animationContextMenu?.appearanceId ?? elementContextMenu?.appearanceId
    if (!appearanceId) return
    addScaleAnimation(appearanceId, animationContextMenu?.animationId)
    setAnimationContextMenu(null)
    setElementContextMenu(null)
  }, [addScaleAnimation, animationContextMenu, elementContextMenu])

  return {
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
    handleDeleteAnimation
  }
}
