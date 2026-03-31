import type { Slide, SlideNode, TextElement, ImageElement, ShapeElement } from '../model/types'
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

// --- Element state resolution ---

function hasEnterAnimation(elementId: string, slide: Slide): boolean {
  for (const cue of slide.cues) {
    if (cue.kind !== 'animation') continue
    for (const anim of cue.animations) {
      if (anim.targetId === elementId && anim.effect.kind === 'enter') return true
    }
  }
  return false
}

function resolveElementState(
  element: LeafElement,
  slide: Slide,
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

  for (const { animation, cueStartTime } of animations) {
    const localTime = time - cueStartTime - animation.offset
    if (localTime < 0) continue

    const rawProgress = Math.min(localTime / animation.duration, 1)
    const progress = applyEasing(animation.easing, rawProgress)
    const completed = rawProgress >= 1
    const effect = animation.effect

    if (effect.kind === 'enter') {
      visible = true
      if (effect.animation.type === 'fade') {
        opacity = lerp(effect.animation.from, effect.animation.to, progress)
        if (completed) opacity = effect.animation.to
      } else if (effect.animation.type === 'move') {
        const ix = lerp(effect.animation.from.x, effect.animation.to.x, progress)
        const iy = lerp(effect.animation.from.y, effect.animation.to.y, progress)
        translateX = ix - element.x
        translateY = iy - element.y
        if (completed) {
          translateX = 0
          translateY = 0
        }
      } else {
        throw new Error('not implemented')
      }
    } else if (effect.kind === 'exit') {
      if (effect.animation.type === 'fade') {
        opacity = lerp(effect.animation.from, effect.animation.to, progress)
        if (completed) {
          opacity = effect.animation.to
          visible = false
        }
      } else {
        throw new Error('not implemented')
      }
    } else {
      throw new Error('not implemented')
    }
  }

  return {
    element,
    visible,
    opacity,
    transform: `translate(${translateX}px, ${translateY}px)`,
    textShadow: null
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

function renderSlide(slide: Slide, scheduledCues: ScheduledCue[], time: number): RenderedSlide {
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
    const emptySlide: Slide = { id: '', children: [], cues: [] }
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
