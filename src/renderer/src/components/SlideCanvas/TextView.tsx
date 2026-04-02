import type { RenderedAppearance } from '@shared/animation/types'
import type { Appearance, MsoMaster } from '@shared/model/types'

interface TextViewProps {
  master: MsoMaster
  appearance: Appearance
  rendered?: RenderedAppearance
}

export function TextView({ master, appearance, rendered }: TextViewProps): React.JSX.Element {
  const { transform: t } = master
  const visible = rendered?.visible ?? appearance.initialVisibility === 'visible'

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
    />
  )
}
