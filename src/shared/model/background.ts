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
