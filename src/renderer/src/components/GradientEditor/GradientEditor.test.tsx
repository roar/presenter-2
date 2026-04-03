import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GradientEditor } from './GradientEditor'
import type { GradientValue } from './GradientEditor'

function makeLinearGradient(): GradientValue {
  return {
    kind: 'linear',
    angle: 90,
    stops: [
      { id: 'stop-1', offset: 0, color: '#ffffff' },
      { id: 'stop-2', offset: 0.4, color: '#c62828' },
      { id: 'stop-3', offset: 1, color: '#000000' }
    ]
  }
}

describe('GradientEditor', () => {
  it('renders a linear gradient preview from the value', () => {
    render(<GradientEditor value={makeLinearGradient()} onChange={() => {}} />)

    expect(screen.getByLabelText('Gradient preview').firstElementChild).toHaveStyle({
      background: 'linear-gradient(90deg, #ffffff 0%, #c62828 40%, #000000 100%)'
    })
  })

  it('renders a linear gradient angle control', () => {
    render(<GradientEditor value={makeLinearGradient()} onChange={() => {}} />)

    expect(screen.getByLabelText('Gradient angle')).toHaveValue('90')
  })

  it('updates the linear gradient angle', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<GradientEditor value={makeLinearGradient()} onChange={onChange} />)

    const input = screen.getByLabelText('Gradient angle')
    await user.clear(input)
    await user.type(input, '45')
    fireEvent.blur(input)

    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'linear',
      angle: 45,
      stops: [
        { id: 'stop-1', offset: 0, color: '#ffffff' },
        { id: 'stop-2', offset: 0.4, color: '#c62828' },
        { id: 'stop-3', offset: 1, color: '#000000' }
      ]
    })
  })

  it('updates the selected stop color', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<GradientEditor value={makeLinearGradient()} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Gradient stop 2' }))
    fireEvent.change(screen.getByLabelText('Selected stop color'), {
      target: { value: '#123456' }
    })

    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'linear',
      angle: 90,
      stops: [
        { id: 'stop-1', offset: 0, color: '#ffffff' },
        { id: 'stop-2', offset: 0.4, color: '#123456' },
        { id: 'stop-3', offset: 1, color: '#000000' }
      ]
    })
  })

  it('opens the color picker when clicking a handle', async () => {
    const user = userEvent.setup()
    const showPicker = vi.fn()

    const originalShowPicker = HTMLInputElement.prototype.showPicker
    HTMLInputElement.prototype.showPicker = showPicker

    try {
      render(<GradientEditor value={makeLinearGradient()} onChange={() => {}} />)

      await user.click(screen.getByRole('button', { name: 'Gradient stop 2' }))

      expect(showPicker).toHaveBeenCalledTimes(1)
      expect(screen.getByLabelText('Selected stop color')).toHaveValue('#c62828')
    } finally {
      HTMLInputElement.prototype.showPicker = originalShowPicker
    }
  })

  it('does not open the color picker when a handle is dragged', () => {
    const showPicker = vi.fn()

    const originalShowPicker = HTMLInputElement.prototype.showPicker
    HTMLInputElement.prototype.showPicker = showPicker

    try {
      render(<GradientEditor value={makeLinearGradient()} onChange={() => {}} />)

      const preview = screen.getByLabelText('Gradient preview')
      vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 300,
        bottom: 80,
        width: 300,
        height: 80,
        toJSON: () => ({})
      })

      const stop = screen.getByRole('button', { name: 'Gradient stop 2' })
      fireEvent.mouseDown(stop, { clientX: 120, clientY: 70 })
      fireEvent.mouseMove(window, { clientX: 225, clientY: 70 })
      fireEvent.mouseUp(window, { clientX: 225, clientY: 70 })
      fireEvent.click(stop)

      expect(showPicker).not.toHaveBeenCalled()
    } finally {
      HTMLInputElement.prototype.showPicker = originalShowPicker
    }
  })

  it('drags a stop along the gradient track', () => {
    const onChange = vi.fn()

    render(<GradientEditor value={makeLinearGradient()} onChange={onChange} />)

    const preview = screen.getByLabelText('Gradient preview')
    vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 300,
      bottom: 80,
      width: 300,
      height: 80,
      toJSON: () => ({})
    })

    const stop = screen.getByRole('button', { name: 'Gradient stop 2' })
    fireEvent.mouseDown(stop, { clientX: 120, clientY: 70 })
    fireEvent.mouseMove(window, { clientX: 225, clientY: 70 })
    fireEvent.mouseUp(window, { clientX: 225, clientY: 70 })

    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'linear',
      angle: 90,
      stops: [
        { id: 'stop-1', offset: 0, color: '#ffffff' },
        { id: 'stop-2', offset: 0.75, color: '#c62828' },
        { id: 'stop-3', offset: 1, color: '#000000' }
      ]
    })
  })

  it('does not move the first stop', () => {
    const onChange = vi.fn()

    render(<GradientEditor value={makeLinearGradient()} onChange={onChange} />)

    const preview = screen.getByLabelText('Gradient preview')
    vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 300,
      bottom: 80,
      width: 300,
      height: 80,
      toJSON: () => ({})
    })

    const stop = screen.getByRole('button', { name: 'Gradient stop 1' })
    fireEvent.mouseDown(stop, { clientX: 0, clientY: 70 })
    fireEvent.mouseMove(window, { clientX: 120, clientY: 70 })
    fireEvent.mouseUp(window, { clientX: 120, clientY: 70 })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('reverses the gradient stops', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<GradientEditor value={makeLinearGradient()} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Reverse gradient' }))

    expect(onChange).toHaveBeenCalledWith({
      kind: 'linear',
      angle: 90,
      stops: [
        { id: 'stop-3', offset: 0, color: '#000000' },
        { id: 'stop-2', offset: 0.6, color: '#c62828' },
        { id: 'stop-1', offset: 1, color: '#ffffff' }
      ]
    })
  })

  it('shows a shadow handle in the stop lane and creates a stop when clicked', async () => {
    const onChange = vi.fn()

    render(<GradientEditor value={makeLinearGradient()} onChange={onChange} />)

    const preview = screen.getByLabelText('Gradient preview')
    vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 300,
      bottom: 110,
      width: 300,
      height: 110,
      toJSON: () => ({})
    })

    fireEvent.mouseMove(preview, { clientX: 180, clientY: 90 })

    const shadowHandle = screen.getByRole('button', { name: 'New gradient stop' })
    fireEvent.click(shadowHandle)

    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'linear',
      angle: 90,
      stops: [
        { id: 'stop-1', offset: 0, color: '#ffffff' },
        { id: 'stop-2', offset: 0.4, color: '#c62828' },
        { id: expect.any(String), offset: 0.6, color: '#841b1b' },
        { id: 'stop-3', offset: 1, color: '#000000' }
      ]
    })
  })

  it('does not show a shadow handle when hovering near an existing stop', () => {
    render(<GradientEditor value={makeLinearGradient()} onChange={() => {}} />)

    const preview = screen.getByLabelText('Gradient preview')
    vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 300,
      bottom: 110,
      width: 300,
      height: 110,
      toJSON: () => ({})
    })

    fireEvent.mouseMove(preview, { clientX: 120, clientY: 90 })

    expect(screen.queryByRole('button', { name: 'New gradient stop' })).not.toBeInTheDocument()
  })

  it('deletes a stop when it is dragged outside the control', () => {
    const onChange = vi.fn()

    render(<GradientEditor value={makeLinearGradient()} onChange={onChange} />)

    const preview = screen.getByLabelText('Gradient preview')
    vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 300,
      bottom: 80,
      width: 300,
      height: 80,
      toJSON: () => ({})
    })

    const stop = screen.getByRole('button', { name: 'Gradient stop 2' })
    fireEvent.mouseDown(stop, { clientX: 120, clientY: 70 })
    fireEvent.mouseMove(window, { clientX: -40, clientY: 70 })
    fireEvent.mouseUp(window, { clientX: -40, clientY: 70 })

    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'linear',
      angle: 90,
      stops: [
        { id: 'stop-1', offset: 0, color: '#ffffff' },
        { id: 'stop-3', offset: 1, color: '#000000' }
      ]
    })
  })

  it('deletes a stop when it is dragged onto the first fixed stop', () => {
    const onChange = vi.fn()

    render(<GradientEditor value={makeLinearGradient()} onChange={onChange} />)

    const preview = screen.getByLabelText('Gradient preview')
    vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 300,
      bottom: 80,
      width: 300,
      height: 80,
      toJSON: () => ({})
    })

    const stop = screen.getByRole('button', { name: 'Gradient stop 2' })
    fireEvent.mouseDown(stop, { clientX: 120, clientY: 70 })
    fireEvent.mouseMove(window, { clientX: 0, clientY: 70 })
    fireEvent.mouseUp(window, { clientX: 0, clientY: 70 })

    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'linear',
      angle: 90,
      stops: [
        { id: 'stop-1', offset: 0, color: '#ffffff' },
        { id: 'stop-3', offset: 1, color: '#000000' }
      ]
    })
  })

  it('deletes a stop when it is dragged onto the last fixed stop', () => {
    const onChange = vi.fn()

    render(<GradientEditor value={makeLinearGradient()} onChange={onChange} />)

    const preview = screen.getByLabelText('Gradient preview')
    vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 300,
      bottom: 80,
      width: 300,
      height: 80,
      toJSON: () => ({})
    })

    const stop = screen.getByRole('button', { name: 'Gradient stop 2' })
    fireEvent.mouseDown(stop, { clientX: 120, clientY: 70 })
    fireEvent.mouseMove(window, { clientX: 300, clientY: 70 })
    fireEvent.mouseUp(window, { clientX: 300, clientY: 70 })

    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'linear',
      angle: 90,
      stops: [
        { id: 'stop-1', offset: 0, color: '#ffffff' },
        { id: 'stop-3', offset: 1, color: '#000000' }
      ]
    })
  })

  it('does not delete the last stop when dragged outside the control', () => {
    const onChange = vi.fn()

    render(<GradientEditor value={makeLinearGradient()} onChange={onChange} />)

    const preview = screen.getByLabelText('Gradient preview')
    vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 300,
      bottom: 80,
      width: 300,
      height: 80,
      toJSON: () => ({})
    })

    const stop = screen.getByRole('button', { name: 'Gradient stop 3' })
    fireEvent.mouseDown(stop, { clientX: 300, clientY: 70 })
    fireEvent.mouseMove(window, { clientX: 360, clientY: 70 })
    fireEvent.mouseUp(window, { clientX: 360, clientY: 70 })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('switches to circular gradient without showing radial numeric controls', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<GradientEditor value={makeLinearGradient()} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Linear' }))
    await user.click(screen.getByRole('menuitem', { name: 'Circular' }))

    expect(onChange).toHaveBeenCalledWith({
      kind: 'radial',
      centerX: 50,
      centerY: 50,
      radius: 50,
      stops: [
        { id: 'stop-1', offset: 0, color: '#ffffff' },
        { id: 'stop-2', offset: 0.4, color: '#c62828' },
        { id: 'stop-3', offset: 1, color: '#000000' }
      ]
    })
    expect(screen.queryByLabelText('Gradient center x')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Gradient center y')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Gradient radius')).not.toBeInTheDocument()
  })

  it('uses the same strip preview for circular gradients', () => {
    render(
      <GradientEditor
        value={{
          kind: 'radial',
          centerX: 50,
          centerY: 50,
          radius: 50,
          stops: [
            { id: 'stop-1', offset: 0, color: '#ffffff' },
            { id: 'stop-2', offset: 0.4, color: '#c62828' },
            { id: 'stop-3', offset: 1, color: '#000000' }
          ]
        }}
        onChange={() => {}}
      />
    )

    expect(screen.getByLabelText('Gradient preview').firstElementChild).toHaveStyle({
      background: 'linear-gradient(90deg, #ffffff 0%, #c62828 40%, #000000 100%)'
    })
  })
})
