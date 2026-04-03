import React, { useEffect, useRef, useState } from 'react'
import type { Presentation } from '../../shared/model/types'
import { resolveBackgroundStyle } from '../../shared/model/background'
import { examplePresentation } from '../../shared/model/fixtures/example-presentation'
import { buildTimeline } from '../../shared/animation/buildTimeline'
import { createPlaybackPresentation } from '../../shared/animation/createPlaybackPresentation'
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
  const currentTimeRef = useRef(0)
  const triggerTimesRef = useRef<Map<string, number>>(new Map())
  const onClickIdsRef = useRef<string[]>([])

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

  const pres = createPlaybackPresentation(presentation ?? examplePresentation)

  // Collect all on-click IDs in slide order: on-click animation IDs + transitionTriggerIds
  const onClickIds = pres.slideOrder.flatMap((slideId) => {
    const slide = pres.slidesById[slideId]
    const animClickIds = slide.animationOrder.filter(
      (animId) => pres.animationsById[animId]?.trigger === 'on-click'
    )
    const transId = slide.transitionTriggerId ? [slide.transitionTriggerId] : []
    return [...animClickIds, ...transId]
  })

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  useEffect(() => {
    triggerTimesRef.current = triggerTimes
  }, [triggerTimes])

  useEffect(() => {
    onClickIdsRef.current = onClickIds
  }, [onClickIds])

  useEffect(() => {
    function advanceToNextCue(): void {
      const nextId = onClickIdsRef.current.find((id) => !triggerTimesRef.current.has(id))
      if (nextId) {
        setTriggerTimes((prev) => {
          const next = new Map([...prev, [nextId, currentTimeRef.current]])
          triggerTimesRef.current = next
          return next
        })
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (
        event.key === ' ' ||
        event.key === 'Enter' ||
        event.key === 'ArrowRight' ||
        event.key === 'PageDown'
      ) {
        event.preventDefault()
        advanceToNextCue()
      }
    }

    function handleWindowClick(): void {
      advanceToNextCue()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('click', handleWindowClick)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('click', handleWindowClick)
    }
  }, [])

  const tl = buildTimeline(pres, triggerTimes)
  const frame = resolveFrame(tl, currentTime)
  const frameBackground = resolveBackgroundStyle(
    frame.front.slide.background,
    frame.front.colorConstantsById
  )

  useEffect(() => {
    const background = frameBackground ?? '#ffffff'
    document.documentElement.style.background = background
    document.body.style.background = background

    return () => {
      document.documentElement.style.background = ''
      document.body.style.background = ''
    }
  }, [frameBackground])

  if (error) return <div style={{ padding: 24, color: '#ff453a' }}>Error: {error}</div>

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        cursor: 'pointer',
        background: frameBackground ?? '#ffffff'
      }}
    >
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
