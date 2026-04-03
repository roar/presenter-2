import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { ImageElementRenderer } from './ImageElementRenderer'
import type { RenderedAppearance } from '@shared/animation/types'
import type { MsoMaster } from '@shared/model/types'
import { createAppearance, createMsoMaster } from '@shared/model/factories'

function makeMaster(): MsoMaster {
  const master = createMsoMaster('image')
  master.transform = { x: 10, y: 20, width: 200, height: 120, rotation: 15 }
  master.content = { type: 'image', src: '/demo.png' }
  return master
}

function makeRendered(overrides: Partial<RenderedAppearance> = {}): RenderedAppearance {
  const master = makeMaster()

  return {
    master,
    appearance: createAppearance(master.id, 'slide-1'),
    visible: true,
    opacity: 1,
    transform: 'translate(24px, 36px)',
    textShadow: null,
    strokeDashoffset: null,
    ...overrides
  }
}

describe('ImageElementRenderer', () => {
  it('applies animation translation before centered rotation', () => {
    const { container } = render(<ImageElementRenderer rendered={makeRendered()} />)
    const image = container.querySelector('img') as HTMLImageElement

    expect(image.style.transform).toBe('translate(24px, 36px) rotate(15deg)')
    expect(image.style.transformOrigin).toBe('center center')
  })
})
