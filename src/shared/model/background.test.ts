import { describe, expect, it } from 'vitest'
import { resolveSlideBackground } from './background'
import type { Background } from './types'

describe('resolveSlideBackground', () => {
  it('returns the slide background unchanged when there is no default', () => {
    const slide: Background = { fill: '#ff0000' }
    expect(resolveSlideBackground(slide, undefined)).toBe(slide)
  })

  it('falls back to default background fields when slide has none', () => {
    const slide: Background = {}
    const defaultBg: Background = { fill: '#0000ff', image: 'bg.jpg' }
    expect(resolveSlideBackground(slide, defaultBg)).toEqual({
      color: undefined,
      fill: '#0000ff',
      grain: undefined,
      image: 'bg.jpg'
    })
  })

  it('prefers slide background fields over defaults', () => {
    const grain = {
      enabled: true,
      intensity: 0.5,
      scale: 1,
      seed: 42,
      blendMode: 'overlay' as const
    }
    const slide: Background = { fill: '#ff0000', grain }
    const defaultBg: Background = {
      fill: '#0000ff',
      grain: { enabled: false, intensity: 0.2, scale: 0.5, seed: 1, blendMode: 'multiply' as const }
    }
    const result = resolveSlideBackground(slide, defaultBg)
    expect(result.fill).toBe('#ff0000')
    expect(result.grain).toBe(grain)
  })

  it('merges partially — slide fill overrides default fill but inherits default grain', () => {
    const defaultGrain = {
      enabled: true,
      intensity: 0.4,
      scale: 0.5,
      seed: 1,
      blendMode: 'overlay' as const
    }
    const slide: Background = { fill: '#abcdef' }
    const defaultBg: Background = { fill: '#000000', grain: defaultGrain }
    const result = resolveSlideBackground(slide, defaultBg)
    expect(result.fill).toBe('#abcdef')
    expect(result.grain).toBe(defaultGrain)
  })
})
