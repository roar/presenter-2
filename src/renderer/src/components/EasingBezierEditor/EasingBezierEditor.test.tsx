import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Easing } from '@shared/model/types'
import { EasingBezierEditor } from './EasingBezierEditor'

function makeCurveEasing(): Extract<Easing, { kind: 'curve' }> {
  return {
    kind: 'curve',
    points: [
      { x: 0, y: 0, kind: 'corner' },
      {
        x: 0.5,
        y: 0.45,
        kind: 'smooth',
        inHandle: { dx: -0.12, dy: -0.08 },
        outHandle: { dx: 0.12, dy: 0.08 }
      },
      { x: 1, y: 1, kind: 'corner' }
    ]
  }
}

describe('EasingBezierEditor', () => {
  it('renders the current custom easing curve', () => {
    render(<EasingBezierEditor easing={makeCurveEasing()} onChange={vi.fn()} />)

    expect(screen.getByLabelText('Custom easing editor')).toHaveStyle({
      width: '232px',
      height: '152px'
    })
    expect(screen.getByLabelText('Custom easing curve')).toBeInTheDocument()
    expect(screen.getAllByTestId('animation-path-point')).toHaveLength(3)
  })

  it('updates the curve when dragging an interior anchor point', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<EasingBezierEditor easing={makeCurveEasing()} onChange={onChange} />)

    const points = screen.getAllByTestId('animation-path-point')
    await user.pointer([
      {
        target: points[1],
        keys: '[MouseLeft>]',
        coords: { clientX: 140, clientY: 78 }
      }
    ])
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 172, clientY: 58, bubbles: true }))
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 172, clientY: 58, bubbles: true }))

    expect(onChange).toHaveBeenCalledTimes(1)
    const nextEasing = onChange.mock.calls[0][0] as Extract<Easing, { kind: 'curve' }>
    expect(nextEasing.kind).toBe('curve')
    expect(nextEasing.points[1].x).toBeGreaterThan(0.5)
    expect(nextEasing.points[1].y).toBeGreaterThan(0.45)
  })

  it('opens a point context menu and converts the point to symmetric', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<EasingBezierEditor easing={makeCurveEasing()} onChange={onChange} />)

    const points = screen.getAllByTestId('animation-path-point')
    await user.pointer([{ target: points[1], keys: '[MouseRight]' }])
    await user.click(screen.getByRole('menuitem', { name: 'Make Symmetric Point' }))

    expect(onChange).toHaveBeenCalled()
    const nextEasing = onChange.mock.calls.at(-1)?.[0] as Extract<Easing, { kind: 'curve' }>
    expect(nextEasing.points[1].kind).toBe('balanced')
  })

  it('disables delete for endpoints in the point context menu', async () => {
    const user = userEvent.setup()

    render(<EasingBezierEditor easing={makeCurveEasing()} onChange={vi.fn()} />)

    const points = screen.getAllByTestId('animation-path-point')
    await user.pointer([{ target: points[0], keys: '[MouseRight]' }])

    expect(screen.getByRole('menuitem', { name: 'Delete Point' })).toBeDisabled()
  })
})
