import type { RenderedAppearance } from '@shared/animation/types'
import { resolveColorValue } from '@shared/model/colors'
import type { Appearance, MsoMaster } from '@shared/model/types'

interface ShapeViewProps {
  master: MsoMaster
  appearance: Appearance
  rendered?: RenderedAppearance
}

export function ShapeView({ master, appearance, rendered }: ShapeViewProps): React.JSX.Element {
  const { transform: t, objectStyle, geometry } = master
  const style = objectStyle.defaultState
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
    fill: resolveColorValue(style.fill, colorConstantsById) ?? 'none',
    stroke: resolveColorValue(style.stroke, colorConstantsById) ?? 'none',
    strokeWidth: style.strokeWidth ?? 0
  }

  const viewBox =
    geometry?.type === 'path' && geometry.baseWidth && geometry.baseHeight
      ? `0 0 ${geometry.baseWidth} ${geometry.baseHeight}`
      : undefined

  return (
    <svg style={svgStyle} viewBox={viewBox}>
      {geometry?.type === 'path' && <path d={geometry.pathData ?? ''} {...shapeProps} />}
      {geometry?.type === 'rect' && (
        <rect x={0} y={0} width={t.width} height={t.height} {...shapeProps} />
      )}
      {geometry?.type === 'ellipse' && (
        <ellipse
          cx={t.width / 2}
          cy={t.height / 2}
          rx={t.width / 2}
          ry={t.height / 2}
          {...shapeProps}
        />
      )}
    </svg>
  )
}
