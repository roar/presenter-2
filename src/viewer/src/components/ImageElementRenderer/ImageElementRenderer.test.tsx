import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ImageElementRenderer } from './ImageElementRenderer'
import type { ImageElement } from '@shared/model/types'
import type { RenderedElement } from '@shared/animation/types'

function makeElement(overrides: Partial<ImageElement> = {}): ImageElement {
  return {
    kind: 'image',
    id: 'img-1',
    x: 0,
    y: 0,
    width: 200,
    height: 150,
    rotation: 0,
    src: '/assets/photo.jpg',
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

describe('ImageElementRenderer', () => {
  it('renders an img with the correct src', () => {
    const { container } = render(
      <ImageElementRenderer element={makeElement()} state={makeState()} />
    )
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.src).toContain('/assets/photo.jpg')
  })

  it('is hidden when state.visible is false', () => {
    const { container } = render(
      <ImageElementRenderer element={makeElement()} state={makeState({ visible: false })} />
    )
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.style.visibility).toBe('hidden')
  })

  it('applies opacity from state', () => {
    const { container } = render(
      <ImageElementRenderer element={makeElement()} state={makeState({ opacity: 0.3 })} />
    )
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.style.opacity).toBe('0.3')
  })
})
