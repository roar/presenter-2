import { describe, it, expect, beforeEach } from 'vitest'
import {
  useDocumentStore,
  selectPatchedPresentation,
  selectSelectedAnimationGroup
} from './documentStore'
import { createAppearance, createMsoMaster } from '../../../shared/model/factories'
import type { Presentation, Slide } from '../../../shared/model/types'

function makePresentation(overrides?: Partial<Presentation>): Presentation {
  return {
    id: 'pres-1',
    title: 'Test presentation',
    colorConstantsById: {},
    slideOrder: [],
    slidesById: {},
    mastersById: {},
    appearancesById: {},
    animationsById: {},
    animationGroupTemplatesById: {},
    textDecorationsById: {},
    revision: 0,
    ownerId: null,
    isPublished: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides
  }
}

function makeSlide(id: string): Slide {
  return { id, appearanceIds: [], animationOrder: [], background: {} }
}

beforeEach(() => {
  useDocumentStore.setState({
    document: null,
    ui: {
      selectedSlideId: null,
      selectedElementIds: [],
      selectedAnimationId: null,
      zoom: 1,
      clipboard: null
    },
    history: [],
    historyIndex: -1,
    isDirty: false,
    previewPatch: null
  })
})

describe('documentStore', () => {
  describe('setDocument', () => {
    it('sets the document and marks it dirty', () => {
      const pres = makePresentation()
      useDocumentStore.getState().setDocument(pres)

      const state = useDocumentStore.getState()
      expect(state.document).toEqual(pres)
      expect(state.isDirty).toBe(true)
    })
  })

  describe('updatePresentationTitle', () => {
    it('updates the document title and marks it dirty', () => {
      useDocumentStore.getState().setDocument(makePresentation({ title: 'Old title' }))
      useDocumentStore.getState().updatePresentationTitle('New title')

      const state = useDocumentStore.getState()
      expect(state.document?.title).toBe('New title')
      expect(state.isDirty).toBe(true)
    })

    it('pushes a history entry for undo', () => {
      useDocumentStore.getState().setDocument(makePresentation({ title: 'Old title' }))
      const historyLengthBefore = useDocumentStore.getState().history.length

      useDocumentStore.getState().updatePresentationTitle('New title')

      expect(useDocumentStore.getState().history.length).toBe(historyLengthBefore + 1)
      useDocumentStore.getState().undo()
      expect(useDocumentStore.getState().document?.title).toBe('Old title')
    })
  })

  describe('updateAnimationNumericTo', () => {
    it('updates a scale animation target value and marks the document dirty', () => {
      useDocumentStore.getState().setDocument(
        makePresentation({
          animationsById: {
            'anim-1': {
              id: 'anim-1',
              trigger: 'on-click',
              offset: 0,
              duration: 1,
              easing: 'linear',
              loop: { kind: 'none' },
              effect: { kind: 'action', type: 'scale', to: 1 },
              target: { kind: 'appearance', appearanceId: 'appearance-1' }
            }
          }
        })
      )

      useDocumentStore.getState().updateAnimationNumericTo('anim-1', 1.5)

      const state = useDocumentStore.getState()
      const animation = state.document?.animationsById['anim-1']
      if (!animation || animation.effect.type !== 'scale') {
        throw new Error('Expected scale animation')
      }
      expect(animation.effect.to).toBe(1.5)
      expect(state.isDirty).toBe(true)
    })

    it('updates a fade animation target value', () => {
      useDocumentStore.getState().setDocument(
        makePresentation({
          animationsById: {
            'anim-1': {
              id: 'anim-1',
              trigger: 'on-click',
              offset: 0,
              duration: 1,
              easing: 'linear',
              loop: { kind: 'none' },
              effect: { kind: 'build-in', type: 'fade', to: 0.5 },
              target: { kind: 'appearance', appearanceId: 'appearance-1' }
            }
          }
        })
      )

      useDocumentStore.getState().updateAnimationNumericTo('anim-1', 0.75)

      const animation = useDocumentStore.getState().document?.animationsById['anim-1']
      if (!animation || animation.effect.type !== 'fade') {
        throw new Error('Expected fade animation')
      }
      expect(animation.effect.to).toBe(0.75)
    })
  })

  describe('updateAnimationMoveDelta', () => {
    it('updates the stored move delta values', () => {
      useDocumentStore.getState().setDocument(
        makePresentation({
          animationsById: {
            'anim-1': {
              id: 'anim-1',
              trigger: 'on-click',
              offset: 0,
              duration: 1,
              easing: 'linear',
              loop: { kind: 'none' },
              effect: { kind: 'action', type: 'move', delta: { x: 0, y: 100 } },
              target: { kind: 'appearance', appearanceId: 'appearance-1' }
            }
          }
        })
      )

      useDocumentStore.getState().updateAnimationMoveDelta('anim-1', { x: 24, y: 48 })

      const animation = useDocumentStore.getState().document?.animationsById['anim-1']
      if (!animation || animation.effect.type !== 'move') {
        throw new Error('Expected move animation')
      }
      expect(animation.effect.delta).toEqual({ x: 24, y: 48 })
      expect(useDocumentStore.getState().isDirty).toBe(true)
    })
  })

  describe('color constants', () => {
    it('normalizes raw colors into named color constants when setting the document', () => {
      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: ['s-1'],
          slidesById: {
            's-1': {
              id: 's-1',
              appearanceIds: [],
              animationOrder: [],
              background: { color: '#123456' }
            }
          }
        })
      )

      const document = useDocumentStore.getState().document
      expect(document).toBeTruthy()
      const colorConstants = Object.values(document?.colorConstantsById ?? {})
      expect(colorConstants).toHaveLength(1)
      expect(colorConstants[0]?.value).toBe('#123456')
      expect(document?.slidesById['s-1'].background.color).toEqual({
        kind: 'constant',
        colorId: colorConstants[0]?.id
      })
    })

    it('adds a named color constant', () => {
      useDocumentStore.getState().setDocument(makePresentation())

      useDocumentStore.getState().addColorConstant()

      const colorConstants = Object.values(
        useDocumentStore.getState().document?.colorConstantsById ?? {}
      )
      expect(colorConstants).toHaveLength(1)
      expect(colorConstants[0]?.name).toBe('Color 1')
    })

    it('updates a named color constant name and value', () => {
      useDocumentStore.getState().setDocument(
        makePresentation({
          colorConstantsById: {
            'color-1': { id: 'color-1', name: 'Primary', value: '#112233' }
          }
        })
      )

      useDocumentStore.getState().updateColorConstantName('color-1', 'Accent')
      useDocumentStore.getState().updateColorConstantValue('color-1', '#445566')

      const colorConstant = useDocumentStore.getState().document?.colorConstantsById?.['color-1']
      expect(colorConstant).toEqual({ id: 'color-1', name: 'Accent', value: '#445566' })
    })

    it('creates or reuses a named color constant for a chosen raw color', () => {
      useDocumentStore.getState().setDocument(makePresentation())

      const colorId = useDocumentStore.getState().nameColorConstant('#112233', 'Primary')

      expect(colorId).toBeTruthy()
      if (!colorId) {
        throw new Error('Expected color id')
      }
      expect(useDocumentStore.getState().document?.colorConstantsById?.[colorId]).toEqual({
        id: colorId,
        name: 'Primary',
        value: '#112233'
      })
    })

    it('deletes an in-use color constant and detaches usages back to raw colors', () => {
      useDocumentStore.getState().setDocument(
        makePresentation({
          colorConstantsById: {
            'color-1': { id: 'color-1', name: 'Primary', value: '#112233' }
          },
          slideOrder: ['s-1'],
          slidesById: {
            's-1': {
              id: 's-1',
              appearanceIds: [],
              animationOrder: [],
              background: { color: { kind: 'constant', colorId: 'color-1' } }
            }
          }
        })
      )

      useDocumentStore.getState().deleteColorConstant('color-1')

      expect(useDocumentStore.getState().document?.colorConstantsById?.['color-1']).toBeUndefined()
      expect(useDocumentStore.getState().document?.slidesById['s-1'].background.color).toBe(
        '#112233'
      )
    })

    it('updates slide and object color properties with named color references', () => {
      const master = createMsoMaster('shape')
      const slide = makeSlide('s-1')

      useDocumentStore.getState().setDocument(
        makePresentation({
          colorConstantsById: {
            'color-1': { id: 'color-1', name: 'Primary', value: '#112233' }
          },
          slideOrder: ['s-1'],
          slidesById: { 's-1': slide },
          mastersById: { [master.id]: master }
        })
      )

      useDocumentStore.getState().updateSlideBackgroundColor('s-1', {
        kind: 'constant',
        colorId: 'color-1'
      })
      useDocumentStore.getState().updateObjectFill(master.id, {
        kind: 'constant',
        colorId: 'color-1'
      })

      expect(useDocumentStore.getState().document?.slidesById['s-1'].background.color).toEqual({
        kind: 'constant',
        colorId: 'color-1'
      })
      expect(
        useDocumentStore.getState().document?.mastersById[master.id].objectStyle.defaultState.fill
      ).toEqual({
        kind: 'constant',
        colorId: 'color-1'
      })
    })

    it('normalizes gradient stop colors into named color constants when setting the document', () => {
      const master = createMsoMaster('shape')
      master.objectStyle.defaultState.fill = {
        kind: 'linear-gradient',
        rotation: 45,
        stops: [
          { offset: 0, color: '#112233' },
          { offset: 1, color: '#445566' }
        ]
      }

      useDocumentStore.getState().setDocument(
        makePresentation({
          mastersById: { [master.id]: master }
        })
      )

      const document = useDocumentStore.getState().document
      const fill = document?.mastersById[master.id].objectStyle.defaultState.fill
      const colorConstants = Object.values(document?.colorConstantsById ?? {})

      expect(colorConstants).toHaveLength(2)
      expect(fill).toEqual({
        kind: 'linear-gradient',
        rotation: 45,
        stops: [
          { offset: 0, color: { kind: 'constant', colorId: colorConstants[0]?.id } },
          { offset: 1, color: { kind: 'constant', colorId: colorConstants[1]?.id } }
        ]
      })
    })

    it('normalizes slide background gradient stop colors into named color constants', () => {
      const slide = makeSlide('s-1')
      slide.background = {
        fill: {
          kind: 'linear-gradient',
          rotation: 90,
          x1: 0.5,
          y1: 0,
          x2: 0.5,
          y2: 1,
          stops: [
            { offset: 0, color: '#112233' },
            { offset: 1, color: '#445566' }
          ]
        }
      }

      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: ['s-1'],
          slidesById: { 's-1': slide }
        })
      )

      const document = useDocumentStore.getState().document
      const colorConstants = Object.values(document?.colorConstantsById ?? {})
      expect(colorConstants).toHaveLength(2)
      expect(document?.slidesById['s-1'].background.fill).toEqual({
        kind: 'linear-gradient',
        rotation: 90,
        x1: 0.5,
        y1: 0,
        x2: 0.5,
        y2: 1,
        stops: [
          { offset: 0, color: { kind: 'constant', colorId: colorConstants[0]?.id } },
          { offset: 1, color: { kind: 'constant', colorId: colorConstants[1]?.id } }
        ]
      })
    })
  })

  describe('addSlide / removeSlide', () => {
    it('adds a slide to the document', () => {
      useDocumentStore.getState().setDocument(makePresentation())
      useDocumentStore.getState().addSlide(makeSlide('s-1'))

      expect(useDocumentStore.getState().document?.slideOrder).toHaveLength(1)
      expect(useDocumentStore.getState().document?.slidesById['s-1']).toBeDefined()
    })

    it('removes a slide by id', () => {
      useDocumentStore
        .getState()
        .setDocument(
          makePresentation({ slideOrder: ['s-1'], slidesById: { 's-1': makeSlide('s-1') } })
        )
      useDocumentStore.getState().removeSlide('s-1')

      expect(useDocumentStore.getState().document?.slideOrder).toHaveLength(0)
      expect(useDocumentStore.getState().document?.slidesById['s-1']).toBeUndefined()
    })

    it('clears selection when the selected slide is removed', () => {
      useDocumentStore
        .getState()
        .setDocument(
          makePresentation({ slideOrder: ['s-1'], slidesById: { 's-1': makeSlide('s-1') } })
        )
      useDocumentStore.getState().selectSlide('s-1')
      useDocumentStore.getState().removeSlide('s-1')

      expect(useDocumentStore.getState().ui.selectedSlideId).toBeNull()
    })
  })

  describe('undo / redo', () => {
    it('undoes the last change', () => {
      useDocumentStore.getState().setDocument(makePresentation())
      useDocumentStore.getState().addSlide(makeSlide('s-1'))
      useDocumentStore.getState().undo()

      expect(useDocumentStore.getState().document?.slideOrder).toHaveLength(0)
    })

    it('redoes an undone change', () => {
      useDocumentStore.getState().setDocument(makePresentation())
      useDocumentStore.getState().addSlide(makeSlide('s-1'))
      useDocumentStore.getState().undo()
      useDocumentStore.getState().redo()

      expect(useDocumentStore.getState().document?.slideOrder).toHaveLength(1)
    })

    it('discards redo history when a new change is made after undo', () => {
      useDocumentStore.getState().setDocument(makePresentation())
      useDocumentStore.getState().addSlide(makeSlide('s-1'))
      useDocumentStore.getState().undo()
      useDocumentStore.getState().addSlide(makeSlide('s-2'))
      useDocumentStore.getState().redo() // nothing to redo

      expect(useDocumentStore.getState().document?.slideOrder).toEqual(['s-2'])
    })

    it('does nothing when there is no history to undo', () => {
      useDocumentStore.getState().setDocument(makePresentation())
      useDocumentStore.getState().undo() // only one entry — initial setDocument
      useDocumentStore.getState().undo() // should be a no-op

      expect(useDocumentStore.getState().document).not.toBeNull()
    })
  })

  describe('insertElement', () => {
    it('adds the master and appearance to the document', () => {
      const slide = makeSlide('s-1')
      useDocumentStore
        .getState()
        .setDocument(makePresentation({ slideOrder: ['s-1'], slidesById: { 's-1': slide } }))

      const master = createMsoMaster('shape')
      useDocumentStore.getState().insertElement('s-1', master)

      const state = useDocumentStore.getState()
      expect(state.document?.mastersById[master.id]).toBeDefined()
      const appearances = Object.values(state.document?.appearancesById ?? {})
      expect(appearances).toHaveLength(1)
      expect(appearances[0].masterId).toBe(master.id)
      expect(appearances[0].slideId).toBe('s-1')
    })

    it('pushes the appearance id onto the slide', () => {
      const slide = makeSlide('s-1')
      useDocumentStore
        .getState()
        .setDocument(makePresentation({ slideOrder: ['s-1'], slidesById: { 's-1': slide } }))

      const master = createMsoMaster('shape')
      useDocumentStore.getState().insertElement('s-1', master)

      const state = useDocumentStore.getState()
      expect(state.document?.slidesById['s-1'].appearanceIds).toHaveLength(1)
    })

    it('marks the document dirty and pushes history', () => {
      const slide = makeSlide('s-1')
      useDocumentStore
        .getState()
        .setDocument(makePresentation({ slideOrder: ['s-1'], slidesById: { 's-1': slide } }))

      const historyLengthBefore = useDocumentStore.getState().history.length
      useDocumentStore.getState().insertElement('s-1', createMsoMaster('shape'))

      const state = useDocumentStore.getState()
      expect(state.isDirty).toBe(true)
      expect(state.history.length).toBe(historyLengthBefore + 1)
    })
  })

  describe('newPresentation', () => {
    it('creates a presentation with one slide', () => {
      useDocumentStore.getState().newPresentation()

      const { document } = useDocumentStore.getState()
      expect(document?.slideOrder).toHaveLength(1)
      const slideId = document?.slideOrder[0]
      expect(document?.slidesById[slideId]).toBeDefined()
    })

    it('sets selectedSlideId to the new slide', () => {
      useDocumentStore.getState().newPresentation()

      const { document, ui } = useDocumentStore.getState()
      expect(ui.selectedSlideId).toBe(document?.slideOrder[0])
    })

    it('resets history to a single entry', () => {
      useDocumentStore.getState().setDocument(makePresentation())
      useDocumentStore.getState().addSlide(makeSlide('s-1'))
      useDocumentStore.getState().newPresentation()

      const { history, historyIndex } = useDocumentStore.getState()
      expect(history).toHaveLength(1)
      expect(historyIndex).toBe(0)
    })

    it('marks the document as dirty', () => {
      useDocumentStore.getState().newPresentation()

      expect(useDocumentStore.getState().isDirty).toBe(true)
    })

    it('replaces any existing document', () => {
      useDocumentStore.getState().setDocument(makePresentation({ id: 'old-pres' }))
      useDocumentStore.getState().newPresentation()

      const { document } = useDocumentStore.getState()
      expect(document?.id).not.toBe('old-pres')
    })
  })

  describe('selectSlide', () => {
    it('sets the selected slide and clears element and animation selection', () => {
      useDocumentStore.getState().selectElements(['e-1'])
      useDocumentStore.getState().selectAnimation('anim-1')
      useDocumentStore.getState().selectSlide('s-1')

      const { ui } = useDocumentStore.getState()
      expect(ui.selectedSlideId).toBe('s-1')
      expect(ui.selectedElementIds).toHaveLength(0)
      expect(ui.selectedAnimationId).toBeNull()
    })
  })

  describe('selectAnimation', () => {
    it('sets the selected animation and clears element selection', () => {
      useDocumentStore.getState().selectElements(['e-1'])
      useDocumentStore.getState().selectAnimation('anim-1')

      const { ui } = useDocumentStore.getState()
      expect(ui.selectedAnimationId).toBe('anim-1')
      expect(ui.selectedElementIds).toHaveLength(0)
    })
  })

  describe('moveElement', () => {
    it('updates the master transform position', () => {
      const master = createMsoMaster('shape')
      master.transform = { x: 100, y: 200, width: 50, height: 50, rotation: 0 }
      useDocumentStore
        .getState()
        .setDocument(makePresentation({ mastersById: { [master.id]: master } }))

      useDocumentStore.getState().moveElement(master.id, 300, 400)

      const updated = useDocumentStore.getState().document?.mastersById[master.id]
      expect(updated?.transform.x).toBe(300)
      expect(updated?.transform.y).toBe(400)
    })

    it('preserves width, height, and rotation', () => {
      const master = createMsoMaster('shape')
      master.transform = { x: 0, y: 0, width: 120, height: 80, rotation: 45 }
      useDocumentStore
        .getState()
        .setDocument(makePresentation({ mastersById: { [master.id]: master } }))

      useDocumentStore.getState().moveElement(master.id, 10, 20)

      const updated = useDocumentStore.getState().document?.mastersById[master.id]
      expect(updated?.transform.width).toBe(120)
      expect(updated?.transform.height).toBe(80)
      expect(updated?.transform.rotation).toBe(45)
    })

    it('marks the document dirty and pushes history', () => {
      const master = createMsoMaster('shape')
      useDocumentStore
        .getState()
        .setDocument(makePresentation({ mastersById: { [master.id]: master } }))

      const historyLengthBefore = useDocumentStore.getState().history.length
      useDocumentStore.getState().moveElement(master.id, 50, 50)

      const state = useDocumentStore.getState()
      expect(state.isDirty).toBe(true)
      expect(state.history.length).toBe(historyLengthBefore + 1)
    })

    it('does nothing when the master does not exist', () => {
      useDocumentStore.getState().setDocument(makePresentation())
      const historyLengthBefore = useDocumentStore.getState().history.length

      useDocumentStore.getState().moveElement('nonexistent-id', 100, 100)

      expect(useDocumentStore.getState().history.length).toBe(historyLengthBefore)
    })
  })

  describe('updateMasterTransform', () => {
    it('updates only the requested transform fields', () => {
      const slide = makeSlide('s-1')
      const master = createMsoMaster('shape')
      master.transform = { x: 10, y: 20, width: 30, height: 40, rotation: 45 }
      const appearance = createAppearance(master.id, slide.id)
      slide.appearanceIds = [appearance.id]
      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: [slide.id],
          slidesById: { [slide.id]: slide },
          mastersById: { [master.id]: master },
          appearancesById: { [appearance.id]: appearance }
        })
      )

      useDocumentStore.getState().updateMasterTransform(master.id, { width: 120, height: 160 })

      expect(useDocumentStore.getState().document?.mastersById[master.id].transform).toEqual({
        x: 10,
        y: 20,
        width: 120,
        height: 160,
        rotation: 45
      })
    })
  })

  describe('updateObjectGrain', () => {
    it('creates and updates grain settings on the selected master', () => {
      const slide = makeSlide('s-1')
      const master = createMsoMaster('shape')
      const appearance = createAppearance(master.id, slide.id)
      slide.appearanceIds = [appearance.id]
      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: [slide.id],
          slidesById: { [slide.id]: slide },
          mastersById: { [master.id]: master },
          appearancesById: { [appearance.id]: appearance }
        })
      )

      useDocumentStore.getState().updateObjectGrain(master.id, {
        enabled: true,
        intensity: 0.7,
        scale: 0.8,
        seed: 4,
        blendMode: 'multiply'
      })

      expect(
        useDocumentStore.getState().document?.mastersById[master.id].objectStyle.defaultState.grain
      ).toEqual({
        enabled: true,
        intensity: 0.7,
        scale: 0.8,
        seed: 4,
        blendMode: 'multiply'
      })
    })
  })

  describe('addMoveAnimation', () => {
    it('creates a move animation for the selected appearance', () => {
      const slide = makeSlide('s-1')
      const master = createMsoMaster('shape')
      const appearance = createAppearance(master.id, slide.id)
      slide.appearanceIds = [appearance.id]

      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: [slide.id],
          slidesById: { [slide.id]: slide },
          mastersById: { [master.id]: master },
          appearancesById: { [appearance.id]: appearance }
        })
      )

      useDocumentStore.getState().addMoveAnimation(appearance.id)

      const state = useDocumentStore.getState()
      const animationId = state.document?.slidesById[slide.id].animationOrder[0]
      const animation = animationId ? state.document?.animationsById[animationId] : null

      expect(animation).toMatchObject({
        trigger: 'on-click',
        offset: 0,
        duration: 1,
        easing: { kind: 'cubic-bezier', x1: 0.645, y1: 0.045, x2: 0.355, y2: 1 },
        loop: { kind: 'none' },
        effect: { kind: 'action', type: 'move', delta: { x: 0, y: 100 } },
        target: { kind: 'appearance', appearanceId: appearance.id }
      })
      expect(state.document?.appearancesById[appearance.id].animationIds).toEqual([animationId])
    })

    it('selects the new move animation and clears element selection', () => {
      const slide = makeSlide('s-1')
      const master = createMsoMaster('shape')
      const appearance = createAppearance(master.id, slide.id)
      slide.appearanceIds = [appearance.id]

      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: [slide.id],
          slidesById: { [slide.id]: slide },
          mastersById: { [master.id]: master },
          appearancesById: { [appearance.id]: appearance }
        })
      )

      useDocumentStore.getState().selectElements([master.id])
      useDocumentStore.getState().addMoveAnimation(appearance.id)

      const state = useDocumentStore.getState()
      expect(state.ui.selectedAnimationId).toBe(
        state.document?.slidesById[slide.id].animationOrder[0]
      )
      expect(state.ui.selectedElementIds).toEqual([])
      expect(state.ui.selectedSlideId).toBe(slide.id)
    })
  })

  describe('selectSelectedAnimationGroup', () => {
    it('derives the selected appearance animation group for a move animation', () => {
      const slide = makeSlide('s-1')
      const master = createMsoMaster('shape')
      const appearance = createAppearance(master.id, slide.id)
      const animation: Presentation['animationsById'][string] = {
        id: 'anim-1',
        trigger: 'on-click',
        offset: 0,
        duration: 1,
        easing: 'linear',
        loop: { kind: 'none' },
        effect: { kind: 'action', type: 'move', delta: { x: 24, y: 48 } },
        target: { kind: 'appearance', appearanceId: appearance.id }
      }

      slide.appearanceIds = [appearance.id]
      slide.animationOrder = [animation.id]
      appearance.animationIds = [animation.id]

      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: [slide.id],
          slidesById: { [slide.id]: slide },
          mastersById: { [master.id]: master },
          appearancesById: { [appearance.id]: appearance },
          animationsById: { [animation.id]: animation }
        })
      )

      useDocumentStore.getState().selectAnimation(animation.id)

      expect(selectSelectedAnimationGroup(useDocumentStore.getState())).toEqual({
        slideId: slide.id,
        appearanceId: appearance.id,
        masterId: master.id,
        animationIds: [animation.id],
        selectedAnimation: animation,
        moveAnimation: animation,
        moveSteps: [
          {
            animationId: animation.id,
            delta: { x: 24, y: 48 },
            cumulativeDelta: { x: 24, y: 48 }
          }
        ]
      })
    })

    it('derives ordered move steps in slide order with cumulative downstream positions', () => {
      const slide = makeSlide('s-1')
      const master = createMsoMaster('shape')
      const appearance = createAppearance(master.id, slide.id)
      const move1: Presentation['animationsById'][string] = {
        id: 'move-1',
        trigger: 'on-click',
        offset: 0,
        duration: 1,
        easing: 'linear',
        loop: { kind: 'none' },
        effect: { kind: 'action', type: 'move', delta: { x: 10, y: 20 } },
        target: { kind: 'appearance', appearanceId: appearance.id }
      }
      const fade: Presentation['animationsById'][string] = {
        id: 'fade-1',
        trigger: 'with-previous',
        offset: 0,
        duration: 1,
        easing: 'linear',
        loop: { kind: 'none' },
        effect: { kind: 'action', type: 'fade', from: 1, to: 0.5 },
        target: { kind: 'appearance', appearanceId: appearance.id }
      }
      const move2: Presentation['animationsById'][string] = {
        id: 'move-2',
        trigger: 'after-previous',
        offset: 0,
        duration: 1,
        easing: 'linear',
        loop: { kind: 'none' },
        effect: { kind: 'action', type: 'move', delta: { x: -5, y: 40 } },
        target: { kind: 'appearance', appearanceId: appearance.id }
      }

      slide.appearanceIds = [appearance.id]
      slide.animationOrder = [move2.id, fade.id, move1.id]
      appearance.animationIds = [move1.id, fade.id, move2.id]

      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: [slide.id],
          slidesById: { [slide.id]: slide },
          mastersById: { [master.id]: master },
          appearancesById: { [appearance.id]: appearance },
          animationsById: { [move1.id]: move1, [fade.id]: fade, [move2.id]: move2 }
        })
      )

      useDocumentStore.getState().selectAnimation(move1.id)

      expect(selectSelectedAnimationGroup(useDocumentStore.getState())).toEqual({
        slideId: slide.id,
        appearanceId: appearance.id,
        masterId: master.id,
        animationIds: [move2.id, fade.id, move1.id],
        selectedAnimation: move1,
        moveAnimation: move2,
        moveSteps: [
          {
            animationId: move2.id,
            delta: { x: -5, y: 40 },
            cumulativeDelta: { x: -5, y: 40 }
          },
          {
            animationId: move1.id,
            delta: { x: 10, y: 20 },
            cumulativeDelta: { x: 5, y: 60 }
          }
        ]
      })
    })
  })

  describe('removeAnimation', () => {
    it('removes the animation from the appearance, slide order, and selection', () => {
      const slide = makeSlide('s-1')
      const master = createMsoMaster('shape')
      const appearance = createAppearance(master.id, slide.id)
      const animation: Presentation['animationsById'][string] = {
        id: 'anim-1',
        trigger: 'on-click',
        offset: 0,
        duration: 1,
        easing: 'linear',
        loop: { kind: 'none' },
        effect: { kind: 'action', type: 'move', delta: { x: 24, y: 48 } },
        target: { kind: 'appearance', appearanceId: appearance.id }
      }

      slide.appearanceIds = [appearance.id]
      slide.animationOrder = [animation.id]
      appearance.animationIds = [animation.id]

      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: [slide.id],
          slidesById: { [slide.id]: slide },
          mastersById: { [master.id]: master },
          appearancesById: { [appearance.id]: appearance },
          animationsById: { [animation.id]: animation }
        })
      )

      useDocumentStore.getState().selectAnimation(animation.id)
      useDocumentStore.getState().removeAnimation(animation.id)

      const state = useDocumentStore.getState()
      expect(state.document?.animationsById[animation.id]).toBeUndefined()
      expect(state.document?.appearancesById[appearance.id].animationIds).toEqual([])
      expect(state.document?.slidesById[slide.id].animationOrder).toEqual([])
      expect(state.ui.selectedAnimationId).toBeNull()
    })
  })

  describe('updateAnimationTrigger', () => {
    it('updates the trigger for an existing animation', () => {
      const slide = makeSlide('s-1')
      const master = createMsoMaster('shape')
      const appearance = createAppearance(master.id, slide.id)
      const animation: Presentation['animationsById'][string] = {
        id: 'anim-1',
        trigger: 'on-click',
        offset: 0,
        duration: 1,
        easing: 'linear',
        loop: { kind: 'none' },
        effect: { kind: 'action', type: 'move', delta: { x: 0, y: 100 } },
        target: { kind: 'appearance', appearanceId: appearance.id }
      }

      slide.appearanceIds = [appearance.id]
      slide.animationOrder = [animation.id]
      appearance.animationIds = [animation.id]

      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: [slide.id],
          slidesById: { [slide.id]: slide },
          mastersById: { [master.id]: master },
          appearancesById: { [appearance.id]: appearance },
          animationsById: { [animation.id]: animation }
        })
      )

      useDocumentStore.getState().updateAnimationTrigger(animation.id, 'after-previous')

      const updated = useDocumentStore.getState().document?.animationsById[animation.id]
      expect(updated?.trigger).toBe('after-previous')
    })
  })

  describe('updateAnimationOffset', () => {
    it('updates the delay for an existing animation', () => {
      const slide = makeSlide('s-1')
      const master = createMsoMaster('shape')
      const appearance = createAppearance(master.id, slide.id)
      const animation: Presentation['animationsById'][string] = {
        id: 'anim-1',
        trigger: 'on-click',
        offset: 0,
        duration: 1,
        easing: 'linear',
        loop: { kind: 'none' },
        effect: { kind: 'action', type: 'move', delta: { x: 0, y: 100 } },
        target: { kind: 'appearance', appearanceId: appearance.id }
      }

      slide.appearanceIds = [appearance.id]
      slide.animationOrder = [animation.id]
      appearance.animationIds = [animation.id]

      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: [slide.id],
          slidesById: { [slide.id]: slide },
          mastersById: { [master.id]: master },
          appearancesById: { [appearance.id]: appearance },
          animationsById: { [animation.id]: animation }
        })
      )

      useDocumentStore.getState().updateAnimationOffset(animation.id, 1.25)

      const updated = useDocumentStore.getState().document?.animationsById[animation.id]
      expect(updated?.offset).toBe(1.25)
    })
  })

  describe('updateAnimationDuration', () => {
    it('updates the duration for an existing animation', () => {
      const slide = makeSlide('s-1')
      const master = createMsoMaster('shape')
      const appearance = createAppearance(master.id, slide.id)
      const animation: Presentation['animationsById'][string] = {
        id: 'anim-1',
        trigger: 'on-click',
        offset: 0,
        duration: 1,
        easing: 'linear',
        loop: { kind: 'none' },
        effect: { kind: 'action', type: 'move', delta: { x: 0, y: 100 } },
        target: { kind: 'appearance', appearanceId: appearance.id }
      }

      slide.appearanceIds = [appearance.id]
      slide.animationOrder = [animation.id]
      appearance.animationIds = [animation.id]

      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: [slide.id],
          slidesById: { [slide.id]: slide },
          mastersById: { [master.id]: master },
          appearancesById: { [appearance.id]: appearance },
          animationsById: { [animation.id]: animation }
        })
      )

      useDocumentStore.getState().updateAnimationDuration(animation.id, 2.5)

      const updated = useDocumentStore.getState().document?.animationsById[animation.id]
      expect(updated?.duration).toBe(2.5)
    })
  })

  describe('updateAnimationEasing', () => {
    it('updates the easing for an existing animation', () => {
      const slide = makeSlide('s-1')
      const master = createMsoMaster('shape')
      const appearance = createAppearance(master.id, slide.id)
      const animation: Presentation['animationsById'][string] = {
        id: 'anim-1',
        trigger: 'on-click',
        offset: 0,
        duration: 1,
        easing: 'linear',
        loop: { kind: 'none' },
        effect: { kind: 'action', type: 'move', delta: { x: 0, y: 100 } },
        target: { kind: 'appearance', appearanceId: appearance.id }
      }

      slide.appearanceIds = [appearance.id]
      slide.animationOrder = [animation.id]
      appearance.animationIds = [animation.id]

      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: [slide.id],
          slidesById: { [slide.id]: slide },
          mastersById: { [master.id]: master },
          appearancesById: { [appearance.id]: appearance },
          animationsById: { [animation.id]: animation }
        })
      )

      useDocumentStore.getState().updateAnimationEasing(animation.id, 'ease-out')

      const updated = useDocumentStore.getState().document?.animationsById[animation.id]
      expect(updated?.easing).toBe('ease-out')
    })
  })

  describe('updateSlideTransitionTrigger', () => {
    it('updates the slide transition trigger', () => {
      const slide = makeSlide('s-1')

      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: [slide.id],
          slidesById: { [slide.id]: slide }
        })
      )

      useDocumentStore.getState().updateSlideTransitionTrigger(slide.id, 'on-click')

      const updated = useDocumentStore.getState().document?.slidesById[slide.id]
      expect(updated?.transitionTriggerId).toBe(`transition:${slide.id}`)
    })

    it('clears the trigger when set to none', () => {
      const slide = makeSlide('s-1')
      slide.transitionTriggerId = `transition:${slide.id}`

      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: [slide.id],
          slidesById: { [slide.id]: slide }
        })
      )

      useDocumentStore.getState().updateSlideTransitionTrigger(slide.id, 'none')

      const updated = useDocumentStore.getState().document?.slidesById[slide.id]
      expect(updated?.transitionTriggerId).toBeUndefined()
    })
  })

  describe('updateSlideTransitionDuration', () => {
    it('creates and updates the slide transition duration', () => {
      const slide = makeSlide('s-1')

      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: [slide.id],
          slidesById: { [slide.id]: slide }
        })
      )

      useDocumentStore.getState().updateSlideTransitionDuration(slide.id, 1.25)

      const updated = useDocumentStore.getState().document?.slidesById[slide.id].transition
      expect(updated).toMatchObject({
        kind: 'fade-through-color',
        duration: 1.25,
        easing: 'ease-in-out'
      })
    })
  })

  describe('updateSlideTransitionEasing', () => {
    it('updates the slide transition easing', () => {
      const slide = makeSlide('s-1')

      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: [slide.id],
          slidesById: { [slide.id]: slide }
        })
      )

      useDocumentStore.getState().updateSlideTransitionEasing(slide.id, 'ease-out')

      const updated = useDocumentStore.getState().document?.slidesById[slide.id].transition
      expect(updated?.easing).toBe('ease-out')
    })
  })

  describe('updateSlideTransitionKind', () => {
    it('updates the slide transition kind', () => {
      const slide = makeSlide('s-1')

      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: [slide.id],
          slidesById: { [slide.id]: slide }
        })
      )

      useDocumentStore.getState().updateSlideTransitionKind(slide.id, 'dissolve')

      const updated = useDocumentStore.getState().document?.slidesById[slide.id].transition
      expect(updated?.kind).toBe('dissolve')
    })
  })

  describe('copyElement / pasteElement', () => {
    function makeDocWithElement() {
      const slide = makeSlide('s-1')
      const master = createMsoMaster('shape')
      master.transform = { x: 100, y: 200, width: 50, height: 60, rotation: 0 }
      const appearance = createAppearance(master.id, slide.id)
      slide.appearanceIds = [appearance.id]
      const pres = makePresentation({
        slideOrder: ['s-1'],
        slidesById: { 's-1': slide },
        mastersById: { [master.id]: master },
        appearancesById: { [appearance.id]: appearance }
      })
      return { pres, master, slide, appearance }
    }

    describe('copyElement', () => {
      it('stores a deep copy of the master in clipboard', () => {
        const { pres, master } = makeDocWithElement()
        useDocumentStore.getState().setDocument(pres)

        useDocumentStore.getState().copyElement(master.id)

        const { clipboard } = useDocumentStore.getState().ui
        expect(clipboard).not.toBeNull()
        expect(clipboard?.id).toBe(master.id)
        expect(clipboard?.transform).toEqual(master.transform)
      })

      it('clipboard is a deep copy — mutating the original does not affect it', () => {
        const { pres, master } = makeDocWithElement()
        useDocumentStore.getState().setDocument(pres)
        useDocumentStore.getState().copyElement(master.id)

        useDocumentStore.getState().moveElement(master.id, 9999, 9999)

        const { clipboard } = useDocumentStore.getState().ui
        expect(clipboard?.transform.x).toBe(100)
      })

      it('does not push history', () => {
        const { pres, master } = makeDocWithElement()
        useDocumentStore.getState().setDocument(pres)
        const historyLengthBefore = useDocumentStore.getState().history.length

        useDocumentStore.getState().copyElement(master.id)

        expect(useDocumentStore.getState().history.length).toBe(historyLengthBefore)
      })

      it('does nothing when masterId does not exist', () => {
        const { pres } = makeDocWithElement()
        useDocumentStore.getState().setDocument(pres)

        useDocumentStore.getState().copyElement('nonexistent')

        expect(useDocumentStore.getState().ui.clipboard).toBeNull()
      })
    })

    describe('pasteElement', () => {
      it('creates a new master offset by +16px x and +16px y', () => {
        const { pres, master } = makeDocWithElement()
        useDocumentStore.getState().setDocument(pres)
        useDocumentStore.getState().copyElement(master.id)

        useDocumentStore.getState().pasteElement('s-1')

        const masters = Object.values(useDocumentStore.getState().document?.mastersById ?? {})
        const pasted = masters.find((m) => m.id !== master.id)
        expect(pasted).toBeDefined()
        expect(pasted?.transform.x).toBe(116)
        expect(pasted?.transform.y).toBe(216)
      })

      it('adds a new appearance to slide.appearanceIds', () => {
        const { pres, master } = makeDocWithElement()
        useDocumentStore.getState().setDocument(pres)
        useDocumentStore.getState().copyElement(master.id)

        useDocumentStore.getState().pasteElement('s-1')

        const slide = useDocumentStore.getState().document?.slidesById['s-1']
        expect(slide?.appearanceIds).toHaveLength(2)
      })

      it('gives the pasted master a different id than the original', () => {
        const { pres, master } = makeDocWithElement()
        useDocumentStore.getState().setDocument(pres)
        useDocumentStore.getState().copyElement(master.id)

        useDocumentStore.getState().pasteElement('s-1')

        const masters = Object.values(useDocumentStore.getState().document?.mastersById ?? {})
        const ids = masters.map((m) => m.id)
        expect(new Set(ids).size).toBe(ids.length)
      })

      it('pushes history and marks document dirty', () => {
        const { pres, master } = makeDocWithElement()
        useDocumentStore.getState().setDocument(pres)
        useDocumentStore.getState().copyElement(master.id)
        const historyLengthBefore = useDocumentStore.getState().history.length

        useDocumentStore.getState().pasteElement('s-1')

        const state = useDocumentStore.getState()
        expect(state.isDirty).toBe(true)
        expect(state.history.length).toBe(historyLengthBefore + 1)
      })

      it('is a no-op when clipboard is null', () => {
        const { pres } = makeDocWithElement()
        useDocumentStore.getState().setDocument(pres)
        const historyLengthBefore = useDocumentStore.getState().history.length

        useDocumentStore.getState().pasteElement('s-1')

        expect(useDocumentStore.getState().history.length).toBe(historyLengthBefore)
      })

      it('is a no-op when slideId does not exist', () => {
        const { pres, master } = makeDocWithElement()
        useDocumentStore.getState().setDocument(pres)
        useDocumentStore.getState().copyElement(master.id)
        const historyLengthBefore = useDocumentStore.getState().history.length

        useDocumentStore.getState().pasteElement('nonexistent-slide')

        expect(useDocumentStore.getState().history.length).toBe(historyLengthBefore)
      })
    })
  })

  describe('convertToMultiSlideObject', () => {
    it('sets isMultiSlideObject to true on the master', () => {
      const slide = makeSlide('s-1')
      const master = createMsoMaster('shape')
      const appearance = createAppearance(master.id, 's-1')
      slide.appearanceIds = [appearance.id]
      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: ['s-1'],
          slidesById: { 's-1': slide },
          mastersById: { [master.id]: master },
          appearancesById: { [appearance.id]: appearance }
        })
      )

      useDocumentStore.getState().convertToMultiSlideObject(master.id)

      expect(useDocumentStore.getState().document?.mastersById[master.id].isMultiSlideObject).toBe(
        true
      )
    })

    it('does not create any new appearances', () => {
      const slide = makeSlide('s-1')
      const master = createMsoMaster('shape')
      const appearance = createAppearance(master.id, 's-1')
      slide.appearanceIds = [appearance.id]
      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: ['s-1', 's-2'],
          slidesById: { 's-1': slide, 's-2': makeSlide('s-2') },
          mastersById: { [master.id]: master },
          appearancesById: { [appearance.id]: appearance }
        })
      )

      useDocumentStore.getState().convertToMultiSlideObject(master.id)

      expect(Object.keys(useDocumentStore.getState().document?.appearancesById ?? {})).toHaveLength(
        1
      )
    })

    it('pushes history and marks document dirty', () => {
      const slide = makeSlide('s-1')
      const master = createMsoMaster('shape')
      const appearance = createAppearance(master.id, 's-1')
      slide.appearanceIds = [appearance.id]
      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: ['s-1'],
          slidesById: { 's-1': slide },
          mastersById: { [master.id]: master },
          appearancesById: { [appearance.id]: appearance }
        })
      )
      const historyLengthBefore = useDocumentStore.getState().history.length

      useDocumentStore.getState().convertToMultiSlideObject(master.id)

      const state = useDocumentStore.getState()
      expect(state.isDirty).toBe(true)
      expect(state.history.length).toBe(historyLengthBefore + 1)
    })

    it('is a no-op when masterId does not exist', () => {
      useDocumentStore.getState().setDocument(makePresentation())
      const historyLengthBefore = useDocumentStore.getState().history.length

      useDocumentStore.getState().convertToMultiSlideObject('nonexistent')

      expect(useDocumentStore.getState().history.length).toBe(historyLengthBefore)
    })
  })

  describe('pasteElement (MSO)', () => {
    it('creates a new Appearance for the same master when clipboard is an MSO', () => {
      const slide1 = makeSlide('s-1')
      const slide2 = makeSlide('s-2')
      const master = createMsoMaster('shape')
      master.isMultiSlideObject = true
      const appearance = createAppearance(master.id, 's-1')
      slide1.appearanceIds = [appearance.id]
      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: ['s-1', 's-2'],
          slidesById: { 's-1': slide1, 's-2': slide2 },
          mastersById: { [master.id]: master },
          appearancesById: { [appearance.id]: appearance }
        })
      )
      useDocumentStore.getState().copyElement(master.id)

      useDocumentStore.getState().pasteElement('s-2')

      const state = useDocumentStore.getState()
      // No new master should have been created
      expect(Object.keys(state.document?.mastersById ?? {})).toHaveLength(1)
      // A new appearance on slide2 pointing to the same master
      const slide2Appearances = state.document?.slidesById['s-2'].appearanceIds ?? []
      expect(slide2Appearances).toHaveLength(1)
      const newAppearance = state.document?.appearancesById[slide2Appearances[0]]
      expect(newAppearance?.masterId).toBe(master.id)
    })
  })

  describe('previewPatch / selectPatchedPresentation', () => {
    function makeDocWithMaster() {
      const slide = makeSlide('s-1')
      const master = createMsoMaster('shape')
      master.transform = { x: 100, y: 200, width: 50, height: 60, rotation: 0 }
      const appearance = createAppearance(master.id, 's-1')
      slide.appearanceIds = [appearance.id]
      const pres = makePresentation({
        slideOrder: ['s-1'],
        slidesById: { 's-1': slide },
        mastersById: { [master.id]: master },
        appearancesById: { [appearance.id]: appearance }
      })
      return { pres, master }
    }

    it('selectPatchedPresentation returns null when document is null', () => {
      expect(selectPatchedPresentation(useDocumentStore.getState())).toBeNull()
    })

    it('selectPatchedPresentation returns document unchanged when no patch is set', () => {
      const { pres } = makeDocWithMaster()
      useDocumentStore.getState().setDocument(pres)
      const result = selectPatchedPresentation(useDocumentStore.getState())
      expect(result).toBe(useDocumentStore.getState().document)
    })

    it('setPreviewPatch causes selectPatchedPresentation to return updated master transform', () => {
      const { pres, master } = makeDocWithMaster()
      useDocumentStore.getState().setDocument(pres)

      const newTransform = { x: 500, y: 600, width: 50, height: 60, rotation: 0 }
      useDocumentStore.getState().setPreviewPatch({ masterId: master.id, transform: newTransform })

      const result = selectPatchedPresentation(useDocumentStore.getState())
      expect(result?.mastersById[master.id].transform).toEqual(newTransform)
    })

    it('setPreviewPatch can preview a fill change without mutating the original document', () => {
      const { pres, master } = makeDocWithMaster()
      master.objectStyle.defaultState.fill = {
        kind: 'linear-gradient',
        rotation: 90,
        stops: [
          { offset: 0, color: '#112233' },
          { offset: 1, color: '#445566' }
        ]
      }
      useDocumentStore.getState().setDocument(pres)

      const originalFill =
        useDocumentStore.getState().document?.mastersById[master.id].objectStyle.defaultState.fill

      useDocumentStore.getState().setPreviewPatch({
        masterId: master.id,
        fill: {
          kind: 'linear-gradient',
          rotation: 15,
          stops: [
            { offset: 0, color: '#112233' },
            { offset: 1, color: '#445566' }
          ]
        }
      })

      const result = selectPatchedPresentation(useDocumentStore.getState())

      expect(result?.mastersById[master.id].objectStyle.defaultState.fill).toEqual({
        kind: 'linear-gradient',
        rotation: 15,
        stops: [
          { offset: 0, color: '#112233' },
          { offset: 1, color: '#445566' }
        ]
      })
      expect(
        useDocumentStore.getState().document?.mastersById[master.id].objectStyle.defaultState.fill
      ).toEqual(originalFill)
    })

    it('patch does not mutate the original document', () => {
      const { pres, master } = makeDocWithMaster()
      useDocumentStore.getState().setDocument(pres)

      useDocumentStore.getState().setPreviewPatch({
        masterId: master.id,
        transform: { x: 999, y: 999, width: 50, height: 60, rotation: 0 }
      })

      // Original document should be untouched
      expect(useDocumentStore.getState().document?.mastersById[master.id].transform.x).toBe(100)
    })

    it('setPreviewPatch(null) clears the patch and returns the original document', () => {
      const { pres, master } = makeDocWithMaster()
      useDocumentStore.getState().setDocument(pres)
      useDocumentStore.getState().setPreviewPatch({
        masterId: master.id,
        transform: { x: 500, y: 600, width: 50, height: 60, rotation: 0 }
      })

      useDocumentStore.getState().setPreviewPatch(null)

      const result = selectPatchedPresentation(useDocumentStore.getState())
      expect(result?.mastersById[master.id].transform.x).toBe(100)
    })

    it('patch only affects the specified master — other masters are unchanged', () => {
      const slide = makeSlide('s-1')
      const master1 = createMsoMaster('shape')
      master1.transform = { x: 10, y: 20, width: 30, height: 40, rotation: 0 }
      const master2 = createMsoMaster('shape')
      master2.transform = { x: 50, y: 60, width: 70, height: 80, rotation: 0 }
      const app1 = createAppearance(master1.id, 's-1')
      const app2 = createAppearance(master2.id, 's-1')
      slide.appearanceIds = [app1.id, app2.id]
      useDocumentStore.getState().setDocument(
        makePresentation({
          slideOrder: ['s-1'],
          slidesById: { 's-1': slide },
          mastersById: { [master1.id]: master1, [master2.id]: master2 },
          appearancesById: { [app1.id]: app1, [app2.id]: app2 }
        })
      )

      useDocumentStore.getState().setPreviewPatch({
        masterId: master1.id,
        transform: { x: 999, y: 999, width: 30, height: 40, rotation: 0 }
      })

      const result = selectPatchedPresentation(useDocumentStore.getState())
      expect(result?.mastersById[master2.id].transform.x).toBe(50)
    })

    it('patch does not push history or mark document dirty', () => {
      const { pres, master } = makeDocWithMaster()
      useDocumentStore.getState().setDocument(pres)
      const historyLengthBefore = useDocumentStore.getState().history.length

      useDocumentStore.getState().setPreviewPatch({
        masterId: master.id,
        transform: { x: 500, y: 600, width: 50, height: 60, rotation: 0 }
      })

      expect(useDocumentStore.getState().history.length).toBe(historyLengthBefore)
    })
  })

  describe('convertToSingleAppearance', () => {
    function makeDocWithMso() {
      const slide1 = makeSlide('s-1')
      const slide2 = makeSlide('s-2')
      const master = createMsoMaster('shape')
      master.isMultiSlideObject = true
      const app1 = createAppearance(master.id, 's-1')
      const app2 = createAppearance(master.id, 's-2')
      slide1.appearanceIds = [app1.id]
      slide2.appearanceIds = [app2.id]
      const pres = makePresentation({
        slideOrder: ['s-1', 's-2'],
        slidesById: { 's-1': slide1, 's-2': slide2 },
        mastersById: { [master.id]: master },
        appearancesById: { [app1.id]: app1, [app2.id]: app2 }
      })
      return { pres, master, app1, app2 }
    }

    it('creates a new master with a different id', () => {
      const { pres, master, app1 } = makeDocWithMso()
      useDocumentStore.getState().setDocument(pres)

      useDocumentStore.getState().convertToSingleAppearance(app1.id)

      const state = useDocumentStore.getState()
      const masterIds = Object.keys(state.document?.mastersById ?? {})
      expect(masterIds).toHaveLength(2)
      expect(masterIds).toContain(master.id)
      const newMasterId = masterIds.find((id) => id !== master.id)
      expect(newMasterId).toBeDefined()
    })

    it('re-points the converted appearance at the new master', () => {
      const { pres, master, app1 } = makeDocWithMso()
      useDocumentStore.getState().setDocument(pres)

      useDocumentStore.getState().convertToSingleAppearance(app1.id)

      const state = useDocumentStore.getState()
      const updatedAppearance = state.document?.appearancesById[app1.id]
      expect(updatedAppearance?.masterId).not.toBe(master.id)
    })

    it('does not affect the other appearance of the original master', () => {
      const { pres, master, app1, app2 } = makeDocWithMso()
      useDocumentStore.getState().setDocument(pres)

      useDocumentStore.getState().convertToSingleAppearance(app1.id)

      const state = useDocumentStore.getState()
      expect(state.document?.appearancesById[app2.id].masterId).toBe(master.id)
    })

    it('the new master does not have isMultiSlideObject set', () => {
      const { pres, master, app1 } = makeDocWithMso()
      useDocumentStore.getState().setDocument(pres)

      useDocumentStore.getState().convertToSingleAppearance(app1.id)

      const state = useDocumentStore.getState()
      const masterIds = Object.keys(state.document?.mastersById ?? {})
      const newMasterId = masterIds.find((id) => id !== master.id) ?? ''
      expect(state.document?.mastersById[newMasterId]?.isMultiSlideObject).toBeFalsy()
    })

    it('pushes history and marks document dirty', () => {
      const { pres, app1 } = makeDocWithMso()
      useDocumentStore.getState().setDocument(pres)
      const historyLengthBefore = useDocumentStore.getState().history.length

      useDocumentStore.getState().convertToSingleAppearance(app1.id)

      const state = useDocumentStore.getState()
      expect(state.isDirty).toBe(true)
      expect(state.history.length).toBe(historyLengthBefore + 1)
    })

    it('is a no-op when appearanceId does not exist', () => {
      useDocumentStore.getState().setDocument(makePresentation())
      const historyLengthBefore = useDocumentStore.getState().history.length

      useDocumentStore.getState().convertToSingleAppearance('nonexistent')

      expect(useDocumentStore.getState().history.length).toBe(historyLengthBefore)
    })
  })

  describe('selectPatchedPresentation', () => {
    it('returns the same snapshot for repeated reads of the same patched state', () => {
      const master = createMsoMaster('shape')
      master.transform = { x: 100, y: 200, width: 50, height: 50, rotation: 0 }

      const document = makePresentation({ mastersById: { [master.id]: master } })
      const previewPatch = {
        masterId: master.id,
        transform: { ...master.transform, x: 300, y: 400 }
      }

      const state = {
        ...useDocumentStore.getState(),
        document,
        previewPatch
      }

      const first = selectPatchedPresentation(state)
      const second = selectPatchedPresentation(state)

      expect(first).toBe(second)
      expect(first?.mastersById[master.id].transform.x).toBe(300)
      expect(first?.mastersById[master.id].transform.y).toBe(400)
    })
  })
})
