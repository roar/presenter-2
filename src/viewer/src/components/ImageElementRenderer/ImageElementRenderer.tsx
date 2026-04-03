import type { RenderedAppearance } from '@shared/animation/types'

interface ImageElementRendererProps {
  rendered: RenderedAppearance
}

export function ImageElementRenderer({ rendered }: ImageElementRendererProps): React.JSX.Element {
  const { master, visible, opacity, transform } = rendered
  const { transform: t, content } = master
  const src = content.type === 'image' ? content.src : ''

  return (
    <img
      src={src}
      alt=""
      style={{
        position: 'absolute',
        left: t.x,
        top: t.y,
        width: t.width,
        height: t.height,
        transform: `${transform} rotate(${t.rotation}deg)`,
        transformOrigin: 'center center',
        opacity,
        visibility: visible ? 'visible' : 'hidden',
        objectFit: 'contain'
      }}
    />
  )
}
