# Keynote Shape Library

Denne mappen inneholder Keynote-shapes konvertert til samme elementformat som appen bruker for `path`.

## Filer

- `keynote-shapes.library.json`
  - full library med metadata, kategorier, oppslag per kategori, og `template` per shape
- `keynote-shapes.templates.json`
  - kompakt liste med shape-malene klare for innsetting

## Template-format (samme struktur som app-element)

Hver mal i `keynote-shapes.templates.json` har:

- `type: "path"`
- `name`
- `visible`
- `zIndex`
- `transform` (`x`, `y`, `width`, `height`, `rotation`, `scaleX`, `scaleY`, `anchorX`, `anchorY`)
- `style` (`fill`, `stroke`, `strokeWidth`, `opacity`)
- `path` (`baseWidth`, `baseHeight`, `d`)

I tillegg finnes metadatafelter:

- `libraryId`
- `categories`

## Regenerer

```bash
npm run build:keynote-library
```

