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
    textDecorations: undefined,
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
    const { container } = render(<TextElementRenderer rendered={makeRendered()} />)
    expect(container.querySelector('p')?.textContent).toBe('Hello world')
  })

  it('renders rich text marks and list prefixes through the shared text renderer', () => {
    const master = makeMaster()
    master.content = {
      type: 'text',
      value: {
        blocks: [
          {
            id: 'b1',
            list: { kind: 'bulleted' },
            runs: [
              { id: 'r1', text: 'Bold', marks: [{ type: 'bold' }] },
              { id: 'r2', text: ' item', marks: [{ type: 'color', value: '#00ff00' }] }
            ]
          }
        ]
      }
    }

    const { container } = render(<TextElementRenderer rendered={makeRendered({ master })} />)

    expect(container.querySelector('p')?.textContent).toBe('• Bold item')
    expect(screen.getByText('Bold').style.fontWeight).toBe('700')
    expect(screen.getByText(/item/).style.color).toBe('rgb(0, 255, 0)')
  })

  it('renders persisted text decorations through the shared text renderer', () => {
    const master = makeMaster()
    master.content = {
      type: 'text',
      value: {
        blocks: [
          {
            id: 'b1',
            list: { kind: 'none' },
            runs: [
              { id: 'r1', text: 'Hello ', marks: [] },
              { id: 'r2', text: 'world', marks: [] }
            ]
          }
        ]
      }
    }

    render(
      <TextElementRenderer
        rendered={makeRendered({
          master,
          textDecorations: [
            {
              id: 'd1',
              kind: 'highlight',
              range: {
                start: { blockId: 'b1', runId: 'r2', offset: 0 },
                end: { blockId: 'b1', runId: 'r2', offset: 5 }
              }
            }
          ]
        })}
      />
    )

    expect(screen.getByText('world').style.backgroundColor).toBe('rgba(255, 230, 0, 0.45)')
  })

  it('is hidden when visible is false', () => {
    const { container } = render(
      <TextElementRenderer rendered={makeRendered({ visible: false })} />
    )
    const wrapper = container.firstElementChild as HTMLDivElement
    expect(wrapper.style.visibility).toBe('hidden')
  })

  it('applies opacity', () => {
    const { container } = render(<TextElementRenderer rendered={makeRendered({ opacity: 0.5 })} />)
    const wrapper = container.firstElementChild as HTMLDivElement
    expect(wrapper.style.opacity).toBe('0.5')
  })

  it('keeps rotation centered after animation translation', () => {
    const master = makeMaster()
    master.transform.rotation = 30

    const { container } = render(
      <TextElementRenderer
        rendered={makeRendered({ master, transform: 'translate(12px, 18px)' })}
      />
    )
    const wrapper = container.firstElementChild as HTMLDivElement

    expect(wrapper.style.transform).toBe('translate(12px, 18px) rotate(30deg)')
    expect(wrapper.style.transformOrigin).toBe('center center')
  })
})
