import type {
  LegacySlide,
  SlideNode,
  TextElement,
  ImageElement,
  ShapeElement
} from '../model/types'
import type {
  PresentationTimeline,
  ScheduledCue,
  FrameState,
  RenderedSlide,
  RenderedElement
} from './types'
import { applyEasing } from './applyEasing'

// --- Node helpers ---

type LeafElement = TextElement | ImageElement | ShapeElement

function isMSO(node: SlideNode): boolean {
  if (node.kind === 'group') return node.masterId !== undefined
  return (node as LeafElement).masterId !== undefined
}

function flattenNodes(nodes: SlideNode[]): LeafElement[] {
  const result: LeafElement[] = []
  for (const node of nodes) {
    if (node.kind === 'group') {
      result.push(...flattenNodes(node.children))
    } else {
      result.push(node)
    }
  }
  return result
}

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

// --- Element state resolution ---

function hasEnterAnimation(elementId: string, slide: LegacySlide): boolean {
  for (const cue of slide.cues) {
    if (cue.kind !== 'animation') continue
    for (const anim of cue.animations) {
      if (anim.targetId === elementId && anim.effect.kind === 'build-in') return true
    }
  }
  return false
}

function hasLineDraw(elementId: string, slide: LegacySlide): boolean {
  for (const cue of slide.cues) {
    if (cue.kind !== 'animation') continue
    for (const anim of cue.animations) {
      const { effect } = anim
      if (
        anim.targetId === elementId &&
        (effect.kind === 'build-in' || effect.kind === 'build-out' || effect.kind === 'action') &&
        effect.animation.type === 'line-draw'
      )
        return true
    }
  }
  return false
}

function resolveElementState(
  element: LeafElement,
  slide: LegacySlide,
  scheduledCues: ScheduledCue[],
  time: number
): RenderedElement {
  const animations = scheduledCues
    .filter((sc) => sc.cue.kind === 'animation')
    .flatMap((sc) =>
      sc.cue.kind === 'animation'
        ? sc.cue.animations
            .filter((a) => a.targetId === element.id)
            .map((a) => ({ animation: a, cueStartTime: sc.startTime }))
        : []
    )

  // Initial visibility: hidden if the element has any enter animation in the slide's cues
  let visible = !hasEnterAnimation(element.id, slide)
  let opacity = visible ? 1 : 0
  let translateX = 0
  let translateY = 0
  let scale: number | null = null
  let textShadow: import('../model/types').TextShadow | null = null
  let strokeDashoffset: number | null = hasLineDraw(element.id, slide) ? 1 : null

  for (const { animation, cueStartTime } of animations) {
    const localTime = time - cueStartTime - animation.offset
    if (localTime < 0) continue

    const rawProgress = Math.min(localTime / animation.duration, 1)
    const progress = applyEasing(animation.easing, rawProgress)
    const completed = rawProgress >= 1
    const effect = animation.effect

    if (effect.kind === 'build-in') {
      visible = true
      if (effect.animation.type === 'fade') {
        opacity = lerp(opacity, effect.animation.to, progress)
        if (completed) opacity = effect.animation.to
      } else if (effect.animation.type === 'move') {
        const { fromOffset } = effect.animation
        translateX = lerp(fromOffset.x, 0, progress)
        translateY = lerp(fromOffset.y, 0, progress)
        if (completed) {
          translateX = 0
          translateY = 0
        }
      } else if (effect.animation.type === 'scale') {
        scale = lerp(scale ?? 0, effect.animation.to, progress)
        if (completed) scale = effect.animation.to
      } else if (effect.animation.type === 'line-draw') {
        opacity = 1 // visibility is controlled by strokeDashoffset, not opacity
        strokeDashoffset = lerp(1, 0, progress)
        if (completed) strokeDashoffset = 0
      }
    } else if (effect.kind === 'build-out') {
      if (effect.animation.type === 'fade') {
        opacity = lerp(opacity, effect.animation.to, progress)
        if (completed) {
          opacity = effect.animation.to
          visible = false
        }
      }
    } else if (effect.kind === 'action') {
      if (effect.animation.type === 'text-shadow') {
        const from = textShadow ?? { offsetX: 0, offsetY: 0, blur: 0, color: 'rgba(0,0,0,0)' }
        const to = effect.animation.to
        textShadow = {
          offsetX: lerp(from.offsetX, to.offsetX, progress),
          offsetY: lerp(from.offsetY, to.offsetY, progress),
          blur: lerp(from.blur, to.blur, progress),
          color: lerpColor(from.color, to.color, progress)
        }
        if (completed) textShadow = to
      } else if (effect.animation.type === 'line-draw') {
        strokeDashoffset = lerp(1, 0, progress)
        if (completed) strokeDashoffset = 0
      }
    }
  }

  const translatePart = `translate(${translateX}px, ${translateY}px)`
  const transform = scale !== null ? `${translatePart} scale(${scale})` : translatePart

  return {
    element,
    visible,
    opacity,
    transform,
    textShadow,
    strokeDashoffset
  }
}

// --- Slide and transition resolution ---

function resolveActiveSlideIndex(scheduledCues: ScheduledCue[], time: number): number {
  let index = 0
  for (const sc of scheduledCues) {
    // Increment as soon as a transition starts — front becomes the next slide
    if (sc.cue.kind === 'transition' && sc.startTime <= time) {
      index++
    }
  }
  return index
}

function resolveActiveTransition(scheduledCues: ScheduledCue[], time: number) {
  for (const sc of scheduledCues) {
    if (sc.cue.kind === 'transition' && sc.startTime <= time && time < sc.endTime) {
      const rawProgress = (time - sc.startTime) / (sc.endTime - sc.startTime)
      const progress = applyEasing(sc.cue.slideTransition.easing, rawProgress)
      return { kind: sc.cue.slideTransition.kind, progress } as const
    }
  }
  return null
}

function renderSlide(
  slide: LegacySlide,
  scheduledCues: ScheduledCue[],
  time: number
): RenderedSlide {
  const leaves = flattenNodes(slide.children)
  const regular = leaves.filter((n) => !isMSO(n))
  return {
    slide,
    elements: regular.map((el) => resolveElementState(el, slide, scheduledCues, time))
  }
}

// --- Public API ---

export function resolveFrame(timeline: PresentationTimeline, time: number): FrameState {
  const { slides, scheduledCues } = timeline

  if (slides.length === 0) {
    const emptySlide: LegacySlide = { id: '', children: [], cues: [] }
    return {
      front: { slide: emptySlide, elements: [] },
      behind: null,
      transition: null,
      msoElements: []
    }
  }

  const activeIndex = Math.min(resolveActiveSlideIndex(scheduledCues, time), slides.length - 1)
  const activeTransition = resolveActiveTransition(scheduledCues, time)
  const activeSlide = slides[activeIndex]

  const front = renderSlide(activeSlide, scheduledCues, time)
  const behind =
    activeTransition && activeIndex > 0
      ? renderSlide(slides[activeIndex - 1], scheduledCues, time)
      : null

  const msoLeaves = flattenNodes(activeSlide.children).filter(isMSO)
  const msoElements = msoLeaves.map((el) =>
    resolveElementState(el, activeSlide, scheduledCues, time)
  )

  return { front, behind, transition: activeTransition, msoElements }
}
