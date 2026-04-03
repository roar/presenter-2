import { DEFAULT_GRAIN_EFFECT, type GrainEffect } from './types'

export function resolveGrainEffect(grain: GrainEffect | undefined): GrainEffect {
  return grain ? { ...DEFAULT_GRAIN_EFFECT, ...grain } : { ...DEFAULT_GRAIN_EFFECT }
}

export function getGrainBaseFrequency(scale: number): string {
  const normalizedScale = Math.max(0.1, Math.min(scale, 2))
  const frequency = (0.012 / normalizedScale).toFixed(4)
  return `${frequency} ${frequency}`
}
