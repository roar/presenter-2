import React from 'react'
import type { FrameState, RenderedAppearance } from '@shared/animation/types'
import type { Background, LinearGradientFill, Slide } from '@shared/model/types'
import { SlideCanvasStaticPreviewLayer } from './SlideCanvasStaticPreviewLayer'
import { SlideCanvasTransitionLayer } from './SlideCanvasTransitionLayer'

type HandleType = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br' | 'rotation'

interface SlideCanvasPreviewLayerProps {
  defaultBackground?: Background
  draggingMasterId: string | null
  editingTextMasterId: string | null
  previewFrame?: FrameState | null
  renderedAppearances: RenderedAppearance[]
  scale: number
  selectedElementIds: string[]
  slide: Slide
  onBackgroundGradientMouseDown: (
    slideId: string,
    fill: LinearGradientFill,
    target: 'start' | 'end',
    event: React.MouseEvent
  ) => void
  onElementContextMenu: (masterId: string, appearanceId: string, event: React.MouseEvent) => void
  onElementMouseDown: (masterId: string, event: React.MouseEvent) => void
  onGradientOverlayMouseDown: (
    masterId: string,
    fill: LinearGradientFill,
    left: number,
    top: number,
    width: number,
    height: number,
    target: 'start' | 'end',
    event: React.MouseEvent
  ) => void
  onHandleMouseDown: (handle: HandleType, masterId: string, event: React.MouseEvent) => void
}

export function SlideCanvasPreviewLayer({
  defaultBackground,
  draggingMasterId,
  editingTextMasterId,
  previewFrame = null,
  renderedAppearances,
  scale,
  selectedElementIds,
  slide,
  onBackgroundGradientMouseDown,
  onElementContextMenu,
  onElementMouseDown,
  onGradientOverlayMouseDown,
  onHandleMouseDown
}: SlideCanvasPreviewLayerProps): React.JSX.Element {
  if (previewFrame?.transition) {
    return <SlideCanvasTransitionLayer previewFrame={previewFrame} />
  }

  return (
    <SlideCanvasStaticPreviewLayer
      defaultBackground={defaultBackground}
      draggingMasterId={draggingMasterId}
      editingTextMasterId={editingTextMasterId}
      renderedAppearances={renderedAppearances}
      scale={scale}
      selectedElementIds={selectedElementIds}
      slide={slide}
      onBackgroundGradientMouseDown={onBackgroundGradientMouseDown}
      onElementContextMenu={onElementContextMenu}
      onElementMouseDown={onElementMouseDown}
      onGradientOverlayMouseDown={onGradientOverlayMouseDown}
      onHandleMouseDown={onHandleMouseDown}
    />
  )
}
