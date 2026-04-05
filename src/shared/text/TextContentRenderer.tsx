import React from 'react'
import type { ColorConstant, TextContent, TextDecoration } from '../model/types'
import {
  buildRunSegments,
  getBlockPrefix,
  getDecorationRangesForRun,
  getTextRunStyle
} from './textRenderUtils'

interface TextContentRendererProps {
  content: TextContent
  colorConstantsById?: Record<string, ColorConstant>
  decorations?: TextDecoration[]
}

export function TextContentRenderer({
  content,
  colorConstantsById,
  decorations = []
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
            {block.runs.map((run) => {
              const runDecorations = getDecorationRangesForRun(
                block,
                run.id,
                run.text.length,
                decorations
              )
              const segments = buildRunSegments(run.text, runDecorations)

              return segments.map((segment, index) => (
                <span
                  key={`${run.id}-${index}`}
                  style={getTextRunStyle(run.marks, segment.decorationKinds, colorConstantsById)}
                >
                  {segment.text}
                </span>
              ))
            })}
          </p>
        )
      })}
    </>
  )
}
