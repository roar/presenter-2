import { render, screen, within } from '@testing-library/react'
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

vi.mock('@shared/model/grainCanvas', () => ({
  buildGrainBackgroundImage: () => '',
  getGrainBackgroundSize: () => '100% 100%'
}))

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
  function getPropertyCard(title: string): HTMLElement {
    const card = screen.getByText(title).closest('div')
    if (!card) {
      throw new Error(`Expected property card for ${title}`)
    }
    return card
  }

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

    expect(screen.getByRole('tab', { name: 'Properties' })).toHaveAttribute('aria-selected', 'true')
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
    expect(screen.queryByText('Fill')).not.toBeInTheDocument()
    expect(screen.queryByText('Stroke')).not.toBeInTheDocument()
    expect(screen.queryByText('Transform')).not.toBeInTheDocument()
    expect(screen.getByText('States')).toBeInTheDocument()
  })

  it('commits object transform changes from the object tab', async () => {
    const user = userEvent.setup()
    const onObjectTransformChange = vi.fn()
    const { document, slideId, shapeMasterId } = makeDocument()

    render(
      <PropertiesPanel
        document={document}
        selectedSlide={document.slidesById[slideId]}
        selectedSlideIndex={0}
        selectedMaster={document.mastersById[shapeMasterId]}
        selectedAnimation={null}
        selectedAnimationObjectName="Object"
        onObjectTransformChange={onObjectTransformChange}
      />
    )

    const xInput = screen.getByRole('textbox', { name: 'Transform x' })

    await user.clear(xInput)
    await user.type(xInput, '25')
    await user.tab()

    expect(onObjectTransformChange).toHaveBeenCalledWith(shapeMasterId, { x: 25 })
  })

  it('keeps aspect ratio when width changes and keep ratio is enabled', async () => {
    const user = userEvent.setup()
    const onObjectTransformChange = vi.fn()
    const { document, slideId, shapeMasterId } = makeDocument()

    render(
      <PropertiesPanel
        document={document}
        selectedSlide={document.slidesById[slideId]}
        selectedSlideIndex={0}
        selectedMaster={document.mastersById[shapeMasterId]}
        selectedAnimation={null}
        selectedAnimationObjectName="Object"
        onObjectTransformChange={onObjectTransformChange}
      />
    )

    const widthInput = screen.getByRole('textbox', { name: 'Transform width' })

    await user.clear(widthInput)
    await user.type(widthInput, '200')
    await user.tab()

    expect(onObjectTransformChange).toHaveBeenCalledWith(shapeMasterId, {
      width: 200,
      height: 160
    })
  })

  it('disables ratio locking through the shared checkbox', async () => {
    const user = userEvent.setup()
    const onObjectTransformChange = vi.fn()
    const { document, slideId, shapeMasterId } = makeDocument()

    render(
      <PropertiesPanel
        document={document}
        selectedSlide={document.slidesById[slideId]}
        selectedSlideIndex={0}
        selectedMaster={document.mastersById[shapeMasterId]}
        selectedAnimation={null}
        selectedAnimationObjectName="Object"
        onObjectTransformChange={onObjectTransformChange}
      />
    )

    await user.click(screen.getByRole('checkbox', { name: 'Keep ratio' }))

    const widthInput = screen.getByRole('textbox', { name: 'Transform width' })
    await user.clear(widthInput)
    await user.type(widthInput, '200')
    await user.tab()

    expect(onObjectTransformChange).toHaveBeenCalledWith(shapeMasterId, { width: 200 })
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

  it('renders the custom easing editor for selected slide transitions', () => {
    const { document, slideId } = makeDocument()
    document.slidesById[slideId].transition = {
      kind: 'dissolve',
      duration: 0.75,
      easing: {
        kind: 'curve',
        points: [
          { x: 0, y: 0, kind: 'corner' },
          { x: 1, y: 1, kind: 'corner' }
        ]
      }
    }

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

    expect(screen.getByLabelText('Custom easing curve')).toBeInTheDocument()
  })

  it('renders the custom easing editor for selected animations', () => {
    const { document, slideId, animation } = makeDocument()

    render(
      <PropertiesPanel
        document={document}
        selectedSlide={document.slidesById[slideId]}
        selectedSlideIndex={0}
        selectedMaster={null}
        selectedAnimation={{
          ...animation,
          easing: {
            kind: 'curve',
            points: [
              { x: 0, y: 0, kind: 'corner' },
              { x: 1, y: 1, kind: 'corner' }
            ]
          }
        }}
        selectedAnimationObjectName="Airplane"
        onAnimationTriggerChange={vi.fn()}
        onAnimationOffsetChange={vi.fn()}
        onAnimationDurationChange={vi.fn()}
        onAnimationEasingChange={vi.fn()}
        onAnimationNumericToChange={vi.fn()}
        onAnimationMoveDeltaChange={vi.fn()}
      />
    )

    expect(screen.getByLabelText('Custom easing curve')).toBeInTheDocument()
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

    expect(screen.getAllByText('Color 2')).toHaveLength(2)
  })

  it('lets the fill type switch to no fill from the properties tab', async () => {
    const user = userEvent.setup()
    const onObjectFillChange = vi.fn()
    const { document, slideId, shapeMasterId } = makeDocument()

    render(
      <PropertiesPanel
        document={document}
        selectedSlide={document.slidesById[slideId]}
        selectedSlideIndex={0}
        selectedMaster={document.mastersById[shapeMasterId]}
        selectedAnimation={null}
        selectedAnimationObjectName="Object"
        onObjectFillChange={onObjectFillChange}
      />
    )

    await user.click(within(getPropertyCard('Fill')).getByRole('button', { name: 'Solid Fill' }))
    await user.click(screen.getByRole('menuitem', { name: 'No fill' }))

    expect(onObjectFillChange).toHaveBeenCalledWith(shapeMasterId, undefined)
  })

  it('creates a default linear gradient from the properties tab', async () => {
    const user = userEvent.setup()
    const onObjectFillChange = vi.fn()
    const { document, slideId, shapeMasterId } = makeDocument()

    render(
      <PropertiesPanel
        document={document}
        selectedSlide={document.slidesById[slideId]}
        selectedSlideIndex={0}
        selectedMaster={document.mastersById[shapeMasterId]}
        selectedAnimation={null}
        selectedAnimationObjectName="Object"
        onObjectFillChange={onObjectFillChange}
      />
    )

    await user.click(within(getPropertyCard('Fill')).getByRole('button', { name: 'Solid Fill' }))
    await user.click(screen.getByRole('menuitem', { name: 'Linear Gradient' }))

    const firstColor = Object.values(document.colorConstantsById ?? {}).find(
      (color) => color.value === '#ff0000'
    )
    if (!firstColor) {
      throw new Error('Expected normalized fill constant')
    }

    expect(onObjectFillChange).toHaveBeenCalledWith(shapeMasterId, {
      kind: 'linear-gradient',
      rotation: 90,
      x1: 0.5,
      y1: 0,
      x2: 0.5,
      y2: 1,
      stops: [
        { offset: 0, color: { kind: 'constant', colorId: firstColor.id } },
        { offset: 1, color: '#ffffff' }
      ]
    })
  })

  it('renders the shared gradient editor when the selected object has a gradient fill', () => {
    const { document, slideId, shapeMasterId } = makeDocument()
    const firstColor = Object.values(document.colorConstantsById ?? {}).find(
      (color) => color.value === '#ff0000'
    )
    if (!firstColor) {
      throw new Error('Expected normalized fill constant')
    }

    document.mastersById[shapeMasterId].objectStyle.defaultState.fill = {
      kind: 'linear-gradient',
      rotation: 90,
      x1: 0.5,
      y1: 0,
      x2: 0.5,
      y2: 1,
      stops: [
        { offset: 0, color: { kind: 'constant', colorId: firstColor.id } },
        { offset: 1, color: '#ffffff' }
      ]
    }

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

    expect(screen.getByLabelText('Gradient preview')).toBeInTheDocument()
  })

  it('updates object fill to radial gradient when circular is selected in the gradient editor', async () => {
    const user = userEvent.setup()
    const onObjectFillChange = vi.fn()
    const { document, slideId, shapeMasterId } = makeDocument()
    const firstColor = Object.values(document.colorConstantsById ?? {}).find(
      (color) => color.value === '#ff0000'
    )
    if (!firstColor) {
      throw new Error('Expected normalized fill constant')
    }

    document.mastersById[shapeMasterId].objectStyle.defaultState.fill = {
      kind: 'linear-gradient',
      rotation: 90,
      x1: 0.5,
      y1: 0,
      x2: 0.5,
      y2: 1,
      stops: [
        { offset: 0, color: { kind: 'constant', colorId: firstColor.id } },
        { offset: 1, color: '#ffffff' }
      ]
    }

    render(
      <PropertiesPanel
        document={document}
        selectedSlide={document.slidesById[slideId]}
        selectedSlideIndex={0}
        selectedMaster={document.mastersById[shapeMasterId]}
        selectedAnimation={null}
        selectedAnimationObjectName="Object"
        onObjectFillChange={onObjectFillChange}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Linear' }))
    await user.click(screen.getByRole('menuitem', { name: 'Circular' }))

    expect(onObjectFillChange).toHaveBeenCalledWith(shapeMasterId, {
      kind: 'radial-gradient',
      centerX: 50,
      centerY: 50,
      radius: 50,
      stops: [
        { offset: 0, color: '#ff0000' },
        { offset: 1, color: '#ffffff' }
      ]
    })
  })

  it('updates object grain controls from the properties tab', async () => {
    const user = userEvent.setup()
    const onObjectGrainChange = vi.fn()
    const { document, slideId, shapeMasterId } = makeDocument()

    render(
      <PropertiesPanel
        document={document}
        selectedSlide={document.slidesById[slideId]}
        selectedSlideIndex={0}
        selectedMaster={document.mastersById[shapeMasterId]}
        selectedAnimation={null}
        selectedAnimationObjectName="Object"
        onObjectGrainChange={onObjectGrainChange}
      />
    )

    const fillCard = within(getPropertyCard('Fill'))

    await user.click(fillCard.getByRole('checkbox', { name: 'Texture' }))
    await user.click(fillCard.getByRole('button', { name: 'Paper' }))
    await user.click(screen.getByRole('menuitem', { name: 'Rough' }))

    expect(onObjectGrainChange).toHaveBeenCalledWith(shapeMasterId, { enabled: true })
    expect(onObjectGrainChange).toHaveBeenCalledWith(shapeMasterId, {
      blendMode: 'multiply',
      intensity: 0.55,
      scale: 0.9
    })
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

  it('updates slide background to a default linear gradient from the properties tab', async () => {
    const user = userEvent.setup()
    const onSlideBackgroundFillChange = vi.fn()
    const { document, slideId } = makeDocument()
    const backgroundColor = Object.values(document.colorConstantsById ?? {}).find(
      (color) => color.value === '#112233'
    )
    if (!backgroundColor) {
      throw new Error('Expected normalized background color constant')
    }

    render(
      <PropertiesPanel
        document={document}
        selectedSlide={document.slidesById[slideId]}
        selectedSlideIndex={0}
        selectedMaster={null}
        selectedAnimation={null}
        selectedAnimationObjectName="Object"
        onSlideBackgroundFillChange={onSlideBackgroundFillChange}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Solid Fill' }))
    await user.click(screen.getByRole('menuitem', { name: 'Linear Gradient' }))

    expect(onSlideBackgroundFillChange).toHaveBeenCalledWith(slideId, {
      kind: 'linear-gradient',
      rotation: 90,
      x1: 0.5,
      y1: 0,
      x2: 0.5,
      y2: 1,
      stops: [
        { offset: 0, color: { kind: 'constant', colorId: backgroundColor.id } },
        { offset: 1, color: '#ffffff' }
      ]
    })
  })

  it('updates slide grain controls from the properties tab', async () => {
    const user = userEvent.setup()
    const onSlideBackgroundGrainChange = vi.fn()
    const { document, slideId } = makeDocument()

    render(
      <PropertiesPanel
        document={document}
        selectedSlide={document.slidesById[slideId]}
        selectedSlideIndex={0}
        selectedMaster={null}
        selectedAnimation={null}
        selectedAnimationObjectName="Object"
        onSlideBackgroundGrainChange={onSlideBackgroundGrainChange}
      />
    )

    await user.click(
      within(getPropertyCard('Background')).getByRole('checkbox', { name: 'Texture' })
    )

    expect(onSlideBackgroundGrainChange).toHaveBeenCalledWith(slideId, { enabled: true })
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
