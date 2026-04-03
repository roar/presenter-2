import React from 'react'
import type { RenderedSlide, RenderedAppearance } from '@shared/animation/types'
import { SLIDE_WIDTH, SLIDE_HEIGHT } from '@shared/model/types'
import { resolveBackgroundGrain, resolveBackgroundStyle } from '@shared/model/background'
import { getRenderedGrainIntensity } from '@shared/model/grain'
import { buildGrainBackgroundImage, getGrainBackgroundSize } from '@shared/model/grainCanvas'
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
  const grain = resolveBackgroundGrain(slide.background)
  const background = resolveBackgroundStyle(slide.background, renderedSlide.colorConstantsById)

  return (
    <div
      style={{
        position: 'absolute',
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        overflow: 'hidden',
        background: background ?? undefined,
        ...style
      }}
    >
      {grain.enabled ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: buildGrainBackgroundImage(grain),
            backgroundSize: getGrainBackgroundSize(grain),
            mixBlendMode: grain.blendMode,
            opacity: getRenderedGrainIntensity(grain.intensity),
            pointerEvents: 'none'
          }}
        />
      ) : null}
      {appearances.map(renderAppearance)}
    </div>
  )
}
