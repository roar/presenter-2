import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TextElementRenderer } from './TextElementRenderer'
import type { TextElement } from '@shared/model/types'
import type { RenderedElement } from '@shared/animation/types'

function makeElement(overrides: Partial<TextElement> = {}): TextElement {
  return {
    kind: 'text',
    id: 'el-1',
    x: 100,
    y: 200,
    width: 400,
    height: 100,
    rotation: 0,
    content: 'Hello world',
    fontSize: 32,
    fontWeight: 400,
    color: '#ffffff',
    align: 'left',
    ...overrides
  }
}

function makeState(overrides: Partial<RenderedElement> = {}): RenderedElement {
  return {
    element: makeElement(),
    visible: true,
    opacity: 1,
    transform: 'translate(0px, 0px)',
    textShadow: null,
    strokeDashoffset: null,
    ...overrides
  }
}

describe('TextElementRenderer', () => {
  it('renders the element content', () => {
    render(<TextElementRenderer element={makeElement()} state={makeState()} />)
    expect(screen.getByText('Hello world')).toBeDefined()
  })

  it('is hidden when state.visible is false', () => {
    render(<TextElementRenderer element={makeElement()} state={makeState({ visible: false })} />)
    const el = screen.getByText('Hello world')
    expect(el.style.visibility).toBe('hidden')
  })

  it('applies opacity from state', () => {
    render(<TextElementRenderer element={makeElement()} state={makeState({ opacity: 0.5 })} />)
    const el = screen.getByText('Hello world')
    expect(el.style.opacity).toBe('0.5')
  })
})
