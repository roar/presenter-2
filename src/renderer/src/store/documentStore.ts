import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Document, Slide, SlideId } from '../../../shared/model/types'
import type { AuthContext } from '../../../shared/auth/types'
import { nullAuthContext } from '../../../shared/auth/types'
import type { DocumentRepository } from '../repository/DocumentRepository'

// ── UI-only state (never persisted) ──────────────────────────────────────────

interface UiState {
  selectedSlideId: SlideId | null
  selectedElementIds: string[]
  zoom: number
}

// ── History entry for undo/redo ───────────────────────────────────────────────

interface HistoryEntry {
  document: Document
}

// ── Full store state ──────────────────────────────────────────────────────────

interface DocumentState {
  document: Document | null
  ui: UiState
  history: HistoryEntry[]
  historyIndex: number // points to current position in history
  isDirty: boolean // unsaved changes

  // Actions
  loadDocument(repo: DocumentRepository, id: string, auth?: AuthContext): Promise<void>
  saveDocument(repo: DocumentRepository, auth?: AuthContext): Promise<void>
  setDocument(doc: Document): void
  selectSlide(id: SlideId | null): void
  selectElements(ids: string[]): void
  setZoom(zoom: number): void
  addSlide(slide: Slide): void
  removeSlide(id: SlideId): void
  moveSlide(fromIndex: number, toIndex: number): void
  undo(): void
  redo(): void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function snapshot(doc: Document): HistoryEntry {
  // JSON round-trip works on both plain objects and immer drafts (Proxy objects)
  return { document: JSON.parse(JSON.stringify(doc)) as Document }
}

function pushHistory(state: DocumentState, doc: Document): void {
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

    async loadDocument(repo, id, auth = nullAuthContext) {
      const doc = await repo.load(id, auth)
      set((state) => {
        state.document = doc
        state.history = [snapshot(doc)]
        state.historyIndex = 0
        state.isDirty = false
        state.ui.selectedSlideId = doc.slides[0]?.id ?? null
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
        state.document.slides.push(slide)
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    removeSlide(id) {
      set((state) => {
        if (!state.document) return
        state.document.slides = state.document.slides.filter((s) => s.id !== id)
        if (state.ui.selectedSlideId === id) {
          state.ui.selectedSlideId = state.document.slides[0]?.id ?? null
        }
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    moveSlide(fromIndex, toIndex) {
      set((state) => {
        if (!state.document) return
        const slides = state.document.slides
        const [slide] = slides.splice(fromIndex, 1)
        slides.splice(toIndex, 0, slide)
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
