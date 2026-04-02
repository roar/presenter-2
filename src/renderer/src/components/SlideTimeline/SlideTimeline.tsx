import React, { useRef, useState } from 'react'
import { Button } from '../Button/Button'
import type { SlideTimelineBar, TimelineViewModel } from './slideTimelineModel'
import styles from './SlideTimeline.module.css'

interface SlideTimelineProps {
  timeline: TimelineViewModel
  currentTime: number
  isPlaying: boolean
  onTimeChange: (time: number) => void
  onPlayToggle: (isPlaying: boolean) => void
  scope: 'selected-slide' | 'all-slides'
  onScopeToggle: () => void
}

function formatTime(value: number): string {
  return `${value.toFixed(2)}s`
}

function getBarStyle(
  startTime: number,
  endTime: number,
  lane: number,
  totalDuration: number
): React.CSSProperties {
  const safeDuration = totalDuration > 0 ? totalDuration : 1
  return {
    left: `${(startTime / safeDuration) * 100}%`,
    width: `${((endTime - startTime) / safeDuration) * 100}%`,
    top: `calc(${lane} * (var(--space-lg) + var(--space-xs)))`
  }
}

function renderBar(bar: SlideTimelineBar, totalDuration: number): React.JSX.Element {
  return (
    <div
      key={bar.animationId}
      className={styles.bar}
      style={getBarStyle(bar.startTime, bar.endTime, bar.lane, totalDuration)}
      aria-label={`${bar.title}: ${bar.objectName}`}
      data-lane={bar.lane}
      title={`${bar.title}: ${bar.objectName}`}
    >
      <span className={styles.barText}>
        {bar.title}: {bar.objectName}
      </span>
    </div>
  )
}

export function SlideTimeline({
  timeline,
  currentTime,
  isPlaying,
  onTimeChange,
  onPlayToggle,
  scope,
  onScopeToggle
}: SlideTimelineProps): React.JSX.Element {
  const [isScrubMode, setIsScrubMode] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const clampedTime = Math.max(0, Math.min(currentTime, timeline.totalDuration))
  const playheadStyle = {
    left: `${(clampedTime / Math.max(timeline.totalDuration, 1)) * 100}%`
  }
  const clickBuckets = timeline.clickMarkers
  const allBars = timeline.bars
  const laneCount = Math.max(1, timeline.laneCount)

  function scrubToPointer(clientX: number): void {
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return

    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const ratio = x / rect.width
    onTimeChange(Number((ratio * timeline.totalDuration).toFixed(2)))
  }

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-testid="timeline-root"
      onMouseMove={(event) => {
        if (!isScrubMode) return
        scrubToPointer(event.clientX)
      }}
    >
      <div className={styles.controls}>
        <div className={styles.controlButtons}>
          <Button
            type="button"
            variant="secondary"
            aria-label={isPlaying ? 'Pause timeline' : 'Play timeline'}
            onClick={() => {
              setIsScrubMode(false)
              onPlayToggle(!isPlaying)
            }}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button
            type="button"
            variant={isScrubMode ? 'primary' : 'secondary'}
            aria-label={isScrubMode ? 'Disable scrub mode' : 'Enable scrub mode'}
            onClick={() => {
              setIsScrubMode((current) => !current)
              onPlayToggle(false)
            }}
          >
            {isScrubMode ? 'Scrub On' : 'Scrub Off'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            aria-label={
              scope === 'selected-slide'
                ? 'Show all slides timeline'
                : 'Show selected slide timeline'
            }
            onClick={() => {
              setIsScrubMode(false)
              onPlayToggle(false)
              onScopeToggle()
            }}
          >
            {scope === 'selected-slide' ? 'Selected slide' : 'All slides'}
          </Button>
        </div>
        <div className={styles.timeReadout}>
          {formatTime(clampedTime)} / {formatTime(timeline.totalDuration)}
        </div>
      </div>
      <div className={styles.trackSummary}>
        {timeline.summaryLabels.map((label) => (
          <span key={label} className={styles.summaryLabel}>
            {label}
          </span>
        ))}
      </div>
      <div className={styles.clickLabels} aria-hidden="true">
        {clickBuckets.map((bucket) => (
          <div
            key={`${bucket.label}:${bucket.time}`}
            className={styles.clickLabel}
            style={{
              left: `${(bucket.time / Math.max(timeline.totalDuration, 1)) * 100}%`
            }}
          >
            {bucket.label}
          </div>
        ))}
      </div>
      <div
        className={styles.track}
        data-testid="timeline-track"
        style={{
          minHeight: `calc(${laneCount} * (var(--space-lg) + var(--space-xs)))`
        }}
      >
        <div className={styles.playhead} style={playheadStyle} />
        {clickBuckets.map((bucket) => (
          <div
            key={`${bucket.label}:${bucket.time}`}
            className={styles.clickMarker}
            style={{
              left: `${(bucket.time / Math.max(timeline.totalDuration, 1)) * 100}%`
            }}
            aria-label={`Click marker: ${bucket.label}`}
            title={bucket.label}
          />
        ))}
        {timeline.transitionBars.map((transitionBar) => (
          <div
            key={transitionBar.key}
            className={[styles.bar, styles.transitionBar].join(' ')}
            style={getBarStyle(
              transitionBar.startTime,
              transitionBar.endTime,
              0,
              timeline.totalDuration
            )}
          >
            <span className={styles.barText}>{transitionBar.kind}</span>
          </div>
        ))}
        {allBars.map((bar) => renderBar(bar, timeline.totalDuration))}
      </div>
    </div>
  )
}
