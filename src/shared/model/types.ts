// The serialisable document model.
// Plain TypeScript types only — no framework dependencies, no UI state.
// This is exactly what gets written to / read from disk.

export type ElementId = string
export type SlideId = string
export type DocumentId = string
export type UserId = string // Clerk user ID (e.g. "user_2abc...")

// --- Document ---

export interface Document {
  id: DocumentId
  title: string
  slides: Slide[]
  recording?: Recording
  ownerId: UserId | null // null when running locally without auth
  isPublished: boolean
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

// --- Slide ---

export interface Slide {
  id: SlideId
  children: SlideNode[] // top-level nodes; groups nest their own children
  cues: Cue[] // ordered — defines the click sequence for this slide
  background?: string // CSS background value (color or gradient)
  grain?: boolean // overlay a subtle noise texture over the background
}

// --- Slide nodes ---

export type SlideNode = TextElement | ImageElement | ShapeElement | NodeGroup

export interface NodeGroup {
  kind: 'group'
  id: ElementId
  masterId?: string // if present, the whole group is an MSO unit; children must also carry their own masterId to support per-child animation chains
  children: SlideNode[] // recursive — groups of groups are valid
}

// --- Base element ---

export interface BaseElement {
  id: ElementId
  x: number // position from slide left, in points
  y: number // position from slide top, in points
  width: number
  height: number
  rotation: number // degrees
  masterId?: string // present if this element is an MSO instance; links instances across slides
}

export interface TextElement extends BaseElement {
  kind: 'text'
  content: string // plain text for now; rich text later
  fontSize: number
  fontWeight: number
  fontFamily?: string // CSS font-family; defaults to inherited/system sans-serif
  color: string // CSS color string
  align: 'left' | 'center' | 'right'
  textShadow?: TextShadow // static shadow; fades naturally with element opacity
}

export interface ImageElement extends BaseElement {
  kind: 'image'
  src: string // relative path (Electron) or data URL (web)
}

export interface ShapeElement extends BaseElement {
  kind: 'shape'
  pathData: string // SVG path d attribute
  fill: Fill
  stroke: Stroke
}

export interface Fill {
  color: string // CSS color string
  opacity: number // 0–1
}

export interface Stroke {
  color: string // CSS color string
  width: number // points
  opacity: number // 0–1
}

// --- Cues ---

export type Cue = AnimationCue | TransitionCue

// AnimationCue: animates nodes on the current slide; does not change the active slide.
export interface AnimationCue {
  id: string
  kind: 'animation'
  trigger: 'on-click' | 'after-previous' | 'with-previous'
  animations: ScheduledAnimation[]
  loop: LoopConfig
}

// TransitionCue: advances to the next slide; contains no element animations.
// after-previous follows the preceding entry in slide.cues[] by array position —
// parallel with-previous cues do not affect this timing.
export interface TransitionCue {
  id: string
  kind: 'transition'
  trigger: 'on-click' | 'after-previous'
  slideTransition: SlideTransition
}

export interface SlideTransition {
  kind: 'cut' | 'fade' | 'push'
  duration: number // seconds
  easing: Easing
}

// --- Animations ---

export interface ScheduledAnimation {
  id: string
  targetId: ElementId // id of any SlideNode — element, group, or mso-instance
  offset: number // seconds from cue start — encodes parallel/sequential mix
  duration: number // seconds
  easing: Easing
  effect: AnimationEffect
}

export type AnimationEffect =
  | { kind: 'enter'; animation: VisualEffect } // hidden → visible
  | { kind: 'exit'; animation: VisualEffect } // visible → hidden
  | { kind: 'property'; animation: VisualEffect } // no visibility change

export type VisualEffect =
  | { type: 'fade'; from: number; to: number }
  | { type: 'move'; from: Position; to: Position }
  | { type: 'scale'; from: number; to: number }
  | { type: 'text-shadow'; from: TextShadow; to: TextShadow }
  | { type: 'line-draw' } // draws an SVG stroke from 0% to 100% using stroke-dashoffset

// Named presets map directly to CSS equivalents.
// cubic-bezier matches CSS cubic-bezier(x1, y1, x2, y2).
// steps matches CSS steps(count, direction).
export type Easing =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | { kind: 'cubic-bezier'; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'steps'; count: number; direction: 'start' | 'end' }

export type LoopConfig = { kind: 'none' } | { kind: 'finite'; count: number } | { kind: 'infinite' }

// --- Shared value types ---

export interface Position {
  x: number
  y: number
}

export interface TextShadow {
  offsetX: number // points
  offsetY: number // points
  blur: number // points
  color: string // CSS color string
}

// --- Recording ---

export interface Recording {
  videoUrl: string
  triggers: RecordedTrigger[]
}

export interface RecordedTrigger {
  time: number // absolute seconds from recording start
  cueId: string // references an on-click Cue
}

// --- Slide dimensions ---

export const SLIDE_WIDTH = 1920
export const SLIDE_HEIGHT = 1080
