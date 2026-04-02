// The serialisable document model.
// Plain TypeScript types only — no framework dependencies, no UI state.
// This is exactly what gets written to / read from disk.

// ─── ID types ────────────────────────────────────────────────────────────────

export type DocumentId = string
export type PresentationId = DocumentId
export type SlideId = string
export type MasterId = string
export type AppearanceId = string
export type AnimationId = string
export type AnimationGroupTemplateId = string
export type TextDecorationId = string
export type BlockId = string
export type RunId = string
export type ElementId = string // used by legacy element types
export type UserId = string // Clerk user ID (e.g. "user_2abc...")

// ─── Presentation (normalised document model) ─────────────────────────────────

export interface Presentation {
  id: PresentationId
  title: string
  slideOrder: SlideId[]
  slidesById: Record<SlideId, Slide>
  mastersById: Record<MasterId, MsoMaster>
  appearancesById: Record<AppearanceId, Appearance>
  animationsById: Record<AnimationId, ScheduledAnimation>
  animationGroupTemplatesById: Record<AnimationGroupTemplateId, AnimationGroupTemplate>
  textDecorationsById: Record<TextDecorationId, TextDecoration>
  revision: number
  ownerId: UserId | null
  isPublished: boolean
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  recording?: Recording
}

// ─── Slide ────────────────────────────────────────────────────────────────────

export interface Slide {
  id: SlideId
  appearanceIds: AppearanceId[]
  transition?: SlideTransition
  background: Background
}

export interface Background {
  color?: Color
  image?: string
}

// ─── Master Slide Object ──────────────────────────────────────────────────────

export interface MsoMaster {
  id: MasterId
  type: 'shape' | 'text' | 'image' | 'group' | 'table'
  transform: Transform
  objectStyle: ObjectStyle
  textStyle?: TextStyle // only relevant for type: 'text'
  content: Content
  geometry?: ShapeGeometry
  childMasterIds?: MasterId[]
  version: number
}

// ─── Appearance ───────────────────────────────────────────────────────────────

export interface Appearance {
  id: AppearanceId
  masterId: MasterId
  slideId: SlideId
  animationIds: AnimationId[]
  zIndex: number
  initialVisibility: 'visible' | 'hidden'
  version: number
}

// ─── Transform ───────────────────────────────────────────────────────────────
// rotation is in degrees, matching CSS. The spec uses radians; this is a
// deliberate divergence to keep parity with CSS transforms and the rendering code.

export interface Transform {
  x: number
  y: number
  width: number
  height: number
  rotation: number // degrees
}

// ─── Style ────────────────────────────────────────────────────────────────────

export type Color = string // CSS color value

// Container/graphic properties — apply to the bounding box of any master type.
export interface ObjectStyleProperties {
  fill?: Color
  stroke?: Color
  strokeWidth?: number
  opacity?: number
}

// Typography properties — only meaningful on type: 'text' masters.
export interface TextStyleProperties {
  fontSize?: number
  fontFamily?: string
  fontWeight?: number
  color?: Color
  textShadow?: TextShadow
}

// A style owns a default state and any number of named overrides.
// Named states resolve as: defaultState + partial overrides applied on top.
export interface ObjectStyle {
  defaultState: ObjectStyleProperties
  namedStates: Record<string, Partial<ObjectStyleProperties>>
}

export interface TextStyle {
  defaultState: TextStyleProperties
  namedStates: Record<string, Partial<TextStyleProperties>>
}

// ─── Content ─────────────────────────────────────────────────────────────────

export type Content =
  | { type: 'text'; value: TextContent }
  | { type: 'image'; src: string }
  | { type: 'none' }

// ─── Shape geometry ──────────────────────────────────────────────────────────

export interface ShapeGeometry {
  type: 'rect' | 'ellipse' | 'path'
  pathData?: string // for 'path' only
}

// ─── Text system ─────────────────────────────────────────────────────────────

export interface TextContent {
  blocks: TextBlock[]
}

export interface TextBlock {
  id: BlockId
  runs: TextRun[]
}

export interface TextRun {
  id: RunId
  text: string
  marks: TextMark[]
}

export interface TextMark {
  type: 'bold' | 'italic' | 'underline' | 'color'
  value?: Color // used for 'color' mark
}

export interface TextRangeAnchor {
  blockId: BlockId
  startOffset: number // character offset within block
  endOffset: number
  degraded?: boolean
}

export interface TextDecoration {
  id: TextDecorationId
  kind: 'underline' | 'highlight' | 'outline'
  anchor: TextRangeAnchor
}

// ─── Easing ───────────────────────────────────────────────────────────────────
// Named presets map directly to CSS equivalents.
// cubic-bezier matches CSS cubic-bezier(x1, y1, x2, y2).
// spring is evaluated as a damped oscillation bounded by durationMs.
// curve is a piecewise cubic bezier spline authored in the easing editor.

// Handle constraint enforced by the UI when editing; stored unconditionally
// so serialised form is self-contained.
export type SplinePointKind = 'corner' | 'smooth' | 'balanced'

// Offset from the anchor point in the easing graph ([0,1] × ℝ space).
export interface SplineHandle {
  dx: number
  dy: number
}

// One anchor on the piecewise cubic bezier curve.
// x must be in [0,1]; y may exceed [0,1] for overshoot.
// Anchor x values across the points array must be strictly increasing.
export interface SplinePoint {
  x: number
  y: number
  kind: SplinePointKind
  inHandle?: SplineHandle // absent on the first point
  outHandle?: SplineHandle // absent on the last point
}

export type Easing =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | { kind: 'cubic-bezier'; x1: number; y1: number; x2: number; y2: number }
  // points.length >= 2; points[0].x === 0, points[last].x === 1
  | { kind: 'curve'; points: SplinePoint[] }

// ─── Common types ─────────────────────────────────────────────────────────────

export type LoopConfig = { kind: 'none' } | { kind: 'finite'; count: number } | { kind: 'infinite' }

export interface SlideTransition {
  kind: 'cut' | 'fade' | 'push'
  duration: number // seconds
  easing: Easing
}

export interface Recording {
  videoUrl: string
  triggers: RecordedTrigger[]
}

export interface RecordedTrigger {
  time: number // absolute seconds from recording start
  cueId: string
}

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

// ─── Slide dimensions ─────────────────────────────────────────────────────────

export const SLIDE_WIDTH = 1920
export const SLIDE_HEIGHT = 1080

// ─── Legacy document model (v0) ──────────────────────────────────────────────
// The animation system (buildTimeline, resolveFrame) still uses these types
// until Phase 3. The migration utility converts Document → Presentation.

export interface Document {
  id: DocumentId
  title: string
  slides: LegacySlide[]
  recording?: Recording
  ownerId: UserId | null // null when running locally without auth
  isPublished: boolean
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

/** @deprecated Use the new normalised Slide type for new code. */
export interface LegacySlide {
  id: SlideId
  children: SlideNode[] // top-level nodes; groups nest their own children
  cues: Cue[] // ordered — defines the click sequence for this slide
  background?: string // CSS background value (color or gradient)
  grain?: boolean // overlay a subtle noise texture over the background
}

export type SlideNode = TextElement | ImageElement | ShapeElement | NodeGroup

export interface NodeGroup {
  kind: 'group'
  id: ElementId
  masterId?: string
  children: SlideNode[]
}

export interface BaseElement {
  id: ElementId
  x: number // position from slide left, in points
  y: number // position from slide top, in points
  width: number
  height: number
  rotation: number // degrees
  masterId?: string // present if this element is an MSO instance
}

export interface TextElement extends BaseElement {
  kind: 'text'
  content: string // plain text — rich text handled by TextContent in new model
  fontSize: number
  fontWeight: number
  fontFamily?: string
  color: string // CSS color string
  align: 'left' | 'center' | 'right'
  textShadow?: TextShadow
}

export interface ImageElement extends BaseElement {
  kind: 'image'
  src: string
}

export interface ShapeElement extends BaseElement {
  kind: 'shape'
  pathData: string // SVG path d attribute
  fill: Fill
  stroke: Stroke
}

export interface Fill {
  color: string
  opacity: number
}

export interface Stroke {
  color: string
  width: number
  opacity: number
}

export type Cue = AnimationCue | TransitionCue

export interface AnimationCue {
  id: string
  kind: 'animation'
  trigger: 'on-click' | 'after-previous' | 'with-previous'
  animations: ScheduledAnimation[]
  loop: LoopConfig
}

export interface TransitionCue {
  id: string
  kind: 'transition'
  trigger: 'on-click' | 'after-previous'
  slideTransition: SlideTransition
}

export interface ScheduledAnimation {
  id: string
  targetId: ElementId // id of any SlideNode
  offset: number // seconds from cue start
  duration: number // seconds
  easing: Easing
  effect: AnimationEffect
}

export type AnimationEffect =
  | { kind: 'enter'; animation: VisualEffect }
  | { kind: 'exit'; animation: VisualEffect }
  | { kind: 'property'; animation: VisualEffect }

export type VisualEffect =
  | { type: 'fade'; from: number; to: number }
  | { type: 'move'; from: Position; to: Position }
  | { type: 'scale'; from: number; to: number }
  | { type: 'text-shadow'; from: TextShadow; to: TextShadow }
  | { type: 'line-draw' }

// ─── Animation group templates ────────────────────────────────────────────────
// A named, reusable set of animations applied as a single unit.
// All members share the target of the AnimationGroupInstance they are applied through.

export type GroupMemberTrigger =
  | { type: 'withPrevious'; delayMs: number }
  | { type: 'afterPrevious'; delayMs: number }

export type AnimationGroupMember =
  | {
      id: AnimationId
      kind: 'opacity'
      trigger: GroupMemberTrigger
      durationMs: number
      easing: Easing
      from: number
      to: number
    }
  | {
      id: AnimationId
      kind: 'color'
      trigger: GroupMemberTrigger
      durationMs: number
      easing: Easing
      from: Color
      to: Color
    }
  | {
      id: AnimationId
      kind: 'transform'
      trigger: GroupMemberTrigger
      durationMs: number
      easing: Easing
      from: Partial<Transform>
      to: Partial<Transform>
    }
  | {
      id: AnimationId
      kind: 'decorationProgress'
      trigger: GroupMemberTrigger
      durationMs: number
      easing: Easing
      from: number
      to: number
    }
  | {
      id: AnimationId
      kind: 'textReveal'
      trigger: GroupMemberTrigger
      durationMs: number
      easing: Easing
      from: number
      to: number
      mode: 'chars' | 'words' | 'lines'
    }
  | {
      id: AnimationId
      kind: 'stateChange'
      trigger: GroupMemberTrigger
      durationMs: number
      easing: Easing
      fromState: string | 'default'
      toState: string | 'default'
    }

export interface AnimationGroupTemplate {
  id: AnimationGroupTemplateId
  name: string
  members: AnimationGroupMember[]
}
