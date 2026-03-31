# Presenter 2

## Project overview

An Electron application built with React and TypeScript. There are three deployment contexts:
- **Electron editor** — full desktop app with editor UI
- **Electron live window** — second window showing the presentation full-screen on projector (future)
- **Shared link viewer** — browser-only, minimal bundle, renders a published presentation fetched from a backend

## Tech stack

- Electron
- React
- TypeScript
- ESModules (`"type": "module"` — use `import`/`export` everywhere, never `require()`)
- Zustand + immer for state management
- JSON files for document persistence

## Testing

**Tooling:** Vitest + React Testing Library.

```
npm test           # run all tests once
npm run test:watch # watch mode during development
npm run test:ui    # browser UI for test results
```

Tests live next to the code they test: `Foo.ts` → `Foo.test.ts`.

### TDD approach

Follow red-green-refactor for all logic in `store/`, `model/`, and `repository/`:
1. Write a failing test that describes the behaviour
2. Write the minimum code to make it pass
3. Refactor — the test suite keeps you safe

For React components, write the test before (or alongside) the component. Test what the user sees and does — not implementation details.

### What to test

| Layer | Test | Don't test |
|-------|------|-----------|
| Store (Zustand) | State transitions, undo/redo, derived values | Internal helpers |
| Model | Pure transformation functions | Type shapes alone |
| Repository | Each implementation against the interface contract | That `fetch` was called |
| Components | User interactions, rendered output for key states | Internal state, CSS classes |
| Renderer | That it renders given slide data correctly | Editor-only behaviour |

### Component testing rules

- Use `@testing-library/react` — query by role, label, text; never by CSS class or test ID
- Use `@testing-library/user-event` for interactions, not `fireEvent`
- Test the three key states of every component: default, loading/empty, error
- Do not test pure render components with no logic — the TypeScript compiler is enough

### What not to test

- Components that are pure functions of props with no logic or branching
- Styling and layout
- Third-party library behaviour (Zustand, React itself)

## Code quality principles

These are non-negotiable. Apply them to every component, hook, and module written in this project.

### Single responsibility

Every module, component, and function does exactly one thing. If you need "and" to describe what it does, split it.

- A component either fetches/manages data **or** renders UI — not both
- A hook either encapsulates state logic **or** side effects — not both
- A utility function transforms one thing

```tsx
// Wrong — manages state AND renders
function SlidePanel() {
  const [slides, setSlides] = useState([])
  useEffect(() => { fetch('/slides').then(setSlides) }, [])
  return <ul>{slides.map(s => <li>{s.title}</li>)}</ul>
}

// Right — split by responsibility
function useSlidesData() { ... }          // data only
function SlidePanel({ slides }) { ... }   // render only
```

### Code against interfaces, not implementations

Depend on the shape of a thing, not the specific class or module. This applies at every level:

- Components receive data and callbacks as props — they do not reach into the store directly unless they are explicitly a "container" component
- The store calls `DocumentRepository` (the interface) — never `JsonFileRepository` directly
- Functions accept typed interfaces, not concrete classes

```ts
// Wrong
function save(repo: JsonFileRepository) { ... }

// Right
function save(repo: DocumentRepository) { ... }
```

### Explicit, narrow props interfaces

Every component has an explicit TypeScript `Props` interface. Props are as narrow as possible — pass only what the component needs.

```tsx
// Wrong — passes the whole document when only the title is needed
function SlideTitle({ document }: { document: Document }) {
  return <h1>{document.title}</h1>
}

// Right
interface SlideTitleProps {
  title: string
}
function SlideTitle({ title }: SlideTitleProps) {
  return <h1>{title}</h1>
}
```

### Open for extension, closed for modification

Extend behaviour by adding new types/variants, not by adding conditionals to existing code.

- Use union types and discriminated unions for element kinds (`TextElement | ImageElement`)
- Add a new element type by creating a new type and renderer — do not add `if (kind === 'text')` branches scattered across the codebase
- Prefer a `registry` or `map` pattern for dispatching on type

```ts
// Wrong — grows forever with conditionals
function renderElement(el: Element) {
  if (el.kind === 'text') return <TextRenderer ... />
  if (el.kind === 'image') return <ImageRenderer ... />
}

// Right — add new kinds by adding to the map
const renderers: Record<Element['kind'], React.FC<any>> = {
  text: TextRenderer,
  image: ImageRenderer,
}
function renderElement(el: Element) {
  const Renderer = renderers[el.kind]
  return <Renderer {...el} />
}
```

### Dependency inversion

High-level modules do not depend on low-level modules. Both depend on abstractions.

- The store depends on `DocumentRepository` (abstraction), not on file I/O
- Components depend on props and hooks (abstractions), not on global singletons
- Pass dependencies in (via props, hook arguments, or context) rather than importing them directly inside a module when the dependency is likely to vary

### One level of abstraction per function

Functions should operate at one level of abstraction. Don't mix high-level orchestration with low-level detail in the same function body. Extract the detail into a named helper.

### No prop drilling beyond two levels

If a prop needs to pass through more than two components to reach its destination, use a Zustand slice or React context instead.

See [DESIGN.md](./DESIGN.md) for colors, typography, spacing, and component rules. Always follow it when writing UI code.

### Styling architecture

- **Global tokens:** `src/renderer/src/styles/tokens.css` — all CSS custom properties. This is the single place to change the visual style of the entire app. Never hardcode color, spacing, radius, shadow, or duration values in component styles.
- **Component styles:** CSS Modules (`.module.css`) co-located with the component file. Import as `import styles from './Foo.module.css'`.
- **No inline styles** except for dynamic values that cannot be expressed as a token (e.g. computed widths from user interaction).
- **No CSS-in-JS.**

Example component structure:
```
src/renderer/src/components/Button/
  Button.tsx
  Button.module.css
```

## Key architectural constraints

- Code must run in both Electron (Node.js + browser) and pure browser environments
- Avoid Electron-specific APIs in shared/renderer code without a browser fallback
- Platform-specific code should be isolated and conditionally loaded

## Application architecture

### Layers

```
┌─────────────────────────────────────────────┐
│              UI / Components                │  React components, CSS Modules
│    Editor         │      Renderer           │
│  (edit mode)      │   (edit + live mode)    │
├─────────────────────────────────────────────┤
│                  Store                      │  Runtime state (Zustand or similar)
│  model state + UI state (selection, zoom)   │  Undo/redo lives here
├─────────────────────────────────────────────┤
│              Persistence layer              │  Repository interface
│   FileRepository  │  IndexedDBRepository   │  Electron vs Web
├─────────────────────────────────────────────┤
│                  Model                      │  Plain TypeScript types
│        (the serialisable document)          │  No framework dependencies
└─────────────────────────────────────────────┘
```

### Model vs Store

- **Model** — the serialisable document (slides, elements, theme). This is what gets written to disk. Plain TypeScript types only — no framework dependencies, no UI state.
- **Store** — the runtime state. Wraps the model and adds UI-only state: current selection, zoom level, which panel is open, playback position, etc.
- **Never persist UI state.** Never put model mutations directly in components.

### Renderer is a pure function

The slide renderer (the component that draws a slide) must be a pure function of the model:
- Takes model data as props
- Returns JSX
- No store access, no side effects, no IPC calls

This ensures the same renderer works in edit mode, live/presentation mode, slide thumbnails, and eventual export (PDF/image). The edit mode wraps the renderer and adds selection handles, drag targets, etc. on top — it does not modify the renderer itself.

### Persistence abstraction

Define a repository interface that both environments implement:

```ts
interface DocumentRepository {
  load(id: string): Promise<Document>
  save(doc: Document): Promise<void>
  list(): Promise<DocumentMeta[]>
}
```

- **Electron:** `FileRepository` — reads/writes JSON files (or SQLite) via IPC to the main process
- **Web:** `IndexedDBRepository` — uses the browser's IndexedDB
- The store and components only ever call the interface — they never know which implementation is active

### Undo / redo

Components never mutate model state directly. All model changes go through commands (actions) dispatched to the store. The store maintains a history stack. This enables:
- Undo/redo (Cmd+Z / Cmd+Shift+Z)
- Eventual collaboration / operational transform
- Deterministic testing (replay a sequence of commands)

### Multi-window (Electron only)

A presentation app needs two windows simultaneously:
- **Editor window** — on the presenter's display; shows the editor UI
- **Live window** — on the projector/external display; shows the slide full-screen, no chrome

Both windows are separate `BrowserWindow` instances. They share state via Electron IPC:
- The main process is the source of truth for the current slide index during presentation
- The editor sends "go to slide N" via IPC; the main process broadcasts to the live window
- The live window loads the viewer bundle — no editor code

This must be designed in from the start. Do not assume a single-window model.

### Viewer bundle (shared links + live window)

The viewer is a **separate Vite entry point** (`src/viewer/`) that produces its own minimal bundle. It contains only what is needed to render slides — no editor components, no store, no IPC, no Zustand.

**Dependency rule: editor may import from viewer. Viewer must never import from editor.**

```
src/
  editor/    →  may import from viewer/
  viewer/    →  must NOT import from editor/
  shared/    →  model types and utilities, imported by both
```

The viewer receives a document in one of two ways:
- **Shared link:** fetches the document JSON from a backend API using the presentation ID from the URL (e.g. `/view/:id`)
- **Live window:** receives the document via `postMessage` from the Electron main process

### Publishing / shared links

Publishing a presentation requires a backend:
- The app POSTs the document JSON to an API endpoint
- The backend stores it and returns a shareable URL (e.g. `https://presenter.app/view/abc123`)
- Anyone opening that URL gets the viewer bundle + fetches the JSON — no editor loaded

The backend is not part of this repository. The viewer fetches from a configurable `VITE_API_BASE_URL`.

## Development commands

```
npm install         # install dependencies
npm run dev         # run Electron app in dev mode (hot reload)
npm run build       # build Electron app for distribution
npm run build:web   # build website-only bundle → out/web/
npm run preview:web # preview the web build locally
npm run typecheck   # type-check without emitting
```

## Project structure

```
src/
  main/                     # Electron main process (Node.js)
  preload/                  # Preload scripts (bridge between main and renderer)
  shared/                   # Shared code — imported by both editor and viewer
    model/
      types.ts              # Serialisable document types (no framework deps)
  renderer/                 # Electron editor app
    index.html
    src/
      main.tsx              # Editor entry point — imports global.css
      App.tsx
      styles/
        tokens.css          # CSS custom properties — single source of truth
        global.css          # Reset + base styles, imports tokens.css
      repository/
        DocumentRepository.ts     # Interface
        JsonFileRepository.ts     # Electron implementation (JSON files via IPC)
      store/
        documentStore.ts          # Zustand store: model + UI state + undo/redo
      components/
        ComponentName/
          ComponentName.tsx
          ComponentName.module.css
  viewer/                   # Standalone viewer — shared links + live window
    index.html              # Separate entry point, separate bundle
    src/
      main.tsx              # Viewer entry point
      App.tsx               # Fetches doc from API or receives via postMessage
      components/           # Renderer components only — no editor code

electron.vite.config.ts     # Electron editor build
vite.viewer.config.ts       # Viewer-only build → out/viewer/ (deployed separately)
```

## Build targets

| Command              | Output        | Used for                        |
|----------------------|---------------|---------------------------------|
| `npm run dev`        | —             | Electron editor, hot reload     |
| `npm run build`      | `out/`        | Electron app for distribution   |
| `npm run build:viewer` | `out/viewer/` | Viewer bundle for hosting     |
| `npm run preview:viewer` | —         | Preview viewer locally          |

- Keep editor code free of direct Electron API usage; access via `window.electron` (preload)
- Viewer bundle must never import from `src/renderer/`
