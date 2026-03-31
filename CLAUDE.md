# Presenter 2

## Project overview

An Electron application built with React and TypeScript. Deployed in two modes:
- **Standalone app** — packaged Electron desktop application
- **Website** — same codebase running in a browser context

## Tech stack

- Electron
- React
- TypeScript
- ESModules (`"type": "module"` — use `import`/`export` everywhere, never `require()`)

## Design system

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
- The live window is a stripped-down build of the renderer — no editor UI loaded

This must be designed in from the start. Do not assume a single-window model.

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
  main/               # Electron main process (Node.js)
  preload/            # Preload scripts (bridge between main and renderer)
  renderer/           # React app (runs in both Electron and browser)
    index.html
    src/
      main.tsx        # React entry point — imports global.css
      App.tsx
      styles/
        tokens.css    # CSS custom properties — single source of truth
        global.css    # Reset + base styles, imports tokens.css
      components/
        ComponentName/
          ComponentName.tsx
          ComponentName.module.css

electron.vite.config.ts   # Electron + Vite config (dev + Electron build)
vite.web.config.ts        # Standalone web build config
```

## Dual deployment

- **Electron:** `npm run build` — uses `electron.vite.config.ts`
- **Web:** `npm run build:web` — uses `vite.web.config.ts`, outputs to `out/web/`
- Keep renderer code free of direct Electron API usage; access Electron via `window.electron` (exposed through preload)
