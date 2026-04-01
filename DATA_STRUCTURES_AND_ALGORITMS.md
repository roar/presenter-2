# Data Structures and Algorithms

## 1. Core Mental Model

This system consists of three interacting domains:

**1. Document structure**
- slides
- MSO masters
- appearances
- text structure
- decorations

**2. Temporal structure**
- animations (per appearance)
- triggers (on-click, after-previous, with-previous)
- transitions
- downstream state propagation

**3. Derived playback structure**
- compiled timeline (absolute time)
- slide-local timelines
- checkpoints for fast scrubbing
- render state at arbitrary time t

> The system never stores visual state directly. It always derives it from the document + time.

---

## 2. Core Concepts

### 2.1 Multi-Slide Object (MSO)

An MSO is a logical object defined once and reused across slides.

It has:
- one master
- multiple appearances (0–1 per slide)
- a state that propagates forward across slides

Example: Slide 2 → Slide 5 → Slide 9

- Slide 2 starts from master
- Slide 5 starts from Slide 2's final state
- Slide 9 starts from Slide 5's final state

This propagation is central to the system.

---

### 2.2 Ownership Rules

**Master owns**
- geometry and transform
- style
- content (text, image, etc.)
- group structure
- text structure

Any edit to an object updates the master.

**Appearance owns**
- membership on a slide
- z-order
- animations

Appearances do not override geometry.

**Transition owns**
- how a slide is entered
- always completes before local animations begin

---

## 3. Architecture Layers

### 3.1 Source Document
- the authoritative model
- immutable or versioned
- contains no derived data

### 3.2 Compiled Playback Model
- appearance chains
- resolved animation timing
- compiled timelines
- cached state propagation

### 3.3 Render Layer

Multiple targets:
- DOM (text and layout)
- SVG (shapes and overlays)
- Canvas (thumbnails)

### 3.4 UI Interaction State
- selection
- drag state
- scrub position
- viewport

---

## 4. Multi-Window and IPC Architecture

The application runs two windows simultaneously in Electron:

```
Editor (renderer)  ←→  Main Process (source of truth)  ←→  Viewer (renderer)
```

### 4.1 Responsibilities

| Process | Role |
| ------- | ---- |
| Main process | Authoritative current slide index; playback clock; broadcasts state to viewer |
| Editor | Authoring, timeline editing, state mutations; sends commands to main |
| Viewer | Read-only presentation playback; evaluates state using the same engine as the editor |

### 4.2 IPC Protocol

```ts
type IPCMessage =
  | { type: 'STATE_UPDATE'; revision: number; patch: Patch }
  | { type: 'SET_TIME'; timeMs: number }
  | { type: 'SET_SLIDE'; slideId: Id }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
```

**Key rule:** The viewer never derives presentation state independently. It evaluates state using the same compiled timeline and render engine as the editor, driven by the shared time and document received via IPC.

---

## 5. Source Data Model

### 5.1 Root

```ts
type Id = string

interface Presentation {
  id: Id
  slideOrder: Id[]
  slidesById: Record<Id, Slide>
  mastersById: Record<Id, MsoMaster>
  appearancesById: Record<Id, Appearance>
  animationsById: Record<Id, Animation>
  animationGroupTemplatesById: Record<Id, AnimationGroupTemplate>
  textDecorationsById: Record<Id, TextDecoration>
  settings: PresentationSettings
  revision: number
}
```

### 5.2 Slide

```ts
interface Slide {
  id: Id
  appearanceIds: Id[]
  transition?: Transition
  background: Background
}
```

### 5.3 Transition

```ts
interface Transition {
  id: Id
  slideId: Id                // destination slide

  type: 'fade' | 'push' | 'wipe' | 'zoom' | 'none'

  durationMs: number
  easing: Easing

  trigger:
    | { type: 'onClick' }
    | { type: 'afterPrevious'; delayMs: number }

  direction?: 'left' | 'right' | 'up' | 'down' // for directional transitions
}
```

**Semantics**
- Owned by the destination slide.
- Runs before any slide-local animations.
- Uses the same timing model as animations (trigger + delay + easing).

### 5.4 Master

```ts
interface MsoMaster {
  id: Id
  type: 'shape' | 'text' | 'image' | 'group' | 'table'
  transform: Transform
  style: StyleProperties
  styleStates?: Record<string, Partial<StyleProperties>>
  content: Content
  geometry?: ShapeGeometry
  childNodeIds?: Id[]
  version: number
}
```

**`styleStates`** defines named style variants. Each entry is a partial override of `style` (the default state). A named state resolves to `{ ...style, ...styleStates[name] }`. The field is absent when no named states have been created. State names are user-defined strings (e.g. `"highlighted"`, `"muted"`).

### 5.5 Core Types

```ts
interface Transform {
  x: number
  y: number
  width: number
  height: number
  rotation: number // radians
}

interface StyleProperties {
  fill?: Color
  stroke?: Color
  strokeWidth?: number
  opacity?: number
  fontSize?: number
  fontFamily?: string
  fontWeight?: number
}

type Content =
  | { type: 'text'; value: TextContent }
  | { type: 'image'; src: string }
  | { type: 'none' }

interface ShapeGeometry {
  type: 'rect' | 'ellipse' | 'path'
  pathData?: string // for 'path' only
}

interface Background {
  color?: Color
  image?: string
}

interface TextMark {
  type: 'bold' | 'italic' | 'underline' | 'color'
  value?: Color // used for 'color' mark
}
```

---

## 6. Text System

Text is a first-class system because editing is central.

### 6.1 Structured text model

```ts
interface TextContent {
  blocks: TextBlock[]
}

interface TextBlock {
  id: Id
  runs: TextRun[]
}

interface TextRun {
  id: Id
  text: string
  marks: TextMark[]
}
```

### 6.2 Stable anchors

Animations must survive edits as much as possible. Anchors use block-relative character offsets rather than run IDs, since runs can split or merge on every edit.

```ts
interface TextRangeAnchor {
  blockId: Id
  startOffset: number // character offset within block
  endOffset: number
}
```

**Anchor repair after text edits**

After each edit to a `TextBlock`:

1. Compute the diff between the old and new character sequence (e.g. Myers diff).
2. Map each anchor's `startOffset` and `endOffset` through the diff to new positions.
3. Update anchors in place.

**Fallback:** if mapping fails (e.g. the entire block is replaced), mark the anchor as `degraded: true`, surface a UI warning, and allow manual repair.

### 6.3 Decorations (overlay-based)

```ts
interface TextDecoration {
  id: Id
  kind: 'underline' | 'highlight' | 'outline'
  anchor: TextRangeAnchor
}
```

Decorations are rendered as overlays (SVG), not native CSS `text-decoration`. This enables:
- underline draw
- highlight sweep
- animated emphasis

---

## 7. Appearance

```ts
interface Appearance {
  id: Id
  masterId: Id
  slideId: Id
  animationIds: Id[]
  zIndex: number
  initialVisibility: 'visible' | 'hidden'
  version: number
}
```

**Note on `initialVisibility`:** Controls whether the object is visible at slide entry, before any animations play. Set to `'hidden'` when the object is intended to appear via an animation (e.g. a fade-in). This is distinct from opacity — a hidden object takes up no hit-test area and produces no visual output until revealed.

---

## 8. Animation System

### 8.1 Targets

```ts
type AnimationTarget =
  | { kind: 'appearance'; appearanceId: Id }
  | { kind: 'group-child'; appearanceId: Id; childPath: number[] }
  | { kind: 'text-range'; appearanceId: Id; anchor: TextRangeAnchor }
  | { kind: 'text-decoration'; appearanceId: Id; decorationId: Id }
```

This allows:
- whole-object animation
- group hierarchy targeting
- text subrange animation
- decoration animation

### 8.2 Authored model

All animations share a common base interface. Animation-specific payloads are expressed as a discriminated union on `kind`, giving type-safe values per animation type and cleaner sampling dispatch.

```ts
interface BaseAnimation {
  id: Id
  appearanceId: Id
  originMasterId: Id   // denormalized from appearance.masterId — see note below
  target: AnimationTarget
  durationMs: number
  easing: Easing
  trigger: AnimationTrigger
  authoredOrder: number
}

type Animation =
  | OpacityAnimation
  | ColorAnimation
  | TransformAnimation
  | DecorationProgressAnimation
  | TextRevealAnimation
  | AnimationGroupInstance

interface OpacityAnimation extends BaseAnimation {
  kind: 'opacity'
  from: number
  to: number
}

interface ColorAnimation extends BaseAnimation {
  kind: 'color'
  from: Color
  to: Color
}

interface TransformAnimation extends BaseAnimation {
  kind: 'transform'
  from: Partial<Transform>
  to: Partial<Transform>
}

interface DecorationProgressAnimation extends BaseAnimation {
  kind: 'decorationProgress'
  from: number   // usually 0
  to: number     // usually 1
}

interface TextRevealAnimation extends BaseAnimation {
  kind: 'textReveal'
  from: number
  to: number
  mode: 'chars' | 'words' | 'lines'
}

interface StateChangeAnimation extends BaseAnimation {
  kind: 'stateChange'
  fromState: string | 'default'
  toState: string | 'default'
}

interface AnimationGroupInstance extends BaseAnimation {
  kind: 'group'
  templateId: Id
  // durationMs and easing from BaseAnimation are unused — derived from template members
}
```

**Note on `StateChangeAnimation`:** `fromState` and `toState` reference keys in `MsoMaster.styleStates`, or the string `'default'` for the base `style`. The compiled sample function interpolates all `StyleProperties` fields between the two resolved states. Numeric fields (`opacity`, `strokeWidth`, `fontSize`, `fontWeight`) are linearly interpolated. Color fields (`fill`, `stroke`) are interpolated per sRGB channel. Non-interpolatable fields (`fontFamily`) snap to `toState` at `progress >= 1`. Using `'default'` as either state always resolves to `master.style`. If a named state key is absent from `styleStates`, it falls back to `'default'`.

**Note on `originMasterId`:** This is a denormalized field equal to `appearance.masterId`. It exists as an optimization to avoid the lookup `animationId → Appearance → masterId` during downstream invalidation (e.g. when deciding which thumbnails to re-render after an animation change). It carries no independent semantic meaning and must be kept in sync when an appearance is reassigned to a different master.

### 8.3 Compiled runtime model

Timeline compilation normalizes the authored union into a single runtime interface with resolved absolute timing and a sampling function. This gives the playback engine a uniform loop regardless of animation kind.

```ts
interface CompiledAnimation {
  id: Id
  appearanceId: Id
  target: AnimationTarget
  kind: Animation['kind']
  startMs: number
  endMs: number
  sample: (elapsedMs: number, state: RenderState) => void
}

interface RenderState {
  opacity?: number
  transform?: Partial<Transform>
  textRevealProgress?: number
  decorationProgress?: number
  styleOverrides?: Partial<StyleProperties>  // written by stateChange sample()
}
```

`RenderState.styleOverrides` is merged on top of `MsoMaster.style` at render time: `{ ...master.style, ...renderState.styleOverrides }`. The `stateChange` sample writes the interpolated properties here; other animation kinds leave it undefined.

### 8.4 Triggers

```ts
type AnimationTrigger =
  | { type: 'onClick' }
  | { type: 'afterPrevious'; delayMs: number }
  | { type: 'withPrevious'; delayMs: number }
```

### 8.5 Animation Group Templates

A named, reusable set of animations that can be applied to any appearance as a single unit. Groups are authored once and instantiated many times via `AnimationGroupInstance`.

```ts
interface AnimationGroupTemplate {
  id: Id
  name: string              // user-defined, e.g. "Pop In", "Highlight Sweep"
  members: AnimationGroupMember[]
}
```

Each member defines one animation within the group. Members share the same target as the `AnimationGroupInstance` they are applied through — the target is resolved at apply time.

```ts
type GroupMemberTrigger =
  | { type: 'withPrevious'; delayMs: number }
  | { type: 'afterPrevious'; delayMs: number }
  // onClick is not allowed inside a group

type AnimationGroupMember =
  | { id: Id; kind: 'opacity';             trigger: GroupMemberTrigger; durationMs: number; easing: Easing; from: number; to: number }
  | { id: Id; kind: 'color';               trigger: GroupMemberTrigger; durationMs: number; easing: Easing; from: Color; to: Color }
  | { id: Id; kind: 'transform';           trigger: GroupMemberTrigger; durationMs: number; easing: Easing; from: Partial<Transform>; to: Partial<Transform> }
  | { id: Id; kind: 'decorationProgress'; trigger: GroupMemberTrigger; durationMs: number; easing: Easing; from: number; to: number }
  | { id: Id; kind: 'textReveal';         trigger: GroupMemberTrigger; durationMs: number; easing: Easing; from: number; to: number; mode: 'chars' | 'words' | 'lines' }
  | { id: Id; kind: 'stateChange';        trigger: GroupMemberTrigger; durationMs: number; easing: Easing; fromState: string | 'default'; toState: string | 'default' }
```

**Timing model**

The group instance's trigger (`onClick`, `withPrevious`, `afterPrevious`) determines when the group starts. From that moment, member timing is resolved exactly as if the members were standalone animations:

- The first member (lowest `id` order) starts at `t = 0` relative to group start.
- Subsequent members resolve `withPrevious` / `afterPrevious` relative to their predecessor within the group.
- `delayMs` on members shifts start within the group.

The group's total duration is derived — it equals the time from group start to the end of the last-finishing member.

**Compilation**

During timeline compilation, each `AnimationGroupInstance` is expanded in-place into one `CompiledAnimation` per member. The group itself does not appear as a compiled entry; only its children do. The instance's `appearanceId` and `target` are propagated to every expanded member.

**`durationMs` and `easing` on `AnimationGroupInstance`**

These fields are present because `AnimationGroupInstance` extends `BaseAnimation`, but they carry no meaning and must not be used during playback. Set `durationMs: 0` and `easing` to a default when creating an instance.

---

## 9. Easing System

Easing is a runtime subsystem, not just data.

### 9.1 Types

```ts
type Easing =
  | {
      kind: 'bezier'
      preset: 'linear' | 'ease' | 'easeIn' | 'easeOut' | 'easeInOut' | 'custom'
      cubicBezier?: [number, number, number, number]
    }
  | {
      kind: 'spring'
      mass: number
      stiffness: number
      damping: number
      initialVelocity: number
    }
```

### 9.2 Bezier constraints
- P1x and P2x must be in [0, 1]
- enforced in UI and model

### 9.3 Bezier runtime

Uses:
1. lookup table
2. Newton-Raphson refinement
3. binary subdivision fallback

Ensures speed, stability, and determinism.

### 9.4 Spring runtime
- evaluated as f(t)
- still bounded by `durationMs`
- may overshoot internally but clamps at end

### 9.5 Runtime caching

```ts
Map<string, EasingRuntime>
```

Shared across playback, scrubbing, and thumbnails.

---

## 10. State Propagation

### 10.1 Appearance chains

For each master: collect appearances and sort by slide order.

### 10.2 Entry state

```
entry = previous appearance exit OR master state
```

### 10.3 Exit state

```
exit = entry + all animations (to completion)
```

### 10.4 Resolver

```ts
interface ElementState {
  opacity: number
  transform: Transform
  textRevealProgress: number
  decorationProgress: number
  activeStyleState: string | 'default'  // name of the active style state
  resolvedStyle: StyleProperties        // master.style merged with activeStyleState overrides
}

class MsoStateResolver {
  resolveEntryState(masterId: Id, slideId: Id): ElementState
  resolveExitState(masterId: Id, slideId: Id): ElementState
}
```

`activeStyleState` starts as `'default'` and updates to `toState` when a `stateChange` animation completes. `resolvedStyle` is always `{ ...master.style, ...master.styleStates?.[activeStyleState] }` (identity when `activeStyleState === 'default'`).

Caches results for performance.

---

## 11. Timeline Compilation

### 11.1 Rules

For each slide:
1. transition runs first
2. animations start after transition
3. `AnimationGroupInstance` entries are expanded into their member animations (see §8.5) before further processing
4. animations grouped into click buckets
5. dependencies resolved
6. lanes assigned

### 11.2 Click buckets
- bucket 0 = autoplay
- each click creates a new bucket

### 11.3 Dependency resolution
- `withPrevious` shares start time
- `afterPrevious` follows previous

### 11.4 Lane assignment

Greedy interval partitioning.

### 11.5 Structures

```ts
interface CompiledSlideTimeline {
  slideId: Id
  transition?: CompiledTransitionBar
  clickBuckets: ClickBucket[]
}
```

### 11.6 Presentation timeline

```ts
interface CompiledPresentationTimeline {
  slideSegments: CompiledSlideSegment[]
  totalDurationMs: number
}
```

---

## 12. Playback and Scrubbing

### 12.1 Evaluate at time

```
find slide
if transition → blend states
else         → evaluate animations
```

### 12.2 Checkpoints

```ts
interface SlideCheckpoint {
  timeMs: number
  state: CompactSlideStateSnapshot
}
```

Used to avoid replaying all animations from the beginning.

**Placement strategy**

Checkpoints are created at:
- Slide entry (immediately after transition completes).
- Start of each click bucket.
- End of each animation group.
- Intermediate intervals when animation density is low and time gaps exceed `MAX_CHECKPOINT_INTERVAL_MS` (default: 100 ms).

**Scrub guarantee**

Worst-case evaluation time is bounded by:

```
distance to nearest checkpoint + cost of evaluating active animations
```

This ensures smooth scrubbing even on long or complex slides.

---

## 13. Rendering Architecture

### 13.1 Main renderer (DOM + SVG)

| Layer | Responsibility |
|-------|---------------|
| DOM   | text, layout, editing |
| SVG   | shapes, overlays (underline, highlight) |
| CSS   | transform, opacity |

### 13.2 Render state

```ts
interface RenderNode {
  id: Id
  type: 'html' | 'svg'
  transform: string
  opacity: number
  visible: boolean
  styleOverrides?: Partial<StyleProperties>  // merged on top of master.style at render time
  children: RenderNode[]
}
```

---

## 14. Text Layout Service

Required to bridge the text model and rendering.

```ts
interface TextLayoutService {
  measureRange(anchor: TextRangeAnchor): TextRangeGeometry
}
```

### 14.1 Geometry

```ts
interface TextRangeGeometry {
  rects: DOMRect[]
  baselines: { x1: number; x2: number; y: number }[]
}
```

Used for underline drawing and highlight overlays.

---

## 15. Thumbnails

### 15.1 Definition

Thumbnail = entry state of slide.

### 15.2 Cache

```ts
interface ThumbnailCache {
  composited: Map<Id, ImageBitmap | null>
}
```

A `null` value means the thumbnail has been invalidated and is pending re-render. The render scheduler uses this to prioritise visible thumbnails. An absent key means the thumbnail has never been rendered.

### 15.3 Invalidation
- master change → invalidate all appearances
- animation change → invalidate downstream appearances
- slide reorder → rebuild chains

---

## 16. Live Preview

```ts
interface LivePreviewStore {
  masterPatches: Map<Id, Partial<MsoMaster>>
}
```

Used during any interaction that modifies an MSO (drag, resize, style change, text edit):
- No document mutation until interaction ends.
- Patch is applied at render time on top of the committed master state.
- Cleared and committed to the document on interaction end.

This covers transform, style, geometry, and content changes — not only position.

---

## 17. Rendering Priorities

This is runtime scheduling guidance, not a data model concern. It describes how the render scheduler should prioritize work.

1. Main canvas (current slide at full resolution)
2. Visible thumbnails (in viewport order)
3. Off-screen thumbnails (background, lowest priority)

Use batching and `requestAnimationFrame`. Invalidated thumbnails (`null` in cache) are queued and processed in priority order.

---

## 18. Performance Principles

- prefer `transform` and `opacity` (GPU-composited)
- avoid layout-triggering properties
- minimize DOM segmentation
- only split text nodes when needed
- reuse easing runtimes
- cache checkpoints

---

## 19. Key Design Decisions

- text is first-class and editable
- animation targets include text ranges and decorations
- easing is a runtime subsystem
- rendering is DOM + SVG hybrid
- timeline is compiled, not stored
- playback is engine-driven, not CSS-driven
