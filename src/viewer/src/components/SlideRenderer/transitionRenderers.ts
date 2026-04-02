import type { FrameState } from '@shared/animation/types'
import type { SlideTransition } from '@shared/model/types'

export interface TransitionLayerStyles {
  behindOpacity: number
  frontOpacity: number
  frontTranslateX: string
}

type ActiveTransition = NonNullable<FrameState['transition']>
type TransitionRenderer = (transition: ActiveTransition) => TransitionLayerStyles

const defaultLayerStyles: TransitionLayerStyles = {
  behindOpacity: 1,
  frontOpacity: 1,
  frontTranslateX: '0'
}

const transitionRenderers: Record<SlideTransition['kind'], TransitionRenderer> = {
  cut: () => defaultLayerStyles,
  'fade-through-color': (transition) => ({
    behindOpacity: 1,
    frontOpacity: transition.progress,
    frontTranslateX: '0'
  }),
  dissolve: (transition) => ({
    behindOpacity: 1 - transition.progress,
    frontOpacity: transition.progress,
    frontTranslateX: '0'
  }),
  push: (transition) => ({
    behindOpacity: 1,
    frontOpacity: 1,
    frontTranslateX: `${(1 - transition.progress) * 100}%`
  })
}

export function getTransitionLayerStyles(
  transition: FrameState['transition']
): TransitionLayerStyles {
  if (!transition) return defaultLayerStyles
  return transitionRenderers[transition.kind](transition)
}
