import React from 'react'
import type { RenderedSlide, RenderedAppearance } from '@shared/animation/types'
import { SLIDE_WIDTH, SLIDE_HEIGHT } from '@shared/model/types'
import { TextElementRenderer } from '../TextElementRenderer/TextElementRenderer'
import { ImageElementRenderer } from '../ImageElementRenderer/ImageElementRenderer'
import { ShapeElementRenderer } from '../ShapeElementRenderer/ShapeElementRenderer'

interface SlideLayerProps {
  renderedSlide: RenderedSlide
  style?: React.CSSProperties
}

function renderAppearance(ra: RenderedAppearance): React.ReactNode {
  const { master } = ra
  if (master.type === 'text') return <TextElementRenderer key={ra.appearance.id} rendered={ra} />
  if (master.type === 'image') return <ImageElementRenderer key={ra.appearance.id} rendered={ra} />
  if (master.type === 'shape') return <ShapeElementRenderer key={ra.appearance.id} rendered={ra} />
  return null
}

export function SlideLayer({ renderedSlide, style }: SlideLayerProps): React.JSX.Element {
  const { slide, appearances } = renderedSlide
  const bg = slide.background

  return (
    <div
      style={{
        position: 'absolute',
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        overflow: 'hidden',
        background: bg.color ?? bg.image ?? undefined,
        ...style
      }}
    >
      {appearances.map(renderAppearance)}
    </div>
  )
}
