import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  createAppearance,
  createMsoMaster,
  createPresentation,
  createSlide
} from '@shared/model/factories'
import { ensurePresentationColorConstants } from '@shared/model/colors'
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
  shapeMaster.textStyle = {
    defaultState: {
      fontFamily: 'Helvetica Neue',
      fontSize: 32,
      fontWeight: 700,
      color: '#3366ff',
      textShadow: { offsetX: 2, offsetY: 4, blur: 6, color: '#111111' }
    },
    namedStates: {}
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
  ensurePresentationColorConstants(document)

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

    expect(screen.getByRole('tab', { name: 'Properties' })).toHaveAttribute(
      'aria-selected',
      'true'
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

  it('shows object style cards in the object tab when an object is selected', async () => {
    const user = userEvent.setup()
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

    await user.click(screen.getByRole('tab', { name: 'Object' }))

    expect(screen.getByRole('tab', { name: 'Object' })).toHaveAttribute('aria-selected', 'true')
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

  it('shows text styles in the text tab', async () => {
    const user = userEvent.setup()
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

    await user.click(screen.getByRole('tab', { name: 'Text' }))

    expect(screen.getByRole('button', { name: 'Text' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Typography')).toBeInTheDocument()
    expect(screen.getByText('Effects')).toBeInTheDocument()
  })

  it('shows derived color constants in the colors tab', async () => {
    const user = userEvent.setup()
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

    await user.click(screen.getByRole('tab', { name: 'Colors' }))

    expect(screen.getByRole('tab', { name: 'Colors' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByDisplayValue('#ff0000')).toBeInTheDocument()
  })

  it('shows the selected named color beside the object fill field', async () => {
    const user = userEvent.setup()
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

    await user.click(screen.getByRole('tab', { name: 'Object' }))

    expect(screen.getAllByText('Color 2')).toHaveLength(2)
  })

  it('uses the registry color picker for slide background selection', async () => {
    const user = userEvent.setup()
    const { document, slideId } = makeDocument()
    const onSlideBackgroundColorChange = vi.fn()
    const colorConstants = Object.values(document.colorConstantsById ?? {})
    const secondColor = colorConstants.find((color) => color.name === 'Color 2')
    if (!secondColor) {
      throw new Error('Expected second color constant')
    }

    render(
      <PropertiesPanel
        document={document}
        selectedSlide={document.slidesById[slideId]}
        selectedSlideIndex={0}
        selectedMaster={null}
        selectedAnimation={null}
        selectedAnimationObjectName="Object"
        onSlideBackgroundColorChange={onSlideBackgroundColorChange}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Color 1' }))
    await user.click(screen.getByRole('menuitem', { name: 'Color 2' }))

    expect(onSlideBackgroundColorChange).toHaveBeenCalledWith(slideId, {
      kind: 'constant',
      colorId: secondColor.id
    })
  })

  it('deletes an in-use named color after confirmation', async () => {
    const user = userEvent.setup()
    const { document, slideId, shapeMasterId } = makeDocument()
    const onDeleteColorConstant = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <PropertiesPanel
        document={document}
        selectedSlide={document.slidesById[slideId]}
        selectedSlideIndex={0}
        selectedMaster={document.mastersById[shapeMasterId]}
        selectedAnimation={null}
        selectedAnimationObjectName="Object"
        onDeleteColorConstant={onDeleteColorConstant}
      />
    )

    await user.click(screen.getByRole('tab', { name: 'Colors' }))
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])

    expect(window.confirm).toHaveBeenCalled()
    expect(onDeleteColorConstant).toHaveBeenCalled()
  })
})
