import React from 'react'
import type { ShapeTextFlowLine } from './shapeTextFlow'

interface ShapeTextFlowRendererProps {
  lines: ShapeTextFlowLine[]
}

export function ShapeTextFlowRenderer({ lines }: ShapeTextFlowRendererProps): React.JSX.Element {
  return (
    <>
      {lines.map((line, index) => (
        <div
          key={`${line.text}-${index}`}
          style={{
            position: 'absolute',
            left: line.x,
            top: line.y,
            width: line.width,
            height: line.height,
            whiteSpace: 'pre'
          }}
        >
          {line.text}
        </div>
      ))}
    </>
  )
}
