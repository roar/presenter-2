import { DEFAULT_GRAIN_EFFECT, type GrainBlendMode, type GrainEffect } from './types'

export type GrainTexturePresetId = 'soft' | 'paper' | 'rough' | 'custom'

interface GrainTexturePresetValues {
  scale: number
  blendMode: GrainBlendMode
  defaultIntensity: number
}

const GRAIN_TEXTURE_PRESETS: Record<
  Exclude<GrainTexturePresetId, 'custom'>,
  GrainTexturePresetValues
> = {
  soft: {
    scale: 0.7,
    blendMode: 'soft-light',
    defaultIntensity: 0.25
  },
  paper: {
    scale: 0.5,
    blendMode: 'overlay',
    defaultIntensity: 0.4
  },
  rough: {
    scale: 0.9,
    blendMode: 'multiply',
    defaultIntensity: 0.55
  }
}

export function resolveGrainEffect(grain: GrainEffect | undefined): GrainEffect {
  return grain ? { ...DEFAULT_GRAIN_EFFECT, ...grain } : { ...DEFAULT_GRAIN_EFFECT }
}

export function getGrainBaseFrequency(scale: number): string {
  const normalizedScale = Math.max(0.1, Math.min(scale, 2))
  const frequency = (0.15 / normalizedScale).toFixed(4)
  return `${frequency} ${frequency}`
}

export function getRenderedGrainIntensity(intensity: number): number {
  const normalizedIntensity = Math.max(0, Math.min(intensity, 1))
  return normalizedIntensity
}

export function getGrainTexturePresetValues(
  presetId: Exclude<GrainTexturePresetId, 'custom'>
): GrainTexturePresetValues {
  return GRAIN_TEXTURE_PRESETS[presetId]
}

export function getGrainTexturePreset(grain: GrainEffect): GrainTexturePresetId {
  const resolved = resolveGrainEffect(grain)
  const match = Object.entries(GRAIN_TEXTURE_PRESETS).find(([, preset]) => {
    return preset.blendMode === resolved.blendMode && preset.scale === resolved.scale
  })

  return (match?.[0] as GrainTexturePresetId | undefined) ?? 'custom'
}
