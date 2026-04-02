import type { Appearance, MsoMaster, TextShadow, TargetedAnimation } from '../model/types'
import type {
  PresentationTimeline,
  ScheduledAnimationEntry,
  FrameState,
  RenderedSlide,
  RenderedAppearance
} from './types'
import { applyEasing } from './applyEasing'

// ─── Lerp helpers ─────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpColor(a: string, b: string, t: number): string {
  const parse = (s: string) => {
    const m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/)
    if (!m) return null
    return [+m[1], +m[2], +m[3], m[4] !== undefined ? +m[4] : 1] as [number, number, number, number]
  }
  const ca = parse(a)
  const cb = parse(b)
  if (!ca || !cb) return t < 0.5 ? a : b
  const r = Math.round(lerp(ca[0], cb[0], t))
  const g = Math.round(lerp(ca[1], cb[1], t))
  const bl = Math.round(lerp(ca[2], cb[2], t))
  const al = lerp(ca[3], cb[3], t)
  return `rgba(${r}, ${g}, ${bl}, ${al.toFixed(4)})`
}

function getMoveDelta(effect: Extract<TargetedAnimation['effect'], { type: 'move' }>) {
  if ('delta' in effect) return effect.delta
  return effect.fromOffset
}

// ─── Appearance state resolution ──────────────────────────────────────────────

function hasEffect(
  appearanceId: string,
  animationsById: Record<string, TargetedAnimation>,
  predicate: (a: TargetedAnimation) => boolean
): boolean {
  return Object.values(animationsById).some(
    (a) => a.target.kind === 'appearance' && a.target.appearanceId === appearanceId && predicate(a)
  )
}

function resolveAppearanceState(
  appearance: Appearance,
  master: MsoMaster,
  scheduledAnimations: ScheduledAnimationEntry[],
  animationsById: Record<string, TargetedAnimation>,
  time: number
): RenderedAppearance {
  // Animations that target this appearance and have been scheduled
  const relevantEntries = scheduledAnimations.filter((entry) => {
    const anim = animationsById[entry.animationId]
    return anim?.target.kind === 'appearance' && anim.target.appearanceId === appearance.id
  })

  // Does this appearance have a build-in animation (anywhere in the presentation)?
  const hasBuildIn = hasEffect(appearance.id, animationsById, (a) => a.effect.kind === 'build-in')
  // Does it have a line-draw animation?
  const hasLineDraw = hasEffect(appearance.id, animationsById, (a) => a.effect.type === 'line-draw')

  // Initial state
  let visible = appearance.initialVisibility === 'visible' && !hasBuildIn
  let opacity = visible ? 1 : 0
  let translateX = 0
  let translateY = 0
  let scale: number | null = null
  let textShadow: TextShadow | null = null
  let strokeDashoffset: number | null = hasLineDraw ? 1 : null

  for (const entry of relevantEntries) {
    const anim = animationsById[entry.animationId]
    const localTime = time - entry.startTime
    if (localTime < 0) continue

    const rawProgress = Math.min(localTime / anim.duration, 1)
    const progress = applyEasing(anim.easing, rawProgress)
    const completed = rawProgress >= 1
    const effect = anim.effect

    if (effect.kind === 'build-in') {
      visible = true
      if (effect.type === 'fade') {
        opacity = lerp(opacity, effect.to, progress)
        if (completed) opacity = effect.to
      } else if (effect.type === 'move') {
        const delta = getMoveDelta(effect)
        translateX = lerp(delta.x, 0, progress)
        translateY = lerp(delta.y, 0, progress)
        if (completed) {
          translateX = 0
          translateY = 0
        }
      } else if (effect.type === 'scale') {
        scale = lerp(scale ?? 0, effect.to, progress)
        if (completed) scale = effect.to
      } else if (effect.type === 'line-draw') {
        opacity = 1
        strokeDashoffset = lerp(1, 0, progress)
        if (completed) strokeDashoffset = 0
      }
    } else if (effect.kind === 'build-out') {
      if (effect.type === 'fade') {
        opacity = lerp(opacity, effect.to, progress)
        if (completed) {
          opacity = effect.to
          visible = false
        }
      }
    } else if (effect.kind === 'action') {
      if (effect.type === 'move') {
        const delta = getMoveDelta(effect)
        const fromX = translateX
        const fromY = translateY
        translateX = lerp(fromX, fromX + delta.x, progress)
        translateY = lerp(fromY, fromY + delta.y, progress)
        if (completed) {
          translateX = fromX + delta.x
          translateY = fromY + delta.y
        }
      } else if (effect.type === 'text-shadow') {
        const from = textShadow ?? { offsetX: 0, offsetY: 0, blur: 0, color: 'rgba(0,0,0,0)' }
        textShadow = {
          offsetX: lerp(from.offsetX, effect.to.offsetX, progress),
          offsetY: lerp(from.offsetY, effect.to.offsetY, progress),
          blur: lerp(from.blur, effect.to.blur, progress),
          color: lerpColor(from.color, effect.to.color, progress)
        }
        if (completed) textShadow = effect.to
      } else if (effect.type === 'line-draw') {
        strokeDashoffset = lerp(1, 0, progress)
        if (completed) strokeDashoffset = 0
      }
    }
  }

  const translatePart = `translate(${translateX}px, ${translateY}px)`
  const transform = scale !== null ? `${translatePart} scale(${scale})` : translatePart

  return { appearance, master, visible, opacity, transform, textShadow, strokeDashoffset }
}

// ─── Slide rendering ──────────────────────────────────────────────────────────

function renderSlide(
  slideId: string,
  timeline: PresentationTimeline,
  msoMasterIds: Set<string>,
  time: number
): { regular: RenderedAppearance[]; mso: RenderedAppearance[] } {
  const { presentation, scheduledAnimations } = timeline
  const { slidesById, mastersById, appearancesById, animationsById } = presentation
  const slide = slidesById[slideId]

  const regular: RenderedAppearance[] = []
  const mso: RenderedAppearance[] = []

  for (const appId of slide.appearanceIds) {
    const appearance = appearancesById[appId]
    const master = mastersById[appearance.masterId]
    const rendered = resolveAppearanceState(
      appearance,
      master,
      scheduledAnimations,
      animationsById,
      time
    )
    if (msoMasterIds.has(master.id)) {
      mso.push(rendered)
    } else {
      regular.push(rendered)
    }
  }

  return { regular, mso }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function resolveFrame(timeline: PresentationTimeline, time: number): FrameState {
  const { presentation, scheduledTransitions } = timeline
  const { slideOrder, slidesById } = presentation

  if (slideOrder.length === 0) {
    const emptySlide = { id: '', appearanceIds: [], animationOrder: [], background: {} }
    return {
      front: { slide: emptySlide, appearances: [] },
      behind: null,
      transition: null,
      msoAppearances: []
    }
  }

  // Determine active slide index
  let activeIndex = 0
  for (const st of scheduledTransitions) {
    if (st.startTime <= time) activeIndex = st.outgoingSlideIndex + 1
  }
  activeIndex = Math.min(activeIndex, slideOrder.length - 1)

  // Active transition
  let activeTransition: FrameState['transition'] = null
  for (const st of scheduledTransitions) {
    if (st.startTime <= time && time < st.endTime) {
      const rawProgress = (time - st.startTime) / (st.endTime - st.startTime)
      const progress = applyEasing(st.transition.easing, rawProgress)
      activeTransition = { kind: st.transition.kind, progress }
      break
    }
  }

  // Identify MSO masters: shared across more than one slide
  const masterSlideCount = new Map<string, Set<string>>()
  for (const app of Object.values(presentation.appearancesById)) {
    let slideIds = masterSlideCount.get(app.masterId)
    if (!slideIds) {
      slideIds = new Set()
      masterSlideCount.set(app.masterId, slideIds)
    }
    slideIds.add(app.slideId)
  }
  const msoMasterIds = new Set<string>(
    [...masterSlideCount.entries()]
      .filter(([, slideIds]) => slideIds.size > 1)
      .map(([masterId]) => masterId)
  )

  const frontSlideId = slideOrder[activeIndex]
  const { regular: frontRegular, mso: frontMso } = renderSlide(
    frontSlideId,
    timeline,
    msoMasterIds,
    time
  )

  const front: RenderedSlide = { slide: slidesById[frontSlideId], appearances: frontRegular }

  let behind: RenderedSlide | null = null
  if (activeTransition && activeIndex > 0) {
    const behindSlideId = slideOrder[activeIndex - 1]
    const { regular: behindRegular } = renderSlide(behindSlideId, timeline, msoMasterIds, time)
    behind = { slide: slidesById[behindSlideId], appearances: behindRegular }
  }

  // MSO appearances come from the front slide (they're the same master across slides)
  const msoAppearances = frontMso

  return { front, behind, transition: activeTransition, msoAppearances }
}
