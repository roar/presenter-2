import React from 'react'
import { Button } from '../Button/Button'
import type { SlideTimelineBar, SlideTimelineModel } from './slideTimelineModel'
import styles from './SlideTimeline.module.css'

interface SlideTimelineProps {
  timeline: SlideTimelineModel
  currentTime: number
  isPlaying: boolean
  onTimeChange: (time: number) => void
  onPlayToggle: (isPlaying: boolean) => void
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
  onPlayToggle
}: SlideTimelineProps): React.JSX.Element {
  const clampedTime = Math.max(0, Math.min(currentTime, timeline.totalDuration))
  const playheadStyle = {
    left: `${(clampedTime / Math.max(timeline.totalDuration, 1)) * 100}%`
  }
  const clickBuckets = timeline.buckets.filter((bucket) => bucket.triggerId)
  const allBars = timeline.buckets.flatMap((bucket) => bucket.bars)
  const laneCount = Math.max(1, ...timeline.buckets.map((bucket) => Math.max(bucket.laneCount, 1)))

  return (
    <div className={styles.root}>
      <div className={styles.controls}>
        <Button
          type="button"
          variant="secondary"
          aria-label={isPlaying ? 'Pause timeline' : 'Play timeline'}
          onClick={() => onPlayToggle(!isPlaying)}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        <div className={styles.timeReadout}>
          {formatTime(clampedTime)} / {formatTime(timeline.totalDuration)}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={timeline.totalDuration}
        step={0.01}
        value={clampedTime}
        aria-label="Timeline scrubber"
        className={styles.scrubber}
        onInput={(event) => onTimeChange(Number(event.currentTarget.value))}
      />
      <div className={styles.trackSummary}>
        {timeline.transition ? <span className={styles.summaryLabel}>Transition</span> : null}
        {timeline.buckets
          .filter((bucket) => !bucket.triggerId)
          .map((bucket) => (
            <span key={bucket.label} className={styles.summaryLabel}>
              {bucket.label}
            </span>
          ))}
      </div>
      <div className={styles.clickLabels} aria-hidden="true">
        {clickBuckets.map((bucket) => (
          <div
            key={bucket.label}
            className={styles.clickLabel}
            style={{
              left: `${(bucket.startTime / Math.max(timeline.totalDuration, 1)) * 100}%`
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
            key={bucket.label}
            className={styles.clickMarker}
            style={{
              left: `${(bucket.startTime / Math.max(timeline.totalDuration, 1)) * 100}%`
            }}
            aria-label={`Click marker: ${bucket.label}`}
            title={bucket.label}
          />
        ))}
        {timeline.transition ? (
          <div
            className={[styles.bar, styles.transitionBar].join(' ')}
            style={getBarStyle(
              timeline.transition.startTime,
              timeline.transition.endTime,
              0,
              timeline.totalDuration
            )}
          >
            <span className={styles.barText}>{timeline.transition.kind}</span>
          </div>
        ) : null}
        {allBars.map((bar) => renderBar(bar, timeline.totalDuration))}
      </div>
    </div>
  )
}
