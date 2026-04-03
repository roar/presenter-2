// Runtime-only animation types — not persisted to disk.
// These describe the computed rendering state derived from the Presentation model.

import type {
  Presentation,
  Slide,
  Appearance,
  MsoMaster,
  SlideTransition,
  TextShadow,
  AnimationId,
  ColorConstant,
  ColorConstantId
} from '../model/types'

export interface PresentationTimeline {
  presentation: Presentation
  scheduledAnimations: ScheduledAnimationEntry[]
  scheduledTransitions: ScheduledTransitionEntry[]
}

export interface ScheduledAnimationEntry {
  animationId: AnimationId
  triggerTime: number // when the trigger fired (before offset)
  startTime: number // triggerTime + animation.offset
  endTime: number // startTime + animation.duration
}

export interface ScheduledTransitionEntry {
  outgoingSlideIndex: number // index in slideOrder of the slide being exited
  startTime: number
  endTime: number
  transition: SlideTransition
}

export interface FrameState {
  front: RenderedSlide // current / incoming slide
  behind: RenderedSlide | null // outgoing slide — present only during a transition
  transition: ActiveTransition | null
  msoAppearances: RenderedAppearance[] // masters shared across slides, rendered above the transition layer
}

export interface RenderedSlide {
  slide: Slide
  appearances: RenderedAppearance[]
  colorConstantsById?: Record<ColorConstantId, ColorConstant>
}

export interface RenderedAppearance {
  appearance: Appearance
  master: MsoMaster
  colorConstantsById?: Record<ColorConstantId, ColorConstant>
  visible: boolean
  opacity: number // 0–1
  transform: string // CSS transform string (translate, scale, etc.)
  textShadow: TextShadow | null
  strokeDashoffset: number | null // null = no dash; 0 = fully drawn; 1 = hidden (normalised to pathLength=1)
}

export interface ActiveTransition {
  kind: SlideTransition['kind']
  progress: number // 0 → 1, easing already applied
}
