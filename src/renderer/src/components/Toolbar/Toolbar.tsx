import React, { useEffect, useRef, useState } from 'react'
import { nullAuthContext } from '../../../../shared/auth/types'
import { createMsoMaster } from '../../../../shared/model/factories'
import type { ShapeLibraryEntry } from '../../../../shared/shapes/types'
import type { DocumentMeta } from '../../repository/DocumentRepository'
import { JsonFileRepository } from '../../repository/JsonFileRepository'
import { useDocumentStore } from '../../store/documentStore'
import { Button } from '../Button/Button'
import { OpenPresentationPopup } from '../OpenPresentationPopup/OpenPresentationPopup'
import { ShapePickerPopup } from '../ShapePickerPopup/ShapePickerPopup'
import styles from './Toolbar.module.css'

export function Toolbar(): React.JSX.Element {
  const [shapePickerOpen, setShapePickerOpen] = useState(false)
  const [openPresentationPopupOpen, setOpenPresentationPopupOpen] = useState(false)
  const [presentationsPromise, setPresentationsPromise] = useState<Promise<DocumentMeta[]> | null>(
    null
  )
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const repositoryRef = useRef(new JsonFileRepository())
  const repository = repositoryRef.current
  const document = useDocumentStore((s) => s.document)
  const newPresentation = useDocumentStore((s) => s.newPresentation)
  const loadDocument = useDocumentStore((s) => s.loadDocument)
  const updatePresentationTitle = useDocumentStore((s) => s.updatePresentationTitle)
  const insertElement = useDocumentStore((s) => s.insertElement)
  const selectedSlideId = useDocumentStore((s) => s.ui.selectedSlideId)

  useEffect(() => {
    if (!isEditingTitle) return
    titleInputRef.current?.focus()
    titleInputRef.current?.select()
  }, [isEditingTitle])

  function handleInsertShape(entry: ShapeLibraryEntry): void {
    if (!selectedSlideId) return
    const master = createMsoMaster('shape')
    master.transform = {
      x: 100,
      y: 100,
      width: entry.template.transform.width,
      height: entry.template.transform.height,
      rotation: entry.template.transform.rotation
    }
    master.objectStyle = {
      defaultState: {
        fill: entry.template.style.fill,
        stroke: entry.template.style.stroke,
        strokeWidth: entry.template.style.strokeWidth,
        opacity: entry.template.style.opacity
      },
      namedStates: {}
    }
    master.geometry = {
      type: 'path',
      pathData: entry.template.path.d,
      baseWidth: entry.template.path.baseWidth,
      baseHeight: entry.template.path.baseHeight
    }
    insertElement(selectedSlideId, master)
  }

  function handleOpenPresentation(id: string): void {
    void loadDocument(repository, id, nullAuthContext)
  }

  function handleOpenPresentationPopup(): void {
    setPresentationsPromise(repository.list(nullAuthContext))
    setOpenPresentationPopupOpen(true)
  }

  function handleTitleBlur(): void {
    const nextTitle = draftTitle.trim()
    setIsEditingTitle(false)
    if (!document) return
    if (!nextTitle || nextTitle === document.title) {
      setDraftTitle(document.title)
      return
    }
    updatePresentationTitle(nextTitle)
  }

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.group}>
          <Button variant="secondary" onClick={newPresentation}>
            New Presentation
          </Button>
          <Button variant="ghost" onClick={handleOpenPresentationPopup}>
            Open
          </Button>
          <Button variant="ghost" onClick={() => setShapePickerOpen(true)}>
            Insert Shape
          </Button>
        </div>
        <div className={styles.titleGroup}>
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              aria-label="Presentation title"
              className={styles.titleInput}
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onBlur={handleTitleBlur}
            />
          ) : (
            <button
              className={styles.titleButton}
              type="button"
              onClick={() => {
                setDraftTitle(document?.title ?? '')
                setIsEditingTitle(true)
              }}
            >
              {document?.title ?? 'Untitled Presentation'}
            </button>
          )}
        </div>
      </div>
      {openPresentationPopupOpen && presentationsPromise && (
        <OpenPresentationPopup
          presentations={presentationsPromise}
          onClose={() => {
            setOpenPresentationPopupOpen(false)
            setPresentationsPromise(null)
          }}
          onOpen={handleOpenPresentation}
        />
      )}
      {shapePickerOpen && (
        <ShapePickerPopup
          onClose={() => setShapePickerOpen(false)}
          onInsertShape={handleInsertShape}
        />
      )}
    </>
  )
}
