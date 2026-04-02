import type { RenderedAppearance } from '@shared/animation/types'

interface ShapeElementRendererProps {
  rendered: RenderedAppearance
}

export function ShapeElementRenderer({ rendered }: ShapeElementRendererProps): React.JSX.Element {
  const { master, visible, opacity, transform, strokeDashoffset } = rendered
  const { transform: t, objectStyle, geometry } = master
  const style = objectStyle.defaultState
  const pathData = geometry?.pathData ?? ''
  const viewBox =
    geometry?.type === 'path' && geometry.baseWidth && geometry.baseHeight
      ? `0 0 ${geometry.baseWidth} ${geometry.baseHeight}`
      : undefined

  return (
    <svg
      style={{
        position: 'absolute',
        left: t.x,
        top: t.y,
        width: t.width,
        height: t.height,
        overflow: 'visible',
        transform: `rotate(${t.rotation}deg) ${transform}`,
        opacity,
        visibility: visible ? 'visible' : 'hidden'
      }}
      viewBox={viewBox}
    >
      <path
        d={pathData}
        fill={style.fill ?? 'none'}
        stroke={style.stroke ?? 'none'}
        strokeWidth={style.strokeWidth ?? 0}
        pathLength={strokeDashoffset !== null ? 1 : undefined}
        strokeDasharray={strokeDashoffset !== null ? '1' : undefined}
        strokeDashoffset={strokeDashoffset ?? undefined}
      />
    </svg>
  )
}
