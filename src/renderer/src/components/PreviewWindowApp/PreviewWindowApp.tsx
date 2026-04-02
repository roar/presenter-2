import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Presentation } from '@shared/model/types'
import { buildTimeline } from '@shared/animation/buildTimeline'
import { resolveFrame } from '@shared/animation/resolveFrame'
import { SlideRenderer } from '../../../../viewer/src/components/SlideRenderer/SlideRenderer'
import styles from './PreviewWindowApp.module.css'

export function PreviewWindowApp(): React.JSX.Element {
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [triggerTimes, setTriggerTimes] = useState<Map<string, number>>(new Map())
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

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

  const onClickIds = useMemo(() => {
    if (!presentation) return []
    return presentation.slideOrder.flatMap((slideId) => {
      const slide = presentation.slidesById[slideId]
      const animationClickIds = slide.animationOrder.filter(
        (animationId) => presentation.animationsById[animationId]?.trigger === 'on-click'
      )
      const transitionTriggerIds = slide.transitionTriggerId ? [slide.transitionTriggerId] : []
      return [...animationClickIds, ...transitionTriggerIds]
    })
  }, [presentation])

  const handleClick = useCallback(() => {
    const nextId = onClickIds.find((id) => !triggerTimes.has(id))
    if (nextId) {
      setTriggerTimes((prev) => new Map([...prev, [nextId, currentTime]]))
    }
  }, [currentTime, onClickIds, triggerTimes])

  if (!presentation) {
    return <div className={styles.empty}>No presentation loaded.</div>
  }

  const frame = resolveFrame(buildTimeline(presentation, triggerTimes), currentTime)

  return (
    <div className={styles.root} onClick={handleClick}>
      <SlideRenderer frame={frame} />
    </div>
  )
}
