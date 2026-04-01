import type { LegacySlide, AnimationCue, Cue } from '../model/types'
import type { PresentationTimeline, ScheduledCue } from './types'

function blockDuration(cue: AnimationCue): number {
  if (cue.animations.length === 0) return 0
  return Math.max(...cue.animations.map((a) => a.offset + a.duration))
}

function cueDuration(cue: Cue): number {
  if (cue.kind === 'animation') return blockDuration(cue)
  return cue.slideTransition.duration
}

export function buildTimeline(
  slides: LegacySlide[],
  triggerTimes: Map<string, number>
): PresentationTimeline {
  const scheduledCues: ScheduledCue[] = []

  for (const slide of slides) {
    let previousCue: ScheduledCue | null = null

    for (const cue of slide.cues) {
      let startTime: number

      if (cue.trigger === 'on-click') {
        if (!triggerTimes.has(cue.id)) break // not yet triggered — stop here
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        startTime = triggerTimes.get(cue.id)!
      } else if (cue.trigger === 'after-previous') {
        // Follows the preceding entry in cues[] by array position
        startTime = previousCue ? previousCue.endTime : 0
      } else {
        // with-previous
        startTime = previousCue ? previousCue.startTime : 0
      }

      const endTime = startTime + cueDuration(cue)
      const scheduled: ScheduledCue = { cue, slide, startTime, endTime }
      scheduledCues.push(scheduled)
      previousCue = scheduled
    }
  }

  return { slides, scheduledCues }
}
