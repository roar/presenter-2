import type { RenderedAppearance } from '@shared/animation/types'
import { resolveColorValue } from '@shared/model/colors'
import { TextContentRenderer } from '@shared/text/TextContentRenderer'

interface TextElementRendererProps {
  rendered: RenderedAppearance
}

export function TextElementRenderer({ rendered }: TextElementRendererProps): React.JSX.Element {
  const { master, visible, opacity, transform, textShadow, textDecorations } = rendered
  const { transform: t, textStyle } = master
  const style = textStyle?.defaultState ?? {}
  const colorConstantsById = rendered.colorConstantsById

  // Prefer animated textShadow over the master's static default
  const shadow = textShadow ?? (style.textShadow ? style.textShadow : null)

  const content = master.content.type === 'text' ? master.content.value : null

  return (
    <div
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
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        fontFamily: style.fontFamily,
        color: resolveColorValue(style.color, colorConstantsById),
        textShadow: shadow
          ? `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${
              resolveColorValue(shadow.color, colorConstantsById) ?? 'rgba(0,0,0,0)'
            }`
          : undefined
      }}
    >
      {content ? (
        <TextContentRenderer
          content={content}
          colorConstantsById={colorConstantsById}
          decorations={textDecorations}
        />
      ) : null}
    </div>
  )
}
