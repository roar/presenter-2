import { describe, it, expect } from 'vitest'
import { buildTimeline } from './buildTimeline'
import type { LegacySlide, AnimationCue, TransitionCue } from '../model/types'

// Helpers to build minimal cue fixtures
function animCue(id: string, trigger: AnimationCue['trigger'], durationSec = 1): AnimationCue {
  return {
    id,
    kind: 'animation',
    trigger,
    loop: { kind: 'none' },
    animations: [
      {
        id: `anim-${id}`,
        targetId: 'el-1',
        offset: 0,
        duration: durationSec,
        easing: 'linear',
        effect: { kind: 'enter', animation: { type: 'fade', to: 1 } }
      }
    ]
  }
}

function transCue(id: string, trigger: TransitionCue['trigger'], durationSec = 0.5): TransitionCue {
  return {
    id,
    kind: 'transition',
    trigger,
    slideTransition: { kind: 'fade-through-color', duration: durationSec, easing: 'linear' }
  }
}

function slide(id: string, cues: LegacySlide['cues']): LegacySlide {
  return { id, children: [], cues }
}

describe('buildTimeline', () => {
  describe('on-click cues', () => {
    it('schedules an on-click cue at its trigger time', () => {
      const s = slide('s1', [animCue('c1', 'on-click', 1)])
      const triggers = new Map([['c1', 5]])
      const { scheduledCues } = buildTimeline([s], triggers)
      expect(scheduledCues).toHaveLength(1)
      expect(scheduledCues[0].startTime).toBe(5)
      expect(scheduledCues[0].endTime).toBe(6)
    })

    it('stops scheduling when an on-click cue has no trigger time', () => {
      const s = slide('s1', [animCue('c1', 'on-click', 1), animCue('c2', 'on-click', 1)])
      const triggers = new Map<string, number>() // c1 not triggered
      const { scheduledCues } = buildTimeline([s], triggers)
      expect(scheduledCues).toHaveLength(0)
    })

    it('stops at the first untriggered on-click, even with later triggers', () => {
      const s = slide('s1', [animCue('c1', 'on-click', 1), animCue('c2', 'on-click', 1)])
      const triggers = new Map([['c2', 10]]) // c1 not triggered
      const { scheduledCues } = buildTimeline([s], triggers)
      expect(scheduledCues).toHaveLength(0)
    })
  })

  describe('after-previous', () => {
    it('starts immediately after the preceding cue ends', () => {
      const s = slide('s1', [animCue('c1', 'on-click', 1), animCue('c2', 'after-previous', 2)])
      const triggers = new Map([['c1', 0]])
      const { scheduledCues } = buildTimeline([s], triggers)
      expect(scheduledCues[1].startTime).toBe(1) // c1 endTime = 0 + 1
      expect(scheduledCues[1].endTime).toBe(3) // 1 + 2
    })

    it('follows the preceding array entry, not parallel cues', () => {
      const s = slide('s1', [
        animCue('c1', 'on-click', 1),
        animCue('c2', 'with-previous', 3), // parallel, longer
        animCue('c3', 'after-previous', 1) // follows c2 by position, not c1
      ])
      const triggers = new Map([['c1', 0]])
      const { scheduledCues } = buildTimeline([s], triggers)
      const c2 = scheduledCues[1]
      const c3 = scheduledCues[2]
      expect(c3.startTime).toBe(c2.endTime) // follows c2, not c1
    })
  })

  describe('with-previous', () => {
    it('starts at the same time as the preceding cue', () => {
      const s = slide('s1', [animCue('c1', 'on-click', 1), animCue('c2', 'with-previous', 2)])
      const triggers = new Map([['c1', 5]])
      const { scheduledCues } = buildTimeline([s], triggers)
      expect(scheduledCues[1].startTime).toBe(5) // same as c1
    })
  })

  describe('endTime', () => {
    it('computes endTime for AnimationCue as startTime + max(offset + duration)', () => {
      const cue: AnimationCue = {
        id: 'c1',
        kind: 'animation',
        trigger: 'on-click',
        loop: { kind: 'none' },
        animations: [
          {
            id: 'a1',
            targetId: 'el',
            offset: 0,
            duration: 1,
            easing: 'linear',
            effect: { kind: 'enter', animation: { type: 'fade', to: 1 } }
          },
          {
            id: 'a2',
            targetId: 'el',
            offset: 0.5,
            duration: 0.8,
            easing: 'linear',
            effect: { kind: 'enter', animation: { type: 'fade', to: 1 } }
          }
        ]
      }
      const s = slide('s1', [cue])
      const { scheduledCues } = buildTimeline([s], new Map([['c1', 0]]))
      expect(scheduledCues[0].endTime).toBe(1.3) // max(0+1, 0.5+0.8)
    })

    it('computes endTime for TransitionCue as startTime + transition duration', () => {
      const s = slide('s1', [transCue('c1', 'on-click', 0.5)])
      const { scheduledCues } = buildTimeline([s], new Map([['c1', 2]]))
      expect(scheduledCues[0].endTime).toBe(2.5)
    })

    it('endTime equals startTime for an AnimationCue with no animations', () => {
      const cue: AnimationCue = {
        id: 'c1',
        kind: 'animation',
        trigger: 'on-click',
        loop: { kind: 'none' },
        animations: []
      }
      const s = slide('s1', [cue])
      const { scheduledCues } = buildTimeline([s], new Map([['c1', 3]]))
      expect(scheduledCues[0].endTime).toBe(3)
    })
  })

  describe('multiple slides', () => {
    it('schedules cues across slides in order', () => {
      const s1 = slide('s1', [animCue('c1', 'on-click', 1)])
      const s2 = slide('s2', [animCue('c2', 'on-click', 1)])
      const triggers = new Map([
        ['c1', 0],
        ['c2', 5]
      ])
      const { scheduledCues } = buildTimeline([s1, s2], triggers)
      expect(scheduledCues).toHaveLength(2)
      expect(scheduledCues[0].cue.id).toBe('c1')
      expect(scheduledCues[1].cue.id).toBe('c2')
    })
  })
})
