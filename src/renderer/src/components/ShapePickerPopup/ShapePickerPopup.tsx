import React, { useEffect, useMemo, useState } from 'react'
import type { ShapeLibrary, ShapeLibraryEntry } from '../../../../shared/shapes/types'
import { TextInput } from '../TextInput/TextInput'
import styles from './ShapePickerPopup.module.css'
import libraryData from '../../../../shared/shapes/keynote-shapes.library.json'

const library = libraryData as unknown as ShapeLibrary

interface ShapePickerPopupProps {
  onClose: () => void
  onInsertShape: (entry: ShapeLibraryEntry) => void
}

export function ShapePickerPopup({
  onClose,
  onInsertShape
}: ShapePickerPopupProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const filtered = useMemo(() => {
    let shapes = library.shapes
    if (activeCategory !== null) {
      const ids = new Set(library.byCategory[activeCategory] ?? [])
      shapes = shapes.filter((s) => ids.has(s.libraryId))
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      shapes = shapes.filter((s) => s.name.toLowerCase().includes(q))
    }
    return shapes
  }, [activeCategory, query])

  function handleShapeClick(entry: ShapeLibraryEntry): void {
    onInsertShape(entry)
    onClose()
  }

  return (
    <>
      <div role="presentation" className={styles.backdrop} onClick={onClose} />
      <div role="dialog" aria-label="Insert shape" className={styles.popup}>
        <div className={styles.searchRow}>
          <TextInput
            aria-label="Search shapes"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div role="tablist" className={styles.categoryBar}>
          <button
            role="tab"
            aria-selected={activeCategory === null}
            className={[
              styles.categoryTab,
              activeCategory === null ? styles.categoryTabActive : ''
            ].join(' ')}
            onClick={() => setActiveCategory(null)}
          >
            All
          </button>
          {library.categories.map((cat) => (
            <button
              key={cat.id}
              role="tab"
              aria-selected={activeCategory === cat.name}
              className={[
                styles.categoryTab,
                activeCategory === cat.name ? styles.categoryTabActive : ''
              ].join(' ')}
              onClick={() => setActiveCategory(cat.name)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className={styles.grid}>
          {filtered.map((entry) => (
            <ShapeCell key={entry.libraryId} entry={entry} onClick={handleShapeClick} />
          ))}
        </div>
      </div>
    </>
  )
}

interface ShapeCellProps {
  entry: ShapeLibraryEntry
  onClick: (entry: ShapeLibraryEntry) => void
}

function ShapeCell({ entry, onClick }: ShapeCellProps): React.JSX.Element {
  const { baseWidth, baseHeight, d } = entry.template.path
  const { fill } = entry.template.style

  return (
    <button
      aria-label={entry.name}
      className={styles.shapeCell}
      onClick={() => onClick(entry)}
      title={entry.name}
    >
      <span className={styles.shapeThumbnail}>
        <svg viewBox={`0 0 ${baseWidth} ${baseHeight}`} width="100%" height="100%">
          <path d={d} fill={fill} />
        </svg>
      </span>
      <span className={styles.shapeName}>{entry.name}</span>
    </button>
  )
}
