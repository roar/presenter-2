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

## 3. Named Style States

### 3.1 Definition

The user may define any number of **named styles**. There are two types: **text styles^^ and **object styles**.

Every style has a **default state** — its base set of visual properties (fill, stroke, opacity, font size, font weight, text shadow, etc.), defined by the user.

The user may add additional states. Each named state specifies one or more property overrides relative to the default. A named state resolves to the default style with its overrides applied on top; unspecified properties retain their default values.

The user may assign a named style to an object. Named syles are assigned to the object master and are therefore shared across all appearances of that MSO.

**Example:** A style with default fill `white` and opacity `1.0` might have a named state `"highlighted"` that overrides fill to `yellow`, and a named state `"muted"` that overrides opacity to `0.3`.

### 3.2 State Change Animation

The **State Change** animation type transitions an object's style from one state to another.

- **From state** — the starting state (may be the default state or a named state).
- **To state** — the target state (may be the default state or a named state).
- Animatable properties between states are interpolated over the animation duration using the configured easing.
- Non-interpolatable properties (e.g. font family) snap to the target state at completion.

When a State Change animation completes, the object's active style state updates to the `to` state. This updated state propagates forward to downstream appearances as part of exit state.

---

## 4. Animations

### 4.1 Ownership

Animations are owned by appearances, not by the master. This means:
- An animation added to an appearance affects all downstream appearances.
- It does not affect upstream appearances.

### 4.2 Triggers

Each animation has one of the following triggers:

| Trigger          | Description                                                                        |
| ---------------- | ---------------------------------------------------------------------------------- |
| `onClick`        | Starts on the next user click.                                                     |
| `afterPrevious`  | Starts automatically after the previous animation ends, with an optional delay.    |
| `withPrevious`   | Starts at the same time as the previous animation, with an optional delay.         |

### 4.3 Properties

Each animation specifies:
- **Target** — the object, group, group child, text range, or text decoration to animate.
- **Type** — the animation type (see §4.5).
- **To values** — animation end value, specific to the animation type.
- **Duration** — in milliseconds.
- **Easing** — see Section 7.

### 4.4 Animation Targets

Animations can target:

| Target kind        | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| `appearance`       | The whole MSO appearance.                                  |
| `group-child`      | A specific child within a group, addressed by path.        |
| `text-range`       | A range of text within a text object.                      |
| `text-decoration`  | A decoration overlay (underline, highlight, outline).      |

### 4.5 Animation Types

| Type                  | From / To                          | Description                                                  |
| --------------------- | ---------------------------------- | ------------------------------------------------------------ |
| Opacity               | `number` (0–1)                     | Fades the target in or out.                                  |
| Color                 | `Color`                            | Interpolates the fill or stroke color.                       |
| Transform             | `Partial<Transform>`               | Moves, scales, or rotates the target.                        |
| Decoration Progress   | `number` (0–1)                     | Animates a text decoration (e.g. underline draw).            |
| Text Reveal           | `number` (0–1), mode: chars/words/lines | Reveals text progressively.                             |
| State Change          | style state name     | Transitions the object between the object's current style state and another specified named state defined on the onject's style (§3).  |

---

## 5. Animation Groups

### 5.1 Definition

An **animation group** is a named, reusable set of animations that can be applied to a slide as a single unit. Groups are authored once and instantiated multiple times.

**Examples:** `"Pop In"`, `"Highlight Sweep"`, `"Entrance with Underline"`.

### 5.2 Parameter Slots

A group declares one or more **named parameter slots**. Each slot represents an object or text range that one or more animations in the group will target.

- The user binds actual objects or text ranges to each slot at the time the group is added to a slide.

Each animation within the group references exactly one parameter slot by name as its target. A slot may be referenced by multiple animations in the grouø.

**Example:** A group `"Highlight with Underline"` declares two slots — `object` and `highlight text`. One animation fades in `object; another animates highlighting of `highlight text.

### 5.3 Timing

Animations within a group use only `withPrevious` or `afterPrevious` triggers — `onClick` is not permitted inside a group.

The **group instance** itself carries the trigger (`onClick`, `withPrevious`, or `afterPrevious`) that determines when the group begins. From that point, member animations resolve their timing relative to each other in authored order.

The group's total duration is derived — it is the time from group start to the end of the last-finishing member animation.

### 5.4 Authoring

Each member animation in a group specifies:
- **Target slot** — the named parameter slot this animation applies to.
- **Type** — any animation type from §4.5.
- **To value** — as per the animation type.
- **Duration** and **Easing**.
- **Trigger** — `withPrevious` or `afterPrevious`, with optional delay.

---

## 6. Slide Transitions

Each slide may have a transition that plays when the slide is entered.

- Transitions support `onClick` and `afterPrevious` triggers, with optional delay.
- Transitions have duration and easing.
- A transition always completes before the slide's local animations begin.

---

## 7. Easing

All animations and transitions support configurable easing.

- **Presets:** `linear`, `ease-in`, `ease-out`, `ease-in-out`.
- **Custom cubic Bézier:** the user may define a custom curve by manipulating control points. `x1` and `x2` are constrained to [0, 1].

---

## 8. Timeline

### 8.1 Structure

The timeline is compiled from the document — it is never stored. For each slide it contains:

- A transition bar (if applicable).
- Animation bars grouped into **click buckets**.
- Parallel animations displayed in parallel lanes (greedy interval partitioning).
- Animation group instances rendered as a single collapsible bar, expandable to show member animations.

Click bucket 0 contains animations that play after the transition ~ either automatically or after click. Each subsequent user click advances to the next bucket.

For timeline display purposes, `onClick` delays are rendered as a configurable constant duration.

### 8.2 Playback Controls

The timeline UI provides:
- **Play / pause.**
- **Scrubber** — the user can click or drag to any point in the timeline.

### 8.3 Scrubbing

When the scrubber is moved to time *t*:
- The presentation view updates immediately, showing the exact visual state at *t*.
- This works even if *t* falls in the middle of an animation or transition.
- There is no perceptible lag.

Scrubbing is implemented via state checkpoints and evaluated interpolation, not by replaying animations from the beginning.

---

## 9. Thumbnails

### 9.1 Definition

Each thumbnail shows the **entry state** of its slide — the state as it looks the moment it is entered, before any animations play.

### 9.2 Live Updates

| Event                                         | Thumbnail behaviour                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Master edited (e.g. drag to new position)     | All thumbnails for appearances of that MSO update immediately, including while dragging. |
| Animation added or modified on an appearance  | All thumbnails for downstream appearances update immediately.                            |
| Slide reorder                                 | Appearance chains are rebuilt; affected thumbnails update.                               |

---

## 10. Text System

Text editing is a first-class feature.

### 10.1 Structure

Text is modelled as a hierarchy of blocks and runs, each with a stable ID. This allows animations to target specific text ranges and survive edits.

### 10.2 Text Decorations

Decorations (underline, highlight, outline) are rendered as SVG overlays positioned relative to the text layout — not as CSS `text-decoration`. This enables:

- **Line-draw animation:** the underline strokes in progressively.
- **Highlight sweep:** a color fill sweeps across a word or phrase.
- **Animated emphasis:** any decoration property can be animated.

Decorations are anchored to text ranges using stable block/run IDs and character offsets.

### 10.3 Animating Text Sub-ranges

It is possible to animate a subset of text within a text object — for example, fading a single word to a different color, or drawing an underline under a specific phrase — without splitting the text object into multiple independent objects.

---

## 11. Live Preview During Editing

While the user drags or otherwise manipulates an MSO:
- No document mutation occurs until the interaction is committed.
- A patch is applied in a live preview store and rendered immediately.
- All thumbnails reflect the in-progress state in real time.

---

## 12. Multi-Window (Electron)

The application operates with two windows simultaneously during presentation:

- **Editor window** — the authoring interface on the presenter's display.
- **Live window** — full-screen, no chrome, on the projector or external display.

The main process is the source of truth for current slide index. The editor sends navigation commands via IPC; the main process broadcasts to the live window.
