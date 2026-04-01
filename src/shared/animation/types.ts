// Runtime-only animation types — not persisted to disk.
// These describe the computed rendering state derived from the model.

import type { LegacySlide, SlideNode, SlideTransition, TextShadow } from '../model/types'

export interface PresentationTimeline {
  slides: LegacySlide[]
  scheduledCues: ScheduledCue[]
}

export interface ScheduledCue {
  cue: import('../model/types').Cue
  slide: LegacySlide // the slide this cue belongs to
  startTime: number // absolute seconds from presentation start
  endTime: number // startTime + effective duration
}

export interface FrameState {
  behind: RenderedSlide | null // outgoing slide — present only during a transition
  front: RenderedSlide // current / incoming slide
  transition: ActiveTransition | null
  msoElements: RenderedElement[] // rendered above the transition layer; unaffected by it
}

export interface RenderedSlide {
  slide: LegacySlide
  elements: RenderedElement[]
}

export interface RenderedElement {
  element: SlideNode
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
