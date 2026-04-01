# Core Feature Specification

## 1. Overview

Presenter 2 is a TypeScript/React presentation authoring application in the spirit of Keynote and PowerPoint. It introduces a central concept not present in those tools: the **Multi-Slide Object (MSO)**, which allows a single logical object to appear across multiple slides while being authored once.

---

## 2. Multi-Slide Objects (MSO)

### 2.1 Definition

An MSO is a logical object — shape, text, image, or group — that can appear on multiple slides. The slides need not be consecutive.

### 2.2 Master and Appearances

- Each MSO has exactly one **master** that owns all editorial properties: geometry, transform, style, content, and structure.
- Each occurrence of an MSO on a slide is an **appearance**. An appearance holds only slide membership, z-order, and animations.
- Any editorial change to an MSO (e.g. repositioning, restyling, editing text) is applied to the master and immediately reflected in all appearances.

### 2.3 State Propagation

The visual state of an MSO propagates forward along its appearance chain (sorted by slide order):

- The first appearance starts from the master state.
- Each subsequent appearance starts from the exit state of the previous appearance.
- The exit state of an appearance is its entry state with all its animations applied to completion.

Propagation is **downstream only**: animations on a later appearance do not affect earlier ones.

---

## 3. Animations

### 3.1 Ownership

Animations are owned by appearances, not by the master. This means:
- An animation added to an appearance affects all downstream appearances.
- It does not affect upstream appearances.

### 3.2 Triggers

Each animation has one of the following triggers:

| Trigger          | Description                                                                        |
| ---------------- | ---------------------------------------------------------------------------------- |
| `onClick`        | Starts on the next user click.                                                     |
| `afterPrevious`  | Starts automatically after the previous animation ends, with an optional delay.    |
| `withPrevious`   | Starts at the same time as the previous animation, with an optional delay.         |

### 3.3 Properties

Each animation specifies:
- **Target** — the object, group child, text range, or text decoration to animate.
- **Property** — the animatable property (e.g. opacity, transform, color, stroke-dashoffset).
- **From / To values** — start and end values for the property.
- **Duration** — in milliseconds.
- **Easing** — see Section 5.

### 3.4 Animation Targets

Animations can target:

| Target kind        | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| `appearance`       | The whole MSO appearance.                                  |
| `group-child`      | A specific child within a group, addressed by path.        |
| `text-range`       | A range of text within a text object.                      |
| `text-decoration`  | A decoration overlay (underline, highlight, outline).      |

---

## 4. Slide Transitions

Each slide may have a transition that plays when the slide is entered.

- Transitions support the same trigger types as animations (`onClick`, `afterPrevious`), with optional delay.
- Transitions have duration and easing.
- A transition always completes before the slide's local animations begin.

---

## 5. Easing

All animations and transitions support configurable easing.

- **Presets:** `linear`, `ease`, `easeIn`, `easeOut`, `easeInOut`.
- **Custom cubic Bézier:** the user may define a custom curve by manipulating control points P1 and P2. P1x and P2x are constrained to [0, 1].
- **Spring:** parameterised by mass, stiffness, damping, and initial velocity. Still bounded by `durationMs`; may overshoot internally.

---

## 6. Timeline

### 6.1 Structure

The timeline is compiled from the document — it is never stored. For each slide it contains:

- A transition bar (if applicable).
- Animation bars grouped into **click buckets**.
- Parallel animations displayed in parallel lanes (greedy interval partitioning).

Click bucket 0 contains animations that play automatically after the transition. Each subsequent user click advances to the next bucket.

For timeline display purposes, `onClick` delays are rendered as a configurable constant duration.

### 6.2 Playback Controls

The timeline UI provides:
- **Play / pause.**
- **Scrubber** — the user can click or drag to any point in the timeline.

### 6.3 Scrubbing

When the scrubber is moved to time *t*:
- The presentation view updates immediately, showing the exact visual state at *t*.
- This works even if *t* falls in the middle of an animation or transition.
- There is no perceptible lag.

Scrubbing is implemented via state checkpoints and evaluated interpolation, not by replaying animations from the beginning.

---

## 7. Thumbnails

### 7.1 Definition

Each thumbnail shows the **entry state** of its slide — the state as it looks the moment it is entered, before any animations play.

### 7.2 Live Updates

| Event                                         | Thumbnail behaviour                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Master edited (e.g. drag to new position)     | All thumbnails for appearances of that MSO update immediately, including while dragging. |
| Animation added or modified on an appearance  | All thumbnails for downstream appearances update immediately.                            |
| Slide reorder                                 | Appearance chains are rebuilt; affected thumbnails update.                               |

---

## 8. Text System

Text editing is a first-class feature.

### 8.1 Structure

Text is modelled as a hierarchy of blocks and runs, each with a stable ID. This allows animations to target specific text ranges and survive edits.

### 8.2 Text Decorations

Decorations (underline, highlight, outline) are rendered as SVG overlays positioned relative to the text layout — not as CSS `text-decoration`. This enables:

- **Line-draw animation:** the underline strokes in using `stroke-dashoffset`.
- **Highlight sweep:** a color fill sweeps across a word or phrase.
- **Animated emphasis:** any decoration property can be animated.

Decorations are anchored to text ranges using stable block/run IDs and character offsets.

### 8.3 Animating Text Sub-ranges

It is possible to animate a subset of text within a text object — for example, fading a single word to a different color, or drawing an underline under a specific phrase — without splitting the text object into multiple independent objects.

---

## 9. Live Preview During Editing

While the user drags or otherwise manipulates an MSO:
- No document mutation occurs until the interaction is committed.
- A patch is applied in a live preview store and rendered immediately.
- All thumbnails reflect the in-progress state in real time.

---

## 10. Multi-Window (Electron)

The application operates with two windows simultaneously during presentation:

- **Editor window** — the authoring interface on the presenter's display.
- **Live window** — full-screen, no chrome, on the projector or external display.

The main process is the source of truth for current slide index. The editor sends navigation commands via IPC; the main process broadcasts to the live window.
