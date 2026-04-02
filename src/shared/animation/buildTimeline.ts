import type { Presentation } from '../model/types'
import type {
  PresentationTimeline,
  ScheduledAnimationEntry,
  ScheduledTransitionEntry
} from './types'

export function buildTimeline(
  presentation: Presentation,
  triggerTimes: Map<string, number>
): PresentationTimeline {
  const scheduledAnimations: ScheduledAnimationEntry[] = []
  const scheduledTransitions: ScheduledTransitionEntry[] = []

  let slideIndex = 0

  for (const slideId of presentation.slideOrder) {
    const slide = presentation.slidesById[slideId]
    let previous: ScheduledAnimationEntry | null = null

    for (const animId of slide.animationOrder) {
      const animation = presentation.animationsById[animId]
      if (!animation) continue

      let triggerTime: number

      if (animation.trigger === 'on-click') {
        if (!triggerTimes.has(animId)) break // not yet triggered — stop here
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        triggerTime = triggerTimes.get(animId)!
      } else if (animation.trigger === 'after-previous') {
        triggerTime = previous ? previous.endTime : 0
      } else {
        // with-previous — same trigger time as the preceding entry
        triggerTime = previous ? previous.triggerTime : 0
      }

      const startTime = triggerTime + animation.offset
      const endTime = startTime + animation.duration
      const entry: ScheduledAnimationEntry = {
        animationId: animId,
        triggerTime,
        startTime,
        endTime
      }
      scheduledAnimations.push(entry)
      previous = entry
    }

    // Schedule the slide transition if it has been triggered
    if (
      slide.transitionTriggerId &&
      triggerTimes.has(slide.transitionTriggerId) &&
      slide.transition
    ) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const triggerTime = triggerTimes.get(slide.transitionTriggerId)!
      const startTime = triggerTime
      const endTime = startTime + slide.transition.duration
      const entry: ScheduledTransitionEntry = {
        outgoingSlideIndex: slideIndex,
        startTime,
        endTime,
        transition: slide.transition
      }
      scheduledTransitions.push(entry)
    }

    slideIndex++
  }

  return { presentation, scheduledAnimations, scheduledTransitions }
}
