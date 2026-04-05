import React from 'react'

type HandleType = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br' | 'rotation'

interface SelectionOverlayProps {
  rotation: number
  cx: number
  cy: number
  scaledWidth: number
  scaledHeight: number
  opacity: number
  visible: boolean
  scale: number
  slideWidth: number
  slideHeight: number
  isDragging: boolean
  showRotationHandle?: boolean
  onHandleMouseDown: (handle: HandleType, event: React.MouseEvent) => void
}

function getResizeCursor(handle: HandleType, rotation: number): string {
  const naturalAngles: Record<HandleType, number> = {
    tl: 315,
    tc: 270,
    tr: 45,
    ml: 180,
    mr: 0,
    bl: 225,
    bc: 90,
    br: 135,
    rotation: 0
  }
  const cursors = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize']
  const visual = (((naturalAngles[handle] + rotation) % 360) + 360) % 360
  return cursors[Math.round((visual % 180) / 45) % 4]
}

export function SelectionOverlay({
  rotation,
  cx,
  cy,
  scaledWidth,
  scaledHeight,
  opacity,
  visible,
  scale,
  slideWidth,
  slideHeight,
  isDragging,
  showRotationHandle = true,
  onHandleMouseDown
}: SelectionOverlayProps): React.JSX.Element {
  const halfWidth = scaledWidth / 2
  const halfHeight = scaledHeight / 2
  const handleSize = 8 / scale
  const rotationLine = 32 / scale
  const rotationRadius = 6 / scale
  const strokeWidth = 2 / scale

  const handles: Array<{ handle: HandleType; x: number; y: number }> = [
    { handle: 'tl', x: cx - halfWidth, y: cy - halfHeight },
    { handle: 'tc', x: cx, y: cy - halfHeight },
    { handle: 'tr', x: cx + halfWidth, y: cy - halfHeight },
    { handle: 'ml', x: cx - halfWidth, y: cy },
    { handle: 'mr', x: cx + halfWidth, y: cy },
    { handle: 'bl', x: cx - halfWidth, y: cy + halfHeight },
    { handle: 'bc', x: cx, y: cy + halfHeight },
    { handle: 'br', x: cx + halfWidth, y: cy + halfHeight }
  ]

  return (
    <svg
      data-testid="selection-indicator"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: slideWidth,
        height: slideHeight,
        overflow: 'visible',
        pointerEvents: 'none',
        opacity,
        visibility: visible ? 'visible' : 'hidden',
        zIndex: 7
      }}
    >
      <g transform={`rotate(${rotation} ${cx} ${cy})`}>
        <rect
          x={cx - halfWidth}
          y={cy - halfHeight}
          width={scaledWidth}
          height={scaledHeight}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={strokeWidth}
        />

        {!isDragging && showRotationHandle && (
          <>
            <line
              x1={cx}
              y1={cy - halfHeight}
              x2={cx}
              y2={cy - halfHeight - rotationLine}
              stroke="var(--accent)"
              strokeWidth={strokeWidth}
            />
            <circle
              data-testid="selection-handle-rotation"
              cx={cx}
              cy={cy - halfHeight - rotationLine}
              r={rotationRadius}
              fill="white"
              stroke="var(--accent)"
              strokeWidth={strokeWidth}
              style={{ pointerEvents: 'all', cursor: 'crosshair' }}
              onMouseDown={(event) => onHandleMouseDown('rotation', event)}
            />
          </>
        )}

        {!isDragging &&
          handles.map(({ handle, x, y }) => (
            <rect
              key={handle}
              data-testid={`selection-handle-${handle}`}
              x={x - handleSize / 2}
              y={y - handleSize / 2}
              width={handleSize}
              height={handleSize}
              rx={1 / scale}
              fill="white"
              stroke="var(--accent)"
              strokeWidth={strokeWidth}
              style={{
                pointerEvents: 'all',
                cursor: getResizeCursor(handle, rotation)
              }}
              onMouseDown={(event) => onHandleMouseDown(handle, event)}
            />
          ))}
      </g>
    </svg>
  )
}
