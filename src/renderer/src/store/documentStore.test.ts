import { describe, it, expect, beforeEach } from 'vitest'
import { useDocumentStore } from './documentStore'
import { createMsoMaster } from '../../../shared/model/factories'
import type { Presentation, Slide } from '../../../shared/model/types'

function makePresentation(overrides?: Partial<Presentation>): Presentation {
  return {
    id: 'pres-1',
    title: 'Test presentation',
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
    ui: { selectedSlideId: null, selectedElementIds: [], zoom: 1 },
    history: [],
    historyIndex: -1,
    isDirty: false
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
      const slideId = document!.slideOrder[0]
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
    it('sets the selected slide and clears element selection', () => {
      useDocumentStore.getState().selectElements(['e-1'])
      useDocumentStore.getState().selectSlide('s-1')

      const { ui } = useDocumentStore.getState()
      expect(ui.selectedSlideId).toBe('s-1')
      expect(ui.selectedElementIds).toHaveLength(0)
    })
  })
})
