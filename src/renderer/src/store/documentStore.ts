import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  Presentation,
  Slide,
  SlideId,
  MsoMaster,
  Transform,
  AppearanceId,
  TargetedAnimation,
  AnimationId,
  AnimationTrigger,
  Easing
} from '../../../shared/model/types'
import type { AuthContext } from '../../../shared/auth/types'
import { nullAuthContext } from '../../../shared/auth/types'
import type { DocumentRepository } from '../repository/DocumentRepository'
import { createAppearance, createPresentation, createSlide } from '../../../shared/model/factories'

// ── UI-only state (never persisted) ──────────────────────────────────────────

interface UiState {
  selectedSlideId: SlideId | null
  selectedElementIds: string[]
  zoom: number
  clipboard: MsoMaster | null
}

// ── Preview patch ─────────────────────────────────────────────────────────────

export interface PreviewPatch {
  masterId: string
  transform: Transform
}

// ── History entry for undo/redo ───────────────────────────────────────────────

interface HistoryEntry {
  document: Presentation
}

// ── Full store state ──────────────────────────────────────────────────────────

interface DocumentState {
  document: Presentation | null
  previewPatch: PreviewPatch | null
  ui: UiState
  history: HistoryEntry[]
  historyIndex: number // points to current position in history
  isDirty: boolean // unsaved changes

  // Actions
  setPreviewPatch(patch: PreviewPatch | null): void
  newPresentation(): void
  loadDocument(repo: DocumentRepository, id: string, auth?: AuthContext): Promise<void>
  saveDocument(repo: DocumentRepository, auth?: AuthContext): Promise<void>
  setDocument(doc: Presentation): void
  selectSlide(id: SlideId | null): void
  selectElements(ids: string[]): void
  setZoom(zoom: number): void
  updatePresentationTitle(title: string): void
  addSlide(slide: Slide): void
  removeSlide(id: SlideId): void
  insertElement(slideId: SlideId, master: MsoMaster): void
  moveElement(masterId: string, x: number, y: number): void
  moveSlide(fromIndex: number, toIndex: number): void
  copyElement(masterId: string): void
  pasteElement(slideId: SlideId): void
  addMoveAnimation(appearanceId: AppearanceId): void
  updateAnimationTrigger(animationId: AnimationId, trigger: AnimationTrigger): void
  updateAnimationOffset(animationId: AnimationId, offset: number): void
  updateAnimationDuration(animationId: AnimationId, duration: number): void
  updateAnimationEasing(animationId: AnimationId, easing: Easing): void
  convertToMultiSlideObject(masterId: string): void
  convertToSingleAppearance(appearanceId: string): void
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

// ── Selector ──────────────────────────────────────────────────────────────────

/**
 * Returns the document with the previewPatch master transform applied (O(1) structural sharing).
 * Returns null if there is no document. Returns the document unchanged if there is no patch.
 *
 * Use this for all rendering — canvas and thumbnails — so both see the same state during drag.
 */
export function selectPatchedPresentation(state: DocumentState): Presentation | null {
  const { document, previewPatch } = state
  if (!document) return null
  if (!previewPatch) return document
  const master = document.mastersById[previewPatch.masterId]
  if (!master) return document

  if (
    patchedPresentationCache.document === document &&
    patchedPresentationCache.previewPatch === previewPatch
  ) {
    return patchedPresentationCache.result
  }

  const result = {
    ...document,
    mastersById: {
      ...document.mastersById,
      [previewPatch.masterId]: { ...master, transform: previewPatch.transform }
    }
  }

  patchedPresentationCache.document = document
  patchedPresentationCache.previewPatch = previewPatch
  patchedPresentationCache.result = result

  return result
}

const patchedPresentationCache: {
  document: Presentation | null
  previewPatch: PreviewPatch | null
  result: Presentation | null
} = {
  document: null,
  previewPatch: null,
  result: null
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useDocumentStore = create<DocumentState>()(
  immer((set, get) => ({
    document: null,
    previewPatch: null,
    ui: {
      selectedSlideId: null,
      selectedElementIds: [],
      zoom: 1,
      clipboard: null
    },
    history: [],
    historyIndex: -1,
    isDirty: false,

    setPreviewPatch(patch) {
      set((state) => {
        state.previewPatch = patch
      })
    },

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

    updatePresentationTitle(title) {
      set((state) => {
        if (!state.document) return
        state.document.title = title
        pushHistory(state, state.document)
        state.isDirty = true
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

    moveElement(masterId, x, y) {
      set((state) => {
        if (!state.document) return
        const master = state.document.mastersById[masterId]
        if (!master) return
        master.transform.x = x
        master.transform.y = y
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

    copyElement(masterId) {
      set((state) => {
        if (!state.document) return
        const master = state.document.mastersById[masterId]
        if (!master) return
        state.ui.clipboard = JSON.parse(JSON.stringify(master)) as MsoMaster
      })
    },

    pasteElement(slideId) {
      set((state) => {
        if (!state.document || !state.ui.clipboard) return
        const slide = state.document.slidesById[slideId]
        if (!slide) return
        if (state.ui.clipboard.isMultiSlideObject) {
          // MSO paste: new Appearance pointing to the same master
          const appearance = createAppearance(state.ui.clipboard.id, slideId)
          state.document.appearancesById[appearance.id] = appearance
          slide.appearanceIds.push(appearance.id)
        } else {
          // Regular paste: clone the master with a new id and offset position
          const newMaster: MsoMaster = {
            ...(JSON.parse(JSON.stringify(state.ui.clipboard)) as MsoMaster),
            id: crypto.randomUUID(),
            transform: {
              ...state.ui.clipboard.transform,
              x: state.ui.clipboard.transform.x + 16,
              y: state.ui.clipboard.transform.y + 16
            }
          }
          const appearance = createAppearance(newMaster.id, slideId)
          state.document.mastersById[newMaster.id] = newMaster
          state.document.appearancesById[appearance.id] = appearance
          slide.appearanceIds.push(appearance.id)
        }
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    addMoveAnimation(appearanceId) {
      set((state) => {
        if (!state.document) return
        const appearance = state.document.appearancesById[appearanceId]
        if (!appearance) return
        const slide = state.document.slidesById[appearance.slideId]
        if (!slide) return

        const animation: TargetedAnimation = {
          id: crypto.randomUUID(),
          trigger: 'on-click',
          offset: 0,
          duration: 1,
          easing: { kind: 'cubic-bezier', x1: 0.645, y1: 0.045, x2: 0.355, y2: 1 },
          loop: { kind: 'none' },
          effect: { kind: 'action', type: 'move', fromOffset: { x: 0, y: 100 } },
          target: { kind: 'appearance', appearanceId }
        }

        state.document.animationsById[animation.id] = animation
        appearance.animationIds.push(animation.id)
        slide.animationOrder.push(animation.id)
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateAnimationTrigger(animationId, trigger) {
      set((state) => {
        if (!state.document) return
        const animation = state.document.animationsById[animationId]
        if (!animation) return
        animation.trigger = trigger
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateAnimationOffset(animationId, offset) {
      set((state) => {
        if (!state.document) return
        const animation = state.document.animationsById[animationId]
        if (!animation) return
        animation.offset = offset
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateAnimationDuration(animationId, duration) {
      set((state) => {
        if (!state.document) return
        const animation = state.document.animationsById[animationId]
        if (!animation) return
        animation.duration = duration
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateAnimationEasing(animationId, easing) {
      set((state) => {
        if (!state.document) return
        const animation = state.document.animationsById[animationId]
        if (!animation) return
        animation.easing = easing
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    convertToMultiSlideObject(masterId) {
      set((state) => {
        if (!state.document) return
        const master = state.document.mastersById[masterId]
        if (!master) return
        master.isMultiSlideObject = true
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    convertToSingleAppearance(appearanceId) {
      set((state) => {
        if (!state.document) return
        const appearance = state.document.appearancesById[appearanceId]
        if (!appearance) return
        const originalMaster = state.document.mastersById[appearance.masterId]
        if (!originalMaster) return
        const cloned = JSON.parse(JSON.stringify(originalMaster)) as MsoMaster
        delete cloned.isMultiSlideObject
        const newMaster: MsoMaster = { ...cloned, id: crypto.randomUUID() }
        state.document.mastersById[newMaster.id] = newMaster
        appearance.masterId = newMaster.id
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
