import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  createAppearance,
  createMsoMaster,
  createPresentation,
  createSlide
} from '@shared/model/factories'
import type { Presentation, TargetedAnimation } from '@shared/model/types'
import { PropertiesPanel } from './PropertiesPanel'

function makeDocument(): {
  document: Presentation
  slideId: string
  shapeMasterId: string
  animation: TargetedAnimation
} {
  const document = createPresentation()
  const slide = createSlide()
  slide.background = { color: '#112233' }
  slide.transition = { kind: 'dissolve', duration: 0.75, easing: 'ease-out' }
  slide.transitionTriggerId = 'transition-1'

  const shapeMaster = createMsoMaster('shape')
  shapeMaster.name = 'Airplane'
  shapeMaster.transform = { x: 10, y: 20, width: 100, height: 80, rotation: 15 }
  shapeMaster.objectStyle.defaultState = {
    fill: '#ff0000',
    stroke: '#00ff00',
    strokeWidth: 3,
    opacity: 0.8
  }

  const appearance = createAppearance(shapeMaster.id, slide.id)
  const animation: TargetedAnimation = {
    id: 'anim-1',
    trigger: 'on-click',
    offset: 0.25,
    duration: 1,
    easing: 'ease-in-out',
    loop: { kind: 'none' },
    effect: { kind: 'action', type: 'move', delta: { x: 100, y: 50 } },
    target: { kind: 'appearance', appearanceId: appearance.id }
  }

  slide.appearanceIds = [appearance.id]
  slide.animationOrder = [animation.id]

  document.slideOrder = [slide.id]
  document.slidesById[slide.id] = slide
  document.mastersById[shapeMaster.id] = shapeMaster
  document.appearancesById[appearance.id] = appearance
  document.animationsById[animation.id] = animation

  return { document, slideId: slide.id, shapeMasterId: shapeMaster.id, animation }
}

describe('PropertiesPanel', () => {
  it('shows presentation and slide sections, with slide open by default', () => {
    const { document, slideId } = makeDocument()

    render(
      <PropertiesPanel
        document={document}
        selectedSlide={document.slidesById[slideId]}
        selectedSlideIndex={0}
        selectedMaster={null}
        selectedAnimation={null}
        selectedAnimationObjectName="Object"
      />
    )

    expect(screen.getByRole('button', { name: 'Presentation' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    expect(screen.getByRole('button', { name: 'Slide' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Background')).toBeInTheDocument()
    expect(screen.getByText('Transition')).toBeInTheDocument()
  })

  it('keeps only one section open at a time', async () => {
    const user = userEvent.setup()
    const { document, slideId } = makeDocument()

    render(
      <PropertiesPanel
        document={document}
        selectedSlide={document.slidesById[slideId]}
        selectedSlideIndex={0}
        selectedMaster={null}
        selectedAnimation={null}
        selectedAnimationObjectName="Object"
      />
    )

    await user.click(screen.getByRole('button', { name: 'Presentation' }))

    expect(screen.getByRole('button', { name: 'Presentation' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Slide' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows object property cards when an object is selected', () => {
    const { document, slideId, shapeMasterId } = makeDocument()

    render(
      <PropertiesPanel
        document={document}
        selectedSlide={document.slidesById[slideId]}
        selectedSlideIndex={0}
        selectedMaster={document.mastersById[shapeMasterId]}
        selectedAnimation={null}
        selectedAnimationObjectName="Object"
      />
    )

    expect(screen.getByRole('button', { name: 'Object' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Transform')).toBeInTheDocument()
    expect(screen.getByText('Fill')).toBeInTheDocument()
    expect(screen.getByText('Stroke')).toBeInTheDocument()
  })

  it('shows animation property cards when an animation is selected', () => {
    const { document, slideId, animation } = makeDocument()

    render(
      <PropertiesPanel
        document={document}
        selectedSlide={document.slidesById[slideId]}
        selectedSlideIndex={0}
        selectedMaster={null}
        selectedAnimation={animation}
        selectedAnimationObjectName="Airplane"
        onAnimationTriggerChange={vi.fn()}
        onAnimationOffsetChange={vi.fn()}
        onAnimationDurationChange={vi.fn()}
        onAnimationEasingChange={vi.fn()}
        onAnimationNumericToChange={vi.fn()}
        onAnimationMoveDeltaChange={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Animation' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(screen.getByText('Timing')).toBeInTheDocument()
    expect(screen.getByText('Effect')).toBeInTheDocument()
    expect(screen.getByText('Move: Airplane')).toBeInTheDocument()
  })
})
