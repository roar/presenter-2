import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ShapeTextFlowRenderer } from './ShapeTextFlowRenderer'

describe('ShapeTextFlowRenderer', () => {
  it('renders each flow line at its explicit x and y position', () => {
    render(
      <ShapeTextFlowRenderer
        lines={[
          { text: 'Top', x: 20, y: 0, width: 30, height: 20, trackWidth: 100 },
          { text: 'Middle', x: 10, y: 20, width: 60, height: 20, trackWidth: 120 }
        ]}
      />
    )

    expect(screen.getByText('Top')).toHaveStyle({ left: '20px', top: '0px' })
    expect(screen.getByText('Middle')).toHaveStyle({ left: '10px', top: '20px' })
  })

  it('does not render overflow text on its own', () => {
    render(
      <ShapeTextFlowRenderer
        lines={[{ text: 'Visible', x: 0, y: 0, width: 50, height: 20, trackWidth: 100 }]}
      />
    )

    expect(screen.getByText('Visible')).toBeInTheDocument()
    expect(screen.queryByText('Overflow')).not.toBeInTheDocument()
  })
})
