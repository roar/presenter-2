import React, { useEffect, useState } from 'react'
import type { DocumentMeta } from '../../repository/DocumentRepository'
import styles from './OpenPresentationPopup.module.css'

interface OpenPresentationPopupProps {
  presentations: Promise<DocumentMeta[]>
  onClose: () => void
  onOpen: (id: string) => void
}

function formatUpdatedAt(value: string): string {
  return new Date(value).toLocaleString()
}

export function OpenPresentationPopup({
  presentations,
  onClose,
  onOpen
}: OpenPresentationPopupProps): React.JSX.Element {
  const [items, setItems] = useState<DocumentMeta[] | null>(null)

  useEffect(() => {
    let cancelled = false

    void presentations.then((result) => {
      if (!cancelled) {
        setItems(result)
      }
    })

    return () => {
      cancelled = true
    }
  }, [presentations])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <>
      <div role="presentation" className={styles.backdrop} onClick={onClose} />
      <div role="dialog" aria-label="Open presentation" className={styles.popup}>
        <div className={styles.header}>
          <h2 className={styles.title}>Open Presentation</h2>
        </div>
        {items && items.length > 0 ? (
          <div className={styles.list}>
            {items.map((presentation) => (
              <button
                key={presentation.id}
                type="button"
                className={styles.item}
                onClick={() => {
                  onOpen(presentation.id)
                  onClose()
                }}
              >
                <span className={styles.itemTitle}>{presentation.title}</span>
                <span className={styles.itemMeta}>
                  Updated {formatUpdatedAt(presentation.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>No presentations found.</div>
        )}
      </div>
    </>
  )
}
