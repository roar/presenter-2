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

## 4. Source Data Model

### 4.1 Root

```ts
type Id = string

interface Presentation {
  id: Id
  slideOrder: Id[]
  slidesById: Record<Id, Slide>
  mastersById: Record<Id, MsoMaster>
  appearancesById: Record<Id, Appearance>
  animationsById: Record<Id, Animation>
  textDecorationsById: Record<Id, TextDecoration>
  settings: PresentationSettings
  revision: number
}
```

### 4.2 Slide

```ts
interface Slide {
  id: Id
  appearanceIds: Id[]
  transition?: Transition
  background: Background
}
```

### 4.3 Master

```ts
interface MsoMaster {
  id: Id
  type: 'shape' | 'text' | 'image' | 'group' | 'table'
  transform: Transform
  style: StyleProperties
  content: Content
  geometry?: ShapeGeometry
  childNodeIds?: Id[]
  version: number
}
```

---

## 5. Text System

Text is a first-class system because editing is central.

### 5.1 Structured text model

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

### 5.2 Stable anchors

Animations must survive edits as much as possible.

```ts
interface TextRangeAnchor {
  blockId: Id
  runId: Id
  startOffset: number
  endOffset: number
}
```

### 5.3 Decorations (overlay-based)

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

## 6. Appearance

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

---

## 7. Animation System

### 7.1 Targets

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

### 7.2 Animation

```ts
interface Animation {
  id: Id
  appearanceId: Id
  originMasterId: Id
  target: AnimationTarget
  property: AnimatableProperty
  fromValue: PropertyValue
  toValue: PropertyValue
  durationMs: number
  easing: Easing
  trigger: AnimationTrigger
  authoredOrder: number
  groupId?: Id
}
```

### 7.3 Triggers

```ts
type AnimationTrigger =
  | { type: 'onClick' }
  | { type: 'afterPrevious'; delayMs: number }
  | { type: 'withPrevious'; delayMs: number }
```

---

## 8. Easing System

Easing is a runtime subsystem, not just data.

### 8.1 Types

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

### 8.2 Bezier constraints
- P1x and P2x must be in [0, 1]
- enforced in UI and model

### 8.3 Bezier runtime

Uses:
1. lookup table
2. Newton-Raphson refinement
3. binary subdivision fallback

Ensures speed, stability, and determinism.

### 8.4 Spring runtime
- evaluated as f(t)
- still bounded by `durationMs`
- may overshoot internally but clamps at end

### 8.5 Runtime caching

```ts
Map<string, EasingRuntime>
```

Shared across playback, scrubbing, and thumbnails.

---

## 9. State Propagation

### 9.1 Appearance chains

For each master: collect appearances and sort by slide order.

### 9.2 Entry state

```
entry = previous appearance exit OR master state
```

### 9.3 Exit state

```
exit = entry + all animations (to completion)
```

### 9.4 Resolver

```ts
class MsoStateResolver {
  resolveEntryState(masterId: Id, slideId: Id): ElementState
  resolveExitState(masterId: Id, slideId: Id): ElementState
}
```

Caches results for performance.

---

## 10. Timeline Compilation

### 10.1 Rules

For each slide:
1. transition runs first
2. animations start after transition
3. animations grouped into click buckets
4. dependencies resolved
5. lanes assigned

### 10.2 Click buckets
- bucket 0 = autoplay
- each click creates a new bucket

### 10.3 Dependency resolution
- `withPrevious` shares start time
- `afterPrevious` follows previous

### 10.4 Lane assignment

Greedy interval partitioning.

### 10.5 Structures

```ts
interface CompiledSlideTimeline {
  slideId: Id
  transition?: CompiledTransitionBar
  clickBuckets: ClickBucket[]
}
```

### 10.6 Presentation timeline

```ts
interface CompiledPresentationTimeline {
  slideSegments: CompiledSlideSegment[]
  totalDurationMs: number
}
```

---

## 11. Playback and Scrubbing

### 11.1 Evaluate at time

```
find slide
if transition → blend states
else         → evaluate animations
```

### 11.2 Checkpoints

```ts
interface SlideCheckpoint {
  timeMs: number
  state: CompactSlideStateSnapshot
}
```

Used to avoid replaying all animations from the beginning.

---

## 12. Rendering Architecture

### 12.1 Main renderer (DOM + SVG)

| Layer | Responsibility |
|-------|---------------|
| DOM   | text, layout, editing |
| SVG   | shapes, overlays (underline, highlight) |
| CSS   | transform, opacity |

### 12.2 Render state

```ts
interface RenderNode {
  id: Id
  type: 'html' | 'svg'
  transform: string
  opacity: number
  visible: boolean
  children: RenderNode[]
}
```

---

## 13. Text Layout Service

Required to bridge the text model and rendering.

```ts
interface TextLayoutService {
  measureRange(anchor: TextRangeAnchor): TextRangeGeometry
}
```

### 13.1 Geometry

```ts
interface TextRangeGeometry {
  rects: DOMRect[]
  baselines: { x1: number; x2: number; y: number }[]
}
```

Used for underline drawing and highlight overlays.

---

## 14. Thumbnails

### 14.1 Definition

Thumbnail = entry state of slide.

### 14.2 Cache

```ts
interface ThumbnailCache {
  composited: Map<Id, ImageBitmap | null>
}
```

### 14.3 Invalidation
- master change → invalidate all appearances
- animation change → invalidate downstream appearances
- slide reorder → rebuild chains

---

## 15. Live Preview

```ts
interface LivePreviewStore {
  masterTransformPatches: Map<Id, Partial<Transform>>
}
```

Used during drag:
- no document mutation
- instant visual feedback
- commit on drag end

---

## 16. Rendering Priorities

1. main canvas
2. current slide
3. visible thumbnails
4. rest

Use batching and `requestAnimationFrame`.

---

## 17. Performance Principles

- prefer `transform` and `opacity` (GPU-composited)
- avoid layout-triggering properties
- minimize DOM segmentation
- only split text nodes when needed
- reuse easing runtimes
- cache checkpoints

---

## 18. Key Design Decisions

- text is first-class and editable
- animation targets include text ranges and decorations
- easing is a runtime subsystem
- rendering is DOM + SVG hybrid
- timeline is compiled, not stored
- playback is engine-driven, not CSS-driven
