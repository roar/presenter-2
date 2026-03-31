import { describe, it, expect, beforeEach } from 'vitest'
import { useDocumentStore } from './documentStore'
import type { Document, Slide } from '../../../shared/model/types'

function makeDocument(overrides?: Partial<Document>): Document {
  return {
    id: 'doc-1',
    title: 'Test presentation',
    slides: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides
  }
}

function makeSlide(id: string): Slide {
  return { id, elements: [] }
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
      const doc = makeDocument()
      useDocumentStore.getState().setDocument(doc)

      const state = useDocumentStore.getState()
      expect(state.document).toEqual(doc)
      expect(state.isDirty).toBe(true)
    })
  })

  describe('addSlide / removeSlide', () => {
    it('adds a slide to the document', () => {
      useDocumentStore.getState().setDocument(makeDocument())
      useDocumentStore.getState().addSlide(makeSlide('s-1'))

      expect(useDocumentStore.getState().document?.slides).toHaveLength(1)
    })

    it('removes a slide by id', () => {
      useDocumentStore.getState().setDocument(makeDocument({ slides: [makeSlide('s-1')] }))
      useDocumentStore.getState().removeSlide('s-1')

      expect(useDocumentStore.getState().document?.slides).toHaveLength(0)
    })

    it('clears selection when the selected slide is removed', () => {
      useDocumentStore.getState().setDocument(makeDocument({ slides: [makeSlide('s-1')] }))
      useDocumentStore.getState().selectSlide('s-1')
      useDocumentStore.getState().removeSlide('s-1')

      expect(useDocumentStore.getState().ui.selectedSlideId).toBeNull()
    })
  })

  describe('undo / redo', () => {
    it('undoes the last change', () => {
      useDocumentStore.getState().setDocument(makeDocument())
      useDocumentStore.getState().addSlide(makeSlide('s-1'))
      useDocumentStore.getState().undo()

      expect(useDocumentStore.getState().document?.slides).toHaveLength(0)
    })

    it('redoes an undone change', () => {
      useDocumentStore.getState().setDocument(makeDocument())
      useDocumentStore.getState().addSlide(makeSlide('s-1'))
      useDocumentStore.getState().undo()
      useDocumentStore.getState().redo()

      expect(useDocumentStore.getState().document?.slides).toHaveLength(1)
    })

    it('discards redo history when a new change is made after undo', () => {
      useDocumentStore.getState().setDocument(makeDocument())
      useDocumentStore.getState().addSlide(makeSlide('s-1'))
      useDocumentStore.getState().undo()
      useDocumentStore.getState().addSlide(makeSlide('s-2'))
      useDocumentStore.getState().redo() // nothing to redo

      expect(useDocumentStore.getState().document?.slides.map((s) => s.id)).toEqual(['s-2'])
    })

    it('does nothing when there is no history to undo', () => {
      useDocumentStore.getState().setDocument(makeDocument())
      useDocumentStore.getState().undo() // only one entry — initial setDocument
      useDocumentStore.getState().undo() // should be a no-op

      expect(useDocumentStore.getState().document).not.toBeNull()
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
