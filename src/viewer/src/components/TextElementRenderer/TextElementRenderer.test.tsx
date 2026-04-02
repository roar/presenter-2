import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TextElementRenderer } from './TextElementRenderer'
import type { RenderedAppearance } from '@shared/animation/types'
import type { MsoMaster, Appearance } from '@shared/model/types'
import { createAppearance, createMsoMaster, createTextContent } from '@shared/model/factories'

function makeMaster(text = 'Hello world'): MsoMaster {
  const m = createMsoMaster('text')
  m.transform = { x: 100, y: 200, width: 400, height: 100, rotation: 0 }
  m.content = { type: 'text', value: createTextContent(text) }
  m.textStyle = {
    defaultState: { fontSize: 32, fontWeight: 400, color: '#ffffff' },
    namedStates: {}
  }
  return m
}

function makeAppearance(masterId: string): Appearance {
  return createAppearance(masterId, 'slide-1')
}

function makeRendered(overrides: Partial<RenderedAppearance> = {}): RenderedAppearance {
  const master = makeMaster()
  const appearance = makeAppearance(master.id)
  return {
    master,
    appearance,
    visible: true,
    opacity: 1,
    transform: 'translate(0px, 0px)',
    textShadow: null,
    strokeDashoffset: null,
    ...overrides
  }
}

describe('TextElementRenderer', () => {
  it('renders the text content', () => {
    render(<TextElementRenderer rendered={makeRendered()} />)
    expect(screen.getByText('Hello world')).toBeDefined()
  })

  it('is hidden when visible is false', () => {
    render(<TextElementRenderer rendered={makeRendered({ visible: false })} />)
    const el = screen.getByText('Hello world')
    expect(el.parentElement!.style.visibility).toBe('hidden')
  })

  it('applies opacity', () => {
    render(<TextElementRenderer rendered={makeRendered({ opacity: 0.5 })} />)
    const el = screen.getByText('Hello world')
    expect(el.parentElement!.style.opacity).toBe('0.5')
  })
})
