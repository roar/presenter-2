import React from 'react'
import type { RenderedSlide } from '@shared/animation/types'
import type { TextElement, ImageElement, ShapeElement } from '@shared/model/types'
import { TextElementRenderer } from '../TextElementRenderer/TextElementRenderer'
import { ImageElementRenderer } from '../ImageElementRenderer/ImageElementRenderer'
import { ShapeElementRenderer } from '../ShapeElementRenderer/ShapeElementRenderer'
import { SLIDE_WIDTH, SLIDE_HEIGHT } from '@shared/model/types'

// SVG feTurbulence noise rendered as a data URL so each layer is self-contained
// (no DOM ID collisions when behind + front layers are both mounted during transitions).
const GRAIN_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`

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
      {renderedSlide.slide.grain && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: GRAIN_BG,
            opacity: 0.18,
            pointerEvents: 'none'
          }}
        />
      )}
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
