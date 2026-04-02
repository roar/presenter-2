import type { Appearance, MsoMaster } from '@shared/model/types'

interface TextViewProps {
  master: MsoMaster
  appearance: Appearance
}

export function TextView({ master, appearance }: TextViewProps): React.JSX.Element {
  const { transform: t } = master
  const visible = appearance.initialVisibility === 'visible'

  return (
    <div
      style={{
        position: 'absolute',
        left: t.x,
        top: t.y,
        width: t.width,
        height: t.height,
        visibility: visible ? 'visible' : 'hidden'
      }}
    />
  )
}
