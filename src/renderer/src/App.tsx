import React, { useEffect, useRef } from 'react'
import { nullAuthContext } from '../../shared/auth/types'
import { JsonFileRepository } from './repository/JsonFileRepository'
import { useDocumentStore } from './store/documentStore'
import { EditorLayout } from './components/EditorLayout/EditorLayout'

function App(): React.JSX.Element {
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
  }, [loadDocument, newPresentation])

  useEffect(() => {
    if (!document || !isDirty) return

    const repository = repositoryRef.current
    if (!repository) return

    const timeoutId = window.setTimeout(() => {
      void saveDocument(repository, nullAuthContext)
    }, 500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [document, isDirty, saveDocument])

  return <EditorLayout />
}

export default App
