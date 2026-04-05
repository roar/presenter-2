import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createAppearance, createMsoMaster, createTextContent } from '@shared/model/factories'
import { TextView } from './TextView'

function makeTextMaster(text = 'Text'): ReturnType<typeof createMsoMaster> {
  const master = createMsoMaster('text')
  master.transform = { x: 120, y: 140, width: 480, height: 160, rotation: 0 }
  master.content = { type: 'text', value: createTextContent(text) }
  master.textStyle = {
    defaultState: { fontSize: 32, fontWeight: 400, color: '#ffffff' },
    namedStates: {}
  }
  return master
}

describe('TextView', () => {
  it('renders text content on the canvas', () => {
    const master = makeTextMaster('Hello editor')
    const appearance = createAppearance(master.id, 'slide-1')

    const { container } = render(<TextView master={master} appearance={appearance} />)

    expect(container.querySelector('p')?.textContent).toBe('Hello editor')
  })

  it('respects the appearance visibility when no rendered appearance is provided', () => {
    const master = makeTextMaster()
    const appearance = createAppearance(master.id, 'slide-1')
    appearance.initialVisibility = 'hidden'

    const { container } = render(<TextView master={master} appearance={appearance} />)

    expect((container.firstElementChild as HTMLDivElement).style.visibility).toBe('hidden')
  })

  it('applies the text box style to the rendered content', () => {
    const master = makeTextMaster('Styled text')
    const appearance = createAppearance(master.id, 'slide-1')

    render(<TextView master={master} appearance={appearance} />)

    const paragraph = screen.getByText('Styled text').closest('p')
    expect(paragraph).not.toBeNull()
    expect((paragraph?.parentElement as HTMLDivElement).style.fontSize).toBe('32px')
    expect((paragraph?.parentElement as HTMLDivElement).style.color).toBe('rgb(255, 255, 255)')
  })

  it('marks the text view when it is in text editing mode', () => {
    const master = makeTextMaster('Editing text')
    const appearance = createAppearance(master.id, 'slide-1')

    render(<TextView master={master} appearance={appearance} isEditing />)

    expect(screen.getByTestId('text-view')).toHaveAttribute('data-text-editing', 'true')
  })
})
