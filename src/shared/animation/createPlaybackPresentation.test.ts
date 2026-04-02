import { describe, expect, it } from 'vitest'
import { createPresentation, createSlide } from '../model/factories'
import { createPlaybackPresentation } from './createPlaybackPresentation'

describe('createPlaybackPresentation', () => {
  it('adds implicit transition triggers to non-final slides without one', () => {
    const presentation = createPresentation()
    const slide1 = createSlide()
    const slide2 = createSlide()
    presentation.slideOrder = [slide1.id, slide2.id]
    presentation.slidesById[slide1.id] = slide1
    presentation.slidesById[slide2.id] = slide2

    const playback = createPlaybackPresentation(presentation)

    expect(playback.slidesById[slide1.id].transitionTriggerId).toBe(
      `implicit-transition:${slide1.id}`
    )
    expect(playback.slidesById[slide1.id].transition).toEqual({
      kind: 'cut',
      duration: 0.01,
      easing: 'linear'
    })
    expect(playback.slidesById[slide2.id].transitionTriggerId).toBeUndefined()
  })

  it('preserves explicit transition triggers', () => {
    const presentation = createPresentation()
    const slide1 = createSlide()
    const slide2 = createSlide()
    slide1.transitionTriggerId = 'existing-trigger'
    slide1.transition = { kind: 'fade-through-color', duration: 0.5, easing: 'ease-in-out' }
    presentation.slideOrder = [slide1.id, slide2.id]
    presentation.slidesById[slide1.id] = slide1
    presentation.slidesById[slide2.id] = slide2

    const playback = createPlaybackPresentation(presentation)

    expect(playback.slidesById[slide1.id].transitionTriggerId).toBe('existing-trigger')
    expect(playback.slidesById[slide1.id].transition).toEqual(slide1.transition)
  })
})
