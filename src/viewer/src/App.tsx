import React, { useEffect, useRef, useState, useCallback } from 'react'
import type { Document } from '../../shared/model/types'
import { bibelhistorienDocument } from '../../shared/model/fixtures/bibelhistorien-document'
import { buildTimeline } from '../../shared/animation/buildTimeline'
import { resolveFrame } from '../../shared/animation/resolveFrame'
import { SlideRenderer } from './components/SlideRenderer/SlideRenderer'

// The viewer receives a document in one of two ways:
// 1. Shared link: fetches from the API using the ID in the URL path (/view/:id)
// 2. Live window: receives via postMessage from the Electron main process (future)

function App(): React.JSX.Element {
  const [document, setDocument] = useState<Document | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Playback state
  const [currentTime, setCurrentTime] = useState(0)
  const [triggerTimes, setTriggerTimes] = useState<Map<string, number>>(new Map())
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

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

  // rAF clock — runs continuously so animations play in real time
  useEffect(() => {
    const tick = (now: number): void => {
      if (startTimeRef.current === null) startTimeRef.current = now
      setCurrentTime((now - startTimeRef.current) / 1000)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const doc = document ?? bibelhistorienDocument

  // Collect all on-click cue IDs in slide order
  const onClickCueIds = doc.slides
    .flatMap((s) => s.cues)
    .filter((c) => c.trigger === 'on-click')
    .map((c) => c.id)

  const handleClick = useCallback(() => {
    const nextId = onClickCueIds.find((id) => !triggerTimes.has(id))
    if (nextId) {
      setTriggerTimes((prev) => new Map([...prev, [nextId, currentTime]]))
    }
  }, [onClickCueIds, triggerTimes, currentTime])

  const timeline = buildTimeline(doc.slides, triggerTimes)
  const frame = resolveFrame(timeline, currentTime)

  if (error) return <div style={{ padding: 24, color: '#ff453a' }}>Error: {error}</div>

  return (
    <div style={{ width: '100vw', height: '100vh', cursor: 'pointer' }} onClick={handleClick}>
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
