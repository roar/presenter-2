import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RenderedAppearance } from '@shared/animation/types'
import { createAppearance, createMsoMaster, createTextContent } from '@shared/model/factories'
import { ObjectCard } from './ObjectCard'

function makeRenderedAppearance(): RenderedAppearance {
  const master = createMsoMaster('text')
  master.name = 'Airplane'
  master.transform = { x: 100, y: 50, width: 300, height: 120, rotation: 0 }
  master.content = { type: 'text', value: createTextContent('Airplane') }
  master.textStyle = { defaultState: { fontSize: 24, color: '#fff' }, namedStates: {} }

  return {
    appearance: createAppearance(master.id, 'slide-1'),
    master,
    visible: true,
    opacity: 1,
    transform: 'translate(0px, 0px)',
    textShadow: null,
    strokeDashoffset: null
  }
}

describe('ObjectCard', () => {
  it('renders the object name as the card header', () => {
    render(
      <ObjectCard objectName="Airplane" rendered={makeRenderedAppearance()} isSelected={false} />
    )

    expect(screen.getAllByText('Airplane').length).toBeGreaterThan(0)
  })

  it('renders an object preview image area', () => {
    render(
      <ObjectCard objectName="Airplane" rendered={makeRenderedAppearance()} isSelected={false} />
    )

    expect(screen.getByRole('img', { name: 'Airplane preview' })).toBeInTheDocument()
  })

  it('calls onClick when selected from the objects panel', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <ObjectCard
        objectName="Airplane"
        rendered={makeRenderedAppearance()}
        isSelected={false}
        onClick={onClick}
      />
    )

    await user.click(screen.getByRole('img', { name: 'Airplane preview' }))

    expect(onClick).toHaveBeenCalledOnce()
  })
})
