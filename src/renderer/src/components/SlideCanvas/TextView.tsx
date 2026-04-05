import type { RenderedAppearance } from '@shared/animation/types'
import { resolveColorValue } from '@shared/model/colors'
import type { Appearance, MsoMaster, TextContent } from '@shared/model/types'
import { TextContentRenderer } from '@shared/text/TextContentRenderer'
import { extractPlainText, plainTextToTextContent } from '@shared/text/textContentUtils'

interface TextViewProps {
  master: MsoMaster
  appearance: Appearance
  rendered?: RenderedAppearance
  isEditing?: boolean
  contentOverride?: TextContent | null
  onEditContentChange?: (content: TextContent) => void
  onCommitEdit?: () => void
}

export function TextView({
  master,
  appearance,
  rendered,
  isEditing = false,
  contentOverride = null,
  onEditContentChange,
  onCommitEdit
}: TextViewProps): React.JSX.Element {
  const { transform: t } = master
  const visible = rendered?.visible ?? appearance.initialVisibility === 'visible'
  const textStyle = master.textStyle?.defaultState ?? {}
  const content = contentOverride ?? (master.content.type === 'text' ? master.content.value : null)
  const plainText = content ? extractPlainText(content) : ''

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
      {isEditing ? (
        <textarea
          aria-label="Edit text"
          autoFocus
          defaultValue={plainText}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: 'inherit',
            font: 'inherit',
            resize: 'none',
            outline: 'none'
          }}
          onChange={(event) => onEditContentChange?.(plainTextToTextContent(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              onCommitEdit?.()
            }
          }}
          onBlur={() => onCommitEdit?.()}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        />
      ) : null}
      {!isEditing && content ? <TextContentRenderer content={content} /> : null}
    </div>
  )
}
