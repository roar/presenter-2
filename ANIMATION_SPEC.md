# Animation & Timeline Spec

## Concepts

### Cue sequence

A presentation is a linear sequence of **cues** across all slides. A user click advances to the next `on-click` cue. `after-previous` and `with-previous` cues fire automatically based on timing.

There are two kinds of cue, kept deliberately distinct:

- **AnimationCue** — animates one or more nodes on the current slide; does not change the active slide
- **TransitionCue** — advances to the next slide; contains no element animations

This separation matters: animations describe element state, transitions describe navigation. Mixing them would complicate `resolveFrame` and the editor UI.

### Slide nodes

A slide contains a tree of **nodes** — elements and groups in a single unified list. Groups are recursive: a group can contain elements or other groups.

`AnimationTarget` references any node by `id`, regardless of whether it is an element or a group. When a group is targeted, all members are animated identically.

### Visibility state

Visibility is not stored on a node — it is derived from the cue sequence up to the current time.

- A node whose first animation is an `enter` effect starts **hidden**
- A node with no animations, or whose first animation is an `exit` effect, starts **visible**
- Each `enter` effect toggles the node from hidden → visible
- Each `exit` effect toggles the node from visible → hidden
- Multiple enter/exit on the same node always alternate state

### Enter / Exit vs property animations

| Kind | Visibility change | Typical use |
|---|---|---|
| `enter` | hidden → visible | Fly in, fade in, scale up |
| `exit` | visible → hidden | Fly out, fade out, scale down |
| `property` | none | Colour shift, shadow pulse, move while staying visible |

### Slide transitions

Slide transitions are separate from animation blocks. Element animations on regular slide nodes only start after the transition completes — they do not overlap with the transition.

**MSOs are not affected by slide transitions.** They are rendered on a layer above the transitioning slides and remain fully visible and stable while the transition plays beneath them.

MSOs have no special treatment in the cue sequencing rules. `on-click`, `after-previous`, and `with-previous` work identically whether the target is a regular element or an MSO instance. `after-previous` always follows the preceding entry in `slide.cues[]` by array position — parallel cues (`with-previous`) do not affect the timing of subsequent cues, regardless of whether they target MSOs or regular elements.

---

## Model

```ts
// --- Slide nodes ---

// Elements and groups share a single children array on Slide.
// Groups are recursive: a group may contain elements or other groups.
type SlideNode = TextElement | ImageElement | ShapeElement | NodeGroup | MSOInstance

interface NodeGroup {
  kind: 'group'
  id: string
  children: SlideNode[]   // recursive — groups of groups are valid
}

// MSOInstance is a reference to an MSODefinition (master).
// It carries no visual properties of its own — all properties are derived
// from the master plus the accumulated animation end-states of prior instances.
interface MSOInstance {
  kind: 'mso-instance'
  id: string              // unique per slide — used as animation target
  masterId: string        // references MSODefinition.id
}

// --- Presentation ---

interface Presentation {
  id: string
  slides: Slide[]
  msoDefinitions: MSODefinition[]   // master objects, shared across slides
}

// MSODefinition holds the base properties of the object.
// It is never mutated by animations — animations accumulate on instances only.
interface MSODefinition {
  id: string
  base: TextElement | ImageElement | ShapeElement   // master visual state
}

// --- Slide ---

interface Slide {
  id: string
  children: SlideNode[]   // top-level nodes; groups nest their own children
  cues: Cue[]             // ordered — defines the click sequence for this slide
}

// --- Cues ---

type Cue = AnimationCue | TransitionCue

// AnimationCue: animates nodes on the current slide.
interface AnimationCue {
  id: string
  kind: 'animation'
  trigger: 'on-click' | 'after-previous' | 'with-previous'
  animations: ScheduledAnimation[]
  loop: LoopConfig
}

// TransitionCue: advances to the next slide. Contains no element animations.
interface TransitionCue {
  id: string
  kind: 'transition'
  trigger: 'on-click' | 'after-previous'
  slideTransition: SlideTransition
}

// --- Animations ---

interface ScheduledAnimation {
  id: string
  targetId: string        // id of any SlideNode — element or group
  offset: number          // seconds from block start — defines parallel/sequential mix
  duration: number        // seconds
  easing: Easing
  effect: AnimationEffect
}

type AnimationEffect =
  | { kind: 'enter';    animation: VisualEffect }
  | { kind: 'exit';     animation: VisualEffect }
  | { kind: 'property'; animation: VisualEffect }

type VisualEffect =
  | { type: 'fade';        from: number;     to: number }
  | { type: 'move';        from: Position;   to: Position }
  | { type: 'scale';       from: number;     to: number }
  | { type: 'text-shadow'; from: TextShadow; to: TextShadow }

// Named presets map to CSS equivalents.
// cubic-bezier matches CSS cubic-bezier(x1, y1, x2, y2).
// steps matches CSS steps(count, direction).
type Easing =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | { kind: 'cubic-bezier'; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'steps';        count: number; direction: 'start' | 'end' }

type LoopConfig =
  | { kind: 'none' }
  | { kind: 'finite';   count: number }
  | { kind: 'infinite' }

// --- Slide transition ---

interface SlideTransition {
  kind: 'cut' | 'fade' | 'push'
  duration: number
  easing: Easing
}
```

---

## Derived values

Block duration is always computed — never stored:

```ts
function blockDuration(block: AnimationCue): number {
  if (block.animations.length === 0) return 0
  return Math.max(...block.animations.map(a => a.offset + a.duration))
}
```

Effective block duration with looping:

```ts
function effectiveBlockDuration(block: AnimationCue): number {
  const base = blockDuration(block)
  switch (block.loop.kind) {
    case 'none':     return base
    case 'finite':   return base * block.loop.count
    case 'infinite': return Infinity
  }
}
```

How `offset` encodes parallel and sequential scheduling — no separate flag needed:

```
// Parallel — same offset
A: offset 0,   duration 0.5
B: offset 0,   duration 0.8

// Sequential — each offset = previous end
A: offset 0,   duration 0.5
B: offset 0.5, duration 0.3

// Mixed
A: offset 0,   duration 0.5
B: offset 0,   duration 0.8   // parallel with A
C: offset 0.8, duration 0.4   // starts after B finishes
```

---

## Timeline

The `PresentationTimeline` maps absolute time → cue start times. It is built once from the cue sequence and reused by `resolveFrame`.

```ts
interface ScheduledCue {
  cue: Cue
  startTime: number       // absolute seconds from presentation start
  endTime: number         // startTime + effective duration
}

interface PresentationTimeline {
  scheduledCues: ScheduledCue[]
}
```

Timeline construction rules:

- `on-click` cues: `startTime` comes from a trigger source — either a `RecordedTrigger` (recorded playback) or a manual advance event (live playback)
- `after-previous`: `startTime = previousCue.endTime` — "previous" means the immediately preceding entry in `slide.cues[]` by array position; parallel cues running alongside it do not affect this
- `with-previous`: `startTime = previousCue.startTime`

---

## Recording

Recording captures when the user triggered each `on-click` cue. Timing is absolute from recording start.

```ts
interface Recording {
  videoUrl: string
  triggers: RecordedTrigger[]
}

interface RecordedTrigger {
  time: number      // absolute seconds from recording start
  cueId: string     // references an on-click Cue (AnimationCue or TransitionCue)
}
```

Auto-advancing cues (`after-previous`, `with-previous`) do not appear in the recording — their timing is derived from the previous cue's end time.

---

## resolveFrame

`resolveFrame` is a pure function. It takes a `PresentationTimeline` and an absolute time value and returns a complete description of what to render.

```ts
resolveFrame(timeline: PresentationTimeline, time: number): FrameState
```

```ts
interface FrameState {
  behind: RenderedSlide | null    // outgoing slide — present only during a transition
  front: RenderedSlide            // current / incoming slide
  transition: ActiveTransition | null
  msoElements: RenderedElement[]  // rendered above the transition layer; unaffected by it
}

interface ActiveTransition {
  kind: SlideTransition['kind']
  progress: number                // 0 → 1, easing already applied
}

interface RenderedSlide {
  slide: Slide
  elements: RenderedElement[]
}

interface RenderedElement {
  element: SlideNode
  visible: boolean
  opacity: number                 // 0–1
  transform: string               // CSS transform string
  textShadow: TextShadow | null
}
```

### resolveFrame algorithm

For each node on the active slide (flatten the tree — groups do not render, their children do):

1. Walk all `ScheduledAnimation` entries targeting this node (or any ancestor group), ordered by `startTime`
2. Derive initial visibility (hidden if first animation is `enter`, visible otherwise)
3. For each animation whose `startTime ≤ time`:
   - Compute `localTime = time - startTime - animation.offset`
   - If `localTime < 0`: animation has not started — node stays at `from`
   - If `localTime ≥ duration`: animation has finished — node stays at `to`; apply visibility toggle if `enter`/`exit`
   - Otherwise: compute `progress = localTime / duration`, apply easing, interpolate `from → to`
4. The last completed or currently active `enter`/`exit` determines current visibility

### Resolving MSOInstance nodes

An `MSOInstance` has no visual properties of its own. Its resolved state is built in three steps:

1. **Start from master** — load `MSODefinition.base` for the instance's `masterId`
2. **Apply prior chain** — find all `MSOInstance` nodes with the same `masterId` on slides before the current slide, in slide order. For each, apply the end state of every completed `AnimationCue` that targeted that instance. This gives the accumulated state the object carries into the current slide.
3. **Apply current animations** — apply in-progress and completed animations from the current slide's cues as normal

The master (`MSODefinition.base`) is never modified. Accumulated state exists only in `resolveFrame` output — it is not persisted.

MSO instances are excluded from `RenderedSlide.elements` — they are resolved separately into `FrameState.msoElements` and rendered above the transition layer.

---

## Scrubber and playback

The scrubber and all playback modes drive `resolveFrame` with the same interface:

| Mode | Time source |
|---|---|
| Live presentation | Manual advance events build the timeline in real time |
| Recorded playback | `video.currentTime` — timeline pre-built from `Recording` |
| Scrubber | Slider value — same timeline as recorded playback |
| Export / thumbnail | Fixed time value passed directly |

The renderer has no knowledge of which mode is active.
