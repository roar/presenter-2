import { describe, expect, it } from 'vitest'
import {
  createAppearance,
  createMsoMaster,
  createPresentation,
  createSlide
} from '@shared/model/factories'
import type { Presentation, Slide, TargetedAnimation } from '@shared/model/types'
import {
  buildPresentationPlaybackPlan,
  buildTriggerTimesForSlideTime,
  ON_CLICK_DISPLAY_DURATION
} from './slideTimelineModel'

function makePresentation(...slides: Slide[]): Presentation {
  const presentation = createPresentation()
  for (const slide of slides) {
    presentation.slideOrder.push(slide.id)
    presentation.slidesById[slide.id] = slide
  }
  return presentation
}

function addAppearance(presentation: Presentation, slide: Slide, name: string): string {
  const master = createMsoMaster('shape')
  master.name = name
  const appearance = createAppearance(master.id, slide.id)
  slide.appearanceIds.push(appearance.id)
  presentation.mastersById[master.id] = master
  presentation.appearancesById[appearance.id] = appearance
  return appearance.id
}

function moveAnimation(
  id: string,
  appearanceId: string,
  trigger: TargetedAnimation['trigger'],
  overrides: Partial<TargetedAnimation> = {}
): TargetedAnimation {
  return {
    id,
    trigger,
    offset: 0,
    duration: 1,
    easing: 'linear',
    loop: { kind: 'none' },
    effect: { kind: 'action', type: 'move', delta: { x: 100, y: 0 } },
    target: { kind: 'appearance', appearanceId },
    ...overrides
  }
}

describe('slideTimelineModel', () => {
  it('places the incoming transition before the selected slide buckets', () => {
    const slide1 = createSlide()
    slide1.transitionTriggerId = 'transition-1'
    slide1.transition = { kind: 'push', duration: 0.5, easing: 'linear' }
    const slide2 = createSlide()

    const presentation = makePresentation(slide1, slide2)
    const appearanceId = addAppearance(presentation, slide2, 'Airplane')
    const animation = moveAnimation('anim-1', appearanceId, 'after-previous')

    slide2.animationOrder = [animation.id]
    presentation.animationsById[animation.id] = animation

    const timeline = buildPresentationPlaybackPlan(presentation).slideTimelinesById[slide2.id]

    expect(timeline.transition).toEqual({
      triggerId: 'transition-1',
      kind: 'push',
      startTime: 0,
      endTime: 0.5
    })
    expect(timeline.buckets).toHaveLength(1)
    expect(timeline.buckets[0].label).toBe('Autoplay')
    expect(timeline.buckets[0].startTime).toBe(0.5)
    expect(timeline.buckets[0].bars[0]).toMatchObject({
      animationId: 'anim-1',
      title: 'Move',
      objectName: 'Airplane',
      startTime: 0.5,
      endTime: 1.5,
      lane: 0
    })
  })

  it('places autoplay in bucket 0 and computes click bucket timing and lanes', () => {
    const slide = createSlide()
    const presentation = makePresentation(slide)
    const appearanceId = addAppearance(presentation, slide, 'Airplane')

    const autoplay = moveAnimation('auto', appearanceId, 'after-previous')
    const click = moveAnimation('click', appearanceId, 'on-click')
    const withPrevious = moveAnimation('with', appearanceId, 'with-previous', {
      offset: 0.2,
      duration: 2
    })
    const afterPrevious = moveAnimation('after', appearanceId, 'after-previous', {
      duration: 0.5
    })

    slide.animationOrder = [autoplay.id, click.id, withPrevious.id, afterPrevious.id]
    presentation.animationsById[autoplay.id] = autoplay
    presentation.animationsById[click.id] = click
    presentation.animationsById[withPrevious.id] = withPrevious
    presentation.animationsById[afterPrevious.id] = afterPrevious

    const timeline = buildPresentationPlaybackPlan(presentation).slideTimelinesById[slide.id]

    expect(timeline.buckets).toHaveLength(2)
    expect(timeline.buckets[0]).toMatchObject({
      label: 'Autoplay',
      startTime: 0,
      endTime: 1
    })
    expect(timeline.buckets[0].bars.map((bar) => bar.animationId)).toEqual(['auto'])

    expect(timeline.buckets[1]).toMatchObject({
      label: 'Click 1',
      triggerId: 'click',
      startTime: 1 + ON_CLICK_DISPLAY_DURATION,
      endTime: 4.1,
      laneCount: 2
    })
    expect(timeline.buckets[1].bars).toHaveLength(3)
    expect(timeline.buckets[1].bars[0]).toMatchObject({
      animationId: 'click',
      startTime: 1.4,
      endTime: 2.4,
      lane: 0
    })
    expect(timeline.buckets[1].bars[1].animationId).toBe('with')
    expect(timeline.buckets[1].bars[1].startTime).toBeCloseTo(1.6)
    expect(timeline.buckets[1].bars[1].endTime).toBeCloseTo(3.6)
    expect(timeline.buckets[1].bars[1].lane).toBe(1)
    expect(timeline.buckets[1].bars[2].animationId).toBe('after')
    expect(timeline.buckets[1].bars[2].startTime).toBeCloseTo(3.6)
    expect(timeline.buckets[1].bars[2].endTime).toBeCloseTo(4.1)
    expect(timeline.buckets[1].bars[2].lane).toBe(0)
  })

  it('derives trigger times for the selected slide at a scrubbed local time', () => {
    const slide1 = createSlide()
    const slide2 = createSlide()
    const presentation = makePresentation(slide1, slide2)

    const appearance1 = addAppearance(presentation, slide1, 'First')
    const appearance2 = addAppearance(presentation, slide2, 'Second')
    const animation1 = moveAnimation('anim-1', appearance1, 'on-click')
    const animation2 = moveAnimation('anim-2', appearance2, 'on-click')

    slide1.animationOrder = [animation1.id]
    slide2.animationOrder = [animation2.id]
    presentation.animationsById[animation1.id] = animation1
    presentation.animationsById[animation2.id] = animation2

    const plan = buildPresentationPlaybackPlan(presentation)

    const beforeClick = buildTriggerTimesForSlideTime(plan, slide2.id, 0.2)
    expect(beforeClick.absoluteTime).toBeCloseTo(plan.segments[1].startTime + 0.2)
    expect(beforeClick.triggerTimes.get('anim-1')).toBeCloseTo(0.4)
    expect(beforeClick.triggerTimes.get('anim-2')).toBeUndefined()
    expect(beforeClick.triggerTimes.get(`implicit-transition:${slide1.id}`)).toBeCloseTo(
      plan.segments[1].startTime
    )

    const afterClick = buildTriggerTimesForSlideTime(plan, slide2.id, 0.5)
    expect(afterClick.triggerTimes.get('anim-2')).toBeCloseTo(
      plan.segments[1].startTime + plan.slideTimelinesById[slide2.id].buckets[0].startTime
    )
  })
})
