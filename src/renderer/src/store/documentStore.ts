import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  Color,
  Fill,
  GrainEffect,
  Presentation,
  Slide,
  SlideId,
  MsoMaster,
  Transform,
  AppearanceId,
  TargetedAnimation,
  AnimationId,
  AnimationTrigger,
  Easing,
  Position,
  SlideTransition
} from '../../../shared/model/types'
import type { ColorConstantId } from '../../../shared/model/types'
import { DEFAULT_GRAIN_EFFECT } from '../../../shared/model/types'
import type { AuthContext } from '../../../shared/auth/types'
import { nullAuthContext } from '../../../shared/auth/types'
import type { DocumentRepository } from '../repository/DocumentRepository'
import { createAppearance, createPresentation, createSlide } from '../../../shared/model/factories'
import {
  createOrReuseColorConstant,
  deleteColorConstant,
  ensurePresentationColorConstants
} from '../../../shared/model/colors'
import {
  getMoveEffectDelta,
  syncMoveEffectDelta,
  syncMoveEffectPath
} from '../../../shared/model/movePath'
import {
  buildMoveCanvasSelection,
  type MoveCanvasSelectionState,
  type TransformChainStepInput
} from './animationCanvasModel'

// ── UI-only state (never persisted) ──────────────────────────────────────────

interface UiState {
  selectedSlideId: SlideId | null
  selectedElementIds: string[]
  selectedAnimationId: AnimationId | null
  zoom: number
  clipboard: MsoMaster | null
}

// ── Preview patch ─────────────────────────────────────────────────────────────

export type PreviewPatch =
  | { masterId: string; transform?: Transform; fill?: Fill | undefined }
  | { slideId: string; backgroundFill: Fill | undefined }

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
  selectAnimation(id: AnimationId | null): void
  setZoom(zoom: number): void
  updatePresentationTitle(title: string): void
  addSlide(slide: Slide): void
  removeSlide(id: SlideId): void
  insertElement(slideId: SlideId, master: MsoMaster): void
  moveElement(masterId: string, x: number, y: number): void
  updateMasterTransform(masterId: string, transform: Partial<Transform>): void
  moveSlide(fromIndex: number, toIndex: number): void
  moveAnimation(slideId: SlideId, fromIndex: number, toIndex: number): void
  copyElement(masterId: string): void
  pasteElement(slideId: SlideId): void
  addMoveAnimation(appearanceId: AppearanceId, afterAnimationId?: AnimationId): void
  addScaleAnimation(appearanceId: AppearanceId, afterAnimationId?: AnimationId): void
  addRotateAnimation(appearanceId: AppearanceId, afterAnimationId?: AnimationId): void
  removeAnimation(animationId: AnimationId): void
  updateAnimationTrigger(animationId: AnimationId, trigger: AnimationTrigger): void
  updateAnimationOffset(animationId: AnimationId, offset: number): void
  updateAnimationDuration(animationId: AnimationId, duration: number): void
  updateAnimationEasing(animationId: AnimationId, easing: Easing): void
  updateAnimationNumericTo(animationId: AnimationId, value: number): void
  updateAnimationMoveDelta(animationId: AnimationId, delta: Position): void
  updateAnimationMovePath(
    animationId: AnimationId,
    path: Extract<TargetedAnimation['effect'], { type: 'move' }>['path']
  ): void
  updateSlideTransitionTrigger(slideId: SlideId, trigger: 'none' | 'on-click'): void
  updateSlideTransitionDuration(slideId: SlideId, duration: number): void
  updateSlideTransitionEasing(slideId: SlideId, easing: Easing): void
  updateSlideTransitionKind(slideId: SlideId, kind: SlideTransition['kind']): void
  addColorConstant(): void
  nameColorConstant(value: string, name: string): ColorConstantId | null
  updateColorConstantName(colorId: ColorConstantId, name: string): void
  updateColorConstantValue(colorId: ColorConstantId, value: string): void
  deleteColorConstant(colorId: ColorConstantId): void
  updateSlideBackgroundColor(slideId: SlideId, color: Color | undefined): void
  updateSlideBackgroundFill(slideId: SlideId, fill: Fill | undefined): void
  updateSlideBackgroundGrain(slideId: SlideId, grain: Partial<GrainEffect>): void
  resetSlideBackground(slideId: SlideId): void
  setSlideBackgroundAsDefault(slideId: SlideId): void
  updatePresentationDefaultBackgroundFill(fill: Fill | undefined): void
  updatePresentationDefaultBackgroundGrain(grain: Partial<GrainEffect>): void
  updateObjectFill(masterId: string, fill: Fill | undefined): void
  updateObjectGrain(masterId: string, grain: Partial<GrainEffect>): void
  updateObjectStroke(masterId: string, color: Color | undefined): void
  updateTextColor(masterId: string, color: Color | undefined): void
  updateTextShadowColor(masterId: string, color: Color | undefined): void
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

function cloneEasing(easing: Easing): Easing {
  return JSON.parse(JSON.stringify(easing)) as Easing
}

function defaultAnimationEasing(): Easing {
  return { kind: 'cubic-bezier', x1: 0.645, y1: 0.045, x2: 0.355, y2: 1 }
}

function resolveInheritedAnimationEasing(
  animationsById: Presentation['animationsById'],
  animationIds: AnimationId[],
  afterAnimationId?: AnimationId
): Easing {
  const sourceAnimationId = afterAnimationId ?? animationIds[animationIds.length - 1]
  if (!sourceAnimationId) {
    return defaultAnimationEasing()
  }

  const sourceAnimation = animationsById[sourceAnimationId]
  if (!sourceAnimation) {
    return defaultAnimationEasing()
  }

  return cloneEasing(sourceAnimation.easing)
}

function pushHistory(state: DocumentState, doc: Presentation): void {
  // Discard any redo history ahead of current position
  state.history = state.history.slice(0, state.historyIndex + 1)
  state.history.push(snapshot(doc))
  state.historyIndex = state.history.length - 1
}

const DEFAULT_SLIDE_TRANSITION: SlideTransition = {
  kind: 'fade-through-color',
  duration: 0.5,
  easing: 'ease-in-out'
}

function ensureSlideTransition(slide: Slide): SlideTransition {
  if (!slide.transition) {
    slide.transition = { ...DEFAULT_SLIDE_TRANSITION }
  }

  return slide.transition
}

function insertAnimationIdAfter(
  animationIds: string[],
  newAnimationId: string,
  afterAnimationId?: string
): void {
  if (!afterAnimationId) {
    animationIds.push(newAnimationId)
    return
  }

  const afterIndex = animationIds.indexOf(afterAnimationId)
  if (afterIndex === -1) {
    animationIds.push(newAnimationId)
    return
  }

  animationIds.splice(afterIndex + 1, 0, newAnimationId)
}

function syncAppearanceAnimationIdsForSlide(document: Presentation, slide: Slide): void {
  const appearanceIds = new Set(slide.appearanceIds)

  for (const appearanceId of appearanceIds) {
    const appearance = document.appearancesById[appearanceId]
    if (!appearance) continue
    appearance.animationIds = slide.animationOrder.filter((animationId) => {
      const animation = document.animationsById[animationId]
      return getAnimationTargetAppearanceId(animation) === appearanceId
    })
  }
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

  if (
    patchedPresentationCache.document === document &&
    patchedPresentationCache.previewPatch === previewPatch
  ) {
    return patchedPresentationCache.result
  }

  let result: Presentation

  if ('slideId' in previewPatch) {
    const slide = document.slidesById[previewPatch.slideId]
    if (!slide) return document
    result = {
      ...document,
      slidesById: {
        ...document.slidesById,
        [previewPatch.slideId]: {
          ...slide,
          background: { ...slide.background, fill: previewPatch.backgroundFill }
        }
      }
    }
  } else {
    const master = document.mastersById[previewPatch.masterId]
    if (!master) return document
    if (previewPatch.transform == null && previewPatch.fill === undefined) return document
    result = {
      ...document,
      mastersById: {
        ...document.mastersById,
        [previewPatch.masterId]: {
          ...master,
          transform: previewPatch.transform ?? master.transform,
          objectStyle:
            previewPatch.fill === undefined
              ? master.objectStyle
              : {
                  ...master.objectStyle,
                  defaultState: {
                    ...master.objectStyle.defaultState,
                    fill: previewPatch.fill
                  }
                }
        }
      }
    }
  }

  patchedPresentationCache.document = document
  patchedPresentationCache.previewPatch = previewPatch
  patchedPresentationCache.result = result

  return result
}

export interface SelectedAnimationGroup {
  slideId: SlideId
  appearanceId: AppearanceId
  masterId: string
  animationIds: AnimationId[]
  selectedAnimation: TargetedAnimation
  moveAnimation: TargetedAnimation | null
  transformSteps: TransformChainStepInput[]
  moveSteps: Array<{
    animationId: AnimationId
    delta: Position
    cumulativeDelta: Position
    path?: Extract<TargetedAnimation['effect'], { type: 'move' }>['path']
  }>
  moveCanvasSelection: MoveCanvasSelectionState
}

function getAnimationTargetAppearanceId(animation: TargetedAnimation): AppearanceId | null {
  return animation.target.kind === 'appearance' ? animation.target.appearanceId : null
}

export function selectSelectedAnimationGroup(state: DocumentState): SelectedAnimationGroup | null {
  const document = state.document
  const selectedAnimationId = state.ui.selectedAnimationId

  if (!document || !selectedAnimationId) return null

  const selectedAnimation = document.animationsById[selectedAnimationId]
  if (!selectedAnimation) return null

  const appearanceId = getAnimationTargetAppearanceId(selectedAnimation)
  if (!appearanceId) return null

  const appearance = document.appearancesById[appearanceId]
  if (!appearance) return null

  const slide = document.slidesById[appearance.slideId]
  if (!slide) return null

  const master = document.mastersById[appearance.masterId]
  if (!master) return null

  const animationIds = slide.animationOrder.filter((animationId) => {
    const animation = document.animationsById[animationId]
    return getAnimationTargetAppearanceId(animation) === appearanceId
  })
  const moveAnimations = animationIds
    .map((animationId) => document.animationsById[animationId])
    .filter((animation): animation is TargetedAnimation => animation?.effect.type === 'move')
  const transformSteps = animationIds.reduce<TransformChainStepInput[]>((steps, animationId) => {
    const animation = document.animationsById[animationId]
    if (!animation) return steps
    if (animation.effect.type === 'move') {
      steps.push({
        animationId: animation.id,
        type: 'move',
        delta: getMoveEffectDelta(animation.effect),
        path: animation.effect.path
      })
    } else if (animation.effect.type === 'scale') {
      steps.push({
        animationId: animation.id,
        type: 'scale',
        scale: animation.effect.to
      })
    } else if (animation.effect.type === 'rotate') {
      steps.push({
        animationId: animation.id,
        type: 'rotate',
        rotation: animation.effect.to
      })
    }
    return steps
  }, [])
  const moveAnimation = moveAnimations[0] ?? null
  const moveSteps = moveAnimations.reduce<SelectedAnimationGroup['moveSteps']>(
    (steps, animation) => {
      const delta = getMoveEffectDelta(animation.effect)
      const previous = steps[steps.length - 1]?.cumulativeDelta ?? { x: 0, y: 0 }
      steps.push({
        animationId: animation.id,
        delta,
        path: animation.effect.path,
        cumulativeDelta: {
          x: previous.x + delta.x,
          y: previous.y + delta.y
        }
      })
      return steps
    },
    []
  )
  const moveCanvasSelection = buildMoveCanvasSelection(
    moveSteps.map((step) => ({
      animationId: step.animationId,
      delta: step.delta,
      path: step.path
    })),
    selectedAnimation.effect.type === 'move' ? selectedAnimation.id : null
  )

  if (
    selectedAnimationGroupCache.document === document &&
    selectedAnimationGroupCache.selectedAnimationId === selectedAnimationId &&
    selectedAnimationGroupCache.result?.appearanceId === appearanceId &&
    selectedAnimationGroupCache.result?.masterId === master.id &&
    selectedAnimationGroupCache.result?.animationIds.length === animationIds.length &&
    selectedAnimationGroupCache.result?.animationIds.every(
      (id, index) => id === animationIds[index]
    ) &&
    selectedAnimationGroupCache.result?.selectedAnimation === selectedAnimation &&
    selectedAnimationGroupCache.result?.moveAnimation === moveAnimation &&
    selectedAnimationGroupCache.result?.moveCanvasSelection.activeSegment?.animationId ===
      moveCanvasSelection.activeSegment?.animationId &&
    selectedAnimationGroupCache.result?.moveCanvasSelection.historySegments.length ===
      moveCanvasSelection.historySegments.length &&
    selectedAnimationGroupCache.result?.moveCanvasSelection.activePoints.length ===
      moveCanvasSelection.activePoints.length &&
    selectedAnimationGroupCache.result?.transformSteps.length === transformSteps.length &&
    selectedAnimationGroupCache.result?.transformSteps.every((step, index) => {
      const candidate = transformSteps[index]
      if (
        !candidate ||
        step.animationId !== candidate.animationId ||
        step.type !== candidate.type
      ) {
        return false
      }
      if (step.type === 'move' && candidate.type === 'move') {
        return (
          step.delta.x === candidate.delta.x &&
          step.delta.y === candidate.delta.y &&
          step.path === candidate.path
        )
      }
      if (step.type === 'scale' && candidate.type === 'scale') {
        return step.scale === candidate.scale
      }
      return (
        step.type === 'rotate' &&
        candidate.type === 'rotate' &&
        step.rotation === candidate.rotation
      )
    }) &&
    selectedAnimationGroupCache.result?.moveSteps.length === moveSteps.length &&
    selectedAnimationGroupCache.result?.moveSteps.every(
      (step, index) =>
        step.animationId === moveSteps[index]?.animationId &&
        step.delta.x === moveSteps[index]?.delta.x &&
        step.delta.y === moveSteps[index]?.delta.y &&
        step.path === moveSteps[index]?.path &&
        step.cumulativeDelta.x === moveSteps[index]?.cumulativeDelta.x &&
        step.cumulativeDelta.y === moveSteps[index]?.cumulativeDelta.y
    )
  ) {
    return selectedAnimationGroupCache.result
  }

  const result = {
    slideId: appearance.slideId,
    appearanceId,
    masterId: master.id,
    animationIds,
    selectedAnimation,
    moveAnimation,
    transformSteps,
    moveSteps,
    moveCanvasSelection
  }

  selectedAnimationGroupCache.document = document
  selectedAnimationGroupCache.selectedAnimationId = selectedAnimationId
  selectedAnimationGroupCache.result = result

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

const selectedAnimationGroupCache: {
  document: Presentation | null
  selectedAnimationId: AnimationId | null
  result: SelectedAnimationGroup | null
} = {
  document: null,
  selectedAnimationId: null,
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
      selectedAnimationId: null,
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
        ensurePresentationColorConstants(presentation)
        state.document = presentation
        state.history = [snapshot(presentation)]
        state.historyIndex = 0
        state.isDirty = true
        state.ui.selectedSlideId = slide.id
        state.ui.selectedElementIds = []
        state.ui.selectedAnimationId = null
      })
    },

    async loadDocument(repo, id, auth = nullAuthContext) {
      const presentation = await repo.load(id, auth)
      ensurePresentationColorConstants(presentation)
      set((state) => {
        state.document = presentation
        state.history = [snapshot(presentation)]
        state.historyIndex = 0
        state.isDirty = false
        state.ui.selectedSlideId = presentation.slideOrder[0] ?? null
        state.ui.selectedAnimationId = null
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
        ensurePresentationColorConstants(doc)
        state.document = doc
        pushHistory(state, doc)
        state.isDirty = true
      })
    },

    selectSlide(id) {
      set((state) => {
        state.ui.selectedSlideId = id
        state.ui.selectedElementIds = []
        state.ui.selectedAnimationId = null
      })
    },

    selectElements(ids) {
      set((state) => {
        state.ui.selectedElementIds = ids
        state.ui.selectedAnimationId = null
      })
    },

    selectAnimation(id) {
      set((state) => {
        state.ui.selectedAnimationId = id
        state.ui.selectedElementIds = []
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
        ensurePresentationColorConstants(state.document)
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

    updateMasterTransform(masterId, transform) {
      set((state) => {
        if (!state.document) return
        const master = state.document.mastersById[masterId]
        if (!master) return
        Object.assign(master.transform, transform)
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

    moveAnimation(slideId, fromIndex, toIndex) {
      set((state) => {
        if (!state.document) return
        const slide = state.document.slidesById[slideId]
        if (!slide) return
        const order = slide.animationOrder
        if (
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= order.length ||
          toIndex >= order.length ||
          fromIndex === toIndex
        ) {
          return
        }

        const [animationId] = order.splice(fromIndex, 1)
        order.splice(toIndex, 0, animationId)
        syncAppearanceAnimationIdsForSlide(state.document, slide)
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
        ensurePresentationColorConstants(state.document)
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    addMoveAnimation(appearanceId, afterAnimationId) {
      set((state) => {
        if (!state.document) return
        const appearance = state.document.appearancesById[appearanceId]
        if (!appearance) return
        const slide = state.document.slidesById[appearance.slideId]
        if (!slide) return
        const easing = resolveInheritedAnimationEasing(
          state.document.animationsById,
          appearance.animationIds,
          afterAnimationId
        )

        const animation: TargetedAnimation = {
          id: crypto.randomUUID(),
          trigger: 'on-click',
          offset: 0,
          duration: 1,
          easing,
          loop: { kind: 'none' },
          effect: { kind: 'action', type: 'move', delta: { x: 0, y: 100 } },
          target: { kind: 'appearance', appearanceId }
        }

        state.document.animationsById[animation.id] = animation
        insertAnimationIdAfter(appearance.animationIds, animation.id, afterAnimationId)
        insertAnimationIdAfter(slide.animationOrder, animation.id, afterAnimationId)
        state.ui.selectedAnimationId = animation.id
        state.ui.selectedElementIds = []
        state.ui.selectedSlideId = slide.id
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    addScaleAnimation(appearanceId, afterAnimationId) {
      set((state) => {
        if (!state.document) return
        const appearance = state.document.appearancesById[appearanceId]
        if (!appearance) return
        const slide = state.document.slidesById[appearance.slideId]
        if (!slide) return
        const easing = resolveInheritedAnimationEasing(
          state.document.animationsById,
          appearance.animationIds,
          afterAnimationId
        )

        const animation: TargetedAnimation = {
          id: crypto.randomUUID(),
          trigger: 'on-click',
          offset: 0,
          duration: 1,
          easing,
          loop: { kind: 'none' },
          effect: { kind: 'action', type: 'scale', to: 1.5 },
          target: { kind: 'appearance', appearanceId }
        }

        state.document.animationsById[animation.id] = animation
        insertAnimationIdAfter(appearance.animationIds, animation.id, afterAnimationId)
        insertAnimationIdAfter(slide.animationOrder, animation.id, afterAnimationId)
        state.ui.selectedAnimationId = animation.id
        state.ui.selectedElementIds = []
        state.ui.selectedSlideId = slide.id
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    addRotateAnimation(appearanceId, afterAnimationId) {
      set((state) => {
        if (!state.document) return
        const appearance = state.document.appearancesById[appearanceId]
        if (!appearance) return
        const slide = state.document.slidesById[appearance.slideId]
        if (!slide) return
        const easing = resolveInheritedAnimationEasing(
          state.document.animationsById,
          appearance.animationIds,
          afterAnimationId
        )

        const animation: TargetedAnimation = {
          id: crypto.randomUUID(),
          trigger: 'on-click',
          offset: 0,
          duration: 1,
          easing,
          loop: { kind: 'none' },
          effect: { kind: 'action', type: 'rotate', to: 45 },
          target: { kind: 'appearance', appearanceId }
        }

        state.document.animationsById[animation.id] = animation
        insertAnimationIdAfter(appearance.animationIds, animation.id, afterAnimationId)
        insertAnimationIdAfter(slide.animationOrder, animation.id, afterAnimationId)
        state.ui.selectedAnimationId = animation.id
        state.ui.selectedElementIds = []
        state.ui.selectedSlideId = slide.id
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    removeAnimation(animationId) {
      set((state) => {
        if (!state.document) return
        const animation = state.document.animationsById[animationId]
        if (!animation) return

        const appearanceId = getAnimationTargetAppearanceId(animation)
        if (appearanceId) {
          const appearance = state.document.appearancesById[appearanceId]
          if (appearance) {
            appearance.animationIds = appearance.animationIds.filter((id) => id !== animationId)
            const slide = state.document.slidesById[appearance.slideId]
            if (slide) {
              slide.animationOrder = slide.animationOrder.filter((id) => id !== animationId)
            }
          }
        } else {
          for (const slide of Object.values(state.document.slidesById)) {
            slide.animationOrder = slide.animationOrder.filter((id) => id !== animationId)
          }
        }

        delete state.document.animationsById[animationId]

        if (state.ui.selectedAnimationId === animationId) {
          state.ui.selectedAnimationId = null
        }

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

    updateAnimationNumericTo(animationId, value) {
      set((state) => {
        if (!state.document) return
        const animation = state.document.animationsById[animationId]
        if (!animation) return
        if (
          animation.effect.type !== 'fade' &&
          animation.effect.type !== 'scale' &&
          animation.effect.type !== 'rotate'
        ) {
          return
        }
        animation.effect.to = value
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateAnimationMoveDelta(animationId, delta) {
      set((state) => {
        if (!state.document) return
        const animation = state.document.animationsById[animationId]
        if (!animation || animation.effect.type !== 'move') return
        syncMoveEffectDelta(animation.effect, delta)
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateAnimationMovePath(animationId, path) {
      set((state) => {
        if (!state.document) return
        const animation = state.document.animationsById[animationId]
        if (!animation || animation.effect.type !== 'move') return
        syncMoveEffectPath(animation.effect, path)
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateSlideTransitionTrigger(slideId, trigger) {
      set((state) => {
        if (!state.document) return
        const slide = state.document.slidesById[slideId]
        if (!slide) return
        if (trigger === 'none') {
          delete slide.transitionTriggerId
        } else {
          slide.transitionTriggerId = `transition:${slideId}`
        }
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateSlideTransitionDuration(slideId, duration) {
      set((state) => {
        if (!state.document) return
        const slide = state.document.slidesById[slideId]
        if (!slide) return
        ensureSlideTransition(slide).duration = duration
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateSlideTransitionEasing(slideId, easing) {
      set((state) => {
        if (!state.document) return
        const slide = state.document.slidesById[slideId]
        if (!slide) return
        ensureSlideTransition(slide).easing = easing
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateSlideTransitionKind(slideId, kind) {
      set((state) => {
        if (!state.document) return
        const slide = state.document.slidesById[slideId]
        if (!slide) return
        ensureSlideTransition(slide).kind = kind
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    addColorConstant() {
      set((state) => {
        if (!state.document) return
        state.document.colorConstantsById ??= {}
        const nextIndex = Object.keys(state.document.colorConstantsById).length + 1
        const id = crypto.randomUUID()
        state.document.colorConstantsById[id] = {
          id,
          name: `Color ${nextIndex}`,
          value: '#000000'
        }
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    nameColorConstant(value, name) {
      let colorId: ColorConstantId | null = null

      set((state) => {
        if (!state.document) return
        colorId = createOrReuseColorConstant(state.document, value, name)
        pushHistory(state, state.document)
        state.isDirty = true
      })

      return colorId
    },

    updateColorConstantName(colorId, name) {
      set((state) => {
        if (!state.document?.colorConstantsById?.[colorId]) return
        state.document.colorConstantsById[colorId].name = name
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateColorConstantValue(colorId, value) {
      set((state) => {
        if (!state.document?.colorConstantsById?.[colorId]) return
        state.document.colorConstantsById[colorId].value = value
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    deleteColorConstant(colorId) {
      set((state) => {
        if (!state.document?.colorConstantsById?.[colorId]) return
        deleteColorConstant(state.document, colorId)
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateSlideBackgroundColor(slideId, color) {
      set((state) => {
        const slide = state.document?.slidesById[slideId]
        if (!slide || !state.document) return
        slide.background.color = color
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateSlideBackgroundFill(slideId, fill) {
      set((state) => {
        const slide = state.document?.slidesById[slideId]
        if (!slide || !state.document) return
        slide.background.fill = fill
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateSlideBackgroundGrain(slideId, grain) {
      set((state) => {
        const slide = state.document?.slidesById[slideId]
        if (!slide || !state.document) return
        slide.background.grain = {
          ...DEFAULT_GRAIN_EFFECT,
          ...slide.background.grain,
          ...grain
        }
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    resetSlideBackground(slideId) {
      set((state) => {
        const slide = state.document?.slidesById[slideId]
        if (!slide || !state.document) return
        slide.background = {}
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    setSlideBackgroundAsDefault(slideId) {
      set((state) => {
        const slide = state.document?.slidesById[slideId]
        if (!slide || !state.document) return
        state.document.defaultBackground = { ...slide.background }
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updatePresentationDefaultBackgroundFill(fill) {
      set((state) => {
        if (!state.document) return
        state.document.defaultBackground = {
          ...state.document.defaultBackground,
          fill
        }
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updatePresentationDefaultBackgroundGrain(grain) {
      set((state) => {
        if (!state.document) return
        const existing = state.document.defaultBackground?.grain
        state.document.defaultBackground = {
          ...state.document.defaultBackground,
          grain: {
            ...DEFAULT_GRAIN_EFFECT,
            ...existing,
            ...grain
          }
        }
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateObjectFill(masterId, fill) {
      set((state) => {
        const master = state.document?.mastersById[masterId]
        if (!master || !state.document) return
        master.objectStyle.defaultState.fill = fill
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateObjectGrain(masterId, grain) {
      set((state) => {
        const master = state.document?.mastersById[masterId]
        if (!master || !state.document) return
        master.objectStyle.defaultState.grain = {
          ...DEFAULT_GRAIN_EFFECT,
          ...master.objectStyle.defaultState.grain,
          ...grain
        }
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateObjectStroke(masterId, color) {
      set((state) => {
        const master = state.document?.mastersById[masterId]
        if (!master || !state.document) return
        master.objectStyle.defaultState.stroke = color
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateTextColor(masterId, color) {
      set((state) => {
        const master = state.document?.mastersById[masterId]
        if (!master?.textStyle || !state.document) return
        master.textStyle.defaultState.color = color
        pushHistory(state, state.document)
        state.isDirty = true
      })
    },

    updateTextShadowColor(masterId, color) {
      set((state) => {
        const master = state.document?.mastersById[masterId]
        const textShadow = master?.textStyle?.defaultState.textShadow
        if (!textShadow || !state.document) return
        textShadow.color = color ?? textShadow.color
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
