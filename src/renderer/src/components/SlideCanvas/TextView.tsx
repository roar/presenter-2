import type { RenderedAppearance } from '@shared/animation/types'
import { resolveColorValue } from '@shared/model/colors'
import type { Appearance, MsoMaster } from '@shared/model/types'
import { TextContentRenderer } from '@shared/text/TextContentRenderer'

interface TextViewProps {
  master: MsoMaster
  appearance: Appearance
  rendered?: RenderedAppearance
  isEditing?: boolean
}

export function TextView({
  master,
  appearance,
  rendered,
  isEditing = false
}: TextViewProps): React.JSX.Element {
  const { transform: t } = master
  const visible = rendered?.visible ?? appearance.initialVisibility === 'visible'
  const textStyle = master.textStyle?.defaultState ?? {}
  const content = master.content.type === 'text' ? master.content.value : null

  return (
    <div
      data-testid="text-view"
      data-text-editing={isEditing ? 'true' : 'false'}
      style={{
        position: 'absolute',
        left: t.x,
        top: t.y,
        width: t.width,
        height: t.height,
        transform: rendered?.transform || undefined,
        opacity: rendered?.opacity ?? 1,
        visibility: visible ? 'visible' : 'hidden',
        fontSize: textStyle.fontSize,
        fontWeight: textStyle.fontWeight,
        fontFamily: textStyle.fontFamily,
        color: resolveColorValue(textStyle.color),
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
        outline: isEditing ? '2px solid #0a84ff' : undefined,
        outlineOffset: isEditing ? '4px' : undefined
      }}
    >
      {content ? <TextContentRenderer content={content} /> : null}
    </div>
  )
}
