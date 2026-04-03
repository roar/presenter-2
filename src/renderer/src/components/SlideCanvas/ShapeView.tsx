import React from 'react'
import type { RenderedAppearance } from '@shared/animation/types'
import { resolveColorValue } from '@shared/model/colors'
import { isGradientFill, resolveGradientStops } from '@shared/model/fill'
import { getGrainBaseFrequency, resolveGrainEffect } from '@shared/model/grain'
import type { Appearance, MsoMaster } from '@shared/model/types'

interface ShapeViewProps {
  master: MsoMaster
  appearance: Appearance
  rendered?: RenderedAppearance
}

export function ShapeView({ master, appearance, rendered }: ShapeViewProps): React.JSX.Element {
  const grainFilterId = React.useId()
  const gradientId = React.useId()
  const { transform: t, objectStyle, geometry } = master
  const style = objectStyle.defaultState
  const grain = resolveGrainEffect(style.grain)
  const visible = rendered?.visible ?? appearance.initialVisibility === 'visible'
  const opacity = rendered?.opacity ?? style.opacity
  const baseTransform = rendered?.transform
  const rotationTransform = t.rotation !== 0 ? `rotate(${t.rotation}deg)` : ''
  const colorConstantsById = rendered?.colorConstantsById

  const svgStyle: React.CSSProperties = {
    position: 'absolute',
    left: t.x,
    top: t.y,
    width: t.width,
    height: t.height,
    overflow: 'visible',
    transform: [baseTransform, rotationTransform].filter(Boolean).join(' ') || undefined,
    opacity,
    visibility: visible ? 'visible' : 'hidden'
  }

  const shapeProps = {
    fill: !isGradientFill(style.fill)
      ? (resolveColorValue(style.fill, colorConstantsById) ?? 'none')
      : `url(#${gradientId})`,
    stroke: resolveColorValue(style.stroke, colorConstantsById) ?? 'none',
    strokeWidth: style.strokeWidth ?? 0
  }
  const showGrain = grain.enabled && shapeProps.fill !== 'none'
  const gradientStops = isGradientFill(style.fill)
    ? resolveGradientStops(style.fill.stops, colorConstantsById)
    : []

  const viewBox =
    geometry?.type === 'path' && geometry.baseWidth && geometry.baseHeight
      ? `0 0 ${geometry.baseWidth} ${geometry.baseHeight}`
      : undefined

  function renderShapeNode(extraProps: Record<string, unknown> = {}): React.JSX.Element | null {
    if (geometry?.type === 'path') {
      return <path d={geometry.pathData ?? ''} {...extraProps} />
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
    <svg style={svgStyle} viewBox={viewBox}>
      {showGrain || isGradientFill(style.fill) ? (
        <defs>
          {isGradientFill(style.fill) ? (
            style.fill.kind === 'linear-gradient' ? (
              <linearGradient
                id={gradientId}
                gradientUnits="objectBoundingBox"
                gradientTransform={`rotate(${style.fill.rotation} 0.5 0.5)`}
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
      {renderShapeNode(shapeProps)}
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
