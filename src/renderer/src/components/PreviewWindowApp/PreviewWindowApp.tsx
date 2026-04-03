import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Presentation } from '@shared/model/types'
import { resolveColorValue } from '@shared/model/colors'
import { buildTimeline } from '@shared/animation/buildTimeline'
import { createPlaybackPresentation } from '@shared/animation/createPlaybackPresentation'
import { resolveFrame } from '@shared/animation/resolveFrame'
import { SlideRenderer } from '../../../../viewer/src/components/SlideRenderer/SlideRenderer'
import styles from './PreviewWindowApp.module.css'

export function PreviewWindowApp(): React.JSX.Element {
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [triggerTimes, setTriggerTimes] = useState<Map<string, number>>(new Map())
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const currentTimeRef = useRef(0)
  const triggerTimesRef = useRef<Map<string, number>>(new Map())
  const onClickIdsRef = useRef<string[]>([])

  useEffect(() => {
    if (typeof window.presenterPreview?.getCurrentPresentation !== 'function') {
      return
    }

    let cancelled = false

    void window.presenterPreview.getCurrentPresentation().then((doc) => {
      if (!cancelled) {
        setPresentation(doc)
      }
    })

    const unsubscribe = window.presenterPreview.onLoadPresentation((doc) => {
      setPresentation(doc)
      setTriggerTimes(new Map())
      setCurrentTime(0)
      startTimeRef.current = null
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

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

  const playbackPresentation = useMemo(
    () => (presentation ? createPlaybackPresentation(presentation) : null),
    [presentation]
  )

  const onClickIds = useMemo(() => {
    if (!playbackPresentation) return []
    return playbackPresentation.slideOrder.flatMap((slideId) => {
      const slide = playbackPresentation.slidesById[slideId]
      const animationClickIds = slide.animationOrder.filter(
        (animationId) => playbackPresentation.animationsById[animationId]?.trigger === 'on-click'
      )
      const transitionTriggerIds = slide.transitionTriggerId ? [slide.transitionTriggerId] : []
      return [...animationClickIds, ...transitionTriggerIds]
    })
  }, [playbackPresentation])

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  useEffect(() => {
    triggerTimesRef.current = triggerTimes
  }, [triggerTimes])

  useEffect(() => {
    onClickIdsRef.current = onClickIds
  }, [onClickIds])

  const advanceToNextCue = useCallback(() => {
    const nextId = onClickIdsRef.current.find((id) => !triggerTimesRef.current.has(id))
    if (nextId) {
      setTriggerTimes((prev) => {
        const next = new Map([...prev, [nextId, currentTimeRef.current]])
        triggerTimesRef.current = next
        return next
      })
    }
  }, [])

  useEffect(() => {
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
  }, [advanceToNextCue])

  const frame = playbackPresentation
    ? resolveFrame(buildTimeline(playbackPresentation, triggerTimes), currentTime)
    : null
  const frameBackground =
    (frame
      ? resolveColorValue(frame.front.slide.background.color, frame.front.colorConstantsById)
      : undefined) ?? frame?.front.slide.background.image

  useEffect(() => {
    const background = frameBackground ?? '#ffffff'
    document.documentElement.style.background = background
    document.body.style.background = background

    return () => {
      document.documentElement.style.background = ''
      document.body.style.background = ''
    }
  }, [frameBackground])

  if (!playbackPresentation) {
    return <div className={styles.empty}>No presentation loaded.</div>
  }

  return (
    <div className={styles.root} style={{ background: frameBackground ?? '#ffffff' }}>
      <SlideRenderer frame={frame} />
    </div>
  )
}
