import type { RenderedAppearance } from '@shared/animation/types'
import type { Appearance, MsoMaster } from '@shared/model/types'

interface ImageViewProps {
  master: MsoMaster
  appearance: Appearance
  rendered?: RenderedAppearance
}

export function ImageView({ master, appearance, rendered }: ImageViewProps): React.JSX.Element {
  const { transform: t, content } = master
  const visible = rendered?.visible ?? appearance.initialVisibility === 'visible'
  const src = content.type === 'image' ? content.src : ''

  return (
    <div
      style={{
        position: 'absolute',
        left: t.x,
        top: t.y,
        width: t.width,
        height: t.height,
        transform: rendered?.transform || undefined,
        opacity: rendered?.opacity ?? 1,
        visibility: visible ? 'visible' : 'hidden'
      }}
    >
      {src && (
        <img src={src} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
      )}
    </div>
  )
}
