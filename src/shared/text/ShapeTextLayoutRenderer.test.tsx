import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ShapeTextLayoutRenderer } from './ShapeTextLayoutRenderer'

describe('ShapeTextLayoutRenderer', () => {
  it('renders each line at its explicit x and y position', () => {
    render(
      <ShapeTextLayoutRenderer
        lines={[
          {
            blockId: 'b1',
            text: 'Top',
            x: 20,
            y: 0,
            width: 30,
            height: 20,
            trackWidth: 100,
            fragments: [
              {
                kind: 'content',
                blockId: 'b1',
                runId: 'r1',
                startOffset: 0,
                endOffset: 3,
                text: 'Top',
                x: 20,
                y: 0,
                width: 30,
                height: 20,
                marks: [],
                decorationKinds: []
              }
            ]
          },
          {
            blockId: 'b2',
            text: 'Middle',
            x: 10,
            y: 20,
            width: 60,
            height: 20,
            trackWidth: 120,
            fragments: [
              {
                kind: 'content',
                blockId: 'b2',
                runId: 'r2',
                startOffset: 0,
                endOffset: 6,
                text: 'Middle',
                x: 10,
                y: 20,
                width: 60,
                height: 20,
                marks: [],
                decorationKinds: []
              }
            ]
          }
        ]}
      />
    )

    expect(screen.getByText('Top').parentElement).toHaveStyle({ left: '20px', top: '0px' })
    expect(screen.getByText('Middle').parentElement).toHaveStyle({ left: '10px', top: '20px' })
  })

  it('renders mark and decoration styling through fragment metadata', () => {
    render(
      <ShapeTextLayoutRenderer
        lines={[
          {
            blockId: 'b1',
            text: 'Bold world',
            x: 0,
            y: 0,
            width: 100,
            height: 20,
            trackWidth: 120,
            fragments: [
              {
                kind: 'content',
                blockId: 'b1',
                runId: 'r1',
                startOffset: 0,
                endOffset: 4,
                text: 'Bold',
                x: 0,
                y: 0,
                width: 40,
                height: 20,
                marks: [{ type: 'bold' }],
                decorationKinds: []
              },
              {
                kind: 'content',
                blockId: 'b1',
                runId: 'r2',
                startOffset: 0,
                endOffset: 5,
                text: ' world',
                x: 40,
                y: 0,
                width: 60,
                height: 20,
                marks: [],
                decorationKinds: ['highlight']
              }
            ]
          }
        ]}
      />
    )

    expect(screen.getByText('Bold').style.fontWeight).toBe('700')
    expect(screen.getByText(/world/).style.backgroundColor).toBe('rgba(255, 230, 0, 0.45)')
  })
})
