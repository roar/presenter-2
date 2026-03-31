import type { ShapeElement } from '@shared/model/types'
import type { RenderedElement } from '@shared/animation/types'

interface ShapeElementRendererProps {
  element: ShapeElement
  state: RenderedElement
}

export function ShapeElementRenderer({
  element,
  state
}: ShapeElementRendererProps): React.JSX.Element {
  return (
    <svg
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        overflow: 'visible',
        transform: `rotate(${element.rotation}deg) ${state.transform}`,
        opacity: state.opacity,
        visibility: state.visible ? 'visible' : 'hidden'
      }}
    >
      <path
        d={element.pathData}
        fill={element.fill.color}
        fillOpacity={element.fill.opacity}
        stroke={element.stroke.color}
        strokeWidth={element.stroke.width}
        strokeOpacity={element.stroke.opacity}
      />
    </svg>
  )
}
