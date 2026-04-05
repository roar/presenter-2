import React from 'react'
import type { CSSProperties } from 'react'
import type { RenderedAppearance } from '@shared/animation/types'
import { MsoIndicator } from './MsoIndicator'

interface ObjectAnnotationLayerProps {
  renderedAppearances: RenderedAppearance[]
  style?: CSSProperties
}

function parseRenderedTransform(transform: string): {
  translateX: number
  translateY: number
  scale: number
} {
  const translateMatch = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/)
  const scaleMatch = transform.match(/scale\(([-\d.]+)\)/)

  return {
    translateX: translateMatch ? Number(translateMatch[1]) : 0,
    translateY: translateMatch ? Number(translateMatch[2]) : 0,
    scale: scaleMatch ? Number(scaleMatch[1]) : 1
  }
}

export function ObjectAnnotationLayer({
  renderedAppearances,
  style
}: ObjectAnnotationLayerProps): React.JSX.Element | null {
  const multiSlideAppearances = renderedAppearances.filter(
    (renderedAppearance) => renderedAppearance.master.isMultiSlideObject
  )

  if (multiSlideAppearances.length === 0) {
    return null
  }

  return (
    <div data-testid="object-annotation-layer" style={style}>
      {multiSlideAppearances.map((renderedAppearance) => {
        const { master, transform } = renderedAppearance
        const { translateX, translateY, scale } = parseRenderedTransform(transform)
        const left = master.transform.x + translateX
        const top = master.transform.y + translateY
        const width = master.transform.width * scale

        return (
          <MsoIndicator
            key={`indicator:${renderedAppearance.appearance.id}`}
            x={left}
            y={top}
            width={width}
          />
        )
      })}
    </div>
  )
}
