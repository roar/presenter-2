import React, { useEffect, useRef, useState } from 'react'
import styles from './RotationWheel.module.css'

interface RotationWheelProps {
  value: number
  ariaLabel: string
  onCommit: (value: number) => void
}

function normalizeAngle(angle: number): number {
  const normalized = angle % 360
  return normalized < 0 ? normalized + 360 : normalized
}

function snapAngle(angle: number, shiftKey: boolean): number {
  if (!shiftKey) {
    return angle
  }

  return normalizeAngle(Math.round(angle / 15) * 15)
}

function getAngleFromPointer(element: HTMLElement, event: MouseEvent): number {
  const rect = element.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const deltaX = event.clientX - centerX
  const deltaY = event.clientY - centerY
  const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI + 90
  return normalizeAngle(angle)
}

function resolveContinuousAngle(previousAngle: number, nextAngle: number): number {
  const candidates = [nextAngle - 360, nextAngle, nextAngle + 360]

  return candidates.reduce((closest, candidate) => {
    if (Math.abs(candidate - previousAngle) < Math.abs(closest - previousAngle)) {
      return candidate
    }

    return closest
  })
}

const snapMarkerAngles = Array.from({ length: 24 }, (_, index) => index * 15)

export function RotationWheel({
  value,
  ariaLabel,
  onCommit
}: RotationWheelProps): React.JSX.Element {
  const wheelRef = useRef<HTMLButtonElement | null>(null)
  const shiftPressedRef = useRef(false)
  const lastPointerRef = useRef<{ clientX: number; clientY: number } | null>(null)
  const [dragValue, setDragValue] = useState<number | null>(null)
  const [displayAngle, setDisplayAngle] = useState(() => normalizeAngle(value))

  const normalizedValue = dragValue ?? normalizeAngle(value)

  function publishValue(nextValue: number): void {
    setDragValue(nextValue)
    setDisplayAngle((previousAngle) => resolveContinuousAngle(previousAngle, nextValue))
    onCommit(nextValue)
  }

  useEffect(() => {
    if (dragValue == null) {
      return
    }

    const publishPointerAngle = (event: MouseEvent): void => {
      const wheel = wheelRef.current
      if (!wheel) {
        return
      }

      lastPointerRef.current = { clientX: event.clientX, clientY: event.clientY }
      const nextValue = snapAngle(
        getAngleFromPointer(wheel, event),
        shiftPressedRef.current || event.shiftKey
      )
      publishValue(nextValue)
    }

    const handleMouseMove = (event: MouseEvent): void => {
      publishPointerAngle(event)
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Shift') {
        return
      }

      shiftPressedRef.current = true
      const wheel = wheelRef.current
      const pointer = lastPointerRef.current
      if (!wheel || !pointer) {
        return
      }

      publishPointerAngle(new MouseEvent('mousemove', { ...pointer, shiftKey: true }))
    }

    const handleKeyUp = (event: KeyboardEvent): void => {
      if (event.key !== 'Shift') {
        return
      }

      shiftPressedRef.current = false
    }

    const handleMouseUp = (): void => {
      shiftPressedRef.current = false
      lastPointerRef.current = null
      setDragValue(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragValue, onCommit])

  function handleMouseDown(event: React.MouseEvent<HTMLButtonElement>): void {
    const wheel = wheelRef.current
    if (!wheel) {
      return
    }

    event.preventDefault()
    lastPointerRef.current = { clientX: event.clientX, clientY: event.clientY }
    shiftPressedRef.current = event.shiftKey
    const nextValue = snapAngle(
      getAngleFromPointer(wheel, event.nativeEvent),
      shiftPressedRef.current
    )
    publishValue(nextValue)
  }

  return (
    <button
      ref={wheelRef}
      type="button"
      className={styles.wheel}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={359}
      aria-valuenow={Math.round(normalizedValue)}
      onMouseDown={handleMouseDown}
    >
      {snapMarkerAngles.map((angle) => (
        <span
          key={angle}
          aria-hidden="true"
          data-testid="rotation-wheel-marker"
          className={[styles.marker, angle % 45 === 0 ? styles.majorMarker : '']
            .filter(Boolean)
            .join(' ')}
          style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
        />
      ))}
      <span
        className={styles.arrow}
        aria-hidden="true"
        style={{ transform: `rotate(${displayAngle}deg)` }}
      >
        ↑
      </span>
    </button>
  )
}
