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
