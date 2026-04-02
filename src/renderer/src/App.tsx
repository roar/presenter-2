import React, { useEffect, useRef } from 'react'
import { nullAuthContext } from '../../shared/auth/types'
import { JsonFileRepository } from './repository/JsonFileRepository'
import { useDocumentStore } from './store/documentStore'
import { EditorLayout } from './components/EditorLayout/EditorLayout'
import { PreviewWindowApp } from './components/PreviewWindowApp/PreviewWindowApp'

function isPreviewWindow(): boolean {
  return new URLSearchParams(window.location.search).get('window') === 'preview'
}

function App(): React.JSX.Element {
  const previewMode = isPreviewWindow()

  const document = useDocumentStore((s) => s.document)
  const isDirty = useDocumentStore((s) => s.isDirty)
  const newPresentation = useDocumentStore((s) => s.newPresentation)
  const loadDocument = useDocumentStore((s) => s.loadDocument)
  const saveDocument = useDocumentStore((s) => s.saveDocument)

  const repositoryRef = useRef<JsonFileRepository | null>(null)
  const hasInitializedRef = useRef(false)

  if (repositoryRef.current == null) {
    repositoryRef.current = new JsonFileRepository()
  }

  useEffect(() => {
    if (previewMode) return
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    let cancelled = false

    async function bootstrap(): Promise<void> {
      const repository = repositoryRef.current
      if (!repository) return

      const presentations = await repository.list(nullAuthContext)
      if (cancelled) return

      const latest = presentations[0]
      if (latest) {
        await loadDocument(repository, latest.id, nullAuthContext)
      } else {
        newPresentation()
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [loadDocument, newPresentation, previewMode])

  useEffect(() => {
    if (previewMode) return
    if (!document || !isDirty) return

    const repository = repositoryRef.current
    if (!repository) return

    const timeoutId = window.setTimeout(() => {
      void saveDocument(repository, nullAuthContext)
    }, 500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [document, isDirty, previewMode, saveDocument])

  if (previewMode) {
    return <PreviewWindowApp />
  }

  return <EditorLayout />
}

export default App
