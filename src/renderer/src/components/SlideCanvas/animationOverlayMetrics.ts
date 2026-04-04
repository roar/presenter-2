import type { RenderedAppearance } from '@shared/animation/types'
import type { MsoMaster } from '@shared/model/types'

export interface AnimationOverlayMetrics {
  baseLeft: number
  baseTop: number
  ghostWidth: number
  ghostHeight: number
  rotation: number
}

export function getAnimationOverlayMetrics(
  master: MsoMaster,
  renderedAppearance: RenderedAppearance
): AnimationOverlayMetrics {
  const transform = renderedAppearance.transform
  const translateMatch = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/)
  const scaleMatch = transform.match(/scale\(([-\d.]+)\)/)
  const translateX = translateMatch ? Number(translateMatch[1]) : 0
  const translateY = translateMatch ? Number(translateMatch[2]) : 0
  const renderedScale = scaleMatch ? Number(scaleMatch[1]) : 1

  return {
    baseLeft: master.transform.x + translateX,
    baseTop: master.transform.y + translateY,
    ghostWidth: master.transform.width * renderedScale,
    ghostHeight: master.transform.height * renderedScale,
    rotation: master.transform.rotation
  }
}
