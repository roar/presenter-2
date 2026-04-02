import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { RenderedSlide } from '@shared/animation/types'
import { ThumbnailCard } from './ThumbnailCard'

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

function makeRenderedSlide(): RenderedSlide {
  return {
    slide: { id: 's1', appearanceIds: [], animationOrder: [], background: {} },
    appearances: []
  }
}

describe('ThumbnailCard', () => {
  it('renders the slide number', () => {
    render(
      <ThumbnailCard
        slideNumber={3}
        isSelected={false}
        renderedSlide={makeRenderedSlide()}
        transitionTrigger="none"
        onClick={vi.fn()}
      />
    )
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders the thumbnail inside a card with a header line', () => {
    render(
      <ThumbnailCard
        slideNumber={2}
        isSelected={false}
        renderedSlide={makeRenderedSlide()}
        transitionTrigger="none"
        onClick={vi.fn()}
      />
    )

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
  })

  it('marks as current when selected', () => {
    render(
      <ThumbnailCard
        slideNumber={1}
        isSelected={true}
        renderedSlide={makeRenderedSlide()}
        transitionTrigger="none"
        onClick={vi.fn()}
      />
    )
    expect(screen.getByText('1').closest('[data-selected="true"]')).toHaveAttribute(
      'data-selected',
      'true'
    )
  })

  it('does not mark as current when not selected', () => {
    render(
      <ThumbnailCard
        slideNumber={1}
        isSelected={false}
        renderedSlide={makeRenderedSlide()}
        transitionTrigger="none"
        onClick={vi.fn()}
      />
    )
    expect(screen.getByText('1').closest('[data-selected="true"]')).toBeNull()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <ThumbnailCard
        slideNumber={1}
        isSelected={false}
        renderedSlide={makeRenderedSlide()}
        transitionTrigger="none"
        onClick={onClick}
      />
    )
    await user.click(screen.getByRole('button', { name: '1' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('shows a delete slide context menu item on right-click', async () => {
    const user = userEvent.setup()
    render(
      <ThumbnailCard
        slideNumber={1}
        isSelected={false}
        renderedSlide={makeRenderedSlide()}
        transitionTrigger="none"
        onClick={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    await user.pointer({ keys: '[MouseRight]', target: screen.getByRole('button', { name: '1' }) })

    expect(screen.getByRole('menuitem', { name: 'Delete slide' })).toBeInTheDocument()
  })

  it('calls onDelete from the context menu', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()

    render(
      <ThumbnailCard
        slideNumber={1}
        isSelected={false}
        renderedSlide={makeRenderedSlide()}
        transitionTrigger="none"
        onClick={vi.fn()}
        onDelete={onDelete}
      />
    )

    await user.pointer({ keys: '[MouseRight]', target: screen.getByRole('button', { name: '1' }) })
    await user.click(screen.getByRole('menuitem', { name: 'Delete slide' }))

    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('renders the slide transition controls beneath the thumbnail', () => {
    render(
      <ThumbnailCard
        slideNumber={1}
        isSelected={false}
        renderedSlide={makeRenderedSlide()}
        transitionTrigger="on-click"
        transition={{ kind: 'dissolve', duration: 0.75, easing: 'ease-out' }}
        onClick={vi.fn()}
      />
    )

    expect(screen.getByText('Transition')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'On click' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Transition duration' })).toHaveValue('0.75')
    expect(screen.getByRole('button', { name: 'Ease out' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dissolve' })).toBeInTheDocument()
  })
})
