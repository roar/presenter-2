import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RotationWheel } from './RotationWheel'

function pointForAngle(angle: number): { clientX: number; clientY: number } {
  const radians = (angle * Math.PI) / 180
  const radius = 40
  const centerX = 50
  const centerY = 50

  return {
    clientX: centerX + Math.sin(radians) * radius,
    clientY: centerY - Math.cos(radians) * radius
  }
}

describe('RotationWheel', () => {
  it('publishes the dragged rotation value while dragging', () => {
    const onCommit = vi.fn()

    render(<RotationWheel value={0} ariaLabel="Rotation" onCommit={onCommit} />)

    const wheel = screen.getByRole('slider', { name: 'Rotation' })
    vi.spyOn(wheel, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({})
    })

    fireEvent.mouseDown(wheel, pointForAngle(0))
    fireEvent.mouseMove(window, pointForAngle(90))

    expect(onCommit).toHaveBeenCalledWith(90)
  })

  it('snaps drag commits to 15 degree increments while shift is held', () => {
    const onCommit = vi.fn()

    render(<RotationWheel value={0} ariaLabel="Rotation" onCommit={onCommit} />)

    const wheel = screen.getByRole('slider', { name: 'Rotation' })
    vi.spyOn(wheel, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({})
    })

    fireEvent.mouseDown(wheel, pointForAngle(0))
    fireEvent.mouseMove(window, { ...pointForAngle(23), shiftKey: true })
    fireEvent.mouseUp(window, pointForAngle(23))

    expect(onCommit).toHaveBeenCalledWith(30)
  })

  it('snaps to 0 degrees at the wraparound boundary while shift is held', () => {
    const onCommit = vi.fn()

    render(<RotationWheel value={345} ariaLabel="Rotation" onCommit={onCommit} />)

    const wheel = screen.getByRole('slider', { name: 'Rotation' })
    vi.spyOn(wheel, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({})
    })

    fireEvent.mouseDown(wheel, pointForAngle(345))
    fireEvent.mouseMove(window, { ...pointForAngle(359), shiftKey: true })

    expect(onCommit).toHaveBeenLastCalledWith(0)
  })

  it('starts snapping as soon as shift is pressed during an active drag', () => {
    const onCommit = vi.fn()

    render(<RotationWheel value={0} ariaLabel="Rotation" onCommit={onCommit} />)

    const wheel = screen.getByRole('slider', { name: 'Rotation' })
    vi.spyOn(wheel, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({})
    })

    fireEvent.mouseDown(wheel, pointForAngle(0))
    fireEvent.mouseMove(window, pointForAngle(23))
    fireEvent.keyDown(window, { key: 'Shift' })

    expect(onCommit).toHaveBeenLastCalledWith(30)
  })

  it('renders snap markers around the circle', () => {
    render(<RotationWheel value={0} ariaLabel="Rotation" onCommit={() => {}} />)

    expect(screen.getAllByTestId('rotation-wheel-marker')).toHaveLength(24)
  })

  it('keeps the arrow on the shortest path when crossing 0 degrees', () => {
    const onCommit = vi.fn()

    render(<RotationWheel value={350} ariaLabel="Rotation" onCommit={onCommit} />)

    const wheel = screen.getByRole('slider', { name: 'Rotation' })
    vi.spyOn(wheel, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({})
    })

    fireEvent.mouseDown(wheel, pointForAngle(350))
    fireEvent.mouseMove(window, pointForAngle(10))

    expect(screen.getByText('↑')).toHaveStyle({ transform: 'rotate(370deg)' })
  })
})
