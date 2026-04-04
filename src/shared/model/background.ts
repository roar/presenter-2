import type { Background, Fill, GrainEffect } from './types'
import type { ColorConstant, ColorConstantId } from './types'
import { resolveFillBackground } from './fill'
import { resolveGrainEffect } from './grain'

export function getBackgroundFill(background: Background): Fill | undefined {
  return background.fill ?? background.color
}

export function resolveBackgroundStyle(
  background: Background,
  colorConstantsById?: Record<ColorConstantId, ColorConstant>
): string | undefined {
  return (
    resolveFillBackground(getBackgroundFill(background), colorConstantsById) ?? background.image
  )
}

export function resolveBackgroundGrain(background: Background): GrainEffect {
  return resolveGrainEffect(background.grain)
}

/**
 * Merges a slide's own background with the presentation-level default background.
 * Each field falls back to the default if not explicitly set on the slide.
 */
export function resolveSlideBackground(
  slideBackground: Background,
  defaultBackground: Background | undefined
): Background {
  if (!defaultBackground) return slideBackground
  return {
    color: slideBackground.color ?? defaultBackground.color,
    fill: slideBackground.fill ?? defaultBackground.fill,
    grain: slideBackground.grain ?? defaultBackground.grain,
    image: slideBackground.image ?? defaultBackground.image
  }
}
