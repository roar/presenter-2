import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { TextContent } from '../model/types'
import { TextContentRenderer } from './TextContentRenderer'

function renderContent(content: TextContent) {
  return render(<TextContentRenderer content={content} />)
}

describe('TextContentRenderer', () => {
  it('renders plain block content across runs', () => {
    const { container } = renderContent({
      blocks: [
        {
          id: 'b1',
          list: { kind: 'none' },
          runs: [
            { id: 'r1', text: 'Hello', marks: [] },
            { id: 'r2', text: ' world', marks: [] }
          ]
        }
      ]
    })

    expect(container.querySelector('p')?.textContent).toBe('Hello world')
  })

  it('renders inline mark styling for bold, italic, underline, and color', () => {
    renderContent({
      blocks: [
        {
          id: 'b1',
          list: { kind: 'none' },
          runs: [
            { id: 'r1', text: 'Bold', marks: [{ type: 'bold' }] },
            { id: 'r2', text: ' Italic', marks: [{ type: 'italic' }] },
            { id: 'r3', text: ' Underline', marks: [{ type: 'underline' }] },
            { id: 'r4', text: ' Color', marks: [{ type: 'color', value: '#ff0000' }] }
          ]
        }
      ]
    })

    expect(screen.getByText('Bold').style.fontWeight).toBe('700')
    expect(screen.getByText(/Italic/).style.fontStyle).toBe('italic')
    expect(screen.getByText(/Underline/).style.textDecoration).toBe('underline')
    expect(screen.getByText(/Color/).style.color).toBe('rgb(255, 0, 0)')
  })

  it('renders bullets from block list metadata', () => {
    const { container } = renderContent({
      blocks: [
        {
          id: 'b1',
          list: { kind: 'bulleted' },
          runs: [{ id: 'r1', text: 'First bullet', marks: [] }]
        }
      ]
    })

    expect(container.querySelector('p')?.textContent).toBe('• First bullet')
  })

  it('renders contiguous numbered blocks using derived numbering', () => {
    const { container } = renderContent({
      blocks: [
        {
          id: 'b1',
          list: { kind: 'numbered', start: 3 },
          runs: [{ id: 'r1', text: 'First', marks: [] }]
        },
        {
          id: 'b2',
          list: { kind: 'numbered' },
          runs: [{ id: 'r2', text: 'Second', marks: [] }]
        }
      ]
    })

    const paragraphs = Array.from(container.querySelectorAll('p'))
    expect(paragraphs[0]?.textContent).toBe('3. First')
    expect(paragraphs[1]?.textContent).toBe('4. Second')
  })
})
