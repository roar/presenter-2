import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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

    const textView = screen.getByTestId('text-view')
    expect(textView).toHaveAttribute('data-text-editing', 'true')
    expect(textView).toHaveStyle({
      outline: '2px solid #0a84ff',
      outlineOffset: '4px'
    })
  })

  it('renders override content when present', () => {
    const master = makeTextMaster('Persisted text')
    const appearance = createAppearance(master.id, 'slide-1')

    render(
      <TextView
        master={master}
        appearance={appearance}
        contentOverride={createTextContent('Draft text')}
      />
    )

    expect(screen.getByText('Draft text')).toBeInTheDocument()
    expect(screen.queryByText('Persisted text')).not.toBeInTheDocument()
  })

  it('renders a textbox overlay in edit mode and updates draft content on input', async () => {
    const user = userEvent.setup()
    const master = makeTextMaster('Persisted text')
    const appearance = createAppearance(master.id, 'slide-1')
    const onEditContentChange = vi.fn()

    render(
      <TextView
        master={master}
        appearance={appearance}
        isEditing
        contentOverride={createTextContent('Draft text')}
        onEditContentChange={onEditContentChange}
      />
    )

    const textbox = screen.getByRole('textbox', { name: 'Edit text' })
    await user.clear(textbox)
    await user.type(textbox, 'Ny tekst{enter}Neste linje')

    expect(onEditContentChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        blocks: [
          expect.objectContaining({
            runs: [expect.objectContaining({ text: 'Ny tekst' })]
          }),
          expect.objectContaining({
            runs: [expect.objectContaining({ text: 'Neste linje' })]
          })
        ]
      })
    )
  })

  it('commits editing on blur', async () => {
    const user = userEvent.setup()
    const master = makeTextMaster('Persisted text')
    const appearance = createAppearance(master.id, 'slide-1')
    const onCommitEdit = vi.fn()

    render(
      <>
        <TextView master={master} appearance={appearance} isEditing onCommitEdit={onCommitEdit} />
        <button type="button">Outside</button>
      </>
    )

    await user.click(screen.getByRole('textbox', { name: 'Edit text' }))
    await user.click(screen.getByRole('button', { name: 'Outside' }))

    expect(onCommitEdit).toHaveBeenCalledTimes(1)
  })

  it('commits editing on Ctrl+Enter', async () => {
    const user = userEvent.setup()
    const master = makeTextMaster('Persisted text')
    const appearance = createAppearance(master.id, 'slide-1')
    const onCommitEdit = vi.fn()

    render(
      <TextView master={master} appearance={appearance} isEditing onCommitEdit={onCommitEdit} />
    )

    await user.click(screen.getByRole('textbox', { name: 'Edit text' }))
    await user.keyboard('{Control>}{Enter}{/Control}')

    expect(onCommitEdit).toHaveBeenCalledTimes(1)
  })
})
