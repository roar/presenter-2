import React from 'react'
import type { RenderedAppearance } from '@shared/animation/types'
import { resolveColorValue } from '@shared/model/colors'
import {
  isGradientFill,
  resolveGradientStops,
  resolveLinearGradientEndpoints
} from '@shared/model/fill'
import { getGrainBaseFrequency, resolveGrainEffect } from '@shared/model/grain'

interface ShapeElementRendererProps {
  rendered: RenderedAppearance
}

export function ShapeElementRenderer({ rendered }: ShapeElementRendererProps): React.JSX.Element {
  const grainFilterId = React.useId()
  const gradientId = React.useId()
  const { master, visible, opacity, transform, strokeDashoffset } = rendered
  const { transform: t, objectStyle, geometry } = master
  const style = objectStyle.defaultState
  const grain = resolveGrainEffect(style.grain)
  const colorConstantsById = rendered.colorConstantsById
  const pathData = geometry?.pathData ?? ''
  const viewBox =
    geometry?.type === 'path' && geometry.baseWidth && geometry.baseHeight
      ? `0 0 ${geometry.baseWidth} ${geometry.baseHeight}`
      : undefined
  const fillColor = !isGradientFill(style.fill)
    ? (resolveColorValue(style.fill, colorConstantsById) ?? 'none')
    : `url(#${gradientId})`
  const strokeColor = resolveColorValue(style.stroke, colorConstantsById) ?? 'none'
  const showGrain = grain.enabled && fillColor !== 'none'
  const gradientStops = isGradientFill(style.fill)
    ? resolveGradientStops(style.fill.stops, colorConstantsById)
    : []

  function renderShapeNode(extraProps: Record<string, unknown> = {}): React.JSX.Element | null {
    if (geometry?.type === 'path') {
      return <path d={pathData} {...extraProps} />
    }

    if (geometry?.type === 'rect') {
      return <rect x={0} y={0} width={t.width} height={t.height} {...extraProps} />
    }

    if (geometry?.type === 'ellipse') {
      return (
        <ellipse
          cx={t.width / 2}
          cy={t.height / 2}
          rx={t.width / 2}
          ry={t.height / 2}
          {...extraProps}
        />
      )
    }

    return null
  }

  return (
    <svg
      style={{
        position: 'absolute',
        left: t.x,
        top: t.y,
        width: t.width,
        height: t.height,
        overflow: 'visible',
        transform: `${transform} rotate(${t.rotation}deg)`,
        transformOrigin: 'center center',
        opacity,
        visibility: visible ? 'visible' : 'hidden'
      }}
      viewBox={viewBox}
    >
      {showGrain || isGradientFill(style.fill) ? (
        <defs>
          {isGradientFill(style.fill) ? (
            style.fill.kind === 'linear-gradient' ? (
              <linearGradient
                id={gradientId}
                gradientUnits="objectBoundingBox"
                x1={`${resolveLinearGradientEndpoints(style.fill).x1}`}
                y1={`${resolveLinearGradientEndpoints(style.fill).y1}`}
                x2={`${resolveLinearGradientEndpoints(style.fill).x2}`}
                y2={`${resolveLinearGradientEndpoints(style.fill).y2}`}
              >
                {gradientStops.map((stop, index) => (
                  <stop
                    key={`${stop.offset}-${index}`}
                    offset={`${stop.offset * 100}%`}
                    stopColor={stop.color}
                  />
                ))}
              </linearGradient>
            ) : (
              <radialGradient
                id={gradientId}
                gradientUnits="objectBoundingBox"
                cx={`${style.fill.centerX}%`}
                cy={`${style.fill.centerY}%`}
                r={`${style.fill.radius}%`}
              >
                {gradientStops.map((stop, index) => (
                  <stop
                    key={`${stop.offset}-${index}`}
                    offset={`${stop.offset * 100}%`}
                    stopColor={stop.color}
                  />
                ))}
              </radialGradient>
            )
          ) : null}
          <filter id={grainFilterId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency={getGrainBaseFrequency(grain.scale)}
              numOctaves={2}
              seed={grain.seed}
              result="noise"
            />
            <feColorMatrix in="noise" type="saturate" values="0" result="monoNoise" />
            <feComponentTransfer in="monoNoise" result="grainNoise">
              <feFuncA type="linear" slope={grain.intensity} />
            </feComponentTransfer>
            <feComposite in="grainNoise" in2="SourceAlpha" operator="in" />
          </filter>
        </defs>
      ) : null}
      {renderShapeNode({
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: style.strokeWidth ?? 0,
        pathLength: strokeDashoffset !== null ? 1 : undefined,
        strokeDasharray: strokeDashoffset !== null ? '1' : undefined,
        strokeDashoffset: strokeDashoffset ?? undefined
      })}
      {showGrain
        ? renderShapeNode({
            'data-testid': 'shape-grain-overlay',
            fill: '#ffffff',
            stroke: 'none',
            filter: `url(#${grainFilterId})`,
            opacity: grain.intensity,
            style: { mixBlendMode: grain.blendMode }
          })
        : null}
    </svg>
  )
}
