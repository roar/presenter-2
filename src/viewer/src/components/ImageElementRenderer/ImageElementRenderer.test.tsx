import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ImageElementRenderer } from './ImageElementRenderer'
import type { RenderedAppearance } from '@shared/animation/types'
import type { MsoMaster } from '@shared/model/types'
import { createAppearance, createMsoMaster } from '@shared/model/factories'

function makeMaster(): MsoMaster {
  const m = createMsoMaster('image')
  m.transform = { x: 0, y: 0, width: 200, height: 150, rotation: 0 }
  m.content = { type: 'image', src: '/assets/photo.jpg' }
  return m
}

function makeRendered(overrides: Partial<RenderedAppearance> = {}): RenderedAppearance {
  const master = makeMaster()
  return {
    master,
    appearance: createAppearance(master.id, 'slide-1'),
    visible: true,
    opacity: 1,
    transform: 'translate(0px, 0px)',
    textShadow: null,
    strokeDashoffset: null,
    ...overrides
  }
}

describe('ImageElementRenderer', () => {
  it('renders an img with the correct src', () => {
    const { container } = render(<ImageElementRenderer rendered={makeRendered()} />)
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.src).toContain('/assets/photo.jpg')
  })

  it('is hidden when visible is false', () => {
    const { container } = render(
      <ImageElementRenderer rendered={makeRendered({ visible: false })} />
    )
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.style.visibility).toBe('hidden')
  })

  it('applies opacity', () => {
    const { container } = render(<ImageElementRenderer rendered={makeRendered({ opacity: 0.3 })} />)
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.style.opacity).toBe('0.3')
  })
})
