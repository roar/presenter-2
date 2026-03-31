import type { TextElement } from '@shared/model/types'
import type { RenderedElement } from '@shared/animation/types'

interface TextElementRendererProps {
  element: TextElement
  state: RenderedElement
}

export function TextElementRenderer({
  element,
  state
}: TextElementRendererProps): React.JSX.Element {
  return (
    <div
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation}deg) ${state.transform}`,
        opacity: state.opacity,
        visibility: state.visible ? 'visible' : 'hidden',
        fontSize: element.fontSize,
        fontWeight: element.fontWeight,
        color: element.color,
        textAlign: element.align,
        textShadow: state.textShadow
          ? `${state.textShadow.offsetX}px ${state.textShadow.offsetY}px ${state.textShadow.blur}px ${state.textShadow.color}`
          : undefined
      }}
    >
      {element.content}
    </div>
  )
}
