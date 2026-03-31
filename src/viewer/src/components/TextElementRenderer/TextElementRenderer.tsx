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
  const shadow = state.textShadow ?? element.textShadow ?? null
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
        fontFamily: element.fontFamily,
        color: element.color,
        textAlign: element.align,
        textShadow: shadow
          ? `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.color}`
          : undefined
      }}
    >
      {element.content}
    </div>
  )
}
