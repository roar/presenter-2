# Implementation Plan

## Dependency order

```
Phase 1 (model normalization) ← everything depends on this
  ├── Phase 2 (easing)          — independent, can run in parallel with Ph1
  ├── Phase 3 (animation union) — requires Ph1 types
  ├── Phase 4 (rich text)       — requires Ph1 TextContent types
  ├── Phase 5 (IPC + repo)      — requires Ph1 Presentation type
  └── Phase 6 (MsoStateResolver + decorations) — requires Ph1, Ph3
          └── Phase 7 (checkpoints + caches) — requires Ph1, Ph3, Ph6
```

---

## Phase 1 — Normalize the Document Model `XL`

**Goal:** Replace the flat inline model with the normalized `Presentation` from the spec. This is the single biggest breaking change and the root dependency for everything else.

### What changes

`/src/shared/model/types.ts` — complete rewrite:
- `Presentation` replaces `Document`: adds `slideOrder: SlideId[]`, `slidesById`, `mastersById`, `appearancesById`, `animationsById`, `textDecorationsById`, `revision: number`
- `Slide` loses `children` and `cues` — becomes `{ id, appearanceIds, transition?, background }`
- Add `MsoMaster`: `{ id, type, transform: Transform, style: StyleProperties, content: Content, geometry?, childMasterIds?, version }`
- Add `Appearance`: `{ id, masterId, slideId, animationIds, zIndex, initialVisibility, version }`
- Add `TextContent → TextBlock → TextRun → TextMark` hierarchy
- Add `TextRangeAnchor`: `{ blockId, startOffset, endOffset, degraded? }`
- Add `TextDecoration`: `{ id, kind, anchor }`
- Keep `Easing`, `SlideTransition`, `Recording`, `LoopConfig`
- **Note on rotation:** keep degrees (matches CSS + current rendering code); document as deliberate divergence from spec's radians

`/src/shared/model/factories.ts` — new file:
- `createPresentation()`, `createSlide()`, `createMsoMaster(type)`, `createAppearance(masterId, slideId)`
- `createTextContent(plain: string): TextContent` — for migration
- All use `crypto.randomUUID()`

`/src/shared/model/migration.ts` — new file:
- `migrateV0ToV1(legacyDoc): Presentation` — converts old flat format, creates one master per element, handles elements with existing `masterId` by mapping to same master across slides

`/src/renderer/src/store/documentStore.ts` — `DocumentState.document` becomes `Presentation | null`; all actions updated; `addSlide` now creates `MsoMaster` + `Appearance` per element

### Tests to write first (TDD)

- `factories.test.ts`: `createPresentation()` has empty maps + `revision: 0`; `createTextContent('hello')` produces one block, one run, no marks
- `migration.test.ts`: legacy doc with one text element → one master in `mastersById`, one appearance in `appearancesById`; MSO elements (shared `masterId`) map to the same master across slides
- Update: `documentStore.test.ts`, `resolveFrame.test.ts`, `buildTimeline.test.ts`, `SlideRenderer.test.tsx`

### Migration safety

`JsonFileRepository.load()` (Phase 5) calls `migrateV0ToV1()` when the loaded JSON lacks `slideOrder`. Saves always write new format.

---

## Phase 2 — Complete the Easing System `S`

**Goal:** Fix the two `throw new Error('not implemented')` paths and add spring easing.

### What changes

`/src/shared/animation/applyEasing.ts`:
- `cubic-bezier`: route to the existing `cubicBezier()` helper already in the file (it's a misrouted branch, not missing logic)
- `steps`: `Math.floor(progress * count) / count` for `'end'`; `Math.ceil(...)` for `'start'`, clamped to `[0,1]`
- `spring`: closed-form `f(t) = 1 - e^(-damping*t) * cos(omega*t)` scaled to `[0,1]` within `durationMs`, clamped at end

`/src/shared/model/types.ts` — add `SpringEasing` to the `Easing` union (can land during Phase 1):
```ts
| { kind: 'spring'; mass: number; stiffness: number; damping: number; initialVelocity: number }
```

### Tests to write first

- `cubic-bezier` with `(0.4, 0, 0.2, 1)`: `f(0) === 0`, `f(1) ≈ 1`, midpoint in `(0,1)`
- `steps(4, 'end')` at `t=0.25 → 0`, `t=0.5 → 0.25`, `t=1.0 → 1.0`
- `steps(4, 'start')` at `t=0.01 → 0.25`
- `spring`: `f(0) === 0`, `f(1) ≈ 1`, may overshoot internally

---

## Phase 3 — Animation Union + CompiledAnimation `L`

**Goal:** Replace `ScheduledAnimation` with the spec's discriminated union and produce a `CompiledAnimation` with a typed `sample()` function. Removes the inline `effect.kind` switch from `resolveFrame.ts`.

### What changes

`/src/shared/animation/types.ts` — adds:
- `AnimationTarget` union: `{ kind: 'appearance' | 'group-child' | 'text-range' | 'text-decoration'; ... }`
- `BaseAnimation`, `OpacityAnimation`, `ColorAnimation`, `TransformAnimation`, `DecorationProgressAnimation`, `TextRevealAnimation` — per spec §8.2
- `AnimationTrigger` (replaces trigger string on old `ScheduledAnimation`)
- `CompiledAnimation`: `{ id, appearanceId, target, kind, startMs, endMs, sample: (elapsedMs, state: RenderState) => void }`
- `RenderState`: `{ opacity?, transform?, textRevealProgress?, decorationProgress? }`
- `ClickBucket`, `CompiledSlideTimeline`, `CompiledPresentationTimeline` per spec §11

`/src/shared/animation/compileAnimation.ts` — new file:
- `compileAnimation(anim: Animation, startMs: number): CompiledAnimation`
- Per-kind helpers: `compileOpacity`, `compileColor`, `compileTransform`, `compileDecorationProgress`, `compileTextReveal`
- Each builds a `sample()` closure that reads `elapsedMs`, applies easing, mutates `RenderState`

`/src/shared/animation/buildTimeline.ts` — updated:
- Takes `Presentation` instead of `Slide[]`
- Walks `slideOrder → slidesById → appearancesById → animationsById`
- Outputs `CompiledPresentationTimeline` with click buckets per spec §11.2–11.4
- Lane assignment: greedy interval partitioning

`/src/shared/animation/resolveFrame.ts` — updated:
- Drives `CompiledAnimation.sample()` instead of inline `effect.kind` switch
- Removes all `throw new Error('not implemented')` paths

### Tests to write first

- `compileAnimation.test.ts`: opacity `sample(0) → from`, `sample(endMs) → to`, clamped at endMs; color channels interpolate independently; `textReveal` at 50% with 10 chars → `revealedCount === 5`
- Update `buildTimeline.test.ts` to use `Presentation` fixtures, assert `CompiledPresentationTimeline`
- Update `resolveFrame.test.ts`; add cases for `ColorAnimation`, `TextRevealAnimation`

---

## Phase 4 — Rich Text Rendering + Anchor Repair `L`

**Goal:** Render `TextContent` (blocks/runs/marks) in the viewer. Implement anchor repair after text edits.

### What changes

`/src/shared/text/textContentUtils.ts` — new file:
- `extractPlainText(content): string`
- `blockPlainText(block): string`
- `charOffsetToRunPosition(block, offset): { runIndex, offsetInRun }` — needed by anchor repair and reveal clipping

`/src/shared/text/anchorRepair.ts` — new file:
- `repairAnchors(oldText, newText, anchors): TextRangeAnchor[]`
- Simple prefix/suffix diff (Myers is a follow-up)
- Sets `degraded: true` when anchor's range falls entirely inside a deleted region

`/src/viewer/src/components/TextContentRenderer/TextContentRenderer.tsx` — new component:
- Props: `{ content: TextContent; revealedCharCount?: number }`
- Maps `blocks → div`, `runs → span` with inline styles from `TextMark[]`
- `bold` → `fontWeight: bold`, `italic` → `fontStyle: italic`, `underline` → `textDecoration: underline` (CSS only; SVG overlay deferred to Phase 6), `color` → `color: value`
- When `revealedCharCount` defined, clips visible characters

`/src/viewer/src/components/TextElementRenderer/TextElementRenderer.tsx` — replace `{element.content}` with `<TextContentRenderer content={master.content.value} revealedCharCount={...} />`

### Tests to write first

- `textContentUtils.test.ts`: `extractPlainText` with two blocks; `charOffsetToRunPosition` at run boundary; past-end clamps to last run
- `anchorRepair.test.ts`: insert before anchor shifts offsets; delete before anchor shifts left; delete overlapping anchor start clips; delete entire range → `degraded: true`; unchanged region → unaffected
- `TextContentRenderer.test.tsx`: plain text renders; bold mark → `fontWeight`; with `revealedCharCount=3` on 5-char run → only 3 chars visible

---

## Phase 5 — IPC Protocol + JsonFileRepository `M`

**Goal:** Define the typed IPC protocol, wire `JsonFileRepository` to real file I/O, implement `list()`.

### What changes

`/src/shared/ipc/types.ts` — new file:
```ts
type IPCMessage =
  | { type: 'STATE_UPDATE'; revision: number; patch: Partial<Presentation> }
  | { type: 'SET_TIME'; timeMs: number }
  | { type: 'SET_SLIDE'; slideId: SlideId }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
```
Plus `IPCChannel = 'presenter:message'` constant.

`/src/main/ipc/documentHandlers.ts` — new file: `ipcMain.handle` for `document:load`, `document:save`, `document:list`, `document:delete` using `userDataPath`.

`/src/main/index.ts` — register handlers; open viewer `BrowserWindow` (hidden); add `presenter:message` relay to viewer.

`/src/preload/index.ts` — typed bridge exposing `window.electronAPI.document.*` and `window.electronAPI.ipc.{ send, on }`.

`/src/renderer/src/repository/JsonFileRepository.ts` — implement all four methods via `window.electronAPI.document.*`; remove `throw` stubs.

`/src/renderer/src/env.d.ts` — declare `window.electronAPI: ElectronAPI`.

### Tests to write first

- `ipc/types.test.ts`: each message variant round-trips through `JSON.parse(JSON.stringify(...))`
- `JsonFileRepository.test.ts` with `vi.stubGlobal('electronAPI', mock)`: `load(id)` calls `electronAPI.document.load(id)`; `save(doc)` calls through; `list()` returns mocked `DocumentMeta[]`

---

## Phase 6 — MsoStateResolver + TextDecoration Overlays `M`

**Goal:** Cross-slide state propagation. Text decorations rendered as SVG overlays (underline draw, highlight sweep).

### What changes

`/src/shared/animation/MsoStateResolver.ts` — new file:
- `class MsoStateResolver` — takes `Presentation` in constructor
- `resolveEntryState(masterId, slideId): ElementState` — master default state + accumulated exit states from all prior appearances (in `slideOrder`)
- `resolveExitState(masterId, slideId): ElementState` — entry state + all animations for this appearance run to completion
- `ElementState`: `{ opacity, transform, textRevealProgress, decorationProgress }`
- Memoizes results in `Map<string, ElementState>`

`/src/shared/text/TextLayoutService.ts` — new file:
- `interface TextLayoutService { measureRange(blockId, startOffset, endOffset): TextRangeGeometry }`
- `NullTextLayoutService` — returns empty arrays (stub until DOM is available)
- `TextRangeGeometry`: `{ rects: DOMRect[]; baselines: { x1, x2, y }[] }`

`/src/viewer/src/components/TextDecorationRenderer/TextDecorationRenderer.tsx` — new component:
- Props: `{ decoration: TextDecoration; geometry: TextRangeGeometry; progress: number }`
- `'underline'`: `<line>` per baseline, `stroke-dashoffset` driven by `progress`
- `'highlight'`: `<rect>` per line rect, `clipPath` sweeps
- `'outline'`: `<rect>` border

### Tests to write first

- `MsoStateResolver.test.ts`: no appearances → returns master default state; one appearance with opacity 0→1 → next slide entry has `opacity: 1`; slides 1,3,5 chained correctly; memoization returns same reference
- `TextDecorationRenderer.test.tsx`: renders `<svg>`; `underline` at `progress: 1` → `stroke-dashoffset: 0`; `underline` at `progress: 0` → dashoffset equals line length; `highlight` renders `<rect>` per geometry rect

---

## Phase 7 — Checkpoints, ThumbnailCache, LivePreviewStore `M`

**Goal:** Scrubbing optimization, thumbnail invalidation, non-destructive live preview during drag/resize.

### What changes

`/src/shared/animation/SlideCheckpoint.ts` — new file:
- `interface SlideCheckpoint { timeMs: number; state: CompactSlideStateSnapshot }`
- `CompactSlideStateSnapshot`: `{ appearanceStates: Map<AppearanceId, ElementState> }`
- `buildCheckpoints(timeline: CompiledSlideTimeline, resolver: MsoStateResolver): SlideCheckpoint[]` — at slide entry, each click bucket start, each animation group end, + every `MAX_CHECKPOINT_INTERVAL_MS` (100ms) gap
- `nearestCheckpointBefore(checkpoints, timeMs): SlideCheckpoint | null`

`/src/renderer/src/store/thumbnailCache.ts` — new file:
- `ThumbnailCache`: `{ composited: Map<SlideId, ImageBitmap | null> }`
- `invalidateForMaster(cache, masterId, presentation)` — nulls all slides containing the master's appearances
- `invalidateDownstream(cache, masterId, fromSlideId, presentation)` — nulls slides at/after `fromSlideId`
- `invalidateAll(cache)`

`/src/renderer/src/store/livePreviewStore.ts` — new standalone Zustand store:
- `{ masterPatches: Map<MasterId, Partial<MsoMaster>> }`
- Actions: `setPatch(masterId, patch)`, `clearPatch(masterId)`, `commitAndClear(masterId, documentStore)`
- `applyLivePreview(master, store): MsoMaster` — shallow merge, no mutation

`/src/renderer/src/store/documentStore.ts` — add `thumbnailCache` slice; invalidate on `addSlide`, `removeSlide`, `moveSlide`, and future element edits.

### Tests to write first

- `SlideCheckpoint.test.ts`: 3 click buckets → ≥3 checkpoints; 300ms gap → ≥1 intermediate; `nearestCheckpointBefore(150)` returns checkpoint just before; returns `null` when none precede
- `thumbnailCache.test.ts`: `invalidateForMaster` nulls matching slides, leaves others; `invalidateDownstream` only affects slides at/after target; `invalidateAll` nulls all
- `livePreviewStore.test.ts`: `setPatch` + `applyLivePreview` → patched fields; `clearPatch` → original returned; `applyLivePreview` does not mutate input; `commitAndClear` calls store action

---

## Complexity summary

| Phase | Goal | Complexity |
|---|---|---|
| 1 | Normalize document model | XL |
| 2 | Complete easing system | S |
| 3 | Animation union + CompiledAnimation | L |
| 4 | Rich text rendering + anchor repair | L |
| 5 | IPC protocol + JsonFileRepository | M |
| 6 | MsoStateResolver + decoration overlays | M |
| 7 | Checkpoints, ThumbnailCache, LivePreviewStore | M |

---

## Cross-cutting rules (every phase)

- **TDD:** write the failing test first, verify it fails for the right reason, then implement
- **Undo/redo:** every new `documentStore` action calls `pushHistory` before returning
- **Import boundary:** nothing in `src/viewer/` imports from `src/renderer/`; enforce with ESLint `no-restricted-imports`
- **No prop drilling** beyond 2 levels — new state goes into Zustand slices or context
