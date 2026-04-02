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
      <div className={styles.rows}>
        {timeline.transition ? (
          <div className={styles.row}>
            <div className={styles.rowLabel}>Transition</div>
            <div className={styles.track}>
              <div className={styles.playhead} style={playheadStyle} />
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
            </div>
          </div>
        ) : null}
        {timeline.buckets.map((bucket) => (
          <div key={bucket.label} className={styles.row}>
            <div className={styles.rowLabel}>{bucket.label}</div>
            <div
              className={styles.track}
              style={{
                height: `calc(${Math.max(bucket.laneCount, 1)} * (var(--space-lg) + var(--space-xs)))`
              }}
            >
              <div className={styles.playhead} style={playheadStyle} />
              {bucket.bars.map((bar) => renderBar(bar, timeline.totalDuration))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
