import React from 'react'
import type { RenderedSlide } from '@shared/animation/types'
import type { TextElement, ImageElement, ShapeElement } from '@shared/model/types'
import { TextElementRenderer } from '../TextElementRenderer/TextElementRenderer'
import { ImageElementRenderer } from '../ImageElementRenderer/ImageElementRenderer'
import { ShapeElementRenderer } from '../ShapeElementRenderer/ShapeElementRenderer'
import { SLIDE_WIDTH, SLIDE_HEIGHT } from '@shared/model/types'

const elementRenderers = {
  text: TextElementRenderer,
  image: ImageElementRenderer,
  shape: ShapeElementRenderer
} as const

interface SlideLayerProps {
  renderedSlide: RenderedSlide
  style?: React.CSSProperties
}

export function SlideLayer({ renderedSlide, style }: SlideLayerProps): React.JSX.Element {
  return (
    <div
      style={{
        position: 'absolute',
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        overflow: 'hidden',
        background: renderedSlide.slide.background,
        ...style
      }}
    >
      {renderedSlide.elements.map((re) => {
        const kind = re.element.kind as keyof typeof elementRenderers
        const Renderer = elementRenderers[kind]
        if (!Renderer) return null
        return (
          <Renderer
            key={re.element.id}
            element={re.element as TextElement & ImageElement & ShapeElement}
            state={re}
          />
        )
      })}
    </div>
  )
}
