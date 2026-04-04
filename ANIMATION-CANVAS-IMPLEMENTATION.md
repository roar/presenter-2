# Animation Canvas Implementation

## Purpose

This document tracks the phased implementation of the canvas animation UI defined in [ANIMATION-CANVAS-UI.md](/Users/roarskullestad/dev/presenter-2/ANIMATION-CANVAS-UI.md).

This document is an implementation and rollout plan. It is intentionally separate from the product spec. The product spec defines the intended final behavior. This document defines how that behavior will be delivered in testable phases.

## Delivery Rules

- Work proceeds in phases.
- Each phase ends with explicit manual user testing.
- No later phase begins until the current phase has been manually tested and accepted.
- Automated tests should be added during each phase, but the gate to continue is manual user testing.
- The persisted model remains one animation record per step. The canvas chain is derived editor state.

## Current Status

- Product target: full ordered ghost-chain behavior for move, scale, and rotate sequences.
- Current implementation status: partial.
- Implemented so far:
  - create and select a move animation from the canvas
  - derive and render multi-step move ghost chains
  - drag the selected move ghost while keeping later ghosts visually fixed
  - compensate the following move step on commit
  - highlight the selected ghost and its incoming segment
  - move the base object while move ghosts are visible
  - render move ghosts using the original object's form
  - delete the selected move step from the canvas context menu
- Not yet implemented:
  - trigger-aware chain presentation
  - scale step chains
  - rotate step chains
  - mixed-type cumulative chains
  - path-based move editing within the chain model

## Phase 1: Move Step Chains

### Goal

Upgrade move editing from one selected move ghost to a full ordered move chain for one object on one slide.

### Implementation scope

- Derive the selected object's move steps in slide order.
- Compute one ghost state per move step.
- Render the base object plus all move ghosts in sequence.
- Render movement lines between consecutive move-related states.
- Keep one selected move step within the active chain.
- Clicking a ghost selects that specific move step.
- Clicking a movement line selects the move step for that segment.
- Dragging one move ghost updates only that move step.
- Dragging one move ghost moves only that selected ghost on the canvas.
- Later move ghosts remain visually fixed while dragging.
- Committing one move-step edit compensates the following move step so later ghost positions stay unchanged.
- Deleting one move step removes only that step and recomputes the chain.
- Non-selected downstream ghosts remain visible as secondary context.

### Automated coverage

- Store tests for ordered move-chain derivation.
- Canvas tests for one ghost per move step.
- Canvas tests for movement-line chaining.
- Canvas tests for step-level selection and deletion.
- Canvas tests that later move ghosts stay fixed while an earlier step is dragged.
- Canvas tests that committing a move-step drag compensates the following move step.

### Manual user test gate

The user must verify all of the following before Phase 2 begins:

1. Add two or three move animations to the same object on one slide.
2. Confirm the canvas shows one ghost per move step.
3. Confirm movement lines connect the sequence.
4. Select the first move step and confirm later ghosts remain visible.
5. Drag the first move ghost and confirm only the selected ghost moves.
6. Release the drag and confirm later ghost positions stay unchanged.
7. Delete the middle move step and confirm only that step disappears and the chain closes correctly.

## Phase 2: Trigger-Aware Step Chains

### Goal

Keep per-step ghosts while accurately reflecting `On Click`, `With Previous`, and `After Previous`.

### Implementation scope

- Preserve one ghost per ordered step regardless of trigger type.
- Derive trigger metadata for each step from the existing animation trigger fields.
- Keep Build Order grouping separate from canvas step identity.
- Add visual distinction for:
  - selected step
  - non-selected downstream steps
  - steps sharing timing with adjacent steps
- Keep full downstream chain visibility when an early step is selected.
- Keep earlier and later chain context visible when a later step is selected.

### Automated coverage

- Store tests for trigger-aware chain metadata.
- Canvas tests that `With Previous` and `After Previous` do not collapse steps into one ghost.
- Canvas tests that downstream chain visibility is preserved for early and late selections.

### Manual user test gate

The user must verify all of the following before Phase 3 begins:

1. Create an `On Click` only sequence and confirm one ghost per step.
2. Change later steps to `With Previous` and `After Previous`.
3. Confirm Build Order grouping changes but the canvas still shows one ghost per step.
4. Select step 1 and confirm later ghosts remain visible.
5. Select a later shared-timing step and confirm the full chain remains visible.

## Phase 3: Scale Step Chains

### Goal

Add scale steps to the same cumulative chain model.

### Implementation scope

- Add canvas creation flow for scale steps if needed.
- Compute cumulative ghost states for scale steps.
- Render one ghost per scale step in sequence.
- Show resize handles only on the selected scale step's ghost.
- Dragging a resize handle updates only that scale step.
- Recompute downstream ghosts after editing one scale step.
- Support mixed move + scale chains in one object sequence.

### Automated coverage

- Store tests for cumulative scale chain derivation.
- Canvas tests for one ghost per scale step.
- Canvas tests for step-specific resize handles.
- Canvas tests for downstream recomputation after editing an early scale step.

### Manual user test gate

The user must verify all of the following before Phase 4 begins:

1. Add multiple scale steps to one object and confirm one ghost per step.
2. Select one scale step and confirm only that ghost gets resize handles.
3. Resize an early scale step and confirm later ghosts update.
4. Combine move and scale steps and confirm the chain remains cumulative and ordered.

## Phase 4: Rotate Step Chains

### Goal

Add rotate steps to the same cumulative chain model.

### Implementation scope

- Extend the shared animation model to support rotate as a first-class effect if needed.
- Extend cumulative ghost-state derivation to include rotation.
- Add canvas creation flow for rotate steps.
- Render one ghost per rotate step in sequence.
- Show a rotate handle only on the selected rotate step's ghost.
- Dragging the rotate handle updates only that rotate step.
- Recompute downstream ghosts after editing one rotate step.
- Support mixed move + scale + rotate chains in one object sequence.

### Automated coverage

- Shared-model tests for rotate animation data and frame resolution.
- Store tests for cumulative rotate chain derivation.
- Canvas tests for one ghost per rotate step.
- Canvas tests for step-specific rotate handles and downstream recomputation.

### Manual user test gate

The user must verify all of the following before Phase 5 begins:

1. Add multiple rotate steps and confirm one ghost per step.
2. Select one rotate step and confirm only that ghost gets a rotate handle.
3. Rotate an early step and confirm later ghosts update.
4. Combine move, scale, and rotate steps and confirm each ghost reflects the cumulative sequence.

## Phase 5: Mixed-Sequence Interaction Consistency

### Goal

Make selection, deletion, and visual emphasis consistent across all supported step types.

### Implementation scope

- Ensure selecting one ghost selects one step while activating the whole chain.
- Ensure only one step is selected at a time.
- Keep side-panel and canvas step selection synchronized.
- Make context-menu delete remove only the selected step.
- Make keyboard delete remove only the selected step.
- Ensure deleting one step recomputes downstream ghosts without breaking earlier states.
- Make selection clearing rules predictable:
  - selecting an object clears selected step
  - selecting a step clears selected object selection
  - clicking empty canvas clears selected step
- Add consistent visual treatment for selected vs non-selected steps across move, scale, and rotate.

### Automated coverage

- Canvas tests for single-step selection in mixed chains.
- Canvas tests for context-menu delete and keyboard delete.
- Canvas tests for selection clearing rules.
- Integration tests for side-panel and canvas selection staying synchronized.

### Manual user test gate

The user must verify all of the following before Phase 6 begins:

1. Select ghosts of different types in one mixed chain and confirm only one step is selected.
2. Delete a selected middle step with context menu.
3. Delete a selected step with keyboard.
4. Confirm the chain remains intact and recomputed after each deletion.
5. Confirm switching between object selection and step selection behaves predictably.

## Phase 6: Path-Based Move Editing

### Goal

Add Keynote-style move-path editing without breaking the step-chain model.

### Implementation scope

- Extend move-step data to support path-backed motion in a backward-compatible way.
- Keep the move step's resolved end state as an endpoint `delta`, even when the edit path is bezier.
- Keep path ownership per move step.
- Show only the selected move step's editable path.
- Keep earlier move segments visible as dashed history context when a later move step is selected.
- Render the selected move step's segment as a solid active path.
- Show path points and control points only for the selected move step.
- Support point drag, insert, type change, and delete for the selected move step.
- Support point-type conversion at minimum for sharp and bezier.
- Show path context menus on selected points.
- Recompute downstream ghosts when the selected move path changes.
- Allow path-backed and delta-based move steps to coexist in the same chain.

### Automated coverage

- Shared-model tests for path-backed move serialization and round-trip.
- Store tests for path point insert/update/delete and type changes.
- Canvas tests for selected-step path display only.
- Canvas tests for dashed history segments plus one solid active segment.
- Canvas tests for point context menus and sharp/bezier conversion actions.
- Canvas tests for downstream recomputation after editing a path-backed move step.

### Manual user test gate

The user must verify all of the following before declaring the sequence model complete:

1. Create or convert a move step to use a path.
2. Confirm only the selected move step exposes editable path points.
3. Confirm earlier move segments remain visible as dashed history when a later move step is selected.
4. Confirm the selected move step's segment is solid.
5. Drag a path point and confirm downstream ghosts update.
6. Insert and delete path points and confirm only the selected step changes.
7. Convert a selected point between sharp and bezier from the context menu.
8. Save and reload and confirm the path-backed step persists correctly.

## Notes

- This plan assumes ordered step identity is preserved on canvas even when trigger timing is shared.
- This plan assumes no new persisted animation-group type will be added.
- If the product spec changes, update [ANIMATION-CANVAS-UI.md](/Users/roarskullestad/dev/presenter-2/ANIMATION-CANVAS-UI.md) first, then update this rollout plan.
