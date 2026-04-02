import type { Presentation } from '../model/types'

const IMPLICIT_TRANSITION_DURATION = 0.01

export function createPlaybackPresentation(presentation: Presentation): Presentation {
  const nextSlides = presentation.slideOrder.slice(0, -1)
  if (nextSlides.every((slideId) => presentation.slidesById[slideId]?.transitionTriggerId)) {
    return presentation
  }

  const slidesById = { ...presentation.slidesById }

  for (const slideId of nextSlides) {
    const slide = slidesById[slideId]
    if (!slide || slide.transitionTriggerId) continue

    slidesById[slideId] = {
      ...slide,
      transitionTriggerId: `implicit-transition:${slideId}`,
      transition: slide.transition ?? {
        kind: 'cut',
        duration: IMPLICIT_TRANSITION_DURATION,
        easing: 'linear'
      }
    }
  }

  return {
    ...presentation,
    slidesById
  }
}
