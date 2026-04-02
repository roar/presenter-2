import { createPlaybackPresentation } from '@shared/animation/createPlaybackPresentation'
import type { Presentation, SlideId, TargetedAnimation } from '@shared/model/types'
import { getMasterDisplayName } from '../../utils/getMasterDisplayName'

export const ON_CLICK_DISPLAY_DURATION = 0.4
export const MIN_TIMELINE_DURATION = 1

export interface SlideTimelineBar {
  animationId: string
  title: string
  objectName: string
  startTime: number
  endTime: number
  triggerTime: number
  lane: number
}

export interface SlideTimelineBucket {
  index: number
  label: string
  startTime: number
  endTime: number
  triggerId?: string
  laneCount: number
  bars: SlideTimelineBar[]
}

export interface SlideTimelineTransition {
  triggerId: string
  kind: string
  startTime: number
  endTime: number
}

export interface SlideTimelineModel {
  slideId: SlideId
  totalDuration: number
  transition: SlideTimelineTransition | null
  buckets: SlideTimelineBucket[]
}

export interface TimelineMarker {
  label: string
  time: number
}

export interface TimelineRange {
  key: string
  kind: string
  startTime: number
  endTime: number
}

export interface TimelineViewModel {
  totalDuration: number
  summaryLabels: string[]
  clickMarkers: TimelineMarker[]
  transitionBars: TimelineRange[]
  bars: SlideTimelineBar[]
  laneCount: number
}

export interface SlideTimelineSegment {
  slideId: SlideId
  startTime: number
  endTime: number
  timeline: SlideTimelineModel
}

export interface PresentationPlaybackPlan {
  presentation: Presentation
  slideTimelinesById: Record<SlideId, SlideTimelineModel>
  segments: SlideTimelineSegment[]
}

interface ScheduledBar extends Omit<SlideTimelineBar, 'lane'> {}

function formatAnimationTitle(animation: TargetedAnimation): string {
  const effectType = animation.effect.type
  return effectType.charAt(0).toUpperCase() + effectType.slice(1)
}

function assignLanes(bars: ScheduledBar[]): { bars: SlideTimelineBar[]; laneCount: number } {
  const laneEnds: number[] = []

  const assigned = bars.map((bar) => {
    let lane = laneEnds.findIndex((end) => end <= bar.startTime)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(bar.endTime)
    } else {
      laneEnds[lane] = bar.endTime
    }

    return { ...bar, lane }
  })

  return { bars: assigned, laneCount: laneEnds.length }
}

function buildSlideTimelineModel(presentation: Presentation, slideId: SlideId): SlideTimelineModel {
  const slideIndex = presentation.slideOrder.indexOf(slideId)
  const slide = presentation.slidesById[slideId]
  const previousSlide =
    slideIndex > 0 ? presentation.slidesById[presentation.slideOrder[slideIndex - 1]] : null

  const transition =
    previousSlide?.transition && previousSlide.transitionTriggerId
      ? {
          triggerId: previousSlide.transitionTriggerId,
          kind: previousSlide.transition.kind,
          startTime: 0,
          endTime: previousSlide.transition.duration
        }
      : null

  const initialTime = transition?.endTime ?? 0
  const buckets: Array<Omit<SlideTimelineBucket, 'bars' | 'laneCount'> & { bars: ScheduledBar[] }> =
    [
      {
        index: 0,
        label: 'Autoplay',
        startTime: initialTime,
        endTime: initialTime,
        bars: []
      }
    ]

  let currentBucket = buckets[0]
  let currentBucketTriggerTime = initialTime
  let previousBar: ScheduledBar | null = null
  let previousBucketEnd = initialTime

  for (const animationId of slide.animationOrder) {
    const animation = presentation.animationsById[animationId]
    if (!animation) continue

    if (animation.trigger === 'on-click') {
      const bucketStartTime = previousBucketEnd + ON_CLICK_DISPLAY_DURATION
      currentBucket = {
        index: buckets.length,
        label: `Click ${buckets.length}`,
        startTime: bucketStartTime,
        endTime: bucketStartTime,
        triggerId: animation.id,
        bars: []
      }
      buckets.push(currentBucket)
      currentBucketTriggerTime = bucketStartTime
      previousBar = null
    }

    const triggerTime =
      animation.trigger === 'on-click'
        ? currentBucketTriggerTime
        : animation.trigger === 'with-previous'
          ? (previousBar?.triggerTime ?? currentBucketTriggerTime)
          : (previousBar?.endTime ?? currentBucketTriggerTime)

    const startTime = triggerTime + animation.offset
    const endTime = startTime + animation.duration
    const appearanceId =
      animation.target.kind === 'appearance' || animation.target.kind === 'group-child'
        ? animation.target.appearanceId
        : null
    const appearance = appearanceId ? presentation.appearancesById[appearanceId] : null
    const master = appearance ? presentation.mastersById[appearance.masterId] : null
    const bar: ScheduledBar = {
      animationId: animation.id,
      title: formatAnimationTitle(animation),
      objectName: getMasterDisplayName(master),
      startTime,
      endTime,
      triggerTime
    }

    currentBucket.bars.push(bar)
    currentBucket.endTime = Math.max(currentBucket.endTime, endTime)
    previousBucketEnd = Math.max(previousBucketEnd, currentBucket.endTime)
    previousBar = bar
  }

  const normalizedBuckets = buckets
    .filter((bucket) => bucket.bars.length > 0)
    .map((bucket) => {
      const { bars, laneCount } = assignLanes(bucket.bars)
      return { ...bucket, bars, laneCount }
    })

  const totalDuration = Math.max(
    MIN_TIMELINE_DURATION,
    transition?.endTime ?? 0,
    ...normalizedBuckets.map((bucket) => bucket.endTime)
  )

  return {
    slideId,
    totalDuration,
    transition,
    buckets: normalizedBuckets
  }
}

export function buildPresentationPlaybackPlan(
  presentation: Presentation
): PresentationPlaybackPlan {
  const playbackPresentation = createPlaybackPresentation(presentation)
  const slideTimelinesById: Record<SlideId, SlideTimelineModel> = {}
  const segments: SlideTimelineSegment[] = []

  let currentStartTime = 0

  for (const slideId of playbackPresentation.slideOrder) {
    const timeline = buildSlideTimelineModel(playbackPresentation, slideId)
    slideTimelinesById[slideId] = timeline
    segments.push({
      slideId,
      startTime: currentStartTime,
      endTime: currentStartTime + timeline.totalDuration,
      timeline
    })
    currentStartTime += timeline.totalDuration
  }

  return {
    presentation: playbackPresentation,
    slideTimelinesById,
    segments
  }
}

export function buildTriggerTimesForSlideTime(
  plan: PresentationPlaybackPlan,
  slideId: SlideId,
  localTime: number
): { absoluteTime: number; triggerTimes: Map<string, number> } {
  const segmentIndex = plan.segments.findIndex((segment) => segment.slideId === slideId)
  if (segmentIndex === -1) {
    return { absoluteTime: 0, triggerTimes: new Map() }
  }

  const segment = plan.segments[segmentIndex]
  const clampedLocalTime = Math.max(0, Math.min(localTime, segment.timeline.totalDuration))
  const triggerTimes = new Map<string, number>()

  for (let index = 0; index <= segmentIndex; index += 1) {
    const currentSegment = plan.segments[index]

    if (currentSegment.timeline.transition?.triggerId) {
      triggerTimes.set(currentSegment.timeline.transition.triggerId, currentSegment.startTime)
    }

    const cutoffTime =
      index === segmentIndex ? clampedLocalTime : currentSegment.timeline.totalDuration

    for (const bucket of currentSegment.timeline.buckets) {
      if (!bucket.triggerId) continue
      if (bucket.startTime <= cutoffTime) {
        triggerTimes.set(bucket.triggerId, currentSegment.startTime + bucket.startTime)
      }
    }
  }

  return {
    absoluteTime: segment.startTime + clampedLocalTime,
    triggerTimes
  }
}

export function buildTriggerTimesForPresentationTime(
  plan: PresentationPlaybackPlan,
  presentationTime: number
): { absoluteTime: number; triggerTimes: Map<string, number> } {
  const clampedTime = Math.max(
    0,
    Math.min(
      presentationTime,
      Math.max(0, ...plan.segments.map((segment) => segment.endTime), MIN_TIMELINE_DURATION)
    )
  )
  const triggerTimes = new Map<string, number>()

  for (const segment of plan.segments) {
    if (segment.startTime > clampedTime) break

    if (segment.timeline.transition?.triggerId) {
      triggerTimes.set(segment.timeline.transition.triggerId, segment.startTime)
    }

    const localCutoff = Math.min(clampedTime - segment.startTime, segment.timeline.totalDuration)

    for (const bucket of segment.timeline.buckets) {
      if (!bucket.triggerId) continue
      if (bucket.startTime <= localCutoff) {
        triggerTimes.set(bucket.triggerId, segment.startTime + bucket.startTime)
      }
    }
  }

  return {
    absoluteTime: clampedTime,
    triggerTimes
  }
}

export function buildSlideTimelineViewModel(timeline: SlideTimelineModel): TimelineViewModel {
  return {
    totalDuration: timeline.totalDuration,
    summaryLabels: timeline.buckets
      .filter((bucket) => !bucket.triggerId)
      .map((bucket) => bucket.label),
    clickMarkers: timeline.buckets
      .filter((bucket) => bucket.triggerId)
      .map((bucket) => ({ label: bucket.label, time: bucket.startTime })),
    transitionBars: timeline.transition
      ? [
          {
            key: timeline.transition.triggerId,
            kind: timeline.transition.kind,
            startTime: timeline.transition.startTime,
            endTime: timeline.transition.endTime
          }
        ]
      : [],
    bars: timeline.buckets.flatMap((bucket) => bucket.bars),
    laneCount: Math.max(1, ...timeline.buckets.map((bucket) => Math.max(bucket.laneCount, 1)))
  }
}

export function buildPresentationTimelineViewModel(
  plan: PresentationPlaybackPlan
): TimelineViewModel {
  const summaryLabels = plan.segments.map((segment, index) => `Slide ${index + 1}`)
  const clickMarkers: TimelineMarker[] = []
  const transitionBars: TimelineRange[] = []
  const bars: SlideTimelineBar[] = []
  let laneCount = 1

  for (let index = 0; index < plan.segments.length; index += 1) {
    const segment = plan.segments[index]
    const offset = segment.startTime
    laneCount = Math.max(
      laneCount,
      segment.timeline.buckets.map((bucket) => bucket.laneCount).reduce((a, b) => Math.max(a, b), 1)
    )

    if (segment.timeline.transition) {
      transitionBars.push({
        key: segment.timeline.transition.triggerId,
        kind: segment.timeline.transition.kind,
        startTime: offset + segment.timeline.transition.startTime,
        endTime: offset + segment.timeline.transition.endTime
      })
    }

    for (const bucket of segment.timeline.buckets) {
      if (bucket.triggerId) {
        clickMarkers.push({
          label: bucket.label,
          time: offset + bucket.startTime
        })
      }

      for (const bar of bucket.bars) {
        bars.push({
          ...bar,
          startTime: offset + bar.startTime,
          endTime: offset + bar.endTime,
          triggerTime: offset + bar.triggerTime
        })
      }
    }
  }

  return {
    totalDuration: Math.max(
      MIN_TIMELINE_DURATION,
      ...plan.segments.map((segment) => segment.endTime)
    ),
    summaryLabels,
    clickMarkers,
    transitionBars,
    bars,
    laneCount
  }
}
