import React from 'react'
import type { ColorConstant, TextDecoration } from '../model/types'
import type { ShapeTextRenderLine } from './shapeTextRenderLayout'
import { getTextRunStyle } from './textRenderUtils'

interface ShapeTextLayoutRendererProps {
  lines: ShapeTextRenderLine[]
  colorConstantsById?: Record<string, ColorConstant>
}

export function ShapeTextLayoutRenderer({
  lines,
  colorConstantsById
}: ShapeTextLayoutRendererProps): React.JSX.Element {
  return (
    <>
      {lines.map((line, lineIndex) => (
        <div
          key={`${line.blockId}-${lineIndex}`}
          style={{
            position: 'absolute',
            left: line.x,
            top: line.y,
            width: line.trackWidth,
            height: line.height,
            whiteSpace: 'pre'
          }}
        >
          {line.fragments.map((fragment, fragmentIndex) => (
            <span
              key={`${fragment.blockId}-${fragment.runId ?? 'prefix'}-${fragmentIndex}`}
              style={getTextRunStyle(
                fragment.marks,
                fragment.decorationKinds as TextDecoration['kind'][],
                colorConstantsById
              )}
            >
              {fragment.text}
            </span>
          ))}
        </div>
      ))}
    </>
  )
}
