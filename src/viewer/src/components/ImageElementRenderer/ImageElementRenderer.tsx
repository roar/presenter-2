import type { ImageElement } from '@shared/model/types'
import type { RenderedElement } from '@shared/animation/types'

interface ImageElementRendererProps {
  element: ImageElement
  state: RenderedElement
}

export function ImageElementRenderer({
  element,
  state
}: ImageElementRendererProps): React.JSX.Element {
  return (
    <img
      src={element.src}
      alt=""
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation}deg) ${state.transform}`,
        opacity: state.opacity,
        visibility: state.visible ? 'visible' : 'hidden',
        objectFit: 'contain'
      }}
    />
  )
}
