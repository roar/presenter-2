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
export type UserId = string // Clerk user ID (e.g. "user_2abc...")
export type ColorConstantId = string

// ─── Presentation (normalised document model) ─────────────────────────────────

export interface Presentation {
  id: PresentationId
  title: string
  colorConstantsById?: Record<ColorConstantId, ColorConstant>
  defaultBackground?: Background
  slideOrder: SlideId[]
  slidesById: Record<SlideId, Slide>
  mastersById: Record<MasterId, MsoMaster>
  appearancesById: Record<AppearanceId, Appearance>
  animationsById: Record<AnimationId, TargetedAnimation>
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
  // Ordered list of animation IDs defining the click sequence for this slide.
  // Each animation carries its own trigger (on-click / after-previous / with-previous).
  animationOrder: AnimationId[]
  // If set, the key in triggerTimes that fires the slide transition (always on-click).
  transitionTriggerId?: string
  transition?: SlideTransition
  background: Background
}

export interface Background {
  color?: Color
  fill?: Fill
  grain?: GrainEffect
  image?: string
}

// ─── Master Slide Object ──────────────────────────────────────────────────────

export interface MsoMaster {
  id: MasterId
  type: 'shape' | 'text' | 'image' | 'group' | 'table'
  name?: string
  isMultiSlideObject?: boolean
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

export type MovePathPointType = 'sharp' | 'smooth' | 'bezier'

export interface MovePathPoint {
  id: string
  position: Position
  type: MovePathPointType
  inHandle?: Position
  outHandle?: Position
}

export interface MovePath {
  points: MovePathPoint[]
}

// ─── Style ────────────────────────────────────────────────────────────────────

export interface ColorConstant {
  id: ColorConstantId
  name: string
  value: string
}

export type ColorReference = { kind: 'constant'; colorId: ColorConstantId }

export type Color = string | ColorReference

export interface GradientStop {
  offset: number
  color: Color
}

export interface LinearGradientFill {
  kind: 'linear-gradient'
  rotation: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  stops: GradientStop[]
}

export interface RadialGradientFill {
  kind: 'radial-gradient'
  centerX: number
  centerY: number
  radius: number
  stops: GradientStop[]
}

export type Fill = Color | LinearGradientFill | RadialGradientFill

export type GrainBlendMode = 'overlay' | 'soft-light' | 'multiply'

export interface GrainEffect {
  enabled: boolean
  intensity: number
  scale: number
  seed: number
  blendMode: GrainBlendMode
}

export const DEFAULT_GRAIN_EFFECT: GrainEffect = {
  enabled: false,
  intensity: 0.4,
  scale: 0.5,
  seed: 1,
  blendMode: 'overlay'
}

// Container/graphic properties — apply to the bounding box of any master type.
export interface ObjectStyleProperties {
  fill?: Fill
  grain?: GrainEffect
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
  // Natural coordinate space the pathData was authored in.
  // Used as the SVG viewBox so the path scales to fit transform.width × transform.height.
  baseWidth?: number
  baseHeight?: number
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
  kind: 'cut' | 'fade-through-color' | 'dissolve' | 'push'
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
  color: Color
}

// ─── Slide dimensions ─────────────────────────────────────────────────────────

export const SLIDE_WIDTH = 1920
export const SLIDE_HEIGHT = 1080

// ─── Animation model ─────────────────────────────────────────────────────────

export type AnimationTrigger = 'on-click' | 'after-previous' | 'with-previous'

export type AnimationTarget =
  | { kind: 'appearance'; appearanceId: AppearanceId }
  | { kind: 'group-child'; appearanceId: AppearanceId; path: string[] }
  | { kind: 'text-range'; appearanceId: AppearanceId; anchor: TextRangeAnchor }
  | { kind: 'text-decoration'; decorationId: TextDecorationId }

// Pure animation spec — no target; reusable in group templates
export interface ScheduledAnimation {
  id: AnimationId
  trigger: AnimationTrigger
  offset: number // seconds of delay from trigger point
  duration: number // seconds
  easing: Easing
  loop: LoopConfig
  effect: Animation
}

// Concrete animation bound to a specific presentation element
export type TargetedAnimation = ScheduledAnimation & { target: AnimationTarget }

export type AnimationKind = 'build-in' | 'build-out' | 'action'

export type Animation =
  | { kind: AnimationKind; type: 'fade'; to: number }
  // delta is the total movement applied by the animation.
  // build-in move animations interpolate from delta to zero.
  // action move animations interpolate from the current offset to current + delta.
  | { kind: AnimationKind; type: 'move'; delta: Position; path?: MovePath }
  | { kind: AnimationKind; type: 'scale'; to: number }
  | { kind: AnimationKind; type: 'rotate'; to: number }
  | { kind: AnimationKind; type: 'text-shadow'; to: TextShadow }
  | { kind: AnimationKind; type: 'line-draw' }

// ─── Animation group templates ────────────────────────────────────────────────
// A named, reusable set of animations applied as a single unit.
// When instantiated, each member's slotName is resolved to a concrete AnimationTarget.

// A group member is a scheduled animation spec bound to a named slot.
// The slot is resolved to a concrete target when the template is instantiated.
export type AnimationGroupMember = ScheduledAnimation & { slotName: string }

export interface AnimationGroupTemplate {
  id: AnimationGroupTemplateId
  name: string
  slots: string[] // declared slot names e.g. ['object', 'highlight text']
  members: AnimationGroupMember[]
}
