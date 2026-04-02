import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Presentation, Slide, SlideId, MsoMaster } from '../../../shared/model/types'
import type { AuthContext } from '../../../shared/auth/types'
import { nullAuthContext } from '../../../shared/auth/types'
import type { DocumentRepository } from '../repository/DocumentRepository'
import { createAppearance, createPresentation, createSlide } from '../../../shared/model/factories'

// ── UI-only state (never persisted) ──────────────────────────────────────────

interface UiState {
  selectedSlideId: SlideId | null
  selectedElementIds: string[]
  zoom: number
}

// ── History entry for undo/redo ───────────────────────────────────────────────

interface HistoryEntry {
  document: Presentation
}

// ── Full store state ──────────────────────────────────────────────────────────

interface DocumentState {
  document: Presentation | null
  ui: UiState
  history: HistoryEntry[]
  historyIndex: number // points to current position in history
  isDirty: boolean // unsaved changes

  // Actions
  newPresentation(): void
  loadDocument(repo: DocumentRepository, id: string, auth?: AuthContext): Promise<void>
  saveDocument(repo: DocumentRepository, auth?: AuthContext): Promise<void>
  setDocument(doc: Presentation): void
  selectSlide(id: SlideId | null): void
  selectElements(ids: string[]): void
  setZoom(zoom: number): void
  addSlide(slide: Slide): void
  removeSlide(id: SlideId): void
  insertElement(slideId: SlideId, master: MsoMaster): void
  moveSlide(fromIndex: number, toIndex: number): void
  undo(): void
  redo(): void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function snapshot(doc: Presentation): HistoryEntry {
  // JSON round-trip works on both plain objects and immer drafts (Proxy objects)
  return { document: JSON.parse(JSON.stringify(doc)) as Presentation }
}

function pushHistory(state: DocumentState, doc: Presentation): void {
  // Discard any redo history ahead of current position
  state.history = state.history.slice(0, state.historyIndex + 1)
  state.history.push(snapshot(doc))
  state.historyIndex = state.history.length - 1
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useDocumentStore = create<DocumentState>()(
  immer((set, get) => ({
    document: null,
    ui: {
      selectedSlideId: null,
      selectedElementIds: [],
      zoom: 1
    },
    history: [],
    historyIndex: -1,
    isDirty: false,

    newPresentation() {
      set((state) => {
        const presentation = createPresentation()
        const slide = createSlide()
        presentation.slideOrder = [slide.id]
        presentation.slidesById[slide.id] = slide
        state.document = presentation
        state.history = [snapshot(presentation)]
        state.historyIndex = 0
        state.isDirty = true
        state.ui.selectedSlideId = slide.id
        state.ui.selectedElementIds = []
      })
    },

    async loadDocument(repo, id, auth = nullAuthContext) {
      const presentation = await repo.load(id, auth)
      set((state) => {
        state.document = presentation
        state.history = [snapshot(presentation)]
        state.historyIndex = 0
        state.isDirty = false
        state.ui.selectedSlideId = presentation.slideOrder[0] ?? null
      })
    },

    async saveDocument(repo, auth = nullAuthContext) {
      const { document } = get()
      if (!document) return
      const saved = { ...document, updatedAt: new Date().toISOString() }
      await repo.save(saved, auth)
      set((state) => {
        state.isDirty = false
        if (state.document) state.document.updatedAt = saved.updatedAt
      })
    },

    setDocument(doc) {
      set((state) => {
        state.document = doc
        pushHistory(state, doc)
        state.isDirty = true
      })
    },

    selectSlide(id) {
      set((state) => {
        state.ui.selectedSlideId = id
        state.ui.selectedElementIds = []
      })
    },

    selectElements(ids) {
      set((state) => {
        state.ui.selectedElementIds = ids
      })
    },

    setZoom(zoom) {
      set((state) => {
        state.ui.zoom = zoom
      })
    },

    addSlide(slide) {
      set((state) => {
        if (!state.document) return
        state.document.slideOrder.push(slide.id)
        state.document.slidesById[slide.id] = slide
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    removeSlide(id) {
      set((state) => {
        if (!state.document) return
        state.document.slideOrder = state.document.slideOrder.filter((s) => s !== id)
        delete state.document.slidesById[id]
        if (state.ui.selectedSlideId === id) {
          state.ui.selectedSlideId = state.document.slideOrder[0] ?? null
        }
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    insertElement(slideId, master) {
      set((state) => {
        if (!state.document) return
        const slide = state.document.slidesById[slideId]
        if (!slide) return
        const appearance = createAppearance(master.id, slideId)
        state.document.mastersById[master.id] = master
        state.document.appearancesById[appearance.id] = appearance
        slide.appearanceIds.push(appearance.id)
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    moveSlide(fromIndex, toIndex) {
      set((state) => {
        if (!state.document) return
        const order = state.document.slideOrder
        const [id] = order.splice(fromIndex, 1)
        order.splice(toIndex, 0, id)
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    undo() {
      set((state) => {
        if (state.historyIndex <= 0) return
        state.historyIndex -= 1
        state.document = state.history[state.historyIndex].document
        state.isDirty = true
      })
    },

    redo() {
      set((state) => {
        if (state.historyIndex >= state.history.length - 1) return
        state.historyIndex += 1
        state.document = state.history[state.historyIndex].document
        state.isDirty = true
      })
    }
  }))
)
