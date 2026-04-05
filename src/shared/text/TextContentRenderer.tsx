import React from 'react'
import { resolveColorValue } from '../model/colors'
import type { ColorConstant, TextBlock, TextContent, TextMark } from '../model/types'

interface TextContentRendererProps {
  content: TextContent
  colorConstantsById?: Record<string, ColorConstant>
}

function getRunStyle(
  marks: TextMark[],
  colorConstantsById?: Record<string, ColorConstant>
): React.CSSProperties {
  const style: React.CSSProperties = {}

  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        style.fontWeight = 700
        break
      case 'italic':
        style.fontStyle = 'italic'
        break
      case 'underline':
        style.textDecoration = 'underline'
        break
      case 'color':
        style.color = resolveColorValue(mark.value, colorConstantsById)
        break
    }
  }

  return style
}

function getBlockPrefix(block: TextBlock, index: number): string | null {
  if (block.list.kind === 'bulleted') {
    return '\u2022 '
  }

  if (block.list.kind === 'numbered') {
    const base = block.list.start ?? 1
    return `${base + index}. `
  }

  return null
}

export function TextContentRenderer({
  content,
  colorConstantsById
}: TextContentRendererProps): React.JSX.Element {
  let numberedSequenceIndex = 0
  let numberedSequenceBase = 1

  return (
    <>
      {content.blocks.map((block) => {
        if (block.list.kind === 'numbered') {
          if (numberedSequenceIndex === 0) {
            numberedSequenceBase = block.list.start ?? 1
          }
        } else {
          numberedSequenceIndex = 0
          numberedSequenceBase = 1
        }

        const sequenceIndex = block.list.kind === 'numbered' ? numberedSequenceIndex++ : 0
        const prefix =
          block.list.kind === 'numbered'
            ? `${numberedSequenceBase + sequenceIndex}. `
            : getBlockPrefix(block, sequenceIndex)

        return (
          <p key={block.id} style={{ margin: 0 }}>
            {prefix ? <span>{prefix}</span> : null}
            {block.runs.map((run) => (
              <span key={run.id} style={getRunStyle(run.marks, colorConstantsById)}>
                {run.text}
              </span>
            ))}
          </p>
        )
      })}
    </>
  )
}
