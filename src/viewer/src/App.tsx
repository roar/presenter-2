import React, { useEffect, useState } from 'react'
import type { Document } from '../../shared/model/types'

// The viewer receives a document in one of two ways:
// 1. Shared link: fetches from the API using the ID in the URL path (/view/:id)
// 2. Live window: receives via postMessage from the Electron main process (future)

function App(): React.JSX.Element {
  const [document, setDocument] = useState<Document | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = getPresentationIdFromUrl()

    if (id) {
      fetchDocument(id)
        .then(setDocument)
        .catch((e) => setError(e.message))
    }

    // Live window: listen for document via postMessage
    const onMessage = (event: MessageEvent): void => {
      if (event.data?.type === 'LOAD_DOCUMENT') {
        setDocument(event.data.document as Document)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  if (error) return <div style={{ padding: 24, color: '#ff453a' }}>Error: {error}</div>
  if (!document) return <div style={{ padding: 24 }}>Loading…</div>

  // TODO: replace with SlideRenderer once built
  return <div style={{ padding: 24 }}>{document.title}</div>
}

function getPresentationIdFromUrl(): string | null {
  const match = window.location.pathname.match(/\/view\/([^/]+)/)
  return match ? match[1] : null
}

async function fetchDocument(id: string): Promise<Document> {
  const base = import.meta.env.VITE_API_BASE_URL ?? ''
  const res = await fetch(`${base}/api/presentations/${id}`)
  if (!res.ok) throw new Error(`Failed to load presentation (${res.status})`)
  return res.json() as Promise<Document>
}

export default App
