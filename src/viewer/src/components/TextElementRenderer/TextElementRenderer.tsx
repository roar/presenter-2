import type { RenderedAppearance } from '@shared/animation/types'

interface TextElementRendererProps {
  rendered: RenderedAppearance
}

export function TextElementRenderer({ rendered }: TextElementRendererProps): React.JSX.Element {
  const { master, visible, opacity, transform, textShadow } = rendered
  const { transform: t, textStyle } = master
  const style = textStyle?.defaultState ?? {}

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
        transform: `rotate(${t.rotation}deg) ${transform}`,
        opacity,
        visibility: visible ? 'visible' : 'hidden',
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        fontFamily: style.fontFamily,
        color: style.color,
        textShadow: shadow
          ? `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.color}`
          : undefined
      }}
    >
      {content?.blocks.map((block) => (
        <p key={block.id} style={{ margin: 0 }}>
          {block.runs.map((run) => run.text).join('')}
        </p>
      ))}
    </div>
  )
}
