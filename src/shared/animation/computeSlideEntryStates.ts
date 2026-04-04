import type { Presentation, MasterId, TargetedAnimation, TextShadow } from '../model/types'
import type { RenderedSlide, RenderedAppearance } from './types'

// ─── Propagated state ─────────────────────────────────────────────────────────

/**
 * The subset of animatable properties that propagate forward between MSO appearances.
 * Tracks animation-induced offsets only — NOT the master's base transform.
 */
export type PropagatedState = {
  visible: boolean
  opacity: number
  translateX: number // animation-induced offset (from move animations)
  translateY: number
  scale: number | null
  textShadow: TextShadow | null
  strokeDashoffset: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasEffect(
  appearanceId: string,
  animationsById: Record<string, TargetedAnimation>,
  predicate: (a: TargetedAnimation) => boolean
): boolean {
  return Object.values(animationsById).some(
    (a) => a.target.kind === 'appearance' && a.target.appearanceId === appearanceId && predicate(a)
  )
}

function getMoveDelta(effect: Extract<TargetedAnimation['effect'], { type: 'move' }>) {
  if ('delta' in effect) return effect.delta
  return effect.fromOffset
}

/**
 * Initial propagated state for the first appearance of a master (or non-MSO).
 * Uses initialVisibility and checks for build-in / line-draw animations.
 */
function defaultPropagatedState(
  appearanceId: string,
  initialVisibility: 'visible' | 'hidden',
  animationsById: Record<string, TargetedAnimation>
): PropagatedState {
  const hasBuildIn = hasEffect(appearanceId, animationsById, (a) => a.effect.kind === 'build-in')
  const hasLineDraw = hasEffect(appearanceId, animationsById, (a) => a.effect.type === 'line-draw')
  const visible = initialVisibility === 'visible' && !hasBuildIn
  return {
    visible,
    opacity: visible ? 1 : 0,
    translateX: 0,
    translateY: 0,
    scale: null,
    textShadow: null,
    strokeDashoffset: hasLineDraw ? 1 : null
  }
}

/**
 * Entry state for a subsequent MSO appearance, derived from the previous exit state.
 * If this appearance has a build-in, the element starts hidden again (regardless of
 * the propagated visibility).
 */
function entryStateFromPropagated(
  propagated: PropagatedState,
  appearanceId: string,
  animationsById: Record<string, TargetedAnimation>
): PropagatedState {
  const hasBuildIn = hasEffect(appearanceId, animationsById, (a) => a.effect.kind === 'build-in')
  const hasLineDraw = hasEffect(appearanceId, animationsById, (a) => a.effect.type === 'line-draw')

  if (hasBuildIn) {
    // A new build-in resets visibility — element waits to be triggered
    return {
      ...propagated,
      visible: false,
      opacity: 0,
      strokeDashoffset: hasLineDraw ? 1 : null
    }
  }

  return {
    ...propagated,
    strokeDashoffset: hasLineDraw ? 1 : propagated.strokeDashoffset
  }
}

/**
 * Applies all animations targeting this appearance at progress = 1 (fully complete)
 * to produce the exit state.
 */
function computeAppearanceExitState(
  entryState: PropagatedState,
  appearanceId: string,
  animationsById: Record<string, TargetedAnimation>
): PropagatedState {
  const state = { ...entryState }

  for (const anim of Object.values(animationsById)) {
    if (anim.target.kind !== 'appearance') continue
    if (anim.target.appearanceId !== appearanceId) continue

    const { effect } = anim

    if (effect.kind === 'build-in') {
      state.visible = true
      if (effect.type === 'fade') {
        state.opacity = effect.to
      } else if (effect.type === 'move') {
        state.translateX = 0
        state.translateY = 0
      } else if (effect.type === 'scale') {
        state.scale = effect.to
      } else if (effect.type === 'line-draw') {
        state.opacity = 1
        state.strokeDashoffset = 0
      }
    } else if (effect.kind === 'build-out') {
      if (effect.type === 'fade') {
        state.opacity = effect.to
        state.visible = false
      }
    } else if (effect.kind === 'action') {
      if (effect.type === 'move') {
        const delta = getMoveDelta(effect)
        state.translateX += delta.x
        state.translateY += delta.y
      } else if (effect.type === 'text-shadow') {
        state.textShadow = effect.to
      } else if (effect.type === 'line-draw') {
        state.strokeDashoffset = 0
      }
    }
  }

  return state
}

/**
 * Identifies which masters appear on more than one slide (MSO masters).
 */
function getMsoMasterIds(presentation: Presentation): Set<MasterId> {
  const masterSlideCount = new Map<string, Set<string>>()
  for (const app of Object.values(presentation.appearancesById)) {
    let slideIds = masterSlideCount.get(app.masterId)
    if (!slideIds) {
      slideIds = new Set()
      masterSlideCount.set(app.masterId, slideIds)
    }
    slideIds.add(app.slideId)
  }
  return new Set(
    [...masterSlideCount.entries()]
      .filter(([, slideIds]) => slideIds.size > 1)
      .map(([masterId]) => masterId)
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Computes MSO exit state chains by walking slides in order.
 *
 * Returns one Map<MasterId, PropagatedState> per slide in slideOrder.
 * Each map holds the accumulated exit state of MSO masters UP TO BUT NOT INCLUDING
 * that slide — i.e. the entry state context for appearances on that slide.
 *
 * This is the EXPENSIVE tier — depends on animation structure only, not master transforms.
 * Safe to memoize on `presentation` (not on a patched version during drag).
 */
export function computeMsoExitStateChains(
  presentation: Presentation
): Map<MasterId, PropagatedState>[] {
  const { slideOrder, slidesById, appearancesById, animationsById } = presentation
  const msoMasterIds = getMsoMasterIds(presentation)
  const result: Map<MasterId, PropagatedState>[] = []
  const runningExitStates = new Map<MasterId, PropagatedState>()

  for (const slideId of slideOrder) {
    // Snapshot BEFORE processing this slide's appearances — this is the entry context
    result.push(new Map(runningExitStates))

    const slide = slidesById[slideId]
    for (const appId of slide.appearanceIds) {
      const appearance = appearancesById[appId]
      if (!msoMasterIds.has(appearance.masterId)) continue

      // Compute entry state for this appearance
      const prevExitState = runningExitStates.get(appearance.masterId)
      const entryState = prevExitState
        ? entryStateFromPropagated(prevExitState, appearance.id, animationsById)
        : defaultPropagatedState(appearance.id, appearance.initialVisibility, animationsById)

      // Compute and cache exit state for downstream slides
      const exitState = computeAppearanceExitState(entryState, appearance.id, animationsById)
      runningExitStates.set(appearance.masterId, exitState)
    }
  }

  return result
}

/**
 * Renders the entry state for every slide, given pre-computed MSO exit chains.
 *
 * This is the CHEAP tier — O(total appearances). Reads master transforms directly
 * from `presentation.mastersById`, so passing a patched presentation (e.g. during
 * drag) automatically reflects updated positions without recomputing exit chains.
 */
export function renderAllSlideEntryStates(
  presentation: Presentation,
  msoExitStatesBySlide: Map<MasterId, PropagatedState>[]
): RenderedSlide[] {
  const { slideOrder, slidesById, appearancesById, mastersById, animationsById } = presentation
  const msoMasterIds = getMsoMasterIds(presentation)

  return slideOrder.map((slideId, slideIndex): RenderedSlide => {
    const slide = slidesById[slideId]
    const exitChainForSlide =
      msoExitStatesBySlide[slideIndex] ?? new Map<MasterId, PropagatedState>()

    const appearances: RenderedAppearance[] = slide.appearanceIds.map(
      (appId): RenderedAppearance => {
        const appearance = appearancesById[appId]
        // Read master directly — patched transforms are picked up automatically
        const master = mastersById[appearance.masterId]

        let propagated: PropagatedState
        if (msoMasterIds.has(master.id) && exitChainForSlide.has(master.id)) {
          propagated = entryStateFromPropagated(
            exitChainForSlide.get(master.id)!,
            appearance.id,
            animationsById
          )
        } else {
          propagated = defaultPropagatedState(
            appearance.id,
            appearance.initialVisibility,
            animationsById
          )
        }

        const translatePart = `translate(${propagated.translateX}px, ${propagated.translateY}px)`
        const transform =
          propagated.scale !== null ? `${translatePart} scale(${propagated.scale})` : translatePart

        return {
          appearance,
          master,
          colorConstantsById: presentation.colorConstantsById,
          visible: propagated.visible,
          opacity: propagated.opacity,
          transform,
          textShadow: propagated.textShadow,
          strokeDashoffset: propagated.strokeDashoffset
        }
      }
    )

    return {
      slide,
      appearances,
      colorConstantsById: presentation.colorConstantsById,
      defaultBackground: presentation.defaultBackground
    }
  })
}
