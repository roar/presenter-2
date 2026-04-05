# Animation Canvas UI

## Purpose

This document specifies the canvas UI for editing object move, scale, and rotate animations on a slide. The canvas UI is based on direct manipulation of on-canvas ghost states rather than separate form-only editing.

This document is a product/UI specification. It describes expected behavior and visible rules. It does not describe implementation.

## Definitions

- **Animation group**: the ordered list of animation steps for one object on one slide.
- **Step**: one animation entry in the slide's ordered animation sequence for that object.
- **Base object state**: the visible state of the object before the first animation step on that slide.
- **Ghost state**: the cumulative object state after a specific step.
- **Canvas chain**: the ordered sequence consisting of the base object state followed by one ghost state per step.
- **Active chain**: the selected object's canvas chain.
- **Selected step**: the single animation step currently selected within the active chain.
- **History segment**: a non-editable path segment from an earlier move step, shown as faded/dashed context.
- **Active segment**: the selected move step's editable path segment, shown as the primary solid path.

## Core Model

- An object's animations on a slide are edited as one ordered animation group.
- The canvas represents that group as a canvas chain.
- The base object state is always the first state in the chain.
- Each subsequent ghost state represents the cumulative result after one additional step.
- If an object has one step, the chain contains one ghost.
- If an object has multiple steps, the chain contains one ghost per step.
- Every step remains its own ordered step even when it shares timing with another step.
- Trigger grouping affects timing and Build Order presentation, but it does not collapse step identity on the canvas.

## Sequence Semantics

- When an animation group is active, the canvas shows the full chain for that object.
- Only the selected object's chain is shown. Other objects do not show ghost chains unless selected.
- Selecting any step makes that object's chain active and selects one specific step within that chain.
- The selected step is visually emphasized.
- Non-selected steps in the same chain remain visible as secondary context.
- Editing a move step changes only that selected ghost's position on the canvas.
- Later move ghosts remain visually fixed while a move step is being edited.
- Editing a later step does not change earlier ghost states.
- The canvas chain is ordered by animation sequence, not by click bucket.

## Display Rules

### General

- The base object remains visible at its base object state.
- Ghost states appear in sequence after the base object.
- Each ghost shows the cumulative result up to its step.
- The active chain remains fully visible while one step is selected.

### Move

- A move step produces a ghost at that step's cumulative destination position.
- The persisted result of a move step is its endpoint translation (`delta.x`, `delta.y`).
- If an object has multiple move steps on the same slide, the canvas shows multiple move ghosts in sequence.
- Consecutive move-related states are connected by movement segments.
- If the selected step is a move step, the movement segment for that step is visually emphasized.
- Downstream movement segments remain visible as secondary context.
- Dragging a move ghost moves only that selected ghost.
- Later move ghosts remain in place while the selected move ghost is dragged.
- When a move step is committed, the following move step is compensated as needed so later move ghosts stay in the same positions.
- If a move step uses a path, that path belongs only to that move step.
- A move path may be straight or bezier.
- The path defines how the object travels, but the step's resulting position is still the endpoint delta.
- A move path is shown for the relevant selected move step, not for the whole chain.
- Earlier move segments remain visible as dashed history while a later move step is selected.
- The selected move step's incoming segment is solid and visually stronger than history segments.
- The selected move ghost uses the same rendered form as the original object, shown as a semi-transparent ghost image.
- A path is edited as an ordered list of anchor points.
- Each anchor point may be `sharp`, `smooth`, or free `bezier`.
- A `sharp` point has no visible control handles.
- A `smooth` point keeps the incoming and outgoing handles on one tangent line while allowing different lengths.
- A free `bezier` point exposes independent control handles that define the incoming and outgoing curve.
- The first and last anchor points are the step endpoints and define the move step's start and end positions.

### Scale

- A scale step produces a ghost with the cumulative size after that step.
- If an object has multiple scale steps on the same slide, the canvas shows one ghost per scale step in sequence.
- The selected scale step exposes resize handles on that step's ghost only.
- Non-selected scale ghosts remain visible without active editing handles.

### Rotate

- A rotate step produces a ghost with the cumulative orientation after that step.
- If an object has multiple rotate steps on the same slide, the canvas shows one ghost per rotate step in sequence.
- The selected rotate step exposes a rotate handle on that step's ghost only.
- Non-selected rotate ghosts remain visible without active editing handles.

### Mixed Sequences

- A chain may include move, scale, and rotate in any order.
- Each ghost reflects the cumulative result of all prior steps plus the current step.
- The selected ghost exposes controls according to the selected step's animation type.
- A move step may be followed by a scale step, a rotate step, another move step, or any other allowed order.
- The chain must remain ordered and cumulative regardless of animation type changes between steps.

## Trigger And Build Order Semantics

### Trigger definitions

- **On Click**: starts a new user-triggered build step in Build Order.
- **With Previous**: remains its own ordered step but shares trigger time with the previous step.
- **After Previous**: remains its own ordered step but begins after the previous step completes.

### Trigger rules on canvas

- Trigger type affects timing and Build Order grouping.
- Trigger type does not remove a step from the canvas chain.
- Trigger type does not merge multiple steps into one canvas step.
- The canvas chain always preserves ordered per-step state.
- Steps that share timing still appear as distinct ordered ghost states.
- Build Order may visually group or nest steps that share timing, but the canvas still shows the per-step sequence.

### Keynote-aligned behavior

- In an `On Click` only sequence, each step remains separate in Build Order and separate in the canvas chain.
- In a sequence containing `With Previous` or `After Previous`, Build Order may visually group related rows, but the canvas still shows the ordered downstream chain.
- Selecting an early step keeps later ghost states visible.
- Selecting a later step still keeps earlier and later chain context visible.

## Interaction Rules

### Selection

- Clicking a ghost selects that specific step.
- Clicking a movement line selects the move step for that segment.
- Clicking a path selects the move step that owns that path.
- Selecting one step activates the whole chain for that object.
- Only one step is selected at a time.

### Editing

- Dragging a ghost edits only the selected step.
- Dragging a move ghost does not drag later ghosts with it.
- Committing a move-ghost edit preserves later move-ghost positions by compensating the following move step.
- The selected move step may be edited through its ghost, movement line, or path controls.
- While a move path is active, only the selected move step exposes editable path points.
- A new path point may be inserted on the selected move segment.
- A selected path point may be converted between sharp, smooth, and free bezier.
- Inserting a point targets the active segment under the pointer and inserts the new anchor into that segment.
- The insert indicator appears only when the pointer is relatively close to the equal-distance midpoint area of the active segment.
- The inserted point appears at the insert indicator position and begins drag in the same pointer gesture.
- Dragging an anchor point moves only that anchor point.
- Dragging a bezier control handle changes only that handle's curve contribution for the selected point, except for `smooth` points where the opposite handle stays aligned on the same tangent.
- Converting a point from `sharp` to `smooth` or free `bezier` creates visible control handles for that point.
- Converting a point from `smooth` or free `bezier` to `sharp` removes its control handles and keeps the anchor position.
- Endpoints may be repositioned, but deleting an endpoint is not allowed while the path still needs a valid start and end.
- The selected scale step may be edited through resize handles on that step's ghost.
- The selected rotate step may be edited through a rotate handle on that step's ghost.
- Path points and path control points are shown only for the selected move step.

### Deletion

- Context-menu delete removes the selected step.
- Keyboard delete removes the selected step.
- Deleting one selected step does not delete the whole chain.
- Deleting one selected step updates the downstream chain accordingly.
- Path-point deletion removes only the selected point on the selected move step.
- Path-point deletion does not delete the step or the full chain.
- Deleting an interior point reconnects the adjacent segments within the same selected move path.
- Deleting a control handle is not a separate action; point-type conversion controls whether control handles exist.

## Validation Examples

### Single move step

- If one object has one move step, the canvas shows the base object and one move ghost.
- The move segment between the base object and that ghost is visible.
- Selecting the ghost selects that move step.

### Multiple move steps

- If one object has multiple move steps, the canvas shows one ghost per move step.
- Movement segments connect the sequence of move-related states.
- Selecting an early move step keeps later move ghosts visible.

### Selected move path

- If a later move step is selected, earlier move segments remain visible as dashed history.
- The selected step's segment is solid.
- The selected ghost keeps its object handles visible while its path is being edited.
- Only the selected move step exposes editable path points and control points.
- Right-clicking a selected path point allows sharp/bezier conversion and point deletion.
- Right-clicking a selected point does not affect other points or other move steps.
- Clicking directly on an active segment is the insertion target for a new point.
- Only bezier points show control handles.
- Dragging a control handle changes the curve without changing which move step owns the path.

### Path point menu

- A selected interior path point shows a context menu with:
  - `Make Sharp Point` when the point is currently bezier
  - `Make Smooth Point` when the point is not currently smooth
  - `Make Free Bezier Point` when the point is not currently free bezier
  - `Delete`
- If a point is already in the requested type, that conversion action is disabled.
- Endpoint context menus do not offer `Delete`.

### Mixed move, scale, and rotate sequence

- If one object has move, scale, rotate, and move steps in that order, the canvas shows one cumulative ghost after each step.
- The scale ghost shows the scaled result after the earlier move.
- The rotate ghost shows the rotated result after the earlier move and scale.
- The later move ghost shows the moved result after all previous steps.

### On Click only sequence

- If all steps are `On Click`, Build Order shows separate click-triggered rows.
- The canvas still shows the full ordered chain.
- Selecting step 3 emphasizes step 3 while leaving the rest of the chain visible.

### Sequence with With Previous and After Previous

- If later steps are `With Previous` or `After Previous`, Build Order may visually group them with adjacent rows.
- The canvas still shows one ghost per step in order.
- Shared timing does not collapse multiple steps into one ghost.

### Selecting an early step

- If step 1 is selected in a longer chain, the chain remains fully visible.
- Step 1 is emphasized.
- Later ghosts remain visible as downstream results.

### Editing one step

- If an early move step is dragged, only that ghost moves on the canvas.
- Later move ghosts remain fixed while dragging and remain fixed after commit.
- Earlier states before the edited step remain unchanged.

### Deleting one selected step

- If one step in the middle of a chain is deleted, only that step is removed.
- The chain closes around the removed step.
- Remaining downstream ghosts update to reflect the new sequence.

## Implementation Rollout Status

The current product target is the full sequence-based behavior defined above.

Current implementation status is partial:

- Implemented so far:
  - multi-step move ghost chains
  - selecting move ghosts and movement segments from the canvas
  - dragging one move ghost while keeping later move ghosts fixed
  - compensating the following move step on commit
  - selected-step emphasis for the ghost and its incoming segment
  - moving the base object while ghosts are visible
  - rendering ghost images with the original object's form
  - move path point editing, insertion, conversion, and deletion
  - sharp, smooth, and free-bezier move points
  - scale ghost chains with selected-step resize editing
  - rotate ghost chains with selected-step rotate editing
  - mixed cumulative move, scale, and rotate chains
- Not yet implemented:
  - trigger-aware chain presentation polish
  - remaining UX polish for complex mixed transform chains

The rollout status is subordinate to the specification above. The specification defines the intended final behavior.
