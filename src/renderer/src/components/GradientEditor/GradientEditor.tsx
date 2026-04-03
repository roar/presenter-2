import React, { useMemo, useRef, useState } from 'react'
import { Button } from '../Button/Button'
import { DropdownMenu } from '../DropdownMenu/DropdownMenu'
import { NumberInput } from '../NumberInput/NumberInput'
import styles from './GradientEditor.module.css'

export interface GradientStopValue {
  id: string
  offset: number
  color: string
}

export interface LinearGradientValue {
  kind: 'linear'
  angle: number
  stops: GradientStopValue[]
}

export interface RadialGradientValue {
  kind: 'radial'
  centerX: number
  centerY: number
  radius: number
  stops: GradientStopValue[]
}

export type GradientValue = LinearGradientValue | RadialGradientValue

interface GradientEditorProps {
  value: GradientValue
  onChange: (value: GradientValue) => void
}

interface ShadowHandle {
  offset: number
  color: string
}

const HANDLE_HIT_RADIUS = 0.045
const DELETE_DRAG_MARGIN = 24
const CLICK_DRAG_THRESHOLD = 3

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function sortStops(stops: GradientStopValue[]): GradientStopValue[] {
  return [...stops].sort((a, b) => a.offset - b.offset)
}

function formatStops(stops: GradientStopValue[]): string {
  return sortStops(stops)
    .map((stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`)
    .join(', ')
}

function buildPreviewBackground(value: GradientValue): string {
  const stops = formatStops(value.stops)
  return `linear-gradient(90deg, ${stops})`
}

function reverseStops(stops: GradientStopValue[]): GradientStopValue[] {
  return [...stops]
    .map((stop) => ({ ...stop, offset: 1 - stop.offset }))
    .reverse()
    .map((stop) => ({ ...stop }))
}

function toRadialGradient(value: GradientValue): RadialGradientValue {
  return {
    kind: 'radial',
    centerX: 50,
    centerY: 50,
    radius: 50,
    stops: sortStops(value.stops)
  }
}

function toLinearGradient(value: GradientValue): LinearGradientValue {
  return {
    kind: 'linear',
    angle: 90,
    stops: sortStops(value.stops)
  }
}

function getStopLaneOffset(preview: HTMLElement, clientX: number): number {
  const rect = preview.getBoundingClientRect()
  return Number(clamp((clientX - rect.left) / rect.width, 0, 1).toFixed(2))
}

function parseHexColor(color: string): [number, number, number] {
  const value = color.replace('#', '')
  const normalized =
    value.length === 3
      ? value
          .split('')
          .map((channel) => `${channel}${channel}`)
          .join('')
      : value

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16)
  ]
}

function toHexColor([red, green, blue]: [number, number, number]): string {
  return `#${[red, green, blue]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`
}

function interpolateColor(startColor: string, endColor: string, factor: number): string {
  const start = parseHexColor(startColor)
  const end = parseHexColor(endColor)

  return toHexColor([
    start[0] + (end[0] - start[0]) * factor,
    start[1] + (end[1] - start[1]) * factor,
    start[2] + (end[2] - start[2]) * factor
  ])
}

function findInsertColor(stops: GradientStopValue[], offset: number): string {
  const sortedStops = sortStops(stops)
  const nextStop = sortedStops.find((stop) => stop.offset >= offset) ?? sortedStops.at(-1)
  const previousStop =
    [...sortedStops].reverse().find((stop) => stop.offset <= offset) ?? sortedStops[0]

  if (!previousStop && !nextStop) {
    return '#ffffff'
  }

  if (!previousStop) {
    return nextStop?.color ?? '#ffffff'
  }

  if (!nextStop) {
    return previousStop.color
  }

  if (nextStop.offset === previousStop.offset) {
    return previousStop.color
  }

  const factor = (offset - previousStop.offset) / (nextStop.offset - previousStop.offset)
  return interpolateColor(previousStop.color, nextStop.color, factor)
}

function isEdgeStop(stops: GradientStopValue[], stopId: string): boolean {
  const sortedStops = sortStops(stops)
  return sortedStops[0]?.id === stopId || sortedStops.at(-1)?.id === stopId
}

export function GradientEditor({ value, onChange }: GradientEditorProps): React.JSX.Element {
  const previewRef = useRef<HTMLDivElement | null>(null)
  const colorInputRef = useRef<HTMLInputElement | null>(null)
  const suppressPickerRef = useRef(false)
  const [selectedStopId, setSelectedStopId] = useState<string | null>(value.stops[0]?.id ?? null)
  const [shadowHandle, setShadowHandle] = useState<ShadowHandle | null>(null)
  const selectedStop = useMemo(
    () => value.stops.find((stop) => stop.id === selectedStopId) ?? value.stops[0] ?? null,
    [selectedStopId, value.stops]
  )

  function updateStops(mapper: (stops: GradientStopValue[]) => GradientStopValue[]): void {
    onChange({
      ...value,
      stops: sortStops(mapper(value.stops))
    })
  }

  function updateSelectedStopColor(color: string): void {
    if (!selectedStop) {
      return
    }

    updateStops((stops) =>
      stops.map((stop) => (stop.id === selectedStop.id ? { ...stop, color } : stop))
    )
  }

  function addStop(offset: number, color: string): void {
    const nextStopId = `stop-${crypto.randomUUID()}`
    setSelectedStopId(nextStopId)
    onChange({
      ...value,
      stops: sortStops([...value.stops, { id: nextStopId, offset, color }])
    })
  }

  function handleStopMouseDown(stopId: string, event: React.MouseEvent<HTMLButtonElement>): void {
    event.preventDefault()
    setSelectedStopId(stopId)

    if (isEdgeStop(value.stops, stopId)) {
      return
    }

    suppressPickerRef.current = false
    const startX = event.clientX
    const startY = event.clientY

    const handleMouseMove = (moveEvent: MouseEvent): void => {
      const preview = previewRef.current
      if (!preview) {
        return
      }

      if (
        Math.abs(moveEvent.clientX - startX) > CLICK_DRAG_THRESHOLD ||
        Math.abs(moveEvent.clientY - startY) > CLICK_DRAG_THRESHOLD
      ) {
        suppressPickerRef.current = true
      }

      const offset = getStopLaneOffset(preview, moveEvent.clientX)
      updateStops((stops) => stops.map((stop) => (stop.id === stopId ? { ...stop, offset } : stop)))
    }

    const handleMouseUp = (upEvent: MouseEvent): void => {
      const preview = previewRef.current
      if (preview && value.stops.length > 2) {
        const rect = preview.getBoundingClientRect()
        const isOutsideHorizontally =
          upEvent.clientX < rect.left - DELETE_DRAG_MARGIN ||
          upEvent.clientX > rect.right + DELETE_DRAG_MARGIN

        if (isOutsideHorizontally) {
          const remainingStops = value.stops.filter((stop) => stop.id !== stopId)
          setSelectedStopId(remainingStops[0]?.id ?? null)
          onChange({
            ...value,
            stops: sortStops(remainingStops)
          })
        }
      }

      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.setTimeout(() => {
        suppressPickerRef.current = false
      }, 0)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  function handleKindChange(nextKind: 'linear' | 'radial'): void {
    onChange(nextKind === 'linear' ? toLinearGradient(value) : toRadialGradient(value))
  }

  function openColorPicker(): void {
    const input = colorInputRef.current
    if (!input) {
      return
    }

    if (typeof input.showPicker === 'function') {
      input.showPicker()
      return
    }

    input.click()
  }

  function handlePreviewMouseMove(event: React.MouseEvent<HTMLDivElement>): void {
    const preview = previewRef.current
    if (!preview) {
      return
    }

    const { bottom } = preview.getBoundingClientRect()
    const laneTop = bottom - 30
    const laneBottom = bottom + 8
    const isInsideLane = event.clientY >= laneTop && event.clientY <= laneBottom

    if (!isInsideLane) {
      setShadowHandle(null)
      return
    }

    const offset = getStopLaneOffset(preview, event.clientX)
    const isNearExistingStop = value.stops.some(
      (stop) => Math.abs(stop.offset - offset) <= HANDLE_HIT_RADIUS
    )
    if (isNearExistingStop) {
      setShadowHandle(null)
      return
    }

    setShadowHandle({
      offset,
      color: findInsertColor(value.stops, offset)
    })
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.kindControl}>
          <span className={styles.label}>Type</span>
          <DropdownMenu
            value={value.kind}
            options={[
              { value: 'linear', label: 'Linear' },
              { value: 'radial', label: 'Circular' }
            ]}
            onChange={handleKindChange}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onChange({ ...value, stops: reverseStops(value.stops) })}
          aria-label="Reverse gradient"
        >
          ↔
        </Button>
      </div>

      <div
        ref={previewRef}
        className={styles.preview}
        aria-label="Gradient preview"
        onMouseMove={handlePreviewMouseMove}
        onMouseLeave={() => setShadowHandle(null)}
      >
        <div className={styles.ramp} style={{ background: buildPreviewBackground(value) }} />
        {value.stops.map((stop, index) => (
          <button
            key={stop.id}
            type="button"
            className={[styles.stop, selectedStop?.id === stop.id ? styles.stopSelected : '']
              .filter(Boolean)
              .join(' ')}
            aria-label={`Gradient stop ${index + 1}`}
            style={{ left: `${stop.offset * 100}%` }}
            onClick={() => {
              setSelectedStopId(stop.id)
              if (suppressPickerRef.current) {
                return
              }
              openColorPicker()
            }}
            onMouseDown={(event) => handleStopMouseDown(stop.id, event)}
          >
            <span className={styles.stopTip} />
            <span className={styles.stopSwatch} style={{ background: stop.color }} />
          </button>
        ))}
        {shadowHandle ? (
          <button
            type="button"
            className={[styles.stop, styles.shadowStop].join(' ')}
            aria-label="New gradient stop"
            style={{ left: `${shadowHandle.offset * 100}%` }}
            onClick={() => addStop(shadowHandle.offset, shadowHandle.color)}
          >
            <span className={styles.stopTip} />
            <span className={styles.stopSwatch} style={{ background: shadowHandle.color }} />
          </button>
        ) : null}
      </div>

      <div className={styles.controls}>
        <input
          ref={colorInputRef}
          aria-label="Selected stop color"
          className={styles.hiddenColorInput}
          type="color"
          value={selectedStop?.color ?? '#000000'}
          onChange={(event) => updateSelectedStopColor(event.target.value)}
        />

        {value.kind === 'linear' ? (
          <label className={styles.field}>
            <span className={styles.label}>Angle</span>
            <NumberInput
              aria-label="Gradient angle"
              value={value.angle}
              decimals={0}
              onCommit={(angle) =>
                onChange({
                  ...value,
                  angle
                })
              }
            />
          </label>
        ) : null}
      </div>
    </div>
  )
}
