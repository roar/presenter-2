import React, { useEffect, useRef, useState, useCallback } from 'react'
import type { Presentation } from '../../shared/model/types'
import { examplePresentation } from '../../shared/model/fixtures/example-presentation'
import { buildTimeline } from '../../shared/animation/buildTimeline'
import { resolveFrame } from '../../shared/animation/resolveFrame'
import { SlideRenderer } from './components/SlideRenderer/SlideRenderer'

// The viewer receives a presentation in one of two ways:
// 1. Shared link: fetches from the API using the ID in the URL path (/view/:id)
// 2. Live window: receives via postMessage from the Electron main process (future)

function App(): React.JSX.Element {
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Playback state
  const [currentTime, setCurrentTime] = useState(0)
  const [triggerTimes, setTriggerTimes] = useState<Map<string, number>>(new Map())
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const id = getPresentationIdFromUrl()

    if (id) {
      fetchPresentation(id)
        .then(setPresentation)
        .catch((e: Error) => setError(e.message))
    }

    // Live window: listen for presentation via postMessage
    const onMessage = (event: MessageEvent): void => {
      if (event.data?.type === 'LOAD_PRESENTATION') {
        setPresentation(event.data.presentation as Presentation)
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

  const pres = presentation ?? examplePresentation

  // Collect all on-click IDs in slide order: on-click animation IDs + transitionTriggerIds
  const onClickIds = pres.slideOrder.flatMap((slideId) => {
    const slide = pres.slidesById[slideId]
    const animClickIds = slide.animationOrder.filter(
      (animId) => pres.animationsById[animId]?.trigger === 'on-click'
    )
    const transId = slide.transitionTriggerId ? [slide.transitionTriggerId] : []
    return [...animClickIds, ...transId]
  })

  const handleClick = useCallback(() => {
    const nextId = onClickIds.find((id) => !triggerTimes.has(id))
    if (nextId) {
      setTriggerTimes((prev) => new Map([...prev, [nextId, currentTime]]))
    }
  }, [onClickIds, triggerTimes, currentTime])

  const tl = buildTimeline(pres, triggerTimes)
  const frame = resolveFrame(tl, currentTime)

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

async function fetchPresentation(id: string): Promise<Presentation> {
  const base = import.meta.env.VITE_API_BASE_URL ?? ''
  const res = await fetch(`${base}/api/presentations/${id}`)
  if (!res.ok) throw new Error(`Failed to load presentation (${res.status})`)
  return res.json() as Promise<Presentation>
}

export default App
