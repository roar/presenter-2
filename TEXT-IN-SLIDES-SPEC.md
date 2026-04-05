# Text In Slides Spec

## Summary

Text should be planned now with future text styles and style-state animations in mind, even if those features are implemented later. The key design constraint is that text boxes, text ranges, text styles, and text decorations must all share stable anchors so future animations can target whole text objects or specific text parts without remapping the model.

This means the text feature should not be designed as "editable HTML in a box." It should be designed as structured content plus range-bound styling references:

- text content remains blocks/runs with stable IDs
- text ranges can receive text styles
- text styles themselves can have named states
- a future animation type can switch the style state for a targeted text range

## Decision Summary

The following decisions are locked for implementation unless a later document explicitly changes them:

- Text boxes are inserted from the toolbar, not by drag-to-draw in the first version.
- Inserting a text box creates a default frame and immediately enters edit mode.
- Editing is direct on-canvas editing.
- The first editing surface may be a minimal DOM-backed overlay before full rich-text selection exists.
- Text boxes are fixed frames with wrapping.
- The primary editing surface is a floating text toolbar plus in-place selection.
- The inspector remains secondary.
- Rich text and lists are in scope for the text system design.
- Text decorations are first-class persisted range attachments.
- Future text styles with states must be represented in the architecture now.
- Future text-range animations that switch text style state are a compatibility requirement now.
- Double-click defaults to text editing, not future shape-geometry editing.
- Shapes are expected to support text content, and when they do they should follow the same text-edit interaction model as text boxes.

## Current Repo State

The repo already has a partial text foundation:

- Product/spec docs exist in `CORE-FEATURE.md` and `IMPLEMENTATION_PLAN.md`.
- The model already supports structured text (`TextContent` with blocks/runs/marks) in `src/shared/model/types.ts`.
- Shared utilities now exist for plain-text extraction, normalization, range mapping, anchor repair, and style resolution.
- Shared rendering now exists for blocks, runs, marks, lists, and decorations.
- Viewer-side text rendering uses the shared renderer.
- Editor-side text insertion now exists from the toolbar and creates/selects a text object.
- The editor store now has explicit `begin`, `update`, `commit`, and `cancel` actions for text editing state.
- The editor canvas now has a minimal DOM-backed text editing overlay for direct typing, blur commit, `Escape` cancel, and `Ctrl/Cmd+Enter` commit.
- The editor still does not have full rich-text DOM selection, inline formatting UI, or shape-text authoring.

## Authoring UX

The initial editor experience should follow these rules:

- Text boxes are created from a toolbar insert action.
- Inserting a text box creates a default frame at a standard position and immediately enters edit mode.
- Double-clicking an existing text object enters direct on-canvas editing.
- Double-clicking a shape that supports text should also enter text editing, not shape-geometry editing.
- Text boxes are fixed frames with wrapping.
- Typing never auto-grows the frame and never auto-fits the text.
- Selection has two modes:
  - object selection for move/resize/rotate
  - text selection for caret/range editing inside a selected text object
- `Escape` exits text editing back to object selection.
- Clicking outside the editor commits the edit.
- `Ctrl+Enter` or `Cmd+Enter` commits the edit.
- While a text object is being edited, object selection chrome and hitboxes must not intercept pointer or keyboard input.
- A floating text toolbar is the primary formatting surface during text editing.
- The inspector remains secondary and should support box-level text properties and selection summary, not serve as the main editing surface.

### Shape text rule

The project should converge on one text-authoring rule across object kinds:

- dedicated `text` objects support direct text editing
- shapes may also carry text content
- when a shape carries editable text, the default double-click action is text editing
- future shape-geometry editing must use a separate explicit entry point such as toolbar, context menu, or shortcut

This avoids reserving double-click for a future shape mode at the cost of today's primary text-authoring flow.

## Model and Styling Architecture

### Text content

Persisted text content remains structured:

- `TextContent` contains blocks and runs with stable IDs.
- Blocks act as paragraph-level units.
- Blocks gain list metadata so lists are part of the model rather than inferred from literal prefixes.
- Runs carry textual content and direct inline marks where needed.

Recommended block structure:

```ts
interface TextBlock {
  id: BlockId
  runs: TextRun[]
  list:
    | { kind: 'none' }
    | { kind: 'bulleted' }
    | { kind: 'numbered'; start?: number }
}
```

The visible number for numbered lists is derived from block order in a contiguous numbered sequence, not stored as literal text in runs.

### Stable anchors and ranges

Text editing must introduce explicit anchor and range types:

- selections use stable block/run/offset anchors
- persisted attachments use the same anchor system
- anchor repair updates selections, decorations, and style bindings after edits

This anchor system is shared by:

- live text selection in the editor
- persisted text decorations
- future animation targets for text parts
- future text style bindings on ranges

Recommended anchor types:

```ts
interface TextPosition {
  blockId: BlockId
  runId: RunId
  offset: number
}

interface TextRange {
  start: TextPosition
  end: TextPosition
}
```

Selection, decorations, and text-style bindings should all point at the same anchor model.

Recommended JSON shape for persisted ranges:

```json
{
  "start": { "blockId": "b1", "runId": "r2", "offset": 0 },
  "end": { "blockId": "b1", "runId": "r3", "offset": 2 }
}
```

This means:

- `blockId` identifies the paragraph/block
- `runId` identifies the run within that block
- `offset` identifies the character position within the run

Ranges should be anchored to structured content, not stored as raw substring matches and not stored in rendered line coordinates.

Example with overlapping targets:

```json
{
  "content": {
    "blocks": [
      {
        "id": "b1",
        "runs": [
          { "id": "r1", "text": "I løpet av de ", "marks": [] },
          { "id": "r2", "text": "neste timene", "marks": [] },
          { "id": "r3", "text": " er ", "marks": [] },
          {
            "id": "r4",
            "text": "«Dave» ventet å herje langs kysten og innover i landet.",
            "marks": []
          }
        ],
        "list": { "kind": "none" }
      }
    ]
  },
  "textDecorationsById": {
    "d1": {
      "id": "d1",
      "kind": "underline",
      "range": {
        "start": { "blockId": "b1", "runId": "r2", "offset": 0 },
        "end": { "blockId": "b1", "runId": "r2", "offset": 13 }
      }
    }
  },
  "textStyleBindingsById": {
    "sb1": {
      "id": "sb1",
      "styleId": "style-accent",
      "activeState": "default",
      "range": {
        "start": { "blockId": "b1", "runId": "r2", "offset": 6 },
        "end": { "blockId": "b1", "runId": "r3", "offset": 2 }
      }
    }
  }
}
```

This allows:

- an underline decoration over `"neste timene"`
- a separate style binding over `"timene er"`
- overlap on `"timene"` without splitting the text into separate objects

### Text styles and states

Future text styles should be accounted for now at the architecture level.

- Text styles are reusable named definitions.
- Each text style has a `defaultState` and `namedStates`.
- Text styles are applied to text ranges, not only to whole text boxes.
- A text range references a text style definition rather than storing only resolved style values.

The styling model should separate:

- content: the text itself
- direct inline marks: local formatting such as bold/italic/underline/color
- range-bound text style bindings: references to reusable text styles
- text decorations: underline/highlight/outline-like persisted range attachments

Recommended future-facing text style shape:

```ts
interface TextStyleDefinition {
  id: string
  name: string
  defaultState: TextStyleProperties
  namedStates: Record<string, Partial<TextStyleProperties>>
}

interface TextStyleBinding {
  id: string
  range: TextRange
  styleId: string
  activeState?: string
}
```

This is intentionally parallel to the existing style/state direction elsewhere in the app.

### Style resolution

Effective text appearance should resolve in layers:

1. text box default text style
2. range-applied text style default state
3. active named state for that range
4. optional local inline overrides or marks

This keeps direct formatting possible while still allowing reusable text styles and future state-based animation.

Conflict rule for overlapping styling:

- direct inline marks win over referenced style values for the same property
- range style bindings win over box-level defaults
- active named state wins over the referenced text style's `defaultState`
- if overlapping text style bindings target the same property on the same character, the later binding in document order wins

This rule is sufficient for implementation and testability now.

## Editing and Anchor Repair

Text editing must preserve anchors whenever possible.

Required repair behavior:

- inserting text before a range shifts the range forward
- deleting text before a range shifts the range backward
- inserting text inside a range expands the range when appropriate
- deleting text inside a range shrinks the range
- deleting the full targeted content marks the attachment as degraded or removes it according to the owning feature's rule

Recommended degraded attachment shape:

```json
{
  "id": "d1",
  "kind": "underline",
  "range": {
    "start": { "blockId": "b1", "runId": "r2", "offset": 0 },
    "end": { "blockId": "b1", "runId": "r2", "offset": 4 }
  },
  "degraded": true
}
```

`degraded: true` means the editor could not confidently preserve the original semantic target after an edit. The UI may then prompt the user to repair or remove the attachment.

### Incremental editing rule

The editor must not regenerate the full text structure on every keystroke.

Bad behavior:

- user types one character
- the app throws away the existing blocks and runs
- the app rebuilds an entirely new `TextContent`
- unchanged `runId`s and `blockId`s are lost

Required behavior:

- keep unchanged blocks and runs whenever possible
- modify only the affected region
- split runs when needed
- merge adjacent compatible runs when needed
- preserve IDs for unchanged structure

This rule is necessary so persisted ranges, decorations, style bindings, and future text-range animations can survive ordinary typing and editing.

Example:

- original runs:
  - `r1 = "I løpet av de "`
  - `r2 = "neste timene"`
  - `r3 = " er "`
- user inserts `"par "` before `"neste"`

Preferred result:

- keep `r2` and `r3`
- update only the affected earlier content
- repair affected ranges by offset adjustment rather than by rediscovering content from scratch

Avoid:

- rebuilding the content into brand new runs with new IDs
- forcing all persisted text targets to be remapped heuristically after each keystroke

## Animation Compatibility

Animation-aware text features should influence the design now, even if their UI is deferred.

- The model should reserve a clean path for a future animation type that changes the active style state for a text range.
- Text range targets must use stable anchors so animations survive nearby edits.
- Decorations should use the same range anchor system as style bindings and future range animations.
- Current implementation should support editing and persistence semantics that remain compatible with later range-targeted animations.

Recommended future animation target shape:

```ts
type AnimationTarget =
  | { kind: 'appearance'; appearanceId: AppearanceId }
  | { kind: 'text-range'; masterId: MasterId; range: TextRange }
  | { kind: 'text-decoration'; decorationId: string }
```

Recommended future animation effect for text styles:

```ts
type TextStyleStateEffect = {
  type: 'text-style-state'
  styleBindingId: string
  fromState?: string
  toState: string
}
```

This is not part of the first shipping UI, but the model should not block it.

Out of scope for the first implementation:

- full text-style library management UI
- full style-state animation authoring UI
- advanced conflict-resolution rules for overlapping animated style bindings unless they are required for correctness in the shared model

## Implementation Changes

### Shared model and utilities

- Extend `TextBlock` with list metadata.
- Add shared text anchor and range types.
- Add persisted text style binding types for ranges.
- Add persisted text style definition types, even if authoring UI for them is deferred.
- Add shared utilities for:
  - plain-text extraction
  - range mapping between offsets and block/run positions
  - anchor repair after text mutations
  - text normalization after edits
  - effective style resolution

### Editor store

Add store actions for:

- insert text box
- begin, commit, and cancel text edit
- update draft text content while editing
- replace text within a range
- apply and remove inline marks on a range
- toggle list state on selected blocks
- add, update, and remove text decorations
- apply and remove a text style reference on a range

Recommended editor state additions:

```ts
editingText: {
  masterId: MasterId | null
  selection: TextRange | null
  draftContent: TextContent | null
}
```

The draft content should exist only while editing and should be committed back to the persisted document through explicit store actions.

### Rendering and editing

- Replace the editor canvas text stub with a real text renderer.
- Introduce a shared text renderer used by both editor and viewer.
- Keep the editing surface DOM-backed for caret and range interaction, but persist structured `TextContent` instead of raw HTML.
- Allow a minimal textarea/contenteditable overlay as the first shipping editing surface, provided it writes back to structured `TextContent`.
- Make the floating text toolbar selection-aware so it can later apply either direct marks or style references.
- When editing is active, the editor overlay must receive focus and pointer input instead of the object hitbox / resize chrome.
- The first implementation may support plain-text paragraph editing before full rich-text DOM range editing is added.

Implementation constraint:

- browser DOM may be used for editing interaction and layout measurement
- persisted data must remain framework-agnostic TypeScript model data
- no raw HTML or browser-specific selection objects may be stored in the document model

## Acceptance Criteria

The first implementation is complete when all of the following are true:

- A user can insert a text box from the toolbar.
- The new text box appears on the selected slide and immediately enters edit mode.
- A user can type, delete, select text, and commit changes.
- Text renders visibly on the editor canvas and in viewer rendering.
- Text wraps inside a fixed frame.
- A user can apply inline formatting to a selected range.
- A user can toggle bulleted and numbered list behavior for selected blocks.
- Decorations can be persisted on ranges and render consistently after nearby text edits.
- Undo and redo work across text edits and inline formatting.
- The persisted model contains stable enough anchors to support future text-style bindings and text-range animation targets.

## Test Plan

### Model tests

- inserting text within a run preserves stable IDs where possible
- splitting and merging runs normalize correctly
- list metadata round-trips through persistence
- anchor repair keeps decorations and style bindings attached after insertions and deletions

### Store tests

- inserting a text box creates a text master, appearance, default text content, and enters edit mode
- updating the editor overlay updates only draft text content until commit
- applying inline formatting updates only the selected range
- toggling bullets or numbering updates selected blocks without corrupting text content
- commit and cancel behavior is deterministic

### Component tests

- text objects render on the editor canvas
- double-click enters edit mode
- editing mode disables selection chrome and hitbox interception for that object
- typing updates rendered content
- selecting text and using the floating toolbar applies inline formatting
- list actions create visible bullets and numbers
- decorations render and remain attached after nearby edits

### Viewer and resolver tests

- rich text marks render correctly
- lists render correctly
- persisted decorations render from anchors
- effective style resolution combines box defaults, range style bindings, active states, and local marks deterministically
- future style-state switching works at the resolver level before animation authoring UI exists

## Assumptions

- Text boxes are created only from a toolbar insert action in the first implementation.
- Text frames are fixed-size and wrap content.
- The floating text toolbar is the primary formatting UI.
- Inline marks remain available for direct formatting.
- The architecture must support future reusable text styles with named states.
- Future range-targeted style-state animation is a design requirement now, but not a first-pass implementation requirement.

## Phased Delivery

### Phase 1: Shared Text Foundation

Goal:
- make the model and utilities implementation-safe before UI work starts

Changes:
- extend `TextBlock` with list metadata
- add `TextPosition`, `TextRange`, decoration types, text style definition types, and text style binding types
- add text utilities for normalization, plain-text extraction, range mapping, and anchor repair
- add resolver utilities for effective text styling

Exit criteria:
- model can persist lists, decorations, and style bindings
- anchor repair rules are covered by tests
- effective style resolution is deterministic in tests

### Phase 2: Viewer and Shared Rendering

Goal:
- replace plain joined-run rendering with a shared structured renderer

Changes:
- add shared text content renderer
- render blocks, runs, inline marks, lists, and decorations
- update viewer text element rendering to use the shared renderer

Exit criteria:
- viewer correctly renders rich text and lists
- decoration rendering works from persisted anchors

### Phase 3: Editor Canvas Rendering and Insert Flow

Goal:
- make text objects visible and insertable in the editor

Changes:
- add `Insert Text` toolbar action
- create default text master and appearance
- replace editor text stub with real rendering
- add edit-mode entry for new objects and double-click on existing text objects

Exit criteria:
- a user can insert a text box and see it on canvas
- a user can enter and exit text editing mode predictably
- the object hitbox does not block the editing surface while editing

### Phase 4: In-Place Editing Core

Goal:
- support editing text content on canvas without formatting loss

Changes:
- add draft editing state in the store
- add commit and cancel behavior
- add a minimal DOM-backed overlay that maps plain text paragraphs to structured `TextContent`
- support insert, delete, commit, cancel, and paragraph splitting/merging
- later extend this to caret movement, DOM range selection, and rich-text editing without replacing the persisted model

Exit criteria:
- text edits update persisted content correctly on commit
- stable IDs are preserved where possible
- undo and redo work for content edits

### Phase 4b: Text In Shapes

Goal:
- make text authoring interaction consistent across text boxes and shapes

Changes:
- allow shapes to carry text content
- render text content inside supported shapes
- route shape double-click into text editing when the shape has text support
- reuse the same editing lifecycle and overlay rules as dedicated text boxes

Exit criteria:
- a shape with text support can enter text editing
- shape text editing follows the same commit/cancel rules as text boxes
- future shape-geometry editing remains a separate explicit mode

### Phase 5: Formatting, Lists, and Decorations

Goal:
- make the editor useful for real slide text authoring

Changes:
- add floating toolbar
- apply and remove inline marks to the current range
- toggle bulleted and numbered lists on selected blocks
- add decoration creation and editing for supported decoration kinds

Exit criteria:
- inline formatting works on selected ranges
- lists render correctly in editor and viewer
- decorations survive nearby edits through anchor repair

### Phase 6: Future-Ready Style Bindings

Goal:
- land the architecture needed for reusable text styles and style-state animation compatibility

Changes:
- add store commands to apply and remove style bindings on ranges
- add resolver support for `defaultState` plus active named state
- keep UI for style library management minimal or deferred

Exit criteria:
- style bindings can be persisted and resolved
- range-bound styles coexist with direct inline marks
- tests prove future style-state animation can target bindings without changing the content model

## Recommended Implementation Order

Implement in this order:

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6

Do not start the floating toolbar or in-place editor before Phase 1 anchor and normalization rules are in place. Do not add text-style authoring UI before range-bound style bindings are resolvable in shared code.
