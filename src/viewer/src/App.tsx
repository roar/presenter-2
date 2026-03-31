import React, { useEffect, useState } from 'react'
import type { Document } from '../../shared/model/types'
import { exampleDocument } from '../../shared/model/fixtures/example-document'
import { buildTimeline } from '../../shared/animation/buildTimeline'
import { resolveFrame } from '../../shared/animation/resolveFrame'
import { SlideRenderer } from './components/SlideRenderer/SlideRenderer'

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

  // Use example document as fallback when no document is loaded from the network
  const doc = document ?? exampleDocument
  const timeline = buildTimeline(doc.slides, new Map())
  const frame = resolveFrame(timeline, 0)

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <SlideRenderer frame={frame} />
    </div>
  )
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
